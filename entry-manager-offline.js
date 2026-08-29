(() => {
  'use strict';

  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwOkoKs3Is6bSumWYe71zH2mOEZ4h0YhY-PO2JPiea2WClMs6kIMjzYtEZmqg3MlgQC-w/exec';
  const params = new URLSearchParams(location.search);
  const token = params.get('access') || '';
  if (!token) return;

  const QUEUE_KEY = `waimarinoSpeedShearEntryManagerOfflineQueue_${token}`;
  const delegatedFetch = window.fetch.bind(window);
  const ALLOWED_TYPES = new Set([
    'speed_shear_manager_competitor_upsert',
    'speed_shear_manager_competitor_checkin',
    'speed_shear_manager_competitor_remove'
  ]);

  let syncing = false;

  function readQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function writeQueue(queue) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch (_) {}
    window.dispatchEvent(new CustomEvent('waimarino-offline-queue-change'));
  }

  function queuePayload(payload) {
    const queue = readQueue();
    const copy = JSON.parse(JSON.stringify(payload || {}));
    delete copy.requestId;
    delete copy.accessToken;
    queue.push({ queuedAt: new Date().toISOString(), payload: copy });
    writeQueue(queue);
    return queue.length;
  }

  function queuedCompetitorIds() {
    const ids = new Set();
    readQueue().forEach(item => {
      const p = item && item.payload || {};
      const id = p.competitor?.id || p.competitorId || '';
      if (id) ids.add(String(id));
    });
    return ids;
  }

  function pending() {
    return readQueue().length > 0 || syncing;
  }

  function statusText(message, kind) {
    setTimeout(() => {
      const status = document.getElementById('globalStatus');
      if (!status) return;
      status.className = `status ${kind || ''}`;
      status.textContent = message;
    }, 0);
  }

  async function syncQueue() {
    if (syncing || !navigator.onLine) return;
    let queue = readQueue();
    if (!queue.length) {
      updateIndicator();
      return;
    }

    syncing = true;
    updateIndicator();

    while (queue.length && navigator.onLine) {
      const item = queue[0];
      const payload = { ...(item.payload || {}), accessToken: token };
      try {
        await delegatedFetch(ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          cache: 'no-store',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify(payload)
        });
        queue.shift();
        writeQueue(queue);
      } catch (_) {
        break;
      }
    }

    syncing = false;
    updateIndicator();
    markQueuedRows();

    if (!queue.length) {
      statusText('Offline competitor changes have synced successfully.', 'ok');
    }
  }

  function ensureIndicator() {
    let indicator = document.getElementById('entryManagerConnectionStatus');
    if (indicator) return indicator;
    const header = document.querySelector('.brand-card');
    if (!header) return null;
    indicator = document.createElement('div');
    indicator.id = 'entryManagerConnectionStatus';
    indicator.className = 'entry-manager-connection-status';
    const settings = document.getElementById('settingsToggleBtn');
    if (settings) header.insertBefore(indicator, settings);
    else header.appendChild(indicator);
    return indicator;
  }

  function updateIndicator() {
    const indicator = ensureIndicator();
    if (!indicator) return;
    const count = readQueue().length;
    indicator.classList.toggle('offline', !navigator.onLine);
    indicator.classList.toggle('syncing', syncing || (navigator.onLine && count > 0));
    if (!navigator.onLine) {
      indicator.textContent = count
        ? `Offline — ${count} change${count === 1 ? '' : 's'} saved on this device`
        : 'Offline — manual competitor entries available';
    } else if (syncing || count) {
      indicator.textContent = `Online — syncing ${count} offline change${count === 1 ? '' : 's'}`;
    } else {
      indicator.textContent = 'Online';
    }
  }

  function markQueuedRows() {
    const ids = queuedCompetitorIds();
    document.querySelectorAll('tr[data-cid]').forEach(row => {
      const queued = ids.has(String(row.dataset.cid || ''));
      row.classList.toggle('offline-pending-row', queued);
      const nameCell = row.cells && row.cells[1];
      if (!nameCell) return;
      let chip = nameCell.querySelector('.offline-pending-chip');
      if (queued && !chip) {
        chip = document.createElement('span');
        chip.className = 'offline-pending-chip';
        chip.textContent = 'Offline';
        nameCell.appendChild(chip);
      } else if (!queued && chip) {
        chip.remove();
      }
    });
  }

  window.fetch = async function(input, init) {
    const options = init || {};
    const method = String(options.method || 'GET').toUpperCase();
    if (method !== 'POST' || typeof options.body !== 'string') {
      return delegatedFetch(input, options);
    }

    let payload;
    try { payload = JSON.parse(options.body); } catch (_) { return delegatedFetch(input, options); }
    const type = String(payload && payload.type || '');
    if (!ALLOWED_TYPES.has(type) || String(payload.accessToken || '') !== token) {
      return delegatedFetch(input, options);
    }

    if (!navigator.onLine) {
      const count = queuePayload(payload);
      updateIndicator();
      setTimeout(markQueuedRows, 0);
      statusText(`Offline — competitor change saved on this device. ${count} change${count === 1 ? '' : 's'} waiting to sync.`, 'warn');
      return { ok: true, offlineQueued: true };
    }

    return delegatedFetch(input, options);
  };

  const observer = new MutationObserver(() => requestAnimationFrame(markQueuedRows));
  const grades = document.getElementById('gradesContainer');
  if (grades) observer.observe(grades, { childList: true, subtree: true });

  window.addEventListener('online', () => {
    updateIndicator();
    setTimeout(syncQueue, 250);
  });
  window.addEventListener('offline', updateIndicator);
  window.addEventListener('waimarino-offline-queue-change', () => {
    updateIndicator();
    markQueuedRows();
  });

  window.__waimarinoOfflineQueuePending = pending;
  window.__waimarinoOfflineQueuedCompetitorIds = queuedCompetitorIds;
  window.__waimarinoSyncOfflineQueue = syncQueue;

  updateIndicator();
  markQueuedRows();
  if (navigator.onLine && readQueue().length) setTimeout(syncQueue, 500);
})();