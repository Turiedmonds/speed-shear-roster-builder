(() => {
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwOkoKs3Is6bSumWYe71zH2mOEZ4h0YhY-PO2JPiea2WClMs6kIMjzYtEZmqg3MlgQC-w/exec';
  const nativeFetch = window.fetch.bind(window);

  function isManagerWrite(payload) {
    const type = String(payload && payload.type || '');
    return type.indexOf('speed_shear_manager_') === 0 || type === 'speed_shear_roster_submission';
  }

  function requestId_() {
    return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function showBackendError_(message) {
    const text = String(message || 'The change could not be confirmed by the Entry Manager backend.');
    setTimeout(() => {
      const status = document.getElementById('globalStatus');
      if (!status) return;
      status.className = 'status warn';
      status.textContent = `Save failed: ${text}`;
    }, 0);
  }

  async function result_(accessToken, requestId) {
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const response = await nativeFetch(
        `${ENDPOINT}?action=manager-write-result&access=${encodeURIComponent(accessToken)}&requestId=${encodeURIComponent(requestId)}`,
        { cache: 'no-store' }
      );
      const result = await response.json();
      if (!result.pending) return result;
    }

    return {
      ok: false,
      error: 'The change was sent but confirmation was not received. Refresh the Entry Manager before trying the change again.'
    };
  }

  window.fetch = async function(input, init) {
    const options = init || {};
    const method = String(options.method || 'GET').toUpperCase();

    if (method !== 'POST' || typeof options.body !== 'string') {
      return nativeFetch(input, options);
    }

    let payload = null;
    try {
      payload = JSON.parse(options.body);
    } catch (_) {
      return nativeFetch(input, options);
    }

    if (!isManagerWrite(payload)) {
      return nativeFetch(input, options);
    }

    const accessToken = String(payload.accessToken || '').trim();
    if (!accessToken) {
      return nativeFetch(input, options);
    }

    const requestId = String(payload.requestId || requestId_());
    payload.requestId = requestId;

    try {
      await nativeFetch(input, {
        ...options,
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload)
      });

      const result = await result_(accessToken, requestId);
      if (!result || result.ok !== true) {
        const message = result && result.error
          ? result.error
          : 'The Entry Manager backend rejected this change.';
        showBackendError_(message);
        throw new Error(message);
      }

      return { ok: true, managerResult: result };
    } catch (error) {
      if (!error || !error.message) {
        showBackendError_('The change could not be confirmed. Check your connection and refresh before trying again.');
      }
      throw error;
    }
  };

  window.__waimarinoManagerWriteConfirmationVersion = '1.0.0';
})();
