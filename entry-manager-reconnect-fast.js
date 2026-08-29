(() => {
  'use strict';

  const FAST_RETRY_MS = 3000;
  const BURST_DELAYS_MS = [0, 800, 1800, 3500];

  function needsRecovery() {
    try {
      const queued = typeof window.__waimarinoOfflineQueuePending === 'function' &&
        window.__waimarinoOfflineQueuePending();
      const offline = typeof window.__waimarinoConnectionOffline === 'function' &&
        window.__waimarinoConnectionOffline();
      return Boolean(queued || offline);
    } catch (_) {
      return false;
    }
  }

  function tryReconnectNow() {
    if (!needsRecovery()) return;
    if (typeof window.__waimarinoTryReconnect !== 'function') return;
    window.__waimarinoTryReconnect().catch(() => undefined);
  }

  function reconnectBurst() {
    BURST_DELAYS_MS.forEach(delay => {
      setTimeout(tryReconnectNow, delay);
    });
  }

  // Some iPad/Safari reconnects do not emit a useful online event immediately.
  // While recovery is actually needed, retry every 3 seconds instead of waiting
  // for the normal 12-second background heartbeat.
  setInterval(tryReconnectNow, FAST_RETRY_MS);

  window.addEventListener('online', reconnectBurst);
  window.addEventListener('focus', reconnectBurst);
  window.addEventListener('pageshow', reconnectBurst);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) reconnectBurst();
  });

  window.addEventListener('waimarino-offline-queue-change', reconnectBurst);

  // If this script loads while an offline queue is already waiting, start the
  // faster recovery sequence immediately.
  reconnectBurst();
})();
