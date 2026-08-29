(() => {
  'use strict';

  const POLL_INTERVAL_MS = 30000;
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwOkoKs3Is6bSumWYe71zH2mOEZ4h0YhY-PO2JPiea2WClMs6kIMjzYtEZmqg3MlgQC-w/exec';
  const token = new URLSearchParams(location.search).get('access') || '';
  const refreshButton = document.getElementById('refreshEntriesBtn');
  const gradesContainer = document.getElementById('gradesContainer');

  if (!token || !refreshButton || !gradesContainer) return;

  let pollInFlight = false;
  let refreshPending = false;

  function offlineQueuePending() {
    return typeof window.__waimarinoOfflineQueuePending === 'function' && window.__waimarinoOfflineQueuePending();
  }

  function connectionOffline() {
    if (navigator.onLine === false) return true;
    return typeof window.__waimarinoConnectionOffline === 'function' && window.__waimarinoConnectionOffline();
  }

  function exportGuardActive() {
    try {
      return Number(sessionStorage.getItem('waimarinoEntryManagerExportGuardUntil') || 0) > Date.now();
    } catch (_) {
      return false;
    }
  }

  function operatorIsBusy() {
    if (document.hidden || connectionOffline() || offlineQueuePending() || exportGuardActive()) return true;

    const active = document.activeElement;
    if (active && active !== document.body) {
      if (active.matches('input, textarea, select, [contenteditable="true"]')) return true;
    }

    if (document.querySelector('dialog[open]')) return true;
    if (document.querySelector('.grade-card.dragging')) return true;

    const draftInputs = gradesContainer.querySelectorAll(
      '[data-role="quick-name"], [data-role="quick-town"], [data-role="bulk-text"]'
    );
    for (const input of draftInputs) {
      if (String(input.value || '').trim()) return true;
    }

    return false;
  }

  function currentCompetitorIds() {
    return new Set(
      [...gradesContainer.querySelectorAll('tr[data-cid]')]
        .map(row => String(row.dataset.cid || '').trim())
        .filter(Boolean)
    );
  }

  function hasNewPublicEntry(setup) {
    const existingIds = currentCompetitorIds();
    const competitors = Array.isArray(setup && setup.competitors) ? setup.competitors : [];

    return competitors.some(entry => {
      if (!entry || String(entry.source || '') !== 'public-entry') return false;
      const id = String(entry.id || '').trim();
      return id && !existingIds.has(id);
    });
  }

  function applyPendingRefreshWhenSafe() {
    if (!refreshPending || operatorIsBusy()) return;
    refreshPending = false;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    refreshButton.click();

    requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
  }

  async function pollForNewEntries() {
    if (pollInFlight || connectionOffline() || offlineQueuePending() || exportGuardActive()) return;
    pollInFlight = true;

    try {
      const response = await fetch(
        `${ENDPOINT}?action=entry-manager&access=${encodeURIComponent(token)}`,
        { cache: 'no-store' }
      );
      const setup = await response.json();

      if (setup && setup.ok === true && hasNewPublicEntry(setup)) {
        refreshPending = true;
        applyPendingRefreshWhenSafe();
      }
    } catch (_) {
      // Silent by design: background polling must never interrupt the organiser.
    } finally {
      pollInFlight = false;
    }
  }

  setInterval(pollForNewEntries, POLL_INTERVAL_MS);

  document.addEventListener('focusout', () => {
    setTimeout(applyPendingRefreshWhenSafe, 0);
  });
  document.addEventListener('change', () => {
    setTimeout(applyPendingRefreshWhenSafe, 0);
  });
  document.addEventListener('click', () => {
    setTimeout(applyPendingRefreshWhenSafe, 0);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      applyPendingRefreshWhenSafe();
      pollForNewEntries();
    }
  });
  window.addEventListener('waimarino-offline-queue-change', () => {
    setTimeout(() => {
      applyPendingRefreshWhenSafe();
      pollForNewEntries();
    }, 0);
  });
  window.addEventListener('waimarino-offline-sync-complete', () => {
    // One controlled central refresh after the ordered queue has fully synced.
    // Typing/dialog/drag protection still applies before the refresh can run.
    refreshPending = true;
    setTimeout(applyPendingRefreshWhenSafe, 0);
  });
  window.addEventListener('waimarino-connection-change', event => {
    if (event?.detail?.online === true) {
      setTimeout(() => {
        applyPendingRefreshWhenSafe();
        pollForNewEntries();
      }, 0);
    }
  });
})();