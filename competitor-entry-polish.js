(() => {
  const select = document.getElementById('grade');
  const availability = document.getElementById('gradeAvailability');
  if (!select) return;

  function simplifyUnlimitedLines() {
    availability?.querySelectorAll('.grade-line').forEach(line => {
      if (!/\d+ entered\s+—\s+No entry limit/i.test(line.textContent || '')) return;
      const strong = line.querySelector('strong');
      if (!strong) return;
      line.innerHTML = '';
      line.appendChild(strong);
      line.append(' — Open for entries');
    });
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'grade-picker-button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.textContent = 'Select grade / event';
  select.classList.add('custom-grade-select-hidden');
  select.insertAdjacentElement('afterend', button);

  const dialog = document.createElement('dialog');
  dialog.className = 'grade-picker-dialog';
  dialog.innerHTML = `
    <div class="grade-picker-card">
      <div class="grade-picker-head">
        <div><p class="dialog-eyebrow">Competitor entry</p><h2>Select grade / event</h2></div>
        <button type="button" class="grade-picker-close" aria-label="Close">×</button>
      </div>
      <div class="grade-picker-options"></div>
      <div class="grade-picker-actions"><button type="button" class="grade-picker-cancel">Cancel</button></div>
    </div>`;
  document.body.appendChild(dialog);

  const optionsBox = dialog.querySelector('.grade-picker-options');
  const close = () => dialog.open && dialog.close();
  dialog.querySelector('.grade-picker-close').addEventListener('click', close);
  dialog.querySelector('.grade-picker-cancel').addEventListener('click', close);

  function syncButton() {
    const option = select.options[select.selectedIndex];
    button.textContent = select.value && option ? option.textContent.replace(/\s+—\s+\d+\/\d+$/, '') : 'Select grade / event';
    button.classList.toggle('has-value', Boolean(select.value));
  }

  function buildOptions() {
    optionsBox.innerHTML = '';
    [...select.options].filter(option => option.value).forEach(option => {
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.className = 'grade-picker-option';
      const cleanLabel = option.textContent.replace(/\s+—\s+(\d+\/\d+)$/, '');
      const limitMatch = option.textContent.match(/\s+—\s+(\d+\/\d+)$/);
      choice.innerHTML = `<strong>${cleanLabel}</strong>${limitMatch ? `<span>${limitMatch[1]} entries</span>` : ''}`;
      if (option.value === select.value) choice.classList.add('selected');
      choice.addEventListener('click', () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncButton();
        close();
      });
      optionsBox.appendChild(choice);
    });
  }

  button.addEventListener('click', () => {
    buildOptions();
    if (typeof dialog.showModal === 'function') dialog.showModal();
  });
  select.addEventListener('change', syncButton);

  const observer = new MutationObserver(() => {
    simplifyUnlimitedLines();
    syncButton();
  });
  observer.observe(select, { childList: true, subtree: true });
  if (availability) observer.observe(availability, { childList: true, subtree: true });

  simplifyUnlimitedLines();
  syncButton();
})();