(() => {
  'use strict';

  const token = new URLSearchParams(location.search).get('access') || '';
  const STATE_KEY = token ? `waimarinoSpeedShearEntryManagerV3_${token}` : 'waimarinoSpeedShearEntryManagerV3_manual';

  function readState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); }
    catch (_) { return null; }
  }

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

  function wrap(text, width) {
    const words = ascii(text).split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines = [];
    let line = '';
    words.forEach(word => {
      const next = line ? `${line} ${word}` : word;
      if (next.length > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
    });
    if (line) lines.push(line);
    return lines;
  }

  function pageContent(lines) {
    const commands = ['BT', '/F1 10 Tf', '40 802 Td', '13 TL'];
    lines.forEach((line, index) => {
      if (index) commands.push('T*');
      commands.push(`(${pdfEscape(line)}) Tj`);
    });
    commands.push('ET');
    return commands.join('\n');
  }

  function buildPdf(pages) {
    const objects = [];
    const pageRefs = pages.map((_, i) => 4 + i * 2);
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Kids [${pageRefs.map(n => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`;
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

    pages.forEach((lines, i) => {
      const pageNum = 4 + i * 2;
      const contentNum = pageNum + 1;
      const stream = pageContent(lines);
      objects[pageNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`;
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

  function gradeLines(state, grade) {
    const competitors = Array.isArray(grade.competitors) ? grade.competitors : [];
    const confirmed = competitors.filter(c => c.checkedIn === true).length;
    const awaiting = competitors.length - confirmed;
    const queuedIds = typeof window.__waimarinoOfflineQueuedCompetitorIds === 'function'
      ? window.__waimarinoOfflineQueuedCompetitorIds()
      : new Set();
    const offlineCount = competitors.filter(c => queuedIds.has(String(c.id || ''))).length;
    const lines = [
      'WAIMARINO SHEARS - SPEED SHEAR ENTRIES',
      '',
      `Competition: ${state.competition?.name || 'Competition'}`,
      `Grade / Event: ${grade.name || ''}`,
      `Date: ${state.competition?.date || ''}`,
      `Venue: ${state.competition?.venue || ''}`,
      `Booking Reference: ${state.bookingReference || ''}`,
      `Generated: ${new Date().toLocaleString('en-NZ')}`,
      '',
      `Total: ${competitors.length}    Confirmed: ${confirmed}    Awaiting: ${awaiting}${offlineCount ? `    Offline pending: ${offlineCount}` : ''}`,
      '',
      'No.  Name                             Town                     Status / Source',
      '----  -------------------------------  -----------------------  --------------------------'
    ];

    competitors.forEach((c, index) => {
      const status = c.checkedIn === true ? 'Confirmed' : 'Not Confirmed';
      const source = c.source === 'public-entry' ? 'Online' : 'Manual';
      const offline = queuedIds.has(String(c.id || '')) ? ' / OFFLINE' : '';
      const left = `${String(index + 1).padStart(3, ' ')}.  ${ascii(c.name || '').slice(0, 31).padEnd(31, ' ')}  ${ascii(c.town || '').slice(0, 23).padEnd(23, ' ')}`;
      const right = `${status} / ${source}${offline}`;
      wrap(`${left}  ${right}`, 92).forEach(line => lines.push(line));
    });

    if (!competitors.length) lines.push('No competitors currently listed.');
    lines.push('', 'This PDF is generated directly on this device and does not require internet access.');
    return lines;
  }

  function paginate(lines) {
    const max = 54;
    const pages = [];
    for (let i = 0; i < lines.length; i += max) pages.push(lines.slice(i, i + max));
    return pages.length ? pages : [['No roster data.']];
  }

  function downloadGradePdf(gradeId) {
    const state = readState();
    if (!state || !Array.isArray(state.grades)) return false;
    const grade = state.grades.find(g => String(g.id || '') === String(gradeId || ''));
    if (!grade) return false;
    const pdf = buildPdf(paginate(gradeLines(state, grade)));
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName(state.competition?.name)}_${safeName(state.bookingReference || 'NoRef')}_${safeName(grade.name)}_Roster.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-action="download-pdf"]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const card = button.closest('.grade-card');
    const ok = downloadGradePdf(card?.dataset.gradeId || '');
    const status = document.getElementById('globalStatus');
    if (status) {
      status.className = `status ${ok ? 'ok' : 'warn'}`;
      status.textContent = ok ? 'Roster PDF downloaded.' : 'Could not create the roster PDF.';
    }
  }, true);
})();