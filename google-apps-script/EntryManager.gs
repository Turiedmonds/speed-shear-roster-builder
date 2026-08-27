const ENTRY_MANAGER_SETTINGS = {
  receiverEmail: 'Waimarinoshears@gmail.com',
  senderName: 'Waimarino Shears Entry Manager',
  driveFolderName: 'Waimarino Speed Shear Entry Manager',
  publicBaseUrl: 'https://turiedmonds.github.io/speed-shear-roster-builder/',
  competitorEntryPath: 'competitor-entry.html',
  schemaVersion: 2
};

function entryManagerCreateCompetition_(pack) {
  if (!pack || !pack.identity || !pack.identity.bookingReference) throw new Error('Booking Reference is required.');
  const reference = String(pack.identity.bookingReference).trim();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const existingId = properties.getProperty('entryManagerReference_' + reference);
    if (existingId) {
      try {
        const existing = JSON.parse(DriveApp.getFileById(existingId).getBlob().getDataAsString());
        entryManagerNormaliseRecord_(existing);
        return entryManagerLinksFromRecord_(existing, existingId);
      } catch (error) {
        console.warn('Existing Entry Manager record could not be read. Recreating it.', error);
      }
    }

    const managerToken = entryManagerToken_();
    const publicEntryToken = entryManagerToken_();
    const setup = pack.competitionSetup || {};
    const record = {
      schemaVersion: ENTRY_MANAGER_SETTINGS.schemaVersion,
      type: 'speed_shear_entry_manager_competition',
      bookingReference: reference,
      managerToken,
      publicEntryToken,
      createdAt: new Date().toISOString(),
      competition: {
        name: String(pack.booking && pack.booking.competitionName || ''),
        date: String(pack.booking && pack.booking.competitionDate || ''),
        venue: String(pack.booking && pack.booking.venue || '')
      },
      organiser: {
        name: String(pack.booking && pack.booking.contactPerson || ''),
        email: String(pack.booking && pack.booking.email || ''),
        phone: String(pack.booking && pack.booking.phone || '')
      },
      grades: Object.keys(setup.events || {}),
      competitionSetup: {
        events: JSON.parse(JSON.stringify(setup.events || {})),
        program: JSON.parse(JSON.stringify(setup.program || []))
      },
      entrySettings: {
        publicEntriesOpen: true,
        autoCloseAt: '',
        allowOnDayEntries: false,
        updatedAt: new Date().toISOString()
      },
      competitors: [],
      submissions: []
    };

    const blob = Utilities.newBlob(JSON.stringify(record, null, 2), 'application/json', reference + '_EntryManager.json');
    const file = entryManagerFolder_().createFile(blob);
    properties.setProperty('entryManagerToken_' + managerToken, file.getId());
    properties.setProperty('entryPublicToken_' + publicEntryToken, file.getId());
    properties.setProperty('entryManagerReference_' + reference, file.getId());
    return entryManagerLinksFromRecord_(record, file.getId());
  } finally {
    lock.releaseLock();
  }
}

function entryManagerNormaliseRecord_(record) {
  record.grades = Array.isArray(record.grades) ? record.grades : [];
  record.competitors = Array.isArray(record.competitors) ? record.competitors : [];
  record.submissions = Array.isArray(record.submissions) ? record.submissions : [];
  record.entrySettings = record.entrySettings && typeof record.entrySettings === 'object' ? record.entrySettings : {};
  if (record.entrySettings.publicEntriesOpen == null) record.entrySettings.publicEntriesOpen = true;
  if (record.entrySettings.autoCloseAt == null) record.entrySettings.autoCloseAt = '';
  if (record.entrySettings.allowOnDayEntries == null) record.entrySettings.allowOnDayEntries = false;
  record.competitors.forEach(item => {
    if (item.checkedIn == null) item.checkedIn = false;
    if (!item.source) item.source = 'public-entry';
  });
  return record;
}

function entryManagerLinksFromRecord_(record, fileId) {
  return {
    bookingReference: record.bookingReference,
    managerToken: record.managerToken,
    publicEntryToken: record.publicEntryToken,
    entryManagerUrl: entryManagerUrl_(record.managerToken),
    competitorEntryUrl: entryManagerCompetitorUrl_(record.publicEntryToken),
    fileId: fileId || ''
  };
}

function entryManagerToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function entryManagerFolder_() {
  const folders = DriveApp.getFoldersByName(ENTRY_MANAGER_SETTINGS.driveFolderName);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(ENTRY_MANAGER_SETTINGS.driveFolderName);
}

function entryManagerUrl_(token) {
  return ENTRY_MANAGER_SETTINGS.publicBaseUrl + '?access=' + encodeURIComponent(token);
}

function entryManagerCompetitorUrl_(token) {
  return ENTRY_MANAGER_SETTINGS.publicBaseUrl + ENTRY_MANAGER_SETTINGS.competitorEntryPath + '?entry=' + encodeURIComponent(token);
}

function entryManagerReadByManagerToken_(token) {
  return entryManagerReadByProperty_('entryManagerToken_', token, 'managerToken');
}

function entryManagerReadByPublicToken_(token) {
  return entryManagerReadByProperty_('entryPublicToken_', token, 'publicEntryToken');
}

function entryManagerReadByProperty_(prefix, token, field) {
  const clean = String(token || '').trim();
  if (!clean) throw new Error('Access token is missing.');
  const id = PropertiesService.getScriptProperties().getProperty(prefix + clean);
  if (!id) throw new Error('Competition link was not found.');
  const file = DriveApp.getFileById(id);
  const record = JSON.parse(file.getBlob().getDataAsString());
  if (record[field] !== clean) throw new Error('Competition link is invalid.');
  entryManagerNormaliseRecord_(record);
  return {record, file};
}

function entryManagerSaveRecord_(found) {
  found.file.setContent(JSON.stringify(found.record, null, 2));
}

function entryManagerEffectivePublicOpen_(record) {
  entryManagerNormaliseRecord_(record);
  if (record.entrySettings.publicEntriesOpen === false) return false;
  const raw = String(record.entrySettings.autoCloseAt || '').trim();
  if (!raw) return true;
  const cutoff = new Date(raw);
  if (isNaN(cutoff.getTime())) return true;
  return Date.now() < cutoff.getTime();
}

function entryManagerPublicSetup_(token) {
  const record = entryManagerReadByManagerToken_(token).record;
  return {
    ok: true,
    bookingReference: record.bookingReference,
    accessToken: record.managerToken,
    competition: record.competition,
    grades: record.grades,
    competitionSetup: record.competitionSetup,
    competitorEntryUrl: entryManagerCompetitorUrl_(record.publicEntryToken),
    entrySettings: {
      publicEntriesOpen: record.entrySettings.publicEntriesOpen !== false,
      autoCloseAt: String(record.entrySettings.autoCloseAt || ''),
      allowOnDayEntries: record.entrySettings.allowOnDayEntries === true,
      effectivePublicEntriesOpen: entryManagerEffectivePublicOpen_(record)
    },
    competitors: (record.competitors || []).map(entry => ({
      id: entry.id,
      grade: entry.grade,
      name: entry.name,
      town: entry.town || '',
      phone: entry.phone || '',
      email: entry.email || '',
      source: entry.source || 'manual',
      checkedIn: entry.checkedIn === true,
      createdAt: entry.createdAt || '',
      updatedAt: entry.updatedAt || ''
    }))
  };
}

function entryManagerCompetitorSetup_(token) {
  const record = entryManagerReadByPublicToken_(token).record;
  return {
    ok: true,
    competition: record.competition,
    grades: record.grades,
    entriesOpen: entryManagerEffectivePublicOpen_(record),
    autoCloseAt: String(record.entrySettings.autoCloseAt || ''),
    privacyContact: ENTRY_MANAGER_SETTINGS.receiverEmail
  };
}

function entryManagerSaveCompetitorEntry_(payload) {
  if (!payload || payload.type !== 'speed_shear_competitor_entry') throw new Error('Unsupported competitor entry.');
  const token = String(payload.entryToken || '').trim();
  const grade = entryManagerClean_(payload.grade);
  const name = entryManagerClean_(payload.name);
  const town = entryManagerClean_(payload.town);
  const phone = entryManagerClean_(payload.phone);
  const email = entryManagerClean_(payload.email).toLowerCase();
  if (!name) throw new Error('Competitor name is required.');
  if (!phone && !email) throw new Error('Please provide a phone number or email address.');
  if (payload.privacyAccepted !== true) throw new Error('Privacy acknowledgement is required.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const found = entryManagerReadByPublicToken_(token);
    const record = found.record;
    if (!entryManagerEffectivePublicOpen_(record)) throw new Error('Public entries are closed for this competition.');
    if (!grade || (record.grades || []).indexOf(grade) < 0) throw new Error('Please choose a valid grade or event.');
    const duplicate = record.competitors.find(item =>
      String(item.grade || '').toLowerCase() === grade.toLowerCase() &&
      entryManagerClean_(item.name).toLowerCase() === name.toLowerCase() &&
      entryManagerClean_(item.town).toLowerCase() === town.toLowerCase()
    );
    if (duplicate) {
      return {ok:true, duplicate:true, competitionName:record.competition && record.competition.name || '', grade, competitorName:name};
    }

    record.competitors.push({
      id: Utilities.getUuid(), grade, name, town, phone, email,
      source: 'public-entry', checkedIn: false, createdAt: new Date().toISOString()
    });
    entryManagerSaveRecord_(found);
    return {ok:true, duplicate:false, competitionName:record.competition && record.competition.name || '', grade, competitorName:name};
  } finally {
    lock.releaseLock();
  }
}

function entryManagerSaveEntrySettings_(payload) {
  if (!payload || payload.type !== 'speed_shear_manager_entry_settings') throw new Error('Unsupported entry settings update.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const found = entryManagerReadByManagerToken_(payload.accessToken || '');
    const settings = payload.entrySettings || {};
    let autoCloseAt = entryManagerClean_(settings.autoCloseAt);
    if (autoCloseAt) {
      const parsed = new Date(autoCloseAt);
      if (isNaN(parsed.getTime())) throw new Error('Automatic closing date/time is invalid.');
      autoCloseAt = parsed.toISOString();
    }
    found.record.entrySettings = {
      publicEntriesOpen: settings.publicEntriesOpen !== false,
      autoCloseAt,
      allowOnDayEntries: settings.allowOnDayEntries === true,
      updatedAt: new Date().toISOString()
    };
    entryManagerSaveRecord_(found);
    return {ok:true, entrySettings:found.record.entrySettings, effectivePublicEntriesOpen:entryManagerEffectivePublicOpen_(found.record)};
  } finally {
    lock.releaseLock();
  }
}

function entryManagerAddGrade_(payload) {
  if (!payload || payload.type !== 'speed_shear_manager_grade_add') throw new Error('Unsupported grade addition.');
  const name = entryManagerClean_(payload.grade);
  if (!name) throw new Error('Grade or event name is required.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const found = entryManagerReadByManagerToken_(payload.accessToken || '');
    if (!found.record.grades.some(g => entryManagerClean_(g).toLowerCase() === name.toLowerCase())) found.record.grades.push(name);
    entryManagerSaveRecord_(found);
    return {ok:true, grades:found.record.grades};
  } finally {
    lock.releaseLock();
  }
}

function entryManagerRemoveGrade_(payload) {
  if (!payload || payload.type !== 'speed_shear_manager_grade_remove') throw new Error('Unsupported grade removal.');
  const name = entryManagerClean_(payload.grade);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const found = entryManagerReadByManagerToken_(payload.accessToken || '');
    if (found.record.competitors.some(c => entryManagerClean_(c.grade).toLowerCase() === name.toLowerCase())) throw new Error('Remove competitors from this grade before removing the grade.');
    found.record.grades = found.record.grades.filter(g => entryManagerClean_(g).toLowerCase() !== name.toLowerCase());
    entryManagerSaveRecord_(found);
    return {ok:true, grades:found.record.grades};
  } finally {
    lock.releaseLock();
  }
}

function entryManagerUpsertCompetitor_(payload) {
  if (!payload || payload.type !== 'speed_shear_manager_competitor_upsert') throw new Error('Unsupported competitor save.');
  const incoming = payload.competitor || {};
  const grade = entryManagerClean_(incoming.grade);
  const name = entryManagerClean_(incoming.name);
  const town = entryManagerClean_(incoming.town);
  if (!name) throw new Error('Competitor name is required.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const found = entryManagerReadByManagerToken_(payload.accessToken || '');
    const record = found.record;
    if (!record.grades.some(g => entryManagerClean_(g).toLowerCase() === grade.toLowerCase())) throw new Error('Grade or event is invalid.');
    const requestedId = String(incoming.id || '').trim();
    let item = requestedId ? record.competitors.find(c => String(c.id || '') === requestedId) : null;
    const adding = !item;
    if (adding && !entryManagerEffectivePublicOpen_(record) && record.entrySettings.allowOnDayEntries !== true) {
      throw new Error('New entries are closed. Turn on Allow on-the-day entries to add a late competitor.');
    }
    const duplicate = record.competitors.some(c => (!item || c.id !== item.id) &&
      entryManagerClean_(c.grade).toLowerCase() === grade.toLowerCase() &&
      entryManagerClean_(c.name).toLowerCase() === name.toLowerCase() &&
      entryManagerClean_(c.town).toLowerCase() === town.toLowerCase());
    if (duplicate) throw new Error('That competitor already exists in this grade.');
    if (!item) {
      item = {id: requestedId || Utilities.getUuid(), createdAt: incoming.createdAt || new Date().toISOString()};
      record.competitors.push(item);
    }
    item.grade = grade;
    item.name = name;
    item.town = town;
    item.phone = entryManagerClean_(incoming.phone);
    item.email = entryManagerClean_(incoming.email).toLowerCase();
    item.source = entryManagerClean_(incoming.source) || 'manual';
    item.checkedIn = incoming.checkedIn === true;
    item.updatedAt = new Date().toISOString();
    entryManagerSaveRecord_(found);
    return {ok:true, competitor:item};
  } finally {
    lock.releaseLock();
  }
}

function entryManagerSetCheckIn_(payload) {
  if (!payload || payload.type !== 'speed_shear_manager_competitor_checkin') throw new Error('Unsupported check-in update.');
  const competitorId = String(payload.competitorId || '').trim();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const found = entryManagerReadByManagerToken_(payload.accessToken || '');
    const item = found.record.competitors.find(c => String(c.id || '') === competitorId);
    if (!item) throw new Error('Competitor was not found.');
    item.checkedIn = payload.checkedIn === true;
    item.updatedAt = new Date().toISOString();
    entryManagerSaveRecord_(found);
    return {ok:true, checkedIn:item.checkedIn};
  } finally {
    lock.releaseLock();
  }
}

function entryManagerUpdateCompetitor_(payload) {
  if (!payload || payload.type !== 'speed_shear_manager_competitor_update') throw new Error('Unsupported competitor update.');
  return entryManagerUpsertCompetitor_({
    type:'speed_shear_manager_competitor_upsert',
    accessToken:payload.accessToken,
    competitor:{
      id:payload.competitorId,
      grade:payload.grade,
      name:payload.name,
      town:payload.town,
      phone:payload.phone || '',
      email:payload.email || '',
      source:payload.source || 'public-entry',
      checkedIn:payload.checkedIn === true
    }
  });
}

function entryManagerRemoveCompetitor_(payload) {
  if (!payload || payload.type !== 'speed_shear_manager_competitor_remove') throw new Error('Unsupported competitor removal.');
  const token = String(payload.accessToken || '').trim();
  const competitorId = String(payload.competitorId || '').trim();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const found = entryManagerReadByManagerToken_(token);
    const before = found.record.competitors.length;
    found.record.competitors = found.record.competitors.filter(c => String(c.id || '') !== competitorId);
    if (found.record.competitors.length === before) throw new Error('Competitor was not found.');
    entryManagerSaveRecord_(found);
    return {ok:true};
  } finally {
    lock.releaseLock();
  }
}

function entryManagerSaveSubmission_(payload) {
  if (!payload || payload.type !== 'speed_shear_roster_submission') throw new Error('Unsupported roster submission.');
  const token = String(payload.accessToken || '').trim();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const found = entryManagerReadByManagerToken_(token);
    const record = found.record;
    if (String(payload.bookingReference || '') !== record.bookingReference) throw new Error('Booking Reference does not match this competition.');
    const submittedAt = new Date().toISOString();
    const submission = {
      schemaVersion: 2,
      type: 'speed_shear_roster_submission',
      bookingReference: record.bookingReference,
      competition: record.competition,
      submission: {
        mode: payload.submission && payload.submission.mode || 'grade',
        submittedAt,
        version: record.submissions.length + 1
      },
      grades: payload.grades || {}
    };
    record.submissions.push({submittedAt, mode:submission.submission.mode, grades:Object.keys(submission.grades)});
    entryManagerSaveRecord_(found);

    const filename = entryManagerSubmissionFilename_(submission);
    const attachment = Utilities.newBlob(JSON.stringify(submission, null, 2), 'application/json', filename);
    entryManagerFolder_().createFile(attachment.copyBlob());
    MailApp.sendEmail({
      to: ENTRY_MANAGER_SETTINGS.receiverEmail,
      subject: entryManagerSubmissionSubject_(submission),
      body: 'Speed Shear entries submitted for ' + record.competition.name + '. Booking Reference: ' + record.bookingReference + '. The timing-system roster JSON is attached.',
      name: ENTRY_MANAGER_SETTINGS.senderName,
      attachments: [attachment]
    });
    return {ok:true, bookingReference:record.bookingReference, submittedAt, filename};
  } finally {
    lock.releaseLock();
  }
}

function entryManagerSubmissionFilename_(submission) {
  const names = Object.keys(submission.grades || {});
  const gradePart = submission.submission.mode === 'all' ? 'All_Entries' : (names[0] || 'Entries').replace(/[^A-Za-z0-9_-]+/g, '_');
  const competition = String(submission.competition && submission.competition.name || 'Competition').replace(/[^A-Za-z0-9_-]+/g, '_');
  return competition + '_' + submission.bookingReference + '_' + gradePart + '.json';
}

function entryManagerSubmissionSubject_(submission) {
  const names = Object.keys(submission.grades || {});
  const label = submission.submission.mode === 'all' ? 'All Entries' : ((names[0] || 'Entries') + ' Entries');
  return label + ' — ' + submission.bookingReference + ' — ' + String(submission.competition && submission.competition.name || 'Speed Shear');
}

function entryManagerClean_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function entryManagerJsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
