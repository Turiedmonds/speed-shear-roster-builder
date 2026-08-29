(() => {
  const container = document.getElementById('gradesContainer');
  if (!container) return;

  let arranging = false;
  let observer = null;

  function dividerRow(label, count, className) {
    const row = document.createElement('tr');
    row.className = `competitor-group-divider ${className}`;
    row.innerHTML = `<td colspan="6"><span>${label}</span><strong>${count}</strong></td>`;
    return row;
  }

  function arrangeTable(table) {
    const tbody = table && table.tBodies && table.tBodies[0];
    if (!tbody) return;

    [...tbody.querySelectorAll('.competitor-group-divider')].forEach(row => row.remove());
    const rows = [...tbody.querySelectorAll('tr[data-cid]')];
    if (!rows.length) return;

    const confirmed = [];
    const awaiting = [];
    rows.forEach(row => {
      const button = row.querySelector('[data-action="toggle-confirm"]');
      (button && button.classList.contains('confirmed') ? confirmed : awaiting).push(row);
    });

    let number = 1;
    if (confirmed.length) {
      tbody.appendChild(dividerRow('Confirmed', confirmed.length, 'confirmed-group'));
      confirmed.forEach(row => {
        const numberCell = row.cells && row.cells[0];
        if (numberCell) numberCell.textContent = number++;
        tbody.appendChild(row);
      });
    }
    if (awaiting.length) {
      tbody.appendChild(dividerRow('Awaiting confirmation', awaiting.length, 'awaiting-group'));
      awaiting.forEach(row => {
        const numberCell = row.cells && row.cells[0];
        if (numberCell) numberCell.textContent = number++;
        tbody.appendChild(row);
      });
    }
  }

  function startObserving() {
    if (!observer) return;
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  function arrangeAll() {
    if (arranging) return;
    arranging = true;
    if (observer) observer.disconnect();
    try {
      container.querySelectorAll('.competitor-table').forEach(arrangeTable);
    } finally {
      arranging = false;
      startObserving();
    }
  }

  observer = new MutationObserver(() => {
    if (arranging) return;
    requestAnimationFrame(arrangeAll);
  });
  startObserving();

  container.addEventListener('click', event => {
    if (!event.target.closest('[data-action="toggle-confirm"]')) return;
    setTimeout(arrangeAll, 0);
  });

  arrangeAll();
})();