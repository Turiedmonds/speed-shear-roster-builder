const OPERATOR_PORTAL_SETTINGS = {
  title: 'Waimarino Shears — System Operator Portal',
  driveFolderName: 'Waimarino Speed Shear Entry Manager',
  entryBaseUrl: 'https://entries.waimarinoshears.com/',
  shortCodeLength: 20,
  expectedRecordType: 'speed_shear_entry_manager_competition'
};

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(OPERATOR_PORTAL_SETTINGS.title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function getOperatorCompetitions() {
  const folder = operatorPortalFolder_();
  const files = folder.getFiles();
  const competitions = [];

  while (files.hasNext()) {
    const file = files.next();

    if (
      file.getMimeType() !== MimeType.PLAIN_TEXT &&
      !/\.json$/i.test(file.getName())
    ) {
      continue;
    }

    try {
      const record = JSON.parse(
        file.getBlob().getDataAsString('UTF-8')
      );

      if (
        !record ||
        record.type !== OPERATOR_PORTAL_SETTINGS.expectedRecordType
      ) {
        continue;
      }

      competitions.push(operatorPortalSummary_(record));

    } catch (err) {
      // Ignore unrelated or malformed files.
    }
  }

  competitions.sort(operatorPortalSort_);

  return {
    generatedAt: new Date().toISOString(),
    count: competitions.length,
    competitions: competitions
  };
}

function setOperatorDepositStatus(bookingReference, status) {
  const cleanStatus = String(status || '')
    .trim()
    .toLowerCase();

  if (
    cleanStatus !== 'awaiting' &&
    cleanStatus !== 'paid'
  ) {
    throw new Error(
      'Deposit status must be Awaiting or Paid.'
    );
  }

  return operatorPortalUpdateRecord_(
    bookingReference,
    function (record) {
      const control = operatorPortalControl_(record);

      if (control.status === 'cancelled') {
        throw new Error(
          'Restore the competition before changing its deposit status.'
        );
      }

      control.depositStatus = cleanStatus;
      control.updatedAt = new Date().toISOString();

      record.operatorControl = control;
    }
  );
}

function cancelOperatorCompetition(bookingReference) {
  return operatorPortalUpdateRecord_(
    bookingReference,
    function (record) {
      const control = operatorPortalControl_(record);

      control.status = 'cancelled';
      control.cancelledAt = new Date().toISOString();
      control.updatedAt = control.cancelledAt;

      record.operatorControl = control;
    }
  );
}

function restoreOperatorCompetition(bookingReference) {
  return operatorPortalUpdateRecord_(
    bookingReference,
    function (record) {
      const control = operatorPortalControl_(record);

      control.status = 'active';
      control.cancelledAt = '';
      control.updatedAt = new Date().toISOString();

      record.operatorControl = control;
    }
  );
}

function postponeOperatorCompetition(
  bookingReference,
  newDate,
  cutoffMode,
  newAutoCloseAt
) {
  const cleanNewDate =
    operatorPortalValidDate_(newDate);

  return operatorPortalUpdateRecord_(
    bookingReference,
    function (record) {
      const control =
        operatorPortalControl_(record);

      if (control.status === 'cancelled') {
        throw new Error(
          'Restore the competition before postponing it.'
        );
      }

      const competition =
        record.competition &&
        typeof record.competition === 'object'
          ? record.competition
          : {};

      const oldDate =
        operatorPortalValidDate_(
          competition.date,
          'The current competition date is missing or invalid.'
        );

      if (cleanNewDate <= oldDate) {
        throw new Error(
          'A postponed competition date must be later than the current date.'
        );
      }

      const settings =
        record.entrySettings &&
        typeof record.entrySettings === 'object'
          ? record.entrySettings
          : {
              publicEntriesOpen: true,
              autoCloseAt: ''
            };

      const currentCustomCutoff =
        String(settings.autoCloseAt || '').trim();

      const cleanCutoffMode =
        String(cutoffMode || '')
          .trim()
          .toLowerCase();

      const now =
        new Date().toISOString();

      if (currentCustomCutoff) {
        if (
          cleanCutoffMode !== 'move' &&
          cleanCutoffMode !== 'keep'
        ) {
          throw new Error(
            'Choose whether to move or keep the existing custom entry closing time.'
          );
        }

        if (cleanCutoffMode === 'move') {
          const parsed =
            new Date(
              String(newAutoCloseAt || '').trim()
            );

          if (isNaN(parsed.getTime())) {
            throw new Error(
              'The new entry closing date/time is invalid.'
            );
          }

          settings.autoCloseAt =
            parsed.toISOString();

          settings.updatedAt =
            now;
        }

      } else {
        if (
          cleanCutoffMode &&
          cleanCutoffMode !== 'auto'
        ) {
          throw new Error(
            'This competition uses the automatic entry closing time.'
          );
        }

        // Keep autoCloseAt blank. The existing Entry Manager
        // derives its automatic closing time from competition.date,
        // so changing the competition date moves that cutoff safely.
        settings.autoCloseAt = '';
      }

      competition.date =
        cleanNewDate;

      record.competition =
        competition;

      record.entrySettings =
        settings;

      control.originalDate =
        control.originalDate ||
        oldDate;

      control.previousDate =
        oldDate;

      control.postponedAt =
        now;

      control.postponementCount =
        Number(control.postponementCount || 0) + 1;

      control.updatedAt =
        now;

      record.operatorControl =
        control;
    }
  );
}

function deleteOperatorCompetition(bookingReference) {
  const found =
    operatorPortalFindCompetition_(bookingReference);

  const control =
    operatorPortalControl_(found.record);

  if (control.status !== 'cancelled') {
    throw new Error(
      'Cancel the competition before deleting it permanently.'
    );
  }

  found.file.setTrashed(true);

  return {
    ok: true,
    bookingReference:
      found.record.bookingReference || ''
  };
}

function operatorPortalUpdateRecord_(
  bookingReference,
  updater
) {
  const found =
    operatorPortalFindCompetition_(bookingReference);

  updater(found.record);

  found.file.setContent(
    JSON.stringify(found.record, null, 2)
  );

  return {
    ok: true,
    competition:
      operatorPortalSummary_(found.record)
  };
}

function operatorPortalFindCompetition_(
  bookingReference
) {
  const reference =
    String(bookingReference || '').trim();

  if (!reference) {
    throw new Error(
      'Booking Reference is required.'
    );
  }

  const files =
    operatorPortalFolder_().getFiles();

  let match = null;

  while (files.hasNext()) {
    const file = files.next();

    if (
      file.getMimeType() !== MimeType.PLAIN_TEXT &&
      !/\.json$/i.test(file.getName())
    ) {
      continue;
    }

    try {
      const record = JSON.parse(
        file.getBlob().getDataAsString('UTF-8')
      );

      if (
        !record ||
        record.type !==
          OPERATOR_PORTAL_SETTINGS.expectedRecordType
      ) {
        continue;
      }

      if (
        String(record.bookingReference || '').trim() !==
        reference
      ) {
        continue;
      }

      if (match) {
        throw new Error(
          'More than one competition record uses this Booking Reference.'
        );
      }

      match = {
        file: file,
        record: record
      };

    } catch (error) {
      if (
        error &&
        /More than one competition record/.test(
          String(error.message || error)
        )
      ) {
        throw error;
      }
    }
  }

  if (!match) {
    throw new Error(
      'Competition record was not found.'
    );
  }

  return match;
}

function operatorPortalFolder_() {
  const folders =
    DriveApp.getFoldersByName(
      OPERATOR_PORTAL_SETTINGS.driveFolderName
    );

  if (!folders.hasNext()) {
    throw new Error(
      'The Entry Manager competition folder could not be found in this Google Drive account.'
    );
  }

  return folders.next();
}

function operatorPortalControl_(record) {
  const current =
    record.operatorControl &&
    typeof record.operatorControl === 'object'
      ? record.operatorControl
      : {};

  const count =
    Number(current.postponementCount || 0);

  return {
    status:
      current.status === 'cancelled'
        ? 'cancelled'
        : 'active',

    depositStatus:
      current.depositStatus === 'paid'
        ? 'paid'
        : 'awaiting',

    cancelledAt:
      String(current.cancelledAt || ''),

    postponedAt:
      String(current.postponedAt || ''),

    originalDate:
      String(current.originalDate || ''),

    previousDate:
      String(current.previousDate || ''),

    postponementCount:
      isFinite(count) && count > 0
        ? Math.floor(count)
        : 0,

    updatedAt:
      String(current.updatedAt || '')
  };
}

function operatorPortalSummary_(record) {
  const competition =
    record.competition || {};

  const organiser =
    record.organiser || {};

  const gradeSettings =
    record.gradeSettings || {};

  const competitors =
    Array.isArray(record.competitors)
      ? record.competitors
      : [];

  const grades =
    Array.isArray(record.grades)
      ? record.grades
      : Object.keys(gradeSettings);

  const entrySettings =
    record.entrySettings || {};

  const control =
    operatorPortalControl_(record);

  const confirmed =
    competitors.filter(function (person) {
      return (
        person &&
        person.checkedIn === true
      );
    }).length;

  const gradeSummaries =
    grades.map(function (grade) {
      const settings =
        gradeSettings[grade] || {};

      const count =
        competitors.filter(function (person) {
          return (
            person &&
            person.grade === grade
          );
        }).length;

      return {
        name: grade,
        count: count,

        limit:
          operatorPortalNumberOrNull_(
            settings.entryLimit
          ),

        publicOpen:
          settings.publicOpen !== false,

        submitted:
          settings.submitted === true,

        submittedAt:
          settings.submittedAt || ''
      };
    });

  const submittedCount =
    gradeSummaries.filter(function (grade) {
      return grade.submitted;
    }).length;

  let rosterStatus = 'Not submitted';

  if (
    gradeSummaries.length &&
    submittedCount === gradeSummaries.length
  ) {
    rosterStatus = 'Submitted';

  } else if (submittedCount > 0) {
    rosterStatus = 'Partly submitted';
  }

  const effectiveCutoff =
    operatorPortalEffectiveCutoff_(
      competition.date,
      entrySettings.autoCloseAt
    );

  const publicOpen =
    control.status === 'active' &&
    operatorPortalPublicOpen_(
      entrySettings.publicEntriesOpen,
      effectiveCutoff
    );

  return {
    bookingReference:
      record.bookingReference || '',

    name:
      competition.name ||
      'Unnamed competition',

    date:
      competition.date || '',

    venue:
      competition.venue || '',

    organiser: {
      name: organiser.name || '',
      email: organiser.email || '',
      phone: organiser.phone || ''
    },

    operatorStatus:
      control.status,

    operatorStatusLabel:
      control.status === 'cancelled'
        ? 'Cancelled'
        : 'Active',

    depositStatus:
      control.depositStatus,

    depositStatusLabel:
      control.depositStatus === 'paid'
        ? 'Deposit Paid'
        : 'Awaiting Deposit',

    cancelledAt:
      control.cancelledAt,

    postponed:
      Boolean(control.postponedAt),

    postponedAt:
      control.postponedAt,

    originalDate:
      control.originalDate,

    previousDate:
      control.previousDate,

    postponementCount:
      control.postponementCount,

    customCutoffAt:
      String(entrySettings.autoCloseAt || ''),

    totalEntries:
      competitors.length,

    confirmedEntries:
      confirmed,

    notConfirmedEntries:
      Math.max(
        0,
        competitors.length - confirmed
      ),

    publicEntriesOpen:
      publicOpen,

    publicEntriesLabel:
      publicOpen ? 'Open' : 'Closed',

    effectiveCutoff:
      effectiveCutoff || '',

    lifecycle:
      operatorPortalLifecycle_(
        competition.date
      ),

    rosterStatus:
      rosterStatus,

    grades:
      gradeSummaries,

    entryManagerUrl:
      control.status === 'active'
        ? operatorPortalShortUrl_(
            'manage/?c=',
            record.managerToken
          )
        : '',

    competitorEntryUrl:
      control.status === 'active'
        ? operatorPortalShortUrl_(
            'enter/?c=',
            record.publicEntryToken
          )
        : '',

    updatedAt:
      operatorPortalLatestTimestamp_(record)
  };
}

function operatorPortalShortUrl_(path, token) {
  if (!token) return '';

  const code =
    String(token).slice(
      0,
      OPERATOR_PORTAL_SETTINGS.shortCodeLength
    );

  return (
    OPERATOR_PORTAL_SETTINGS.entryBaseUrl +
    path +
    encodeURIComponent(code)
  );
}

function operatorPortalEffectiveCutoff_(
  competitionDate,
  customCutoff
) {
  if (customCutoff) {
    return customCutoff;
  }

  if (!competitionDate) {
    return '';
  }

  const date =
    new Date(
      competitionDate + 'T00:00:00'
    );

  if (isNaN(date.getTime())) {
    return '';
  }

  date.setDate(
    date.getDate() + 1
  );

  date.setHours(
    12,
    0,
    0,
    0
  );

  return date.toISOString();
}

function operatorPortalPublicOpen_(
  flag,
  cutoff
) {
  if (flag === false) {
    return false;
  }

  if (!cutoff) {
    return true;
  }

  const cutoffDate =
    new Date(cutoff);

  if (isNaN(cutoffDate.getTime())) {
    return true;
  }

  return (
    new Date().getTime() <
    cutoffDate.getTime()
  );
}

function operatorPortalLifecycle_(
  dateText
) {
  if (!dateText) {
    return 'Unknown date';
  }

  const today =
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyy-MM-dd'
    );

  if (dateText === today) {
    return 'Today';
  }

  return dateText > today
    ? 'Upcoming'
    : 'Past';
}

function operatorPortalLatestTimestamp_(
  record
) {
  const timestamps = [
    record.createdAt
  ];

  if (
    record.entrySettings &&
    record.entrySettings.updatedAt
  ) {
    timestamps.push(
      record.entrySettings.updatedAt
    );
  }

  if (
    record.operatorControl &&
    record.operatorControl.updatedAt
  ) {
    timestamps.push(
      record.operatorControl.updatedAt
    );
  }

  (record.competitors || []).forEach(
    function (person) {
      if (
        person &&
        person.updatedAt
      ) {
        timestamps.push(
          person.updatedAt
        );

      } else if (
        person &&
        person.createdAt
      ) {
        timestamps.push(
          person.createdAt
        );
      }
    }
  );

  return (
    timestamps
      .filter(Boolean)
      .sort()
      .pop() || ''
  );
}

function operatorPortalValidDate_(
  value,
  message
) {
  const clean =
    String(value || '').trim();

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      clean
    );

  if (!match) {
    throw new Error(
      message ||
      'Choose a valid competition date.'
    );
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const parsed =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(
      message ||
      'Choose a valid competition date.'
    );
  }

  return clean;
}

function operatorPortalNumberOrNull_(
  value
) {
  if (
    value === '' ||
    value === null ||
    typeof value === 'undefined'
  ) {
    return null;
  }

  const number =
    Number(value);

  return (
    isFinite(number) &&
    number > 0
  )
    ? number
    : null;
}

function operatorPortalSort_(a, b) {
  if (a.operatorStatus !== b.operatorStatus) {
    return a.operatorStatus === 'cancelled' ? 1 : -1;
  }

  const rank = {
    Today: 0,
    Upcoming: 1,
    Past: 2,
    'Unknown date': 3
  };

  const rankDiff =
    (rank[a.lifecycle] || 0) -
    (rank[b.lifecycle] || 0);

  if (rankDiff) {
    return rankDiff;
  }

  if (a.lifecycle === 'Past') {
    return String(b.date)
      .localeCompare(String(a.date));
  }

  return String(a.date)
    .localeCompare(String(b.date));
}
