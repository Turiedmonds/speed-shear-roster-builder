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
    competitors: [],
    submissions: []
  };

  const folder = entryManagerFolder_();
  const blob = Utilities.newBlob(JSON.stringify(record, null, 2), 'application/json', reference + '_EntryManager.json');
  const file = folder.createFile(blob);
  const props = PropertiesService.getScriptProperties();
  props.setProperty('entryManagerToken_' + managerToken, file.getId());
  props.setProperty('entryPublicToken_' + publicEntryToken, file.getId());
  props.setProperty('entryManagerReference_' + reference, file.getId());

  return {
    bookingReference: reference,
    managerToken,
    publicEntryToken,
    entryManagerUrl: entryManagerUrl_(managerToken),
    competitorEntryUrl: entryManagerCompetitorUrl_(publicEntryToken),
    fileId: file.getId()
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
  return {record, file};
}

function entryManagerPublicSetup_(token) {
  const found = entryManagerReadByManagerToken_(token);
  const record = found.record;
  return {
    ok: true,
    bookingReference: record.bookingReference,
    accessToken: record.managerToken,
    competition: record.competition,
    grades: record.grades,
    competitionSetup: record.competitionSetup,
    competitorEntryUrl: entryManagerCompetitorUrl_(record.publicEntryToken),
    competitors: (record.competitors || []).map(entry => ({
      id: entry.id,
      grade: entry.grade,
      name: entry.name,
      town: entry.town || '',
      phone: entry.phone || '',
      email: entry.email || '',
      source: entry.source || 'public-entry',
      checkedIn: entry.checkedIn === true,
      createdAt: entry.createdAt || ''
    }))
  };
}

function entryManagerCompetitorSetup_(token) {
  const record = entryManagerReadByPublicToken_(token).record;
  return {
    ok: true,
    competition: record.competition,
    grades: record.grades,
    privacyContact: ENTRY_MANAGER_SETTINGS.receiverEmail
  };
}

function entryManagerSaveCompetitorEntry_(payload) {
  if (!payload || payload.type !== 'speed_shear_competitor_entry') throw new Error('Unsupported competitor entry.');
  const token = String(payload.entryToken || '').trim();
  const found = entryManagerReadByPublicToken_(token);
  const record = found.record;
  const grade = String(payload.grade || '').trim();
  const name = entryManagerClean_(payload.name);
  const town = entryManagerClean_(payload.town);
  const phone = entryManagerClean_(payload.phone);
  const email = entryManagerClean_(payload.email).toLowerCase();

  if (!name) throw new Error('Competitor name is required.');
  if (!grade || (record.grades || []).indexOf(grade) < 0) throw new Error('Please choose a valid grade or event.');
  if (!phone && !email) throw new Error('Please provide a phone number or email address.');
  if (payload.privacyAccepted !== true) throw new Error('Privacy acknowledgement is required.');

  record.competitors = Array.isArray(record.competitors) ? record.competitors : [];
  const duplicate = record.competitors.some(item =>
    String(item.grade || '').toLowerCase() === grade.toLowerCase() &&
    entryManagerClean_(item.name).toLowerCase() === name.toLowerCase() &&
    entryManagerClean_(item.town).toLowerCase() === town.toLowerCase()
  );
  if (duplicate) throw new Error('This competitor is already entered in that grade.');

  const entry = {
    id: Utilities.getUuid(),
    grade,
    name,
    town,
    phone,
    email,
    source: 'public-entry',
    checkedIn: false,
    createdAt: new Date().toISOString()
  };
  record.competitors.push(entry);
  found.file.setContent(JSON.stringify(record, null, 2));

  return {
    ok: true,
    competitionName: record.competition && record.competition.name || '',
    grade,
    competitorName: name
  };
}

function entryManagerSaveSubmission_(payload) {
  if (!payload || payload.type !== 'speed_shear_roster_submission') throw new Error('Unsupported roster submission.');
  const token = String(payload.accessToken || '').trim();
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
      version: (record.submissions || []).length + 1
    },
    grades: payload.grades || {}
  };

  record.submissions = Array.isArray(record.submissions) ? record.submissions : [];
  record.submissions.push({submittedAt, mode: submission.submission.mode, grades: Object.keys(submission.grades)});
  found.file.setContent(JSON.stringify(record, null, 2));

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

function entryManagerClean_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function entryManagerJsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/*
Deployment integration (done later, after frontend review):
- Booking receiver calls entryManagerCreateCompetition_(pack) immediately after assignBookingReference_(pack).
- Internal Waimarino booking email receives entryManagerUrl and competitorEntryUrl.
- Organiser confirmation email does not receive either link automatically.
- Manager GET: ?action=entry-manager&access=TOKEN -> entryManagerPublicSetup_(TOKEN).
- Public competitor GET: ?action=competitor-entry&entry=TOKEN -> entryManagerCompetitorSetup_(TOKEN).
- Public competitor POST calls entryManagerSaveCompetitorEntry_(payload).
- Roster submission POST calls entryManagerSaveSubmission_(payload).
*/
