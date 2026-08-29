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
  const BACKEND_PROBE_TIMEOUT_MS = 5000;
  const HEARTBEAT_MS = 12000;

  let syncing = false;
  let probePromise = null;
  let backendProbePromise = null;
  let reconnectPromise = null;
  let networkReachable = window.__waimarinoOfflineBootstrap === true
    ? false
    : (navigator.onLine === false ? false : null);
  let backendReachable = window.__waimarinoOfflineBootstrap === true ? false : true;
  let lastReportedOnline = null;

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
    return navigator.onLine === false || networkReachable === false || backendReachable === false;
  }

  function reportConnectionChange() {
    const online = !offlineNow();
    if (lastReportedOnline === online) return;
    lastReportedOnline = online;
    window.dispatchEvent(new CustomEvent('waimarino-connection-change', { detail: { online } }));
  }

  function statusText(message, kind) {
    setTimeout(() => {
      const status = document.getElementById('globalStatus');
      if (!status) return;
      status.className = `status ${kind || ''}`;
      status.textContent = message;
    }, 0);
  }

  function setNetworkReachability(reachable) {
    const changed = networkReachable !== reachable;
    networkReachable = reachable;
    if (!reachable) backendReachable = false;
    if (reachable) window.__waimarinoOfflineBootstrap = false;
    if (changed) updateIndicator();
    reportConnectionChange();
  }

  function setBackendReachability(reachable) {
    const changed = backendReachable !== reachable;
    backendReachable = reachable;
    if (changed) updateIndicator();
    reportConnectionChange();
  }

  async function probeNetwork() {
    if (navigator.onLine === false) {
      setNetworkReachability(false);
      return false;
    }

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
        setNetworkReachability(reachable);
        return reachable;
      } catch (_) {
        setNetworkReachability(false);
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

  async function probeBackend() {
    if (!await probeNetwork()) return false;
    if (backendProbePromise) return backendProbePromise;

    backendProbePromise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), BACKEND_PROBE_TIMEOUT_MS);
      try {
        const response = await delegatedFetch(
          `${ENDPOINT}?action=entry-manager&access=${encodeURIComponent(token)}&connectionProbe=${Date.now()}`,
          { cache: 'no-store', signal: controller.signal }
        );
        const result = await response.json();
        const reachable = Boolean(result && result.ok === true);
        setBackendReachability(reachable);
        return reachable;
      } catch (_) {
        setBackendReachability(false);
        return false;
      } finally {
        clearTimeout(timer);
      }
    })();

    try {
      return await backendProbePromise;
    } finally {
      backendProbePromise = null;
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

  function queueAsOffline(payload, reason) {
    const count = queuePayload(payload);
    if (reason === 'network') setNetworkReachability(false);
    if (reason === 'backend') setBackendReachability(false);
    updateIndicator();
    setTimeout(markQueuedRows, 0);
    statusText(`Offline — competitor change saved on this device. ${count} change${count === 1 ? '' : 's'} waiting to sync.`, 'warn');
    return { ok: true, offlineQueued: true };
  }

  async function syncQueue() {
    if (syncing) return false;
    let queue = readQueue();
    if (!queue.length) {
      updateIndicator();
      return true;
    }

    if (!await probeNetwork()) {
      updateIndicator();
      return false;
    }

    syncing = true;
    updateIndicator();
    statusText(`Online connection found — syncing ${queue.length} saved change${queue.length === 1 ? '' : 's'}…`, 'warn');

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
        setBackendReachability(true);
        queue.shift();
        writeQueue(queue);
      } catch (error) {
        if (removeAlreadyApplied(payload, error)) {
          setBackendReachability(true);
          queue.shift();
          writeQueue(queue);
          continue;
        }

        const networkOk = await probeNetwork();
        if (!networkOk) {
          setNetworkReachability(false);
          break;
        }

        if (connectivityLikeError(error)) {
          setBackendReachability(false);
          break;
        }

        setBackendReachability(true);
        hardFailure = error;
        break;
      }
    }

    syncing = false;
    updateIndicator();
    markQueuedRows();

    if (hardFailure) {
      statusText(`Could not sync one saved offline change: ${String(hardFailure.message || hardFailure)}`, 'warn');
      return false;
    }

    if (!queue.length) {
      setNetworkReachability(true);
      setBackendReachability(true);
      statusText('Offline competitor changes have synced successfully.', 'ok');
      window.dispatchEvent(new CustomEvent('waimarino-offline-sync-complete'));
      return true;
    }

    return false;
  }

  async function tryReconnect() {
    if (reconnectPromise) return reconnectPromise;
    reconnectPromise = (async () => {
      if (!await probeNetwork()) return false;
      if (readQueue().length) return syncQueue();
      return probeBackend();
    })();
    try {
      return await reconnectPromise;
    } finally {
      reconnectPromise = null;
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

    if (syncing) {
      indicator.textContent = `Online — syncing ${count} saved change${count === 1 ? '' : 's'}`;
    } else if (offline) {
      indicator.textContent = count
        ? `Offline — ${count} change${count === 1 ? '' : 's'} saved on this device`
        : 'Offline — competitor list available on this device';
    } else if (count) {
      indicator.textContent = `Online — ${count} saved change${count === 1 ? '' : 's'} waiting to sync`;
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

  function isManagerSetupGet(input, options) {
    const method = String(options?.method || 'GET').toUpperCase();
    if (method !== 'GET') return false;
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      if (!raw) return false;
      const url = new URL(raw, location.href);
      const endpoint = new URL(ENDPOINT);
      return url.origin === endpoint.origin &&
        url.pathname === endpoint.pathname &&
        url.searchParams.get('action') === 'entry-manager';
    } catch (_) {
      return false;
    }
  }

  window.fetch = async function(input, init) {
    const options = init || {};
    const method = String(options.method || 'GET').toUpperCase();

    // Never allow a central setup refresh to replace the visible/local roster while
    // offline competitor changes are still waiting to be confirmed centrally.
    if (isManagerSetupGet(input, options) && pending()) {
      throw new TypeError('Central refresh deferred until saved offline changes have synced.');
    }

    if (method !== 'POST' || typeof options.body !== 'string') {
      return delegatedFetch(input, options);
    }

    let payload;
    try { payload = JSON.parse(options.body); } catch (_) { return delegatedFetch(input, options); }
    const type = String(payload && payload.type || '');
    if (!ALLOWED_TYPES.has(type) || String(payload.accessToken || '') !== token) {
      return delegatedFetch(input, options);
    }

    if (!await probeNetwork()) return queueAsOffline(payload, 'network');

    try {
      const response = await delegatedFetch(input, options);
      setBackendReachability(true);
      return response;
    } catch (error) {
      const networkOk = await probeNetwork();
      if (!networkOk) return queueAsOffline(payload, 'network');
      if (connectivityLikeError(error)) return queueAsOffline(payload, 'backend');
      setBackendReachability(true);
      throw error;
    }
  };

  const observer = new MutationObserver(() => requestAnimationFrame(markQueuedRows));
  const grades = document.getElementById('gradesContainer');
  if (grades) observer.observe(grades, { childList: true, subtree: true });

  window.addEventListener('online', () => { setTimeout(tryReconnect, 100); });
  window.addEventListener('offline', () => {
    setNetworkReachability(false);
    updateIndicator();
  });
  window.addEventListener('focus', () => { setTimeout(tryReconnect, 100); });
  window.addEventListener('pageshow', () => { setTimeout(tryReconnect, 100); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(tryReconnect, 100);
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
  window.__waimarinoTryReconnect = tryReconnect;

  updateIndicator();
  reportConnectionChange();
  markQueuedRows();

  setTimeout(tryReconnect, 250);
  setInterval(tryReconnect, HEARTBEAT_MS);
})();