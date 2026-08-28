const ENTRY_MANAGER_COMPETITOR_PRIVACY_VERSION = '28 August 2026';

function entryManagerCompetitorSetupV4_(token) {
  const record = entryManagerReadByPublicToken_(token).record;
  const gradeOptions = record.grades.map(g => entryManagerGradeSummary_(record, g));

  return {
    ok: true,
    competition: record.competition,
    organiser: {
      name: String(record.organiser && record.organiser.name || ''),
      email: String(record.organiser && record.organiser.email || ''),
      phone: String(record.organiser && record.organiser.phone || '')
    },
    entriesOpen: entryManagerEffectivePublicOpen_(record),
    autoCloseAt: String(record.entrySettings.autoCloseAt || ''),
    effectiveCutoffAt: entryManagerEffectiveCutoff_(record),
    grades: gradeOptions,
    privacyContact: ENTRY_MANAGER_SETTINGS.receiverEmail,
    privacyVersion: ENTRY_MANAGER_COMPETITOR_PRIVACY_VERSION
  };
}

function entryManagerSaveCompetitorEntryV4_(payload) {
  if (!payload || payload.type !== 'speed_shear_competitor_entry') {
    throw new Error('Unsupported competitor entry.');
  }

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

  let recordForReceipt = null;
  let savedEntry = null;

  try {
    const found = entryManagerReadByPublicToken_(token);
    const record = found.record;

    if (!entryManagerEffectivePublicOpen_(record)) {
      throw new Error('Public entries are closed for this competition.');
    }

    if (!grade || record.grades.indexOf(grade) < 0) {
      throw new Error('Please choose a valid grade or event.');
    }

    const summary = entryManagerGradeSummary_(record, grade);
    if (summary.submitted) throw new Error(grade + ' entries have already been submitted and are closed.');
    if (!summary.publicOpen) throw new Error(grade + ' public entries are closed.');
    if (summary.full) throw new Error(grade + ' is full. The entry limit has been reached.');

    const duplicate = record.competitors.find(item =>
      String(item.grade || '').toLowerCase() === grade.toLowerCase() &&
      entryManagerClean_(item.name).toLowerCase() === name.toLowerCase() &&
      entryManagerClean_(item.town).toLowerCase() === town.toLowerCase()
    );

    if (duplicate) {
      return {
        ok: true,
        duplicate: true,
        competitionName: record.competition && record.competition.name || '',
        grade,
        competitorName: name,
        entryReference: String(duplicate.entryReference || ''),
        confirmationEmailSent: false,
        organiserNotificationSent: false
      };
    }

    const entryReference = entryManagerNextPublicEntryReferenceV4_(record);
    const now = new Date().toISOString();

    savedEntry = {
      id: Utilities.getUuid(),
      entryReference,
      grade,
      name,
      town,
      phone,
      email,
      source: 'public-entry',
      checkedIn: false,
      privacyAccepted: true,
      privacyVersion: String(payload.privacyVersion || ENTRY_MANAGER_COMPETITOR_PRIVACY_VERSION),
      privacyAcceptedAt: now,
      createdAt: now
    };

    record.competitors.push(savedEntry);
    entryManagerSaveRecord_(found);
    recordForReceipt = JSON.parse(JSON.stringify(record));

  } finally {
    lock.releaseLock();
  }

  let confirmationEmailSent = false;
  if (savedEntry && savedEntry.email) {
    confirmationEmailSent = entryManagerSendCompetitorReceiptV4_(recordForReceipt, savedEntry);
  }

  const organiserNotificationSent = savedEntry
    ? entryManagerSendNewEntryNotificationV4_(recordForReceipt, savedEntry)
    : false;

  return {
    ok: true,
    duplicate: false,
    competitionName: recordForReceipt && recordForReceipt.competition && recordForReceipt.competition.name || '',
    grade,
    competitorName: name,
    entryReference: savedEntry && savedEntry.entryReference || '',
    confirmationEmailSent,
    organiserNotificationSent,
    gradeStatus: entryManagerGradeSummary_(recordForReceipt, grade)
  };
}

function entryManagerNextPublicEntryReferenceV4_(record) {
  let highest = Number(record.nextPublicEntryNumber || 0);

  (record.competitors || []).forEach(item => {
    const match = /-E(\d+)$/i.exec(String(item.entryReference || ''));
    if (match) highest = Math.max(highest, Number(match[1]) || 0);
  });

  const next = highest + 1;
  record.nextPublicEntryNumber = next;
  const bookingReference = String(record.bookingReference || 'ENTRY').replace(/\s+/g, '-');
  return bookingReference + '-E' + String(next).padStart(3, '0');
}

function entryManagerSendNewEntryNotificationV4_(record, entry) {
  if (!record || !entry) return false;

  const competition = record.competition || {};
  const organiser = record.organiser || {};
  const competitionName = String(competition.name || 'Speed Shear Competition');
  const organiserName = String(organiser.name || 'Competition organiser');
  const organiserEmail = String(organiser.email || '').trim();
  const backupEmail = String(ENTRY_MANAGER_SETTINGS.receiverEmail || '').trim();
  const to = organiserEmail || backupEmail;

  if (!to) return false;

  const managerUrl = entryManagerUrl_(record.managerToken || '');
  const totalEntries = Array.isArray(record.competitors) ? record.competitors.length : 0;
  const gradeEntries = (record.competitors || []).filter(item =>
    entryManagerClean_(item.grade).toLowerCase() === entryManagerClean_(entry.grade).toLowerCase()
  ).length;

  const subject = 'New competitor entry — ' + competitionName + ' — ' + entry.grade + ' — ' + entry.name;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#171717;max-width:700px;margin:0 auto">
      <div style="border-top:7px solid #EB1D27;padding:22px 0 8px">
        <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#EB1D27">New Competitor Entry</div>
        <h2 style="margin:7px 0 4px;font-size:24px">${entryManagerHtmlEscapeV4_(competitionName)}</h2>
        <div style="color:#666">${entryManagerHtmlEscapeV4_(entryManagerReceiptDateV4_(competition.date))}${competition.venue ? ' · ' + entryManagerHtmlEscapeV4_(competition.venue) : ''}</div>
      </div>

      <p style="line-height:1.5">A new online competitor entry has been received. The competition organiser is responsible for managing this entry.</p>

      <table style="border-collapse:collapse;width:100%;margin:12px 0 18px">
        ${entryManagerEmailRowV4_('Competitor', entry.name)}
        ${entryManagerEmailRowV4_('Hometown', entry.town || '—')}
        ${entryManagerEmailRowV4_('Grade / event', entry.grade)}
        ${entryManagerEmailRowV4_('Phone', entry.phone || '—')}
        ${entryManagerEmailRowV4_('Email', entry.email || '—')}
        ${entryManagerEmailRowV4_('Entry reference', entry.entryReference || '—')}
        ${entryManagerEmailRowV4_('Entries in this grade', String(gradeEntries))}
        ${entryManagerEmailRowV4_('Total entries', String(totalEntries))}
      </table>

      <div style="margin:22px 0">
        <a href="${entryManagerHtmlEscapeV4_(managerUrl)}" style="display:inline-block;background:#EB1D27;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px">Open Entry Manager</a>
      </div>

      <div style="background:#f5f5f5;border-left:5px solid #666;padding:13px 15px;margin:18px 0;line-height:1.5">
        <strong>Competition administration</strong><br>
        Entry changes, cancellations, payments, check-in and competitor enquiries are handled by the competition organiser. Waimarino Shears provides and operates the entry/timing system and receives this message as a backup where applicable.
      </div>

      <div style="border-top:1px solid #ddd;margin-top:24px;padding-top:14px;font-size:12px;line-height:1.5;color:#777">
        Competition contact: ${entryManagerHtmlEscapeV4_(organiserName)}${organiserEmail ? ' · ' + entryManagerHtmlEscapeV4_(organiserEmail) : ''}
      </div>
    </div>`;

  const body = [
    'New competitor entry — ' + competitionName,
    '',
    'Competitor: ' + entry.name,
    'Hometown: ' + (entry.town || '—'),
    'Grade / event: ' + entry.grade,
    'Phone: ' + (entry.phone || '—'),
    'Email: ' + (entry.email || '—'),
    'Entry reference: ' + (entry.entryReference || '—'),
    'Entries in this grade: ' + gradeEntries,
    'Total entries: ' + totalEntries,
    '',
    'Open Entry Manager: ' + managerUrl,
    '',
    'The competition organiser manages entry changes, cancellations, payments, check-in and competitor enquiries. Waimarino Shears provides and operates the system.'
  ].join('\n');

  try {
    const message = {
      to,
      subject,
      body,
      htmlBody: html,
      name: 'Waimarino Shears Entry System',
      replyTo: organiserEmail || backupEmail
    };

    if (
      organiserEmail &&
      backupEmail &&
      organiserEmail.toLowerCase() !== backupEmail.toLowerCase()
    ) {
      message.bcc = backupEmail;
    }

    MailApp.sendEmail(message);
    return true;
  } catch (error) {
    console.error('New competitor entry notification email failed:', error);
    return false;
  }
}

function entryManagerSendCompetitorReceiptV4_(record, entry) {
  if (!entry || !entry.email) return false;

  const competition = record && record.competition || {};
  const organiser = record && record.organiser || {};
  const competitionName = String(competition.name || 'Speed Shear Competition');
  const organiserName = String(organiser.name || 'Competition organiser');
  const organiserEmail = String(organiser.email || '');
  const organiserPhone = String(organiser.phone || '');
  const replyTo = organiserEmail || ENTRY_MANAGER_SETTINGS.receiverEmail;

  const subject = 'Entry received — ' + competitionName + ' — ' + entry.grade;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#171717;max-width:680px;margin:0 auto">
      <div style="border-top:7px solid #EB1D27;padding:22px 0 8px">
        <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#EB1D27">Speed Shear Competitor Entry</div>
        <h2 style="margin:7px 0 4px;font-size:24px">${entryManagerHtmlEscapeV4_(competitionName)}</h2>
        <div style="color:#666">${entryManagerHtmlEscapeV4_(entryManagerReceiptDateV4_(competition.date))}${competition.venue ? ' · ' + entryManagerHtmlEscapeV4_(competition.venue) : ''}</div>
      </div>

      <div style="background:#effaf2;border:1px solid #9bcfa7;border-left:5px solid #169447;padding:14px 16px;margin:18px 0">
        <strong>Your entry has been received.</strong>
      </div>

      <table style="border-collapse:collapse;width:100%;margin:10px 0 18px">
        ${entryManagerEmailRowV4_('Competitor', entry.name)}
        ${entryManagerEmailRowV4_('Hometown', entry.town || '—')}
        ${entryManagerEmailRowV4_('Grade / event', entry.grade)}
        ${entryManagerEmailRowV4_('Entry reference', entry.entryReference)}
      </table>

      <div style="border-left:5px solid #EB1D27;background:#fff5f5;padding:14px 16px;margin:18px 0">
        <strong>On the day</strong>
        <p style="margin:7px 0 0;line-height:1.5">You must check in with the competition entry staff. If your entry fee has not already been paid or cleared, you will need to pay it at check-in unless the organiser has told you otherwise.</p>
        <p style="margin:8px 0 0;line-height:1.5"><strong>Your name will only be included in the draw for your grade or event once entry staff have recorded you as checked in and paid/cleared.</strong></p>
      </div>

      <h3 style="margin:22px 0 8px">Competition organiser</h3>
      <table style="border-collapse:collapse;width:100%;margin-bottom:18px">
        ${entryManagerEmailRowV4_('Contact', organiserName)}
        ${entryManagerEmailRowV4_('Phone', organiserPhone || '—')}
        ${entryManagerEmailRowV4_('Email', organiserEmail || '—')}
      </table>

      <div style="background:#f5f5f5;border-left:5px solid #666;padding:13px 15px;margin:18px 0;line-height:1.5">
        <strong>Need to change or cancel your entry?</strong><br>
        Contact the competition organiser above. The organiser also handles entry fees, check-in and other competition questions.
      </div>

      <div style="border-top:1px solid #ddd;margin-top:24px;padding-top:14px;font-size:12px;line-height:1.5;color:#777">
        This email was sent automatically by the Waimarino Shears online entry system used by ${entryManagerHtmlEscapeV4_(competitionName)}. Waimarino Shears provides and operates the entry and timing system; the competition organiser manages entries, changes and cancellations, entry fees, check-in, draws and competition administration.
      </div>
    </div>`;

  const body = [
    'Your entry has been received for ' + competitionName + '.',
    '',
    'Competitor: ' + entry.name,
    'Hometown: ' + (entry.town || '—'),
    'Grade / event: ' + entry.grade,
    'Entry reference: ' + entry.entryReference,
    '',
    'On the day: check in with the competition entry staff. If your entry fee has not already been paid or cleared, pay it at check-in unless the organiser has told you otherwise.',
    'Your name will only be included in the draw once entry staff have recorded you as checked in and paid/cleared.',
    '',
    'Competition organiser: ' + organiserName,
    'Phone: ' + (organiserPhone || '—'),
    'Email: ' + (organiserEmail || '—'),
    '',
    'For entry changes, cancellations, payment, check-in or competition questions, contact the competition organiser above.',
    '',
    'This message was sent automatically by the Waimarino Shears online entry system. Waimarino Shears provides and operates the system; the competition organiser manages the competition and its entries.'
  ].join('\n');

  try {
    MailApp.sendEmail({
      to: entry.email,
      subject,
      body,
      htmlBody: html,
      name: 'Waimarino Shears Entry System',
      replyTo
    });
    return true;
  } catch (error) {
    console.error('Competitor entry receipt email failed:', error);
    return false;
  }
}

function entryManagerEmailRowV4_(label, value) {
  return '<tr>' +
    '<td style="padding:8px 10px;border-bottom:1px solid #ddd;background:#f4f4f4;font-weight:bold;width:34%">' + entryManagerHtmlEscapeV4_(label) + '</td>' +
    '<td style="padding:8px 10px;border-bottom:1px solid #ddd">' + entryManagerHtmlEscapeV4_(value) + '</td>' +
    '</tr>';
}

function entryManagerReceiptDateV4_(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return String(value || '');
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
  return Utilities.formatDate(d, 'Pacific/Auckland', 'd MMMM yyyy');
}

function entryManagerHtmlEscapeV4_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
