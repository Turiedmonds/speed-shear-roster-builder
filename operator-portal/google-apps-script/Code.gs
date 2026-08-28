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
  const folders = DriveApp.getFoldersByName(OPERATOR_PORTAL_SETTINGS.driveFolderName);
  if (!folders.hasNext()) {
    throw new Error('The Entry Manager competition folder could not be found in this Google Drive account.');
  }

  const folder = folders.next();
  const files = folder.getFiles();
  const competitions = [];

  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() !== MimeType.PLAIN_TEXT && !/\.json$/i.test(file.getName())) continue;

    try {
      const record = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
      if (!record || record.type !== OPERATOR_PORTAL_SETTINGS.expectedRecordType) continue;
      competitions.push(operatorPortalSummary_(record));
    } catch (err) {
      // Ignore unrelated or malformed files rather than breaking the whole portal.
    }
  }

  competitions.sort(operatorPortalSort_);

  return {
    generatedAt: new Date().toISOString(),
    count: competitions.length,
    competitions: competitions
  };
}

function operatorPortalSummary_(record) {
  const competition = record.competition || {};
  const organiser = record.organiser || {};
  const gradeSettings = record.gradeSettings || {};
  const competitors = Array.isArray(record.competitors) ? record.competitors : [];
  const grades = Array.isArray(record.grades) ? record.grades : Object.keys(gradeSettings);
  const entrySettings = record.entrySettings || {};

  const confirmed = competitors.filter(function (person) {
    return person && person.checkedIn === true;
  }).length;

  const gradeSummaries = grades.map(function (grade) {
    const settings = gradeSettings[grade] || {};
    const count = competitors.filter(function (person) {
      return person && person.grade === grade;
    }).length;

    return {
      name: grade,
      count: count,
      limit: operatorPortalNumberOrNull_(settings.limit),
      publicOpen: settings.publicOpen !== false,
      submitted: settings.submitted === true,
      submittedAt: settings.submittedAt || ''
    };
  });

  const submittedCount = gradeSummaries.filter(function (grade) { return grade.submitted; }).length;
  let rosterStatus = 'Not submitted';
  if (gradeSummaries.length && submittedCount === gradeSummaries.length) rosterStatus = 'Submitted';
  else if (submittedCount > 0) rosterStatus = 'Partly submitted';

  const effectiveCutoff = operatorPortalEffectiveCutoff_(competition.date, entrySettings.autoCloseAt);
  const publicOpen = operatorPortalPublicOpen_(entrySettings.publicEntriesOpen, effectiveCutoff);

  return {
    bookingReference: record.bookingReference || '',
    name: competition.name || 'Unnamed competition',
    date: competition.date || '',
    venue: competition.venue || '',
    organiser: {
      name: organiser.name || '',
      email: organiser.email || '',
      phone: organiser.phone || ''
    },
    totalEntries: competitors.length,
    confirmedEntries: confirmed,
    notConfirmedEntries: Math.max(0, competitors.length - confirmed),
    publicEntriesOpen: publicOpen,
    publicEntriesLabel: publicOpen ? 'Open' : 'Closed',
    effectiveCutoff: effectiveCutoff || '',
    lifecycle: operatorPortalLifecycle_(competition.date),
    rosterStatus: rosterStatus,
    grades: gradeSummaries,
    entryManagerUrl: operatorPortalShortUrl_('m.html?c=', record.managerToken),
    competitorEntryUrl: operatorPortalShortUrl_('e.html?c=', record.publicEntryToken),
    updatedAt: operatorPortalLatestTimestamp_(record)
  };
}

function operatorPortalShortUrl_(path, token) {
  if (!token) return '';
  const code = String(token).slice(0, OPERATOR_PORTAL_SETTINGS.shortCodeLength);
  return OPERATOR_PORTAL_SETTINGS.entryBaseUrl + path + encodeURIComponent(code);
}

function operatorPortalEffectiveCutoff_(competitionDate, customCutoff) {
  if (customCutoff) return customCutoff;
  if (!competitionDate) return '';

  const date = new Date(competitionDate + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + 1);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

function operatorPortalPublicOpen_(flag, cutoff) {
  if (flag === false) return false;
  if (!cutoff) return true;
  const cutoffDate = new Date(cutoff);
  if (isNaN(cutoffDate.getTime())) return true;
  return new Date().getTime() < cutoffDate.getTime();
}

function operatorPortalLifecycle_(dateText) {
  if (!dateText) return 'Unknown date';
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (dateText === today) return 'Today';
  return dateText > today ? 'Upcoming' : 'Past';
}

function operatorPortalLatestTimestamp_(record) {
  const timestamps = [record.createdAt];
  if (record.entrySettings && record.entrySettings.updatedAt) timestamps.push(record.entrySettings.updatedAt);
  (record.competitors || []).forEach(function (person) {
    if (person && person.updatedAt) timestamps.push(person.updatedAt);
    else if (person && person.createdAt) timestamps.push(person.createdAt);
  });
  return timestamps.filter(Boolean).sort().pop() || '';
}

function operatorPortalNumberOrNull_(value) {
  if (value === '' || value === null || typeof value === 'undefined') return null;
  const number = Number(value);
  return isFinite(number) && number >= 0 ? number : null;
}

function operatorPortalSort_(a, b) {
  const rank = { Today: 0, Upcoming: 1, Past: 2, 'Unknown date': 3 };
  const rankDiff = (rank[a.lifecycle] || 0) - (rank[b.lifecycle] || 0);
  if (rankDiff) return rankDiff;

  if (a.lifecycle === 'Past') return String(b.date).localeCompare(String(a.date));
  return String(a.date).localeCompare(String(b.date));
}
