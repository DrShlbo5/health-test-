// ───── RECORDS ─────
function showRecords() {
  document.getElementById('pw-input').value = '';
  document.getElementById('pw-error').style.display = 'none';
  showScreen('password');
  document.getElementById('pw-input').focus();
}

function checkPassword() {
  const val = document.getElementById('pw-input').value;
  if (val === PASSWORD) {
    document.getElementById('pw-error').style.display = 'none';
    renderRecords();
    showScreen('records');
  } else {
    const e = document.getElementById('pw-error');
    e.textContent = T[lang].pwWrong;
    e.style.display = 'block';
  }
}

function renderRecords() {
  const t = T[lang];
  const tbody = document.getElementById('records-body');
  tbody.innerHTML = '';
  if (records.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'empty-state';
    td.textContent = t.noRecords;
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  records.slice().reverse().forEach((r, i) => {
    const tr = document.createElement('tr');
    const cells = [
      String(records.length - i),
      r.name,
      r.score + ' / ' + r.total,
      r.pct + '%',
      null,
      r.date
    ];
    cells.forEach((val, ci) => {
      const td = document.createElement('td');
      if (ci === 4) {
        const b = document.createElement('span');
        b.className = 'badge ' + (r.pass ? 'badge-pass' : 'badge-fail');
        b.textContent = r.pass ? t.pass : t.fail;
        td.appendChild(b);
      } else {
        td.textContent = val;
        if (ci === 1) td.style.fontWeight = '700';
        if (ci === 5) { td.style.color = 'var(--fg-soft)'; td.style.fontSize = '0.82rem'; td.style.whiteSpace = 'nowrap'; }
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// Sends records saved in this browser that were never sent to the sheet (e.g. older tests).
function uploadRecords() {
  const btn = document.getElementById('btn-upload');
  const pending = records.filter(r => !r.sent);
  if (pending.length === 0) { btn.textContent = T[lang].btnUploadDone; return; }
  pending.forEach((r, i) => setTimeout(() => {
    sendToSheet({ name: r.name, score: r.score, total: r.total, pct: r.pct, pass: r.pass,
                  wrong: r.wrong || 'مرفوع من السجل المحلي (بدون تفاصيل)' });
    r.sent = true;
    saveRecords();
  }, i * 400));
  setTimeout(() => { btn.textContent = T[lang].btnUploadDone; }, pending.length * 400 + 200);
}

let clearArmed = false;
function clearRecords() {
  const btn = document.getElementById('btn-clear');
  if (!clearArmed) {
    clearArmed = true;
    btn.textContent = T[lang].confirmClear;
    setTimeout(() => { clearArmed = false; btn.textContent = T[lang].btnClear; }, 4000);
    return;
  }
  clearArmed = false;
  records = [];
  saveRecords();
  renderRecords();
  btn.textContent = T[lang].btnClear;
}

// ───── REVIEW (manager only: all questions, all languages, correct answer marked) ─────

let studyLang = null;
const REV_LANGS = [['ar','عربي'],['en','English'],['hi','हिंदी'],['bn','বাংলা'],['id','Indonesia'],['ne','नेपाली'],['te','తెలుగు']];
function escHtml(s) { return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function showReview() {
  renderReview();
  showScreen('review');
}
function renderReview() {
  const letters = ['A','B','C','D'];
  const html = BANK.map((bq, i) => {
    const langs = REV_LANGS.map(([L, name]) => {
      const opts = bq.o[L].map((o, p) => {
        const ok = p === bq.c;
        return `<div class="rev-opt${ok ? ' ok' : ''}">${ok ? '✓ ' : ''}${escHtml(letters[p])}. ${escHtml(o)}</div>`;
      }).join('');
      return `<div class="rev-lang"><div class="rev-lbl">${name}</div><div class="rev-q">${escHtml(bq.q[L])}</div>${opts}</div>`;
    }).join('');
    return `<div class="rev-item"><div class="rev-head">${i + 1}. ${escHtml(bq.cat.en)} — ${escHtml(bq.cat.ar)}</div>${langs}</div>`;
  }).join('');
  document.getElementById('review-body').innerHTML = html;
}
