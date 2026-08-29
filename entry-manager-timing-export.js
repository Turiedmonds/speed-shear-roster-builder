(() => {
  function clean(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function safeName(value, fallback) {
    const out = clean(value).replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
    return out || fallback;
  }

  function confirmedRows(card) {
    if (!card) return [];
    return [...card.querySelectorAll('tr[data-cid]')]
      .filter(row => {
        const button = row.querySelector('[data-action="toggle-confirm"]');
        return Boolean(button && (button.classList.contains('confirmed') || /^Confirmed$/i.test(clean(button.textContent))));
      })
      .map(row => ({
        name: clean(row.querySelector('input[data-edit="name"]')?.value),
        town: clean(row.querySelector('input[data-edit="town"]')?.value)
      }))
      .filter(row => row.name);
  }

  function gradeName(card) {
    return clean(card?.querySelector('.grade-title-row h3, h3')?.textContent);
  }

  function competitionName() {
    return clean(document.getElementById('competitionName')?.value) || 'Competition';
  }

  function downloadJson(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportGrade(card) {
    const grade = gradeName(card) || 'Grade';
    const rows = confirmedRows(card);
    downloadJson(
      rows,
      `${safeName(competitionName(), 'Competition')}_${safeName(grade, 'Grade')}_Roster.json`
    );
  }

  function exportAll() {
    const rosters = {};
    document.querySelectorAll('.grade-card').forEach(card => {
      const grade = gradeName(card);
      if (grade) rosters[grade] = confirmedRows(card);
    });

    downloadJson(
      { type: 'roster_pack', rosters },
      `${safeName(competitionName(), 'Competition')}_FullRoster.json`
    );
  }

  // Capture the download actions before the legacy Entry Manager handlers.
  // This keeps backend submission payloads unchanged while ensuring user-downloaded
  // timing-system roster files never contain manager tokens or unrelated metadata.
  document.addEventListener('click', event => {
    const gradeButton = event.target.closest('button[data-action="download-grade"]');
    if (gradeButton) {
      const card = gradeButton.closest('.grade-card');
      if (!card) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      exportGrade(card);
      return;
    }

    const allButton = event.target.closest('#downloadAllBtn');
    if (allButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      exportAll();
    }
  }, true);
})();
