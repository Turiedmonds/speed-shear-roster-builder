(() => {
  const CONFIG_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwOkoKs3Is6bSumWYe71zH2mOEZ4h0YhY-PO2JPiea2WClMs6kIMjzYtEZmqg3MlgQC-w/exec';
  const SUBMISSION_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwOkoKs3Is6bSumWYe71zH2mOEZ4h0YhY-PO2JPiea2WClMs6kIMjzYtEZmqg3MlgQC-w/exec';
  const PRIVACY_VERSION = '28 August 2026';
  const params = new URLSearchParams(location.search);
  const entryToken = params.get('entry') || '';
  let latestSetup = null;

  const els = {
    competitionName: document.getElementById('competitionName'),
    competitionDate: document.getElementById('competitionDate'),
    competitionVenue: document.getElementById('competitionVenue'),
    loadingBox: document.getElementById('loadingBox'),
    errorBox: document.getElementById('errorBox'),
    form: document.getElementById('entryForm'),
    name: document.getElementById('name'),
    town: document.getElementById('town'),
    grade: document.getElementById('grade'),
    gradeAvailability: document.getElementById('gradeAvailability'),
    phone: document.getElementById('phone'),
    email: document.getElementById('email'),
    privacyAccepted: document.getElementById('privacyAccepted'),
    privacyEmail: document.getElementById('privacyEmail'),
    privacyDetailsBtn: document.getElementById('privacyDetailsBtn'),
    privacyDialog: document.getElementById('privacyDialog'),
    privacyCloseTop: document.getElementById('privacyCloseTop'),
    privacyCloseBottom: document.getElementById('privacyCloseBottom'),
    organiserName: document.getElementById('organiserName'),
    organiserPhone: document.getElementById('organiserPhone'),
    organiserEmail: document.getElementById('organiserEmail'),
    submitBtn: document.getElementById('submitBtn'),
    statusBox: document.getElementById('statusBox')
  };

  function humanDate(value) {
    if (!value) return '';
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('en-NZ', { dateStyle: 'long' }).format(d);
  }

  function humanDateTime(value) {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-NZ', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  }

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function setError(message) {
    els.loadingBox.classList.add('hidden');
    els.form.classList.add('hidden');
    els.errorBox.textContent = message;
    els.errorBox.classList.remove('hidden');
  }

  function setStatus(message, type) {
    els.statusBox.className = `status ${type || ''}`;
    els.statusBox.textContent = message;
    els.statusBox.classList.remove('hidden');
  }

  function gradeLine(g) {
    let text = '';
    let cls = 'open';
    if (g.submitted) {
      text = 'Submitted — entries closed';
      cls = 'closed';
    } else if (g.full) {
      text = `${g.count} of ${g.entryLimit} — Full`;
      cls = 'full';
    } else if (!g.publicOpen || !g.selectable) {
      text = g.entryLimit ? `${g.count} of ${g.entryLimit} — Public entries closed` : `${g.count} entered — Public entries closed`;
      cls = 'closed';
    } else if (g.entryLimit) {
      text = `${g.count} of ${g.entryLimit} — ${g.remaining} place${g.remaining === 1 ? '' : 's'} left`;
    } else {
      text = `${g.count} entered — No entry limit`;
    }
    return `<div class="grade-line ${cls}"><strong>${esc(g.name)}</strong> — ${esc(text)}</div>`;
  }

  function applyOrganiser(setup) {
    const organiser = setup.organiser || {};
    els.organiserName.textContent = organiser.name || 'Competition organiser';
    els.organiserPhone.textContent = organiser.phone || '—';
    if (organiser.email) {
      els.organiserEmail.textContent = organiser.email;
      els.organiserEmail.href = `mailto:${organiser.email}`;
    } else {
      els.organiserEmail.textContent = '—';
      els.organiserEmail.removeAttribute('href');
    }
  }

  function applySetup(setup) {
    latestSetup = setup;
    els.competitionName.textContent = setup.competition?.name || 'Competition entry';
    els.competitionDate.textContent = humanDate(setup.competition?.date || '');
    els.competitionVenue.textContent = setup.competition?.venue || '';
    if (setup.privacyContact) {
      els.privacyEmail.textContent = setup.privacyContact;
      els.privacyEmail.href = `mailto:${setup.privacyContact}`;
    }
    applyOrganiser(setup);
    els.loadingBox.classList.add('hidden');

    if (setup.entriesOpen === false) {
      const cutoff = humanDateTime(setup.effectiveCutoffAt || setup.autoCloseAt || '');
      setError(cutoff
        ? `Public entries for this competition are closed. The final online entry cutoff is ${cutoff}. Please contact the competition organiser if you need to enter.`
        : 'Public entries for this competition are closed. Please contact the competition organiser if you need to enter.');
      return;
    }

    const grades = Array.isArray(setup.grades) ? setup.grades : [];
    els.errorBox.classList.add('hidden');
    els.gradeAvailability.innerHTML = grades.map(gradeLine).join('');
    const openGrades = grades.filter(g => g.selectable === true);
    els.grade.innerHTML = '<option value="">Select grade / event</option>' + openGrades.map(g => `<option value="${esc(g.name)}">${esc(g.name)}${g.entryLimit ? ` — ${g.count}/${g.entryLimit}` : ''}</option>`).join('');

    if (!openGrades.length) {
      setError('There are no grades or events currently open for public entry. Please contact the competition organiser.');
      return;
    }

    els.form.classList.remove('hidden');
  }

  async function requestSetup() {
    if (!entryToken) throw new Error('missing link');
    const response = await fetch(`${CONFIG_ENDPOINT}?action=competitor-entry&entry=${encodeURIComponent(entryToken)}`, { cache: 'no-store' });
    const setup = await response.json();
    if (!setup.ok) throw new Error(setup.error || 'Competition could not be loaded.');
    return setup;
  }

  async function requestResult(requestId) {
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 250));
      const response = await fetch(`${CONFIG_ENDPOINT}?action=competitor-entry-result&entry=${encodeURIComponent(entryToken)}&requestId=${encodeURIComponent(requestId)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!result.pending) return result;
    }
    return { ok: false, error: 'The entry was sent but confirmation could not be received. Please contact the competition organiser before submitting again.' };
  }

  async function loadSetup() {
    if (!entryToken) return setError('This competitor entry link is incomplete. Please ask the competition organiser for the correct link.');
    if (!CONFIG_ENDPOINT) {
      els.loadingBox.textContent = 'Public competitor entry form is built and ready for backend deployment.';
      return;
    }
    try {
      applySetup(await requestSetup());
    } catch (_) {
      setError('This competition entry form could not be loaded. Please contact the competition organiser.');
    }
  }

  function openPrivacy() {
    if (typeof els.privacyDialog?.showModal === 'function') els.privacyDialog.showModal();
  }

  function closePrivacy() {
    if (els.privacyDialog?.open) els.privacyDialog.close();
  }

  els.privacyDetailsBtn?.addEventListener('click', openPrivacy);
  els.privacyCloseTop?.addEventListener('click', closePrivacy);
  els.privacyCloseBottom?.addEventListener('click', closePrivacy);

  els.form.addEventListener('submit', async event => {
    event.preventDefault();
    els.statusBox.classList.add('hidden');

    const name = els.name.value.trim();
    const town = els.town.value.trim();
    const grade = els.grade.value;
    const phone = els.phone.value.trim();
    const email = els.email.value.trim();

    if (!name) return setStatus('Please enter your name.', 'error');
    if (!grade) return setStatus('Please choose your grade or event.', 'error');
    if (!phone && !email) return setStatus('Please provide a mobile number or email address.', 'error');
    if (!els.privacyAccepted.checked) return setStatus('Please read and agree to the Privacy Notice & Entry Information before submitting.', 'error');
    if (!SUBMISSION_ENDPOINT) return setStatus('The entry form is ready, but the live submission connection has not been deployed yet.', 'error');

    els.submitBtn.disabled = true;
    els.submitBtn.textContent = 'Checking entries…';

    try {
      latestSetup = await requestSetup();
      if (latestSetup.entriesOpen === false) {
        applySetup(latestSetup);
        return;
      }

      const selected = (latestSetup.grades || []).find(g => g.name === grade);
      if (!selected || !selected.selectable) {
        applySetup(latestSetup);
        setStatus(`${grade} is no longer available for public entry. Please check the current grade list above.`, 'error');
        return;
      }

      const requestId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const payload = {
        schemaVersion: 2,
        type: 'speed_shear_competitor_entry',
        requestId,
        entryToken,
        name,
        town,
        grade,
        phone,
        email,
        privacyAccepted: true,
        privacyVersion: PRIVACY_VERSION,
        submittedAt: new Date().toISOString()
      };

      els.submitBtn.textContent = 'Submitting…';
      await fetch(SUBMISSION_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload)
      });

      els.submitBtn.textContent = 'Confirming entry…';
      const result = await requestResult(requestId);

      if (!result.ok) {
        latestSetup = await requestSetup();
        applySetup(latestSetup);
        setStatus(result.error || 'Your entry could not be accepted. Please contact the competition organiser.', 'error');
        return;
      }

      els.form.reset();
      latestSetup = await requestSetup();
      applySetup(latestSetup);

      if (result.duplicate) {
        const ref = result.entryReference ? ` Entry reference: ${result.entryReference}.` : '';
        setStatus(`You were already listed in this grade. No duplicate entry was added.${ref}`, 'success');
        return;
      }

      const ref = result.entryReference ? ` Entry reference: ${result.entryReference}.` : '';
      const emailNote = result.confirmationEmailSent
        ? ' An entry receipt has been emailed to the address you provided.'
        : (email ? ' Your entry was received, but the automatic email receipt could not be sent. Please keep your entry reference and contact the organiser if needed.' : ' No email receipt was sent because no email address was provided.');
      setStatus(`Entry received.${ref}${emailNote}`, 'success');
    } catch (_) {
      setStatus('Your entry could not be confirmed by the system. Please contact the competition organiser before submitting again.', 'error');
    } finally {
      els.submitBtn.disabled = false;
      els.submitBtn.textContent = 'Submit Entry';
    }
  });

  loadSetup();
})();
