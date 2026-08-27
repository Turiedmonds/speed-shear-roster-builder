const ENTRY_MANAGER_SETTINGS = {
  receiverEmail: 'Waimarinoshears@gmail.com',
  senderName: 'Waimarino Shears Entry Manager',
  driveFolderName: 'Waimarino Speed Shear Entry Manager',
  publicBaseUrl: 'https://turiedmonds.github.io/speed-shear-roster-builder/',
  schemaVersion: 2
};

function entryManagerCreateCompetition_(pack) {
  if (!pack || !pack.identity || !pack.identity.bookingReference) throw new Error('Booking Reference is required.');
  const reference = String(pack.identity.bookingReference).trim();
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const setup = pack.competitionSetup || {};
  const record = {
    schemaVersion: ENTRY_MANAGER_SETTINGS.schemaVersion,
    type: 'speed_shear_entry_manager_competition',
    bookingReference: reference,
    accessToken: token,
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
    submissions: []
  };

  const folder = entryManagerFolder_();
  const blob = Utilities.newBlob(JSON.stringify(record, null, 2), 'application/json', reference + '_EntryManager.json');
  const file = folder.createFile(blob);
  const props = PropertiesService.getScriptProperties();
  props.setProperty('entryManagerToken_' + token, file.getId());
  props.setProperty('entryManagerReference_' + reference, file.getId());

  return {
    bookingReference: reference,
    accessToken: token,
    entryManagerUrl: entryManagerUrl_(token),
    fileId: file.getId()
  };
}

function entryManagerFolder_() {
  const folders = DriveApp.getFoldersByName(ENTRY_MANAGER_SETTINGS.driveFolderName);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(ENTRY_MANAGER_SETTINGS.driveFolderName);
}

function entryManagerUrl_(token) {
  return ENTRY_MANAGER_SETTINGS.publicBaseUrl + '?access=' + encodeURIComponent(token);
}

function entryManagerReadByToken_(token) {
  const clean = String(token || '').trim();
  if (!clean) throw new Error('Access token is missing.');
  const id = PropertiesService.getScriptProperties().getProperty('entryManagerToken_' + clean);
  if (!id) throw new Error('Competition link was not found.');
  const record = JSON.parse(DriveApp.getFileById(id).getBlob().getDataAsString());
  if (record.accessToken !== clean) throw new Error('Competition link is invalid.');
  return record;
}

function entryManagerPublicSetup_(token) {
  const record = entryManagerReadByToken_(token);
  return {
    ok: true,
    bookingReference: record.bookingReference,
    competition: record.competition,
    grades: record.grades,
    competitionSetup: record.competitionSetup
  };
}

function entryManagerSaveSubmission_(payload) {
  if (!payload || payload.type !== 'speed_shear_roster_submission') throw new Error('Unsupported roster submission.');
  const token = String(payload.accessToken || '').trim();
  const record = entryManagerReadByToken_(token);
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
      version: (record.submissions || []).length + 1
    },
    grades: payload.grades || {}
  };

  record.submissions = Array.isArray(record.submissions) ? record.submissions : [];
  record.submissions.push({submittedAt, mode: submission.submission.mode, grades: Object.keys(submission.grades)});

  const props = PropertiesService.getScriptProperties();
  const recordId = props.getProperty('entryManagerReference_' + record.bookingReference);
  if (recordId) DriveApp.getFileById(recordId).setContent(JSON.stringify(record, null, 2));

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

function entryManagerJsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/*
Deployment integration (done later, after frontend review):
- Booking receiver calls entryManagerCreateCompetition_(pack) immediately after assignBookingReference_(pack).
- The returned entryManagerUrl is added only to the INTERNAL Waimarino Shears booking email.
- The organiser confirmation email does not contain the Entry Manager link.
- Web-app GET with ?action=entry-manager&access=TOKEN returns entryManagerPublicSetup_(TOKEN).
- Web-app POST with action roster submission calls entryManagerSaveSubmission_(payload).
*/
