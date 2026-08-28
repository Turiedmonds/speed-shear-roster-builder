(() => {
  let scheduled = false;

  function tidyPublicEntryUrl_(value) {
    const text = String(value || '').trim();
    if (!text) return '';

    try {
      const url = new URL(text, location.origin);
      let code = '';

      if (/\/enter\/?$/i.test(url.pathname)) {
        code = String(url.searchParams.get('c') || '').trim().toLowerCase();
      } else if (/\/e\.html$/i.test(url.pathname)) {
        code = String(url.searchParams.get('c') || '').trim().toLowerCase();
      } else if (/\/competitor-entry\.html$/i.test(url.pathname)) {
        const token = String(url.searchParams.get('entry') || '').trim().toLowerCase();
        if (/^[a-f0-9]{20,}$/.test(token)) code = token.slice(0, 20);
      }

      if (/^[a-f0-9]{20}$/.test(code)) {
        return `${location.origin}/enter/?c=${encodeURIComponent(code)}`;
      }
    } catch (_) {}

    return text;
  }

  function setGlobalStatus_(message, kind) {
    const status = document.getElementById('globalStatus');
    if (!status) return;
    status.className = `status ${kind || ''}`;
    status.textContent = message || '';
  }

  function polishEntryManager_() {
    scheduled = false;

    const setupNotice = document.getElementById('setupNotice');
    if (setupNotice) {
      const text = String(setupNotice.textContent || '').trim();
      setupNotice.classList.toggle(
        'routine-setup-note',
        text === 'Competition details, entries, grade status and confirmation state are loaded from the shared competition record.'
      );
    }

    const publicEntryUrl = document.getElementById('publicEntryUrl');
    if (publicEntryUrl && publicEntryUrl.value) {
      const tidyUrl = tidyPublicEntryUrl_(publicEntryUrl.value);
      if (tidyUrl && tidyUrl !== publicEntryUrl.value) publicEntryUrl.value = tidyUrl;
    }

    document.querySelectorAll('.grade-card').forEach(card => {
      const quickRow = card.querySelector('.quick-row');
      if (quickRow && !quickRow.closest('.manual-entry-panel')) {
        const panel = document.createElement('div');
        panel.className = 'manual-entry-panel';

        const heading = document.createElement('div');
        heading.className = 'manual-entry-heading';
        heading.innerHTML = '<h4>Manual Entry</h4><p>Add competitor entries manually if they were not received through the online entry form.</p>';

        quickRow.parentNode.insertBefore(panel, quickRow);
        panel.appendChild(heading);
        panel.appendChild(quickRow);

        const bulk = card.querySelector('.bulk');
        if (bulk && !bulk.closest('.manual-entry-panel')) panel.appendChild(bulk);
      }

      const badges = Array.from(card.querySelectorAll('.badges .badge'));
      badges.forEach(badge => {
        const text = String(badge.textContent || '').trim();
        if (/^Total:\s*/i.test(text)) {
          badge.textContent = text.replace(/^Total:\s*/i, 'Total Entries: ');
          return;
        }
        if (/entered\s*[—-]\s*no limit$/i.test(text)) {
          badge.textContent = 'Entry Limit: No Limit';
          return;
        }
        if (/^\d+\/\d+/.test(text) && !/^Entry Limit:/i.test(text)) {
          badge.textContent = 'Entry Limit: ' + text;
        }
      });
    });
  }

  function schedulePolish_() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(polishEntryManager_);
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('#copyPublicEntryBtn');
    if (!button) return;

    const input = document.getElementById('publicEntryUrl');
    const tidyUrl = tidyPublicEntryUrl_(input && input.value);
    if (!tidyUrl) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (input) input.value = tidyUrl;

    try {
      await navigator.clipboard.writeText(tidyUrl);
      setGlobalStatus_('Public competitor entry link copied.', 'ok');
    } catch (_) {
      setGlobalStatus_('Could not copy the link automatically.', 'warn');
    }
  }, true);

  const observer = new MutationObserver(schedulePolish_);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener('DOMContentLoaded', schedulePolish_);
  schedulePolish_();
})();
