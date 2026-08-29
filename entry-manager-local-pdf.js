(() => {
  'use strict';

  function ascii(value) {
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/[^\x20-\x7E]/g, '?');
  }

  function pdfEscape(value) {
    return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  function safeName(value) {
    return ascii(value || 'Competition').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'Competition';
  }

  function textCommand(font, size, x, y, text) {
    return `BT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`;
  }

  function pageStream(meta, rows, pageNumber, pageCount) {
    const commands = [];
    commands.push(textCommand('F2', 18, 40, 796, meta.competition));
    commands.push(textCommand('F2', 14, 40, 770, meta.grade));
    if (meta.date) commands.push(textCommand('F1', 11, 40, 750, meta.date));
    if (pageCount > 1) commands.push(textCommand('F1', 9, 505, 796, `${pageNumber}/${pageCount}`));
    commands.push('0.7 w 40 735 m 555 735 l S');
    commands.push(textCommand('F2', 10, 42, 714, 'No.'));
    commands.push(textCommand('F2', 10, 82, 714, 'Name'));
    commands.push(textCommand('F2', 10, 330, 714, 'Town'));
    commands.push('0.4 w 40 703 m 555 703 l S');

    if (!rows.length) {
      commands.push(textCommand('F1', 11, 42, 676, 'No confirmed competitors.'));
      return commands.join('\n');
    }

    let y = 680;
    rows.forEach(row => {
      commands.push(textCommand('F1', 10, 42, y, `${row.number}.`));
      commands.push(textCommand('F1', 10, 82, y, ascii(row.name).slice(0, 40)));
      commands.push(textCommand('F1', 10, 330, y, ascii(row.town).slice(0, 34)));
      commands.push('0.2 w 40 ' + (y - 7) + ' m 555 ' + (y - 7) + ' l S');
      y -= 18;
    });

    return commands.join('\n');
  }

  function buildPdf(meta, rows) {
    const rowsPerPage = 34;
    const chunks = [];
    if (!rows.length) chunks.push([]);
    else for (let i = 0; i < rows.length; i += rowsPerPage) chunks.push(rows.slice(i, i + rowsPerPage));

    const objects = [];
    const pageRefs = chunks.map((_, i) => 5 + i * 2);
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Kids [${pageRefs.map(n => `${n} 0 R`).join(' ')}] /Count ${chunks.length} >>`;
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

    chunks.forEach((chunk, i) => {
      const pageNum = 5 + i * 2;
      const contentNum = pageNum + 1;
      const stream = pageStream(meta, chunk, i + 1, chunks.length);
      objects[pageNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`;
      objects[contentNum] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (let i = 1; i < objects.length; i++) {
      offsets[i] = pdf.length;
      pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return pdf;
  }

  function readVisibleGrade(card) {
    const competition = document.getElementById('competitionName')?.value?.trim() || 'Competition';
    const rawDate = document.getElementById('competitionDate')?.value || '';
    let date = rawDate;
    if (rawDate) {
      const d = new Date(`${rawDate}T00:00:00`);
      if (!Number.isNaN(d.getTime())) date = d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const grade = card.querySelector('.grade-title-row h3')?.textContent?.trim() || 'Grade';
    const rows = [...card.querySelectorAll('.competitor-table tbody tr[data-cid]')]
      .filter(row => row.querySelector('[data-action="toggle-confirm"]')?.classList.contains('confirmed'))
      .map((row, index) => ({
        number: index + 1,
        id: String(row.dataset.cid || ''),
        name: row.querySelector('input[data-edit="name"]')?.value?.trim() || '',
        town: row.querySelector('input[data-edit="town"]')?.value?.trim() || ''
      }));
    return { meta: { competition, grade, date }, rows };
  }

  function downloadGradePdf(card) {
    if (!card) return false;

    // Preserve the exact visible roster before Safari/iOS hands the PDF to its file viewer.
    window.dispatchEvent(new CustomEvent('waimarino-before-local-export'));
    try { sessionStorage.setItem('waimarinoEntryManagerExportGuardUntil', String(Date.now() + 10000)); } catch (_) {}

    const visible = readVisibleGrade(card);
    const pdf = buildPdf(visible.meta, visible.rows);
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName(visible.meta.competition)}_${safeName(visible.meta.grade)}_Roster.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-action="download-pdf"]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const ok = downloadGradePdf(button.closest('.grade-card'));
    const status = document.getElementById('globalStatus');
    if (status) {
      status.className = `status ${ok ? 'ok' : 'warn'}`;
      status.textContent = ok ? 'Confirmed roster PDF downloaded.' : 'Could not create the roster PDF.';
    }
  }, true);
})();