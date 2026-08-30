const ENTRY_MANAGER_PDF_LOGO_URL =
  'https://turiedmonds.github.io/waimarino-shears-speed-shear-booking-pack/assets/Waimarino%20Shears%20Logo.png';


function entryManagerReorderGrades_(payload) {
  if (
    !payload ||
    payload.type !== 'speed_shear_manager_grade_reorder'
  ) {
    throw new Error('Unsupported grade reorder.');
  }

  const requested =
    Array.isArray(payload.grades)
      ? payload.grades
          .map(entryManagerClean_)
          .filter(Boolean)
      : [];

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    const found =
      entryManagerReadByManagerToken_(
        payload.accessToken || ''
      );

    const current =
      found.record.grades.slice();

    if (
      requested.length !== current.length
    ) {
      throw new Error(
        'Grade order does not contain every grade/event.'
      );
    }

    const expected =
      current
        .map(g => g.toLowerCase())
        .sort()
        .join('|');

    const actual =
      requested
        .map(g => g.toLowerCase())
        .sort()
        .join('|');

    if (expected !== actual) {
      throw new Error(
        'Grade order does not match this competition.'
      );
    }

    found.record.grades = requested;

    entryManagerSaveRecord_(found);

    return {
      ok: true,
      grades: found.record.grades
    };

  } finally {
    lock.releaseLock();
  }
}


function entryManagerSaveSubmissionV3_(payload) {
  if (
    !payload ||
    payload.type !== 'speed_shear_roster_submission'
  ) {
    throw new Error(
      'Unsupported roster submission.'
    );
  }

  const token =
    String(
      payload.accessToken || ''
    ).trim();

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    const found =
      entryManagerReadByManagerToken_(token);

    const record =
      found.record;

    if (
      String(payload.bookingReference || '') !==
      record.bookingReference
    ) {
      throw new Error(
        'Booking Reference does not match this competition.'
      );
    }

    const submittedAt =
      new Date().toISOString();

    const gradeNames =
      Object.keys(payload.grades || {});

    gradeNames.forEach(name => {
      if (
        record.grades.indexOf(name) < 0
      ) {
        throw new Error(
          'Submitted grade is not part of this competition: ' +
          name
        );
      }
    });

    const orderedGrades = {};

    record.grades.forEach(name => {
      if (
        Object.prototype.hasOwnProperty.call(
          payload.grades || {},
          name
        )
      ) {
        orderedGrades[name] =
          entryManagerTimingRosterRowsV3_(
            payload.grades[name]
          );
      }
    });

    const submission = {
      schemaVersion: 3,

      type:
        'speed_shear_roster_submission',

      bookingReference:
        record.bookingReference,

      competition:
        record.competition,

      submission: {
        mode:
          payload.submission &&
          payload.submission.mode ||
          'grade',

        submittedAt,

        version:
          record.submissions.length + 1,

        statusMeaning:
          'Confirmed means the organiser has accepted the competitor as checked/present and paid/cleared under their own entry process.'
      },

      grades:
        orderedGrades
    };

    record.submissions.push({
      submittedAt,
      mode:
        submission.submission.mode,
      grades:
        Object.keys(orderedGrades)
    });

    Object.keys(orderedGrades)
      .forEach(name => {
        const s =
          entryManagerGradeSettings_(
            record,
            name
          );

        record.gradeSettings[name] = {
          ...s,
          publicOpen: false,
          submitted: true,
          submittedAt
        };
      });

    entryManagerSaveRecord_(found);

    const baseName =
      entryManagerSubmissionBaseNameV3_(
        submission
      );

    const timingJsonPayload =
      entryManagerTimingJsonPayloadV3_(
        submission
      );

    const json =
      Utilities.newBlob(
        JSON.stringify(
          timingJsonPayload,
          null,
          2
        ),
        'application/json',
        entryManagerTimingJsonFilenameV3_(
          submission
        )
      );

    const pdf =
      entryManagerBuildRosterPdf_(
        submission,
        baseName + '.pdf'
      );

    const folder =
      entryManagerFolder_();

    folder.createFile(
      json.copyBlob()
    );

    folder.createFile(
      pdf.copyBlob()
    );

    MailApp.sendEmail({
      to:
        ENTRY_MANAGER_SETTINGS.receiverEmail,

      subject:
        entryManagerSubmissionSubject_(
          submission
        ),

      body:
        'Speed Shear confirmed entries submitted for ' +
        record.competition.name +
        '. Booking Reference: ' +
        record.bookingReference +
        '. The timing-system JSON and printable PDF backup roster are attached.',

      name:
        ENTRY_MANAGER_SETTINGS.senderName,

      attachments: [
        json,
        pdf
      ]
    });

    return {
      ok: true,

      bookingReference:
        record.bookingReference,

      submittedAt,

      jsonFilename:
        json.getName(),

      pdfFilename:
        pdf.getName(),

      allSubmitted:
        entryManagerAllSubmitted_(
          record
        ),

      gradeSettings:
        record.gradeSettings
    };

  } finally {
    lock.releaseLock();
  }
}


function entryManagerTimingRosterRowsV3_(rows) {
  return (
    Array.isArray(rows)
      ? rows
      : []
  )
    .map(item => ({
      name:
        entryManagerClean_(
          item && item.name
        ),
      town:
        entryManagerClean_(
          item && item.town
        )
    }))
    .filter(item => item.name);
}


function entryManagerTimingJsonPayloadV3_(
  submission
) {
  const names =
    Object.keys(
      submission.grades || {}
    );

  if (
    submission.submission &&
    submission.submission.mode === 'all'
  ) {
    const rosters = {};

    names.forEach(name => {
      rosters[name] =
        entryManagerTimingRosterRowsV3_(
          submission.grades[name]
        );
    });

    return {
      type: 'roster_pack',
      rosters
    };
  }

  const grade =
    names[0] || '';

  return grade
    ? entryManagerTimingRosterRowsV3_(
        submission.grades[grade]
      )
    : [];
}


function entryManagerTimingJsonFilenameV3_(
  submission
) {
  const names =
    Object.keys(
      submission.grades || {}
    );

  const competition =
    String(
      submission.competition &&
      submission.competition.name ||
      'Competition'
    )
      .replace(
        /[^A-Za-z0-9]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        ''
      ) || 'Competition';

  if (
    submission.submission &&
    submission.submission.mode === 'all'
  ) {
    return (
      competition +
      '_FullRoster.json'
    );
  }

  const grade =
    String(
      names[0] || 'Grade'
    )
      .replace(
        /[^A-Za-z0-9]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        ''
      ) || 'Grade';

  return (
    competition +
    '_' +
    grade +
    '_Roster.json'
  );
}


function entryManagerSubmissionBaseNameV3_(
  submission
) {
  const names =
    Object.keys(
      submission.grades || {}
    );

  const gradePart =
    submission.submission.mode === 'all'
      ? 'All_Entries'
      : (
          names[0] || 'Entries'
        ).replace(
          /[^A-Za-z0-9_-]+/g,
          '_'
        );

  const competition =
    String(
      submission.competition &&
      submission.competition.name ||
      'Competition'
    ).replace(
      /[^A-Za-z0-9_-]+/g,
      '_'
    );

  return (
    competition +
    '_' +
    submission.bookingReference +
    '_' +
    gradePart
  );
}


function entryManagerBuildRosterPdf_(
  submission,
  filename
) {
  const doc =
    DocumentApp.create(
      'TEMP_' +
      filename.replace(
        /\.pdf$/i,
        ''
      )
    );

  const body =
    doc.getBody();

  body
    .setMarginTop(28)
    .setMarginBottom(28)
    .setMarginLeft(32)
    .setMarginRight(32);

  const header =
    body.appendTable();

  header.setBorderWidth(0);

  const row =
    header.appendTableRow();

  const logoCell =
    row.appendTableCell('');

  const titleCell =
    row.appendTableCell('');

  try {
    const response =
      UrlFetchApp.fetch(
        ENTRY_MANAGER_PDF_LOGO_URL,
        {
          muteHttpExceptions: true
        }
      );

    if (
      response.getResponseCode() >= 200 &&
      response.getResponseCode() < 300
    ) {
      const image =
        logoCell.appendImage(
          response.getBlob()
        );

      image
        .setWidth(78)
        .setHeight(64);
    }

  } catch (error) {
    logoCell
      .appendParagraph('WS')
      .setBold(true)
      .setFontSize(24);
  }

  titleCell
    .appendParagraph(
      'WAIMARINO SHEARS INCORPORATED'
    )
    .setBold(true)
    .setForegroundColor('#EB1D27')
    .setFontSize(9)
    .setSpacingAfter(3);

  titleCell
    .appendParagraph(
      'Speed Shear Confirmed Entry Roster'
    )
    .setBold(true)
    .setFontSize(19)
    .setForegroundColor('#111111')
    .setSpacingAfter(3);

  titleCell
    .appendParagraph(
      String(
        submission.competition &&
        submission.competition.name ||
        ''
      )
    )
    .setBold(true)
    .setFontSize(12)
    .setForegroundColor('#555555');

  body.appendHorizontalRule();

  const details =
    body.appendTable();

  details
    .setBorderWidth(1)
    .setBorderColor('#dddddd');

  const competition =
    submission.competition || {};

  entryManagerPdfDetailRow_(
    details,
    'Competition',
    competition.name || '—',
    'Date',
    entryManagerPdfDate_(
      competition.date
    )
  );

  entryManagerPdfDetailRow_(
    details,
    'Venue',
    competition.venue || '—',
    'Submitted',
    entryManagerPdfDateTime_(
      submission.submission &&
      submission.submission.submittedAt
    )
  );

  body
    .appendParagraph('')
    .setSpacingAfter(2);

  Object.keys(
    submission.grades || {}
  ).forEach(
    (grade, gradeIndex) => {

      const competitors =
        entryManagerTimingRosterRowsV3_(
          submission.grades[grade]
        );

      const heading =
        body.appendParagraph(
          grade +
          ' — ' +
          competitors.length +
          ' Confirmed'
        );

      heading
        .setBold(true)
        .setFontSize(14)
        .setForegroundColor('#111111')
        .setSpacingBefore(
          gradeIndex ? 12 : 5
        )
        .setSpacingAfter(5);

      const table =
        body.appendTable();

      table
        .setBorderWidth(1)
        .setBorderColor('#d9d9d9');

      const headerRow =
        table.appendTableRow();

      [
        '#',
        'Competitor',
        'Hometown'
      ].forEach(label => {
        const cell =
          headerRow.appendTableCell(
            label
          );

        cell.setBackgroundColor(
          '#111111'
        );

        cell
          .editAsText()
          .setBold(true)
          .setForegroundColor(
            '#ffffff'
          );
      });

      if (!competitors.length) {
        const empty =
          table.appendTableRow();

        entryManagerPdfRosterCell_(
          empty,
          '—'
        );

        entryManagerPdfRosterCell_(
          empty,
          'No confirmed competitors submitted.'
        );

        entryManagerPdfRosterCell_(
          empty,
          ''
        );

      } else {

        competitors.forEach(
          (competitor, index) => {

            const r =
              table.appendTableRow();

            entryManagerPdfRosterCell_(
              r,
              String(index + 1)
            );

            entryManagerPdfRosterCell_(
              r,
              competitor.name
            );

            entryManagerPdfRosterCell_(
              r,
              competitor.town
            );
          }
        );
      }
    }
  );

  doc.saveAndClose();

  Utilities.sleep(300);

  const file =
    DriveApp.getFileById(
      doc.getId()
    );

  const pdf =
    file
      .getAs(MimeType.PDF)
      .setName(filename);

  file.setTrashed(true);

  return pdf;
}


function entryManagerPdfRosterCell_(
  row,
  value
) {
  const cell =
    row.appendTableCell(
      String(
        value == null
          ? ''
          : value
      )
    );

  cell.setBackgroundColor(
    '#ffffff'
  );

  cell
    .editAsText()
    .setBold(false)
    .setForegroundColor(
      '#111111'
    );

  return cell;
}


function entryManagerPdfDetailRow_(
  table,
  label1,
  value1,
  label2,
  value2
) {
  const row =
    table.appendTableRow();

  const values = [
    label1,
    value1,
    label2,
    value2
  ];

  values.forEach(
    (value, index) => {

      const cell =
        row.appendTableCell(
          String(
            value == null
              ? ''
              : value
          )
        );

      if (index % 2 === 0) {
        cell.setBackgroundColor(
          '#f2f2f2'
        );

        cell
          .editAsText()
          .setBold(true)
          .setForegroundColor(
            '#111111'
          );

      } else {

        cell.setBackgroundColor(
          '#ffffff'
        );

        cell
          .editAsText()
          .setForegroundColor(
            '#111111'
          );
      }
    }
  );
}


function entryManagerPdfDate_(value) {
  const m =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      String(value || '')
    );

  if (!m) {
    return String(
      value || '—'
    );
  }

  return (
    m[3] +
    '/' +
    m[2] +
    '/' +
    m[1]
  );
}


function entryManagerPdfDateTime_(value) {
  const d =
    new Date(value || '');

  if (isNaN(d.getTime())) {
    return String(
      value || '—'
    );
  }

  return Utilities.formatDate(
    d,
    'Pacific/Auckland',
    'dd/MM/yyyy h:mm a'
  );
}