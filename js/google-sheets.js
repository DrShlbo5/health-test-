// Sends the result to the Google Sheet. Fire-and-forget: no-cors means we cannot read the reply,
// but the Apps Script still receives and writes the row.
function sendToSheet(data) {
  try {
    fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
  } catch (e) {}
}

// ───── IMPORT FROM SHEET (manager view of tests already stored in the sheet) ─────
let importedRows = null;
function setImportMsg(text) {
  const box = document.getElementById('import-box');
  box.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = text;
  box.appendChild(p);
}
async function importFromSheet() {
  setImportMsg('...');
  try {
    const res = await fetch(SHEET_URL + '?key=' + encodeURIComponent(PASSWORD));
    const data = await res.json();
    if (!data.ok) throw new Error('not ok');
    // row = the record's row number in the sheet (1 = header), used for deleting it.
    importedRows = data.rows.map((r, i) => ({ r, row: i + 1 })).slice(1).filter(x => x.r[1]).map(({ r, row }) => ({
      row, date: String(r[0] || ''), name: String(r[1] || ''), score: String(r[2] || ''),
      pct: String(r[3] || ''), verdict: String(r[4] || ''), wrong: String(r[5] || ''), detail: String(r[6] || '')
    }));
    renderImported();
  } catch (e) {
    setImportMsg('تعذر الاستيراد من الشيت. تأكد من تحديث Apps Script وإعادة النشر.');
  }
}
// Deletes one record from the sheet. The Apps Script checks the row still holds this name before deleting.
function deleteFromSheet(r) {
  if (!confirm('سيتم حذف نتيجة "' + r.name + '" من الشيت نهائياً. متأكد؟')) return;
  try {
    fetch(SHEET_URL, { method: 'POST', mode: 'no-cors',
      body: JSON.stringify({ action: 'delete', key: PASSWORD, row: r.row, name: r.name }) });
  } catch (e) {}
  setImportMsg('... جاري الحذف');
  // The response is not readable in no-cors mode, so reload the list after a short wait.
  setTimeout(importFromSheet, 1500);
}
// Old records were stored as one line per wrong answer ("... | إجابته: ... | الصح: ...").
// Convert them to the same readable layout used for new tests.
function reformatWrong(text) {
  if (!text || text.indexOf('إجابتك') !== -1 || text === 'لا يوجد' || text.indexOf('إجابته:') === -1) return text;
  const render = (label, arr) => {
    const items = arr.flatMap(x => x.split(' ← '));
    if (items.length === 1 && items[0].indexOf('↔') === -1) return '\n  ' + label + ' ' + items[0];
    const numbered = items.length > 1 && items[0].indexOf('↔') === -1;
    return '\n  ' + label + '\n' + items.map((x, k) => numbered ? '   ' + (k + 1) + '. ' + x : '   • ' + x).join('\n');
  };
  return text.split('\n').filter(l => l.trim()).map(line => {
    const parts = line.split(' | ');
    const chosen = [], correct = [];
    let cur = null;
    parts.slice(1).forEach(seg => {
      if (seg.indexOf('إجابته:') === 0) { cur = chosen; seg = seg.slice('إجابته:'.length).trim(); }
      else if (seg.indexOf('الصح:') === 0) { cur = correct; seg = seg.slice('الصح:'.length).trim(); }
      if (cur) cur.push(seg);
    });
    return parts[0] + render('إجابتك:', chosen) + render('الصحيح:', correct);
  }).join('\n\n');
}
function splitWrongItems(raw) {
  const items = [];
  (raw || '').split('\n').forEach(line => {
    if (/^\d+\)\s/.test(line)) items.push(line);
    else if (items.length && line.trim()) items[items.length - 1] += '\n' + line;
  });
  return items;
}
// Results log: for each wrong question show only the employee's answer (✗) and the correct answer (✓),
// in the same row style as the test. Works for multiple choice, true/false, ordering and matching.
function parseWrongItem(item) {
  const question = item.split('\n')[0].split(' | ')[0].replace(/^\d+\)\s*/, '').trim();
  const bi = BANK.findIndex(b => b.q.ar === question);
  if (bi === -1) return null;
  const cm = item.match(/إجابت(?:ك|ه):([\s\S]*?)(?:\n\s*الصحيح:|\s\|\s*الصح:|$)/);
  const raw = cm ? cm[1] : '';
  const tokens = raw.split(/\n|\s\|\s/)
    .map(t => t.replace(/^\s*(?:•|✓|✗|\d+\.)\s*/, '').replace(/\s*(?:✓|✗)\s*$/, '').trim())
    .flatMap(t => t.split(' ← '))
    .filter(Boolean);
  return { bq: BANK[bi], tokens: tokens };
}
let pendingDraws = [];
// One test-style block: left/right columns with lines drawn between joined items.
function buildMatchBlock(bq, pairs, lineClass, label) {
  const lbl = document.createElement('div'); lbl.className = 'rev-lbl'; lbl.textContent = label;
  const box = document.createElement('div'); box.className = 'match-box';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'match-svg');
  const cols = document.createElement('div'); cols.className = 'match-cols';
  const colL = document.createElement('div'); colL.className = 'match-col';
  const colR = document.createElement('div'); colR.className = 'match-col';
  bq.l.ar.forEach(t => { const d = document.createElement('div'); d.className = 'match-item'; d.textContent = t; colL.appendChild(d); });
  bq.r.ar.forEach(t => { const d = document.createElement('div'); d.className = 'match-item'; d.textContent = t; colR.appendChild(d); });
  cols.appendChild(colL); cols.appendChild(colR);
  box.appendChild(svg); box.appendChild(cols);
  const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.gap = '6px';
  wrap.appendChild(lbl); wrap.appendChild(box);
  pendingDraws.push(() => {
    const br = box.getBoundingClientRect();
    svg.setAttribute('width', br.width); svg.setAttribute('height', br.height);
    svg.setAttribute('viewBox', '0 0 ' + br.width + ' ' + br.height);
    svg.innerHTML = '';
    pairs.forEach(([i, j]) => {
      const l = colL.children[i], r = colR.children[j];
      if (!l || !r) return;
      const lr = l.getBoundingClientRect(), rr = r.getBoundingClientRect();
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', lr.left - br.left); line.setAttribute('y1', lr.top + lr.height / 2 - br.top);
      line.setAttribute('x2', rr.right - br.left); line.setAttribute('y2', rr.top + rr.height / 2 - br.top);
      line.setAttribute('class', 'match-line ' + lineClass);
      svg.appendChild(line);
    });
  });
  return wrap;
}
// One test-style block: each step with rank buttons 1-4; the chosen rank is coloured.
function buildOrderBlock(bq, rankOfStep, cls, label) {
  const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.gap = '8px';
  const lbl = document.createElement('div'); lbl.className = 'rev-lbl'; lbl.textContent = label;
  wrap.appendChild(lbl);
  bq.o.ar.forEach((step, j) => {
    const row = document.createElement('div'); row.className = 'ord-row';
    const t = document.createElement('div'); t.className = 'ord-text'; t.textContent = step;
    const ranks = document.createElement('div'); ranks.className = 'ord-ranks';
    [1, 2, 3, 4].forEach(r => {
      const b = document.createElement('div');
      b.className = 'num-btn' + (rankOfStep[j] === r ? ' ' + cls : '');
      b.textContent = r;
      ranks.appendChild(b);
    });
    row.appendChild(t); row.appendChild(ranks);
    wrap.appendChild(row);
  });
  return wrap;
}
function buildWrongCard(bq, tokens, ok, num) {
  const good = !!ok;
  const cls = good ? 'res-ok' : 'res-bad';
  const lineCls = good ? 'res-line-ok' : 'res-line-bad';
  const wrap = document.createElement('div');
  wrap.className = 'rev-item';
  const head = document.createElement('div'); head.className = 'rev-head';
  head.style.display = 'flex'; head.style.justifyContent = 'space-between'; head.style.alignItems = 'center'; head.style.gap = '8px';
  const hTitle = document.createElement('span'); hTitle.textContent = (num ? num + '. ' : '') + bq.cat.ar;
  const hBadge = document.createElement('span');
  hBadge.className = 'badge ' + (good ? 'badge-pass' : 'badge-fail');
  hBadge.textContent = good ? 'صح ✓' : 'غلط ✗';
  head.appendChild(hTitle); head.appendChild(hBadge);
  const q = document.createElement('div'); q.className = 'rev-q'; q.textContent = bq.q.ar;
  wrap.appendChild(head); wrap.appendChild(q);
  if (bq.matching) {
    // Employee's joined pairs (red) and the correct pairs (green).
    const his = tokens.map(t => {
      const parts = t.split(' ↔ ');
      return [bq.l.ar.indexOf(parts[0]), bq.r.ar.indexOf(parts[1])];
    }).filter(([i, j]) => i !== -1 && j !== -1);
    const correct = bq.l.ar.map((x, i) => [i, i]);
    wrap.appendChild(buildMatchBlock(bq, his, lineCls, 'إجابة الموظف'));
    if (!good) wrap.appendChild(buildMatchBlock(bq, correct, 'res-line-ok', 'الإجابة الصحيحة'));
  } else if (bq.ordering) {
    // Employee's rank for each step (red) and the correct rank (green).
    const hisRank = bq.o.ar.map(step => { const k = tokens.indexOf(step); return k === -1 ? null : k + 1; });
    const correctRank = bq.o.ar.map((step, j) => j + 1);
    wrap.appendChild(buildOrderBlock(bq, hisRank, cls, 'إجابة الموظف'));
    if (!good) wrap.appendChild(buildOrderBlock(bq, correctRank, 'res-ok', 'الإجابة الصحيحة'));
  } else {
    const his = tokens.map(t => ({ text: t, ok: good }));
    const addRows = (label, rows) => {
      const lbl = document.createElement('div'); lbl.className = 'rev-lbl'; lbl.textContent = label;
      wrap.appendChild(lbl);
      rows.forEach(r => {
        const d = document.createElement('div');
        d.className = 'rev-opt ' + (r.ok ? 'ok' : 'bad');
        d.textContent = (r.ok ? '✓ ' : '✗ ') + r.text;
        wrap.appendChild(d);
      });
    };
    addRows('إجابة الموظف', his);
    if (!good) addRows('الإجابة الصحيحة', [{ text: bq.o.ar[bq.c], ok: true }]);
  }
  return wrap;
}
function buildWrongItem(item) {
  const parsed = parseWrongItem(item);
  if (parsed) return buildWrongCard(parsed.bq, parsed.tokens);
  // Unknown question (e.g. text changed): show the stored text as is.
  const pre = document.createElement('pre');
  pre.style.whiteSpace = 'pre-wrap'; pre.style.fontFamily = 'inherit'; pre.style.lineHeight = '1.7'; pre.style.margin = '0';
  pre.textContent = reformatWrong(item);
  return pre;
}
function renderImported() {
  const box = document.getElementById('import-box');
  box.innerHTML = '';
  if (!importedRows || importedRows.length === 0) { setImportMsg('لا توجد نتائج في الشيت.'); return; }
  const title = document.createElement('h3');
  title.className = 'note-h2';
  title.textContent = 'نتائج من الشيت (' + importedRows.length + ')';
  box.appendChild(title);
  importedRows.slice().reverse().forEach(r => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginTop = '10px';
    card.style.display = 'flex'; card.style.flexDirection = 'column'; card.style.gap = '12px';
    const head = document.createElement('div');
    head.style.display = 'flex'; head.style.justifyContent = 'space-between'; head.style.gap = '8px'; head.style.flexWrap = 'wrap';
    const nm = document.createElement('strong'); nm.textContent = r.name;
    const sc = document.createElement('span'); sc.textContent = r.score + ' (' + r.pct + ') — ' + r.verdict;
    const dt = document.createElement('small'); dt.style.color = 'var(--fg-soft)'; dt.textContent = r.date;
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'حذف';
    del.style.cssText = 'background:#d64545;color:#fff;border:0;border-radius:8px;padding:4px 12px;font:inherit;cursor:pointer;';
    del.addEventListener('click', e => { e.stopPropagation(); deleteFromSheet(r); });
    head.appendChild(nm); head.appendChild(sc); head.appendChild(dt); head.appendChild(del);
    head.style.cursor = 'pointer';
    card.appendChild(head);
    // Details hidden until the manager taps the name/row.
    pendingDraws = [];
    const body = document.createElement('div');
    body.style.display = 'none';
    body.style.flexDirection = 'column';
    body.style.gap = '12px';
    let detailItems = null;
    try { if (r.detail) detailItems = JSON.parse(r.detail); } catch (e) { detailItems = null; }
    if (Array.isArray(detailItems) && detailItems.length) {
      detailItems.forEach(([qAr, ok, tokens], idx) => {
        const num = idx + 1;
        const bi = BANK.findIndex(b => b.q.ar === qAr);
        if (bi !== -1) body.appendChild(buildWrongCard(BANK[bi], tokens || [], ok, num));
      });
    }
    const items = (Array.isArray(detailItems) && detailItems.length) ? [] : splitWrongItems(r.wrong);
    if (!Array.isArray(detailItems) && items.length === 0) {
      const none = document.createElement('p'); none.className = 'empty-state'; none.textContent = 'لا توجد إجابات غلط';
      body.appendChild(none);
    } else {
      items.forEach(item => body.appendChild(buildWrongItem(item)));
    }
    const myDraws = pendingDraws; pendingDraws = [];
    card.appendChild(body);
    head.addEventListener('click', () => {
      const open = body.style.display === 'none';
      body.style.display = open ? 'flex' : 'none';
      // Lines can only be measured once the block is visible.
      if (open) myDraws.forEach(f => f());
    });
    box.appendChild(card);
  });
  const draws = pendingDraws; pendingDraws = [];
  draws.forEach(f => f());
}
document.getElementById('btn-import').addEventListener('click', importFromSheet);
