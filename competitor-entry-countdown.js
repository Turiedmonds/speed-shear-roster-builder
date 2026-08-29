(() => {
  'use strict';

  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwOkoKs3Is6bSumWYe71zH2mOEZ4h0YhY-PO2JPiea2WClMs6kIMjzYtEZmqg3MlgQC-w/exec';
  const entryToken = new URLSearchParams(location.search).get('entry') || '';
  const header = document.querySelector('.entry-header');
  if (!entryToken || !header) return;

  const card = document.createElement('div');
  card.className = 'entry-countdown-card';
  card.hidden = true;
  card.innerHTML = '<p class="entry-countdown-eyebrow">Online entries</p><div class="entry-countdown-main"></div><div class="entry-countdown-time"></div>';
  header.insertAdjacentElement('afterend', card);

  const main = card.querySelector('.entry-countdown-main');
  const time = card.querySelector('.entry-countdown-time');
  let cutoff = '';
  let refreshInFlight = false;

  function formatDateTime(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-NZ', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).format(d);
  }

  function countdownText(ms) {
    if (ms <= 0) return 'Online entries are closed';
    const totalMinutes = Math.max(0, Math.floor(ms / 60000));
    if (ms > 24 * 60 * 60 * 1000) {
      const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
      return `Entries close in ${days} day${days === 1 ? '' : 's'}`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `Entries close in ${hours}h ${minutes}m`;
    return `Entries close in ${minutes}m`;
  }

  function render() {
    const cutoffMs = new Date(cutoff).getTime();
    if (!cutoff || Number.isNaN(cutoffMs)) {
      card.hidden = true;
      return;
    }
    const remaining = cutoffMs - Date.now();
    card.hidden = false;
    card.classList.toggle('countdown-closed', remaining <= 0);
    card.classList.toggle('countdown-urgent', remaining > 0 && remaining <= 6 * 60 * 60 * 1000);
    card.classList.toggle('countdown-soon', remaining > 6 * 60 * 60 * 1000 && remaining <= 24 * 60 * 60 * 1000);
    main.textContent = countdownText(remaining);
    time.textContent = `Online entry closes ${formatDateTime(cutoff)}`;
  }

  async function loadCutoff() {
    if (refreshInFlight || document.hidden) return;
    refreshInFlight = true;
    try {
      const response = await fetch(`${ENDPOINT}?action=competitor-entry&entry=${encodeURIComponent(entryToken)}`, { cache: 'no-store' });
      const setup = await response.json();
      if (!setup || setup.ok !== true) return;
      const nextCutoff = setup.autoCloseAt || '';
      if (nextCutoff !== cutoff) {
        cutoff = nextCutoff;
        render();
      }
    } catch (_) {
      // Optional silent display refresh only; never interrupt or alter the entry form.
    } finally {
      refreshInFlight = false;
    }
  }

  loadCutoff();
  setInterval(render, 1000);
  setInterval(loadCutoff, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadCutoff();
  });
})();