(() => {
  let scheduled = false;

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

  const observer = new MutationObserver(schedulePolish_);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener('DOMContentLoaded', schedulePolish_);
  schedulePolish_();
})();
