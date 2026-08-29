(() => {
  'use strict';

  const token = new URLSearchParams(location.search).get('access') || '';
  const stateKey = token ? `waimarinoSpeedShearEntryManagerV3_${token}` : 'waimarinoSpeedShearEntryManagerV3_manual';
  const host = document.querySelector('.competition-card');
  const settingsButton = document.getElementById('settingsToggleBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const autoCloseInput = document.getElementById('autoCloseAt');
  if (!host) return;

  const card = document.createElement('div');
  card.className = 'entry-countdown-card entry-countdown-clickable';
  card.hidden = true;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', 'Open online entry closing settings');
  card.innerHTML = '<p class="entry-countdown-eyebrow">Online entries</p><div class="entry-countdown-main"></div><div class="entry-countdown-time"></div><div class="entry-countdown-extra"></div>';
  host.insertAdjacentElement('afterend', card);

  const main = card.querySelector('.entry-countdown-main');
  const time = card.querySelector('.entry-countdown-time');
  const extra = card.querySelector('.entry-countdown-extra');

  function readState() {
    try { return JSON.parse(localStorage.getItem(stateKey) || 'null') || null; }
    catch (_) { return null; }
  }

  function formatDateTime(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-NZ', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).format(d);
  }

  function countdownText(ms) {
    if (ms <= 0) return 'Online entries are closed';
    const totalMinutes = Math.max(0, Math.floor(ms / 60000));
    if (ms > 24 * 60 * 60 * 1000) {
      const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
      return `Online entries close in ${days} day${days === 1 ? '' : 's'}`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `Online entries close in ${hours}h ${minutes}m`;
    return `Online entries close in ${minutes}m`;
  }

  function openGradeCount(state, cutoffMs) {
    const grades = Array.isArray(state?.grades) ? state.grades : [];
    const overallOpen = state?.entrySettings?.publicEntriesOpen !== false && cutoffMs > Date.now();
    const open = overallOpen ? grades.filter(g => {
      const count = Array.isArray(g.competitors) ? g.competitors.length : 0;
      const full = Number(g.entryLimit) > 0 && count >= Number(g.entryLimit);
      return g.publicOpen !== false && g.submitted !== true && !full;
    }).length : 0;
    return `${open} of ${grades.length} grade${grades.length === 1 ? '' : 's'} currently accepting online entries`;
  }

  function render() {
    const state = readState();
    const cutoff = state?.entrySettings?.autoCloseAt || '';
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
    time.textContent = `Closes ${formatDateTime(cutoff)}`;
    extra.textContent = openGradeCount(state, cutoffMs);
  }

  function openSettings() {
    if (settingsPanel?.classList.contains('hidden')) settingsButton?.click();
    setTimeout(() => {
      autoCloseInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      autoCloseInput?.focus({ preventScroll: true });
    }, 80);
  }

  card.addEventListener('click', openSettings);
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openSettings();
    }
  });

  render();
  setInterval(render, 1000);
})();