(() => {
  'use strict';

  const LOGO_URL = 'https://raw.githubusercontent.com/Turiedmonds/waimarino-shears-speed-shear-booking-pack/main/assets/Waimarino%20Shears%20Logo.png';
  const RED = '0.922 0.114 0.153';
  const DARK = '0.067 0.067 0.067';
  const MID = '0.333 0.333 0.333';
  const LIGHT = '0.949 0.949 0.949';
  const BORDER = '0.851 0.851 0.851';

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

  function textCommand(font, size, x, y, text, colour = DARK) {
    return `${colour} rg BT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`;
  }

  function truncate(value, max) {
    const text = ascii(value);
    return text.length > max ? `${text.slice(0, Math.max(0, max - 3))}...` : text;
  }

  function rect(x, y, width, height, fillColour, strokeColour = null, lineWidth = 0.5) {
    const parts = [];
    if (fillColour) parts.push(`${fillColour} rg`);
    if (strokeColour) parts.push(`${strokeColour} RG`, `${lineWidth} w`);
    parts.push(`${x} ${y} ${width} ${height} re`);
    parts.push(fillColour && strokeColour ? 'B' : fillColour ? 'f' : 'S');
    return parts.join(' ');
  }

  function line(x1, y1, x2, y2, colour = DARK, width = 0.7) {
    return `${colour} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`;
  }

  function formatDate(raw) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw || ''));
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(raw || '—');
  }

  function formatDateTime(value) {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return '—';
    const parts = new Intl.DateTimeFormat('en-NZ', {
      timeZone: 'Pacific/Auckland',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    }).formatToParts(date);
    const get = type => parts.find(part => part.type === type)?.value || '';
    return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')} ${get('dayPeriod').toUpperCase()}`;
  }

  function readStoredGrade(gradeName) {
    const token = new URLSearchParams(location.search).get('access') || '';
    const key = token ? `waimarinoSpeedShearEntryManagerV3_${token}` : 'waimarinoSpeedShearEntryManagerV3_manual';
    try {
      const state = JSON.parse(localStorage.getItem(key) || 'null');
      return (state?.grades || []).find(grade => String(grade?.name || '').trim().toLowerCase() === gradeName.toLowerCase()) || null;
    } catch (_) {
      return null;
    }
  }

  function readVisibleGrade(card) {
    const competition = document.getElementById('competitionName')?.value?.trim() || 'Competition';
    const rawDate = document.getElementById('competitionDate')?.value || '';
    const venue = document.getElementById('venue')?.value?.trim() || '—';
    const grade = card.querySelector('.grade-title-row h3')?.textContent?.trim() || 'Grade';
    const storedGrade = readStoredGrade(grade);
    const submittedAt = storedGrade?.submittedAt || storedGrade?.lastSubmittedAt || '';
    const rows = [...card.querySelectorAll('.competitor-table tbody tr[data-cid]')]
      .filter(row => row.querySelector('[data-action="toggle-confirm"]')?.classList.contains('confirmed'))
      .map(row => ({
        name: row.querySelector('input[data-edit="name"]')?.value?.trim() || '',
        town: row.querySelector('input[data-edit="town"]')?.value?.trim() || ''
      }))
      .filter(row => row.name);
    return {
      meta: {
        competition,
        grade,
        date: formatDate(rawDate),
        venue,
        submitted: formatDateTime(submittedAt)
      },
      rows
    };
  }

  async function loadLogoJpeg() {
    try {
      const response = await fetch(LOGO_URL, { cache: 'force-cache', mode: 'cors' });
      if (!response.ok) throw new Error('Logo fetch failed');
      const sourceBlob = await response.blob();
      const sourceUrl = URL.createObjectURL(sourceBlob);
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = sourceUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || 137;
      canvas.height = image.naturalHeight || 118;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(sourceUrl);
      const jpegBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!jpegBlob) throw new Error('Logo conversion failed');
      const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
      let hex = '';
      for (const byte of bytes) hex += byte.toString(16).padStart(2, '0').toUpperCase();
      return { hex, width: canvas.width, height: canvas.height };
    } catch (_) {
      return null;
    }
  }

  function pageStream(meta, rows, firstNumber, pageNumber, pageCount, hasLogo) {
    const commands = [];

    if (hasLogo) commands.push('q 78 0 0 64 40 752 cm /Im1 Do Q');
    else commands.push(textCommand('F2', 22, 50, 780, 'WS', RED));

    commands.push(textCommand('F2', 9, 140, 805, 'WAIMARINO SHEARS INCORPORATED', RED));
    commands.push(textCommand('F2', 19, 140, 781, 'Speed Shear Confirmed Entry Roster', DARK));
    commands.push(textCommand('F2', 12, 140, 760, truncate(meta.competition, 55), MID));
    if (pageCount > 1) commands.push(textCommand('F1', 9, 520, 805, `${pageNumber}/${pageCount}`, MID));
    commands.push(line(40, 738, 555, 738, DARK, 0.7));

    const x = [40, 112, 282, 354];
    const w = [72, 170, 72, 201];
    const detailRows = [
      ['Competition', truncate(meta.competition, 29), 'Date', meta.date || '—'],
      ['Venue', truncate(meta.venue, 29), 'Submitted', meta.submitted || '—']
    ];
    let top = 720;
    detailRows.forEach(values => {
      const bottom = top - 24;
      for (let i = 0; i < 4; i++) {
        const label = i % 2 === 0;
        commands.push(rect(x[i], bottom, w[i], 24, label ? LIGHT : '1 1 1', BORDER, 0.5));
        commands.push(textCommand(label ? 'F2' : 'F1', 9, x[i] + 5, bottom + 8, values[i], DARK));
      }
      top = bottom;
    });

    const gradeHeading = pageNumber === 1
      ? `${truncate(meta.grade, 48)} - ${meta.totalConfirmed} Confirmed`
      : `${truncate(meta.grade, 48)} - continued`;
    commands.push(textCommand('F2', 14, 40, 646, gradeHeading, DARK));

    commands.push(rect(40, 608, 515, 24, DARK));
    commands.push(textCommand('F2', 10, 47, 616, '#', '1 1 1'));
    commands.push(textCommand('F2', 10, 82, 616, 'Competitor', '1 1 1'));
    commands.push(textCommand('F2', 10, 340, 616, 'Hometown', '1 1 1'));

    if (!rows.length) {
      commands.push(rect(40, 584, 515, 24, '1 1 1', BORDER, 0.5));
      commands.push(textCommand('F1', 10, 82, 592, 'No confirmed competitors submitted.', DARK));
      return commands.join('\n');
    }

    let y = 584;
    rows.forEach((row, index) => {
      commands.push(rect(40, y, 515, 24, '1 1 1', BORDER, 0.5));
      commands.push(textCommand('F1', 10, 47, y + 8, String(firstNumber + index), DARK));
      commands.push(textCommand('F1', 10, 82, y + 8, truncate(row.name, 40), DARK));
      commands.push(textCommand('F1', 10, 340, y + 8, truncate(row.town, 30), DARK));
      y -= 24;
    });

    return commands.join('\n');
  }

  async function buildPdf(meta, rows) {
    const rowsPerPage = 22;
    const chunks = [];
    if (!rows.length) chunks.push([]);
    else for (let i = 0; i < rows.length; i += rowsPerPage) chunks.push(rows.slice(i, i + rowsPerPage));
    meta.totalConfirmed = rows.length;

    const logo = await loadLogoJpeg();
    const objects = [];
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

    let nextObject = 5;
    let logoObject = 0;
    if (logo) {
      logoObject = nextObject++;
      objects[logoObject] = `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${logo.hex.length + 1} >>\nstream\n${logo.hex}>\nendstream`;
    }

    const pageRefs = [];
    chunks.forEach((chunk, index) => {
      const pageNum = nextObject++;
      const contentNum = nextObject++;
      pageRefs.push(pageNum);
      const stream = pageStream(meta, chunk, index * rowsPerPage + 1, index + 1, chunks.length, Boolean(logo));
      const xObject = logo ? ` /XObject << /Im1 ${logoObject} 0 R >>` : '';
      objects[pageNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xObject} >> /Contents ${contentNum} 0 R >>`;
      objects[contentNum] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });
    objects[2] = `<< /Type /Pages /Kids [${pageRefs.map(n => `${n} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`;

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

  async function downloadGradePdf(card) {
    if (!card) return false;

    window.dispatchEvent(new CustomEvent('waimarino-before-local-export'));
    try { sessionStorage.setItem('waimarinoEntryManagerExportGuardUntil', String(Date.now() + 10000)); } catch (_) {}

    const visible = readVisibleGrade(card);
    const pdf = await buildPdf(visible.meta, visible.rows);
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

  document.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action="download-pdf"]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const status = document.getElementById('globalStatus');
    if (status) {
      status.className = 'status';
      status.textContent = 'Creating confirmed roster PDF...';
    }

    let ok = false;
    try {
      ok = await downloadGradePdf(button.closest('.grade-card'));
    } catch (_) {
      ok = false;
    }

    if (status) {
      status.className = `status ${ok ? 'ok' : 'warn'}`;
      status.textContent = ok ? 'Confirmed roster PDF downloaded.' : 'Could not create the roster PDF.';
    }
  }, true);
})();