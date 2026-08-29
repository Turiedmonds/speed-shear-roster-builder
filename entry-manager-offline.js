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
  const PROBE_TIMEOUT_MS = 1500;
  const HEARTBEAT_MS = 12000;

  let syncing = false;
  let probePromise = null;
  let networkReachable = window.__waimarinoOfflineBootstrap === true
    ? false
    : (navigator.onLine === false ? false : null);

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

  function cleanPayload(payload) {
    const copy = JSON.parse(JSON.stringify(payload || {}));
    delete copy.requestId;
    delete copy.accessToken;
    return copy;
  }

  function queuePayload(payload) {
    const queue = readQueue();
    const copy = cleanPayload(payload);
    const signature = JSON.stringify(copy);
    const last = queue[queue.length - 1];

    // Prevent an accidental double tap from adding the exact same queued write twice.
    if (!last || JSON.stringify(last.payload || {}) !== signature) {
      queue.push({ queuedAt: new Date().toISOString(), payload: copy });
      writeQueue(queue);
    }

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

  function offlineNow() {
    return navigator.onLine === false || networkReachable === false;
  }

  function statusText(message, kind) {
    setTimeout(() => {
      const status = document.getElementById('globalStatus');
      if (!status) return;
      status.className = `status ${kind || ''}`;
      status.textContent = message;
    }, 0);
  }

  function setReachability(reachable) {
    const changed = networkReachable !== reachable;
    networkReachable = reachable;
    if (reachable) window.__waimarinoOfflineBootstrap = false;
    if (changed) {
      updateIndicator();
      window.dispatchEvent(new CustomEvent('waimarino-connection-change', { detail: { online: reachable } }));
    }
  }

  async function probeNetwork(force = false) {
    if (navigator.onLine === false) {
      setReachability(false);
      return false;
    }

    if (probePromise && !force) return probePromise;
    if (probePromise) return probePromise;

    probePromise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      try {
        const response = await delegatedFetch(
          `${location.origin}/CNAME?network-probe=${Date.now()}`,
          { cache: 'no-store', signal: controller.signal }
        );
        const reachable = Boolean(response && response.ok);
        setReachability(reachable);
        return reachable;
      } catch (_) {
        setReachability(false);
        return false;
      } finally {
        clearTimeout(timer);
      }
    })();

    try {
      return await probePromise;
    } finally {
      probePromise = null;
    }
  }

  function connectivityLikeError(error) {
    const text = String(error && error.message || error || '');
    return /failed to fetch|network|load failed|abort|confirmation was not received|could not be confirmed|check your connection/i.test(text);
  }

  function removeAlreadyApplied(payload, error) {
    return payload?.type === 'speed_shear_manager_competitor_remove' &&
      /competitor was not found/i.test(String(error && error.message || error || ''));
  }

  function queueAsOffline(payload) {
    const count = queuePayload(payload);
    setReachability(false);
    updateIndicator();
    setTimeout(markQueuedRows, 0);
    statusText(`Offline — competitor change saved on this device. ${count} change${count === 1 ? '' : 's'} waiting to sync.`, 'warn');
    return { ok: true, offlineQueued: true };
  }

  async function syncQueue() {
    if (syncing) return;
    let queue = readQueue();
    if (!queue.length) {
      updateIndicator();
      return;
    }

    if (!await probeNetwork(true)) {
      updateIndicator();
      return;
    }

    syncing = true;
    updateIndicator();

    let hardFailure = null;

    while (queue.length) {
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
      } catch (error) {
        if (removeAlreadyApplied(payload, error)) {
          queue.shift();
          writeQueue(queue);
          continue;
        }

        const reachable = await probeNetwork(true);
        if (!reachable || connectivityLikeError(error)) {
          setReachability(false);
          break;
        }

        hardFailure = error;
        break;
      }
    }

    syncing = false;
    updateIndicator();
    markQueuedRows();

    if (hardFailure) {
      statusText(`Could not sync one saved offline change: ${String(hardFailure.message || hardFailure)}`, 'warn');
      return;
    }

    if (!queue.length) {
      statusText('Offline competitor changes have synced successfully.', 'ok');
      window.dispatchEvent(new CustomEvent('waimarino-offline-sync-complete'));
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
    const offline = offlineNow();
    indicator.classList.toggle('offline', offline);
    indicator.classList.toggle('syncing', !offline && (syncing || count > 0));

    if (offline) {
      indicator.textContent = count
        ? `Offline — ${count} change${count === 1 ? '' : 's'} saved on this device`
        : 'Offline — competitor list available on this device';
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

    // Never trust the browser flag alone. A quick real-network probe decides whether
    // competitor work should use the normal confirmed backend path or the local queue.
    if (!await probeNetwork(true)) return queueAsOffline(payload);

    try {
      const response = await delegatedFetch(input, options);
      setReachability(true);
      return response;
    } catch (error) {
      const reachable = await probeNetwork(true);
      if (!reachable || connectivityLikeError(error)) return queueAsOffline(payload);
      throw error;
    }
  };

  const observer = new MutationObserver(() => requestAnimationFrame(markQueuedRows));
  const grades = document.getElementById('gradesContainer');
  if (grades) observer.observe(grades, { childList: true, subtree: true });

  window.addEventListener('online', async () => {
    if (await probeNetwork(true)) await syncQueue();
  });

  window.addEventListener('offline', () => {
    setReachability(false);
    updateIndicator();
  });

  window.addEventListener('waimarino-offline-queue-change', () => {
    updateIndicator();
    markQueuedRows();
  });

  window.__waimarinoOfflineQueuePending = pending;
  window.__waimarinoOfflineQueuedCompetitorIds = queuedCompetitorIds;
  window.__waimarinoSyncOfflineQueue = syncQueue;
  window.__waimarinoConnectionOffline = offlineNow;
  window.__waimarinoProbeConnection = probeNetwork;

  updateIndicator();
  markQueuedRows();

  probeNetwork(true).then(reachable => {
    if (reachable && readQueue().length) syncQueue();
  });

  setInterval(async () => {
    const wasOffline = offlineNow();
    const reachable = await probeNetwork(true);
    if (reachable && (wasOffline || readQueue().length)) syncQueue();
  }, HEARTBEAT_MS);
})();