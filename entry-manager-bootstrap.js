(() => {
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwOkoKs3Is6bSumWYe71zH2mOEZ4h0YhY-PO2JPiea2WClMs6kIMjzYtEZmqg3MlgQC-w/exec';
  const token = new URLSearchParams(location.search).get('access') || '';
  const MANAGER_STORAGE_PREFIX = 'waimarinoSpeedShearEntryManagerV3_';
  const appScripts = [
    'entry-manager-workflow.js?v=1.1.1',
    'entry-manager-write-confirmation.js?v=1.0.0',
    'entry-manager-offline.js?v=1.1.0',
    'entry-manager.js?v=20260829-responsive1',
    'entry-manager-local-pdf.js?v=1.1.0',
    'entry-manager-live-refresh.js?v=1.2.0',
    'entry-manager-drag-autoscroll.js?v=1.0.0',
    'entry-manager-tidy.js?v=1.2.0',
    'entry-manager-entry-groups.js?v=1.0.1',
    'entry-manager-countdown.js?v=1.1.0'
  ];

  function showPage() {
    document.body.classList.remove('entry-manager-access-checking');
  }

  function showBlocked(message, clearCachedState = true) {
    if (token && clearCachedState) {
      try {
        localStorage.removeItem(MANAGER_STORAGE_PREFIX + token);
      } catch (_) {}
    }

    document.body.innerHTML = `
      <main style="max-width:760px;margin:48px auto;padding:20px;font-family:Segoe UI,Arial,sans-serif;">
        <section style="background:#fff;border:1px solid #ddd;border-top:6px solid #EB1D27;border-radius:14px;padding:28px;box-shadow:0 3px 14px rgba(0,0,0,.08);">
          <p style="margin:0 0 8px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:#EB1D27;">Entry Manager</p>
          <h1 style="margin:0 0 16px;font-size:30px;">Competition unavailable</h1>
          <p style="font-size:17px;line-height:1.55;margin:0;">${escapeHtml(message || 'This competition is not currently available.')}</p>
        </section>
      </main>`;

    showPage();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function hasCachedCompetition() {
    if (!token) return false;
    try {
      const cached = JSON.parse(localStorage.getItem(MANAGER_STORAGE_PREFIX + token) || 'null');
      return Boolean(cached && Array.isArray(cached.grades));
    } catch (_) {
      return false;
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load the Entry Manager application.'));
      document.body.appendChild(script);
    });
  }

  async function loadApplication() {
    for (const src of appScripts) {
      await loadScript(src);
    }
    showPage();
  }

  async function validateAndLoad() {
    if (!token) {
      try {
        await loadApplication();
      } catch (error) {
        showBlocked(error && error.message, false);
      }
      return;
    }

    if (!navigator.onLine && hasCachedCompetition()) {
      try {
        await loadApplication();
      } catch (_) {
        showBlocked('This device has saved competition data, but the Entry Manager files were not available offline. Reconnect once and reopen the page.', false);
      }
      return;
    }

    try {
      const response = await fetch(
        `${ENDPOINT}?action=entry-manager&access=${encodeURIComponent(token)}`,
        { cache: 'no-store' }
      );

      const result = await response.json();

      if (!result || result.ok !== true) {
        throw new Error(
          result && result.error
            ? result.error
            : 'This competition is not currently available.'
        );
      }

      await loadApplication();
    } catch (error) {
      const text = String(error && error.message || error || '');
      const lifecycleBlocked = /cancelled|no longer available|not found|not currently available/i.test(text);
      if (!lifecycleBlocked && !navigator.onLine && hasCachedCompetition()) {
        try {
          await loadApplication();
          return;
        } catch (_) {}
      }
      const safeMessage = lifecycleBlocked
        ? text
        : 'Unable to verify this competition right now. Check your internet connection and try again.';
      showBlocked(safeMessage, lifecycleBlocked);
    }
  }

  validateAndLoad();
})();