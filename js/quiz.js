// ───── QUIZ FLOW ─────
function startQuiz() {
  empName = document.getElementById('emp-name').value.trim();
  const err = document.getElementById('name-error');
  if (!empName) {
    err.textContent = T[lang].enterName;
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  const codeErr = document.getElementById('code-error');
  if (document.getElementById('test-code').value.trim() !== TEST_CODE) {
    codeErr.textContent = CODE_T[lang].err;
    codeErr.style.display = 'block';
    return;
  }
  codeErr.style.display = 'none';
  // 50 questions: 30 food-safety MC, 3 logic MC, 13 true/false, 2 ordering, 2 matching. Calculation questions are excluded.
  // Options are shuffled per employee so the answer position changes.
  const REASONING_CATS = ['Logic', 'Prioritizing', 'Reasoning'];
  const isTF = i => !!BANK[i].tf;
  const isOrd = i => !!BANK[i].ordering;
  const isMatch = i => !!BANK[i].matching;
  const isReasoning = i => REASONING_CATS.includes(BANK[i].cat.en);
  const allIdx = BANK.map((_, i) => i);
  const mcIdx = allIdx.filter(i => !isTF(i) && !isOrd(i) && !isMatch(i) && BANK[i].cat.en !== 'Calculation');
  const TF_COUNT = 13, ORD_COUNT = 2, REASON_COUNT = 3, MATCH_COUNT = 2;
  const reasoningPick = shuffle(mcIdx.filter(isReasoning)).slice(0, REASON_COUNT);
  const healthPick = shuffle(mcIdx.filter(i => !isReasoning(i))).slice(0, QUIZ_LENGTH - TF_COUNT - ORD_COUNT - REASON_COUNT - MATCH_COUNT);
  const tfPick = shuffle(allIdx.filter(isTF)).slice(0, TF_COUNT);
  const ordPick = shuffle(allIdx.filter(isOrd)).slice(0, ORD_COUNT);
  const matchPick = shuffle(allIdx.filter(isMatch)).slice(0, MATCH_COUNT);
  const picked60 = shuffle(reasoningPick.concat(healthPick, tfPick, ordPick, matchPick));
  quiz = picked60.map(qi => {
    if (isOrd(qi)) {
      // Steps are shown in a shuffled order; the employee gives each one a rank 1-4.
      return { qi, order: shuffle([0, 1, 2, 3]), ordering: true, correctPos: null };
    }
    if (isMatch(qi)) {
      // Right-hand items are shown in a shuffled order; order[k] = which pair's right item is shown in slot k.
      return { qi, order: shuffle([0, 1, 2, 3]), matching: true, correctPos: null };
    }
    const order = shuffle(BANK[qi].o.ar.map((_, k) => k));
    return { qi, order, correctPos: order.indexOf(BANK[qi].c) };
  });
  currentQ = 0;
  score = 0;
  picked = null;
  answers = quiz.map(it => (it.ordering || it.matching) ? [null, null, null, null] : null);
  matchSel = null;
  showScreen('quiz');
  renderQuestion();
}

function renderQuestion() {
  picked = answers[currentQ] ?? null;
  const item = quiz[currentQ];
  const bq = BANK[item.qi];
  const total = quiz.length;
  document.getElementById('emp-display').textContent = T[lang].empOf + ' ' + empName;
  document.getElementById('progress-fill').style.width = Math.round((currentQ / total) * 100) + '%';
  document.getElementById('q-counter').textContent = (currentQ + 1) + ' / ' + total;
  document.getElementById('q-cat').textContent = bq.cat[lang];
  document.getElementById('q-text').textContent = bq.q[lang];

  const labels = lang === 'ar' ? ['أ','ب','ج','د'] : ['A','B','C','D'];
  const opts = bq.o[lang];
  const wrap = document.getElementById('options');
  wrap.innerHTML = '';
  if (item.matching) {
    renderMatch(item, bq);
  } else if (item.ordering) {
    // item.order[k] is the step shown in row k; answers[currentQ][k] is the rank (1-4) the employee gave it.
    item.order.forEach((stepIdx, k) => {
      const row = document.createElement('div');
      row.className = 'ord-row';
      const txt = document.createElement('div');
      txt.className = 'ord-text';
      txt.textContent = opts[stepIdx];
      row.appendChild(txt);
      const ranks = document.createElement('div');
      ranks.className = 'ord-ranks';
      [1, 2, 3, 4].forEach(n => {
        const b = document.createElement('button');
        b.className = 'num-btn' + (answers[currentQ][k] === n ? ' picked' : '');
        b.textContent = n;
        b.addEventListener('click', () => setRank(k, n));
        ranks.appendChild(b);
      });
      row.appendChild(ranks);
      wrap.appendChild(row);
    });
  } else item.order.forEach((origIdx, pos) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn' + (picked === pos ? ' picked' : '');
    btn.innerHTML = '<span class="opt-label">' + labels[pos] + '</span>';
    const txt = document.createElement('span');
    txt.textContent = opts[origIdx];
    btn.appendChild(txt);
    btn.addEventListener('click', () => selectOption(pos));
    wrap.appendChild(btn);
  });

  const next = document.getElementById('btn-next');
  next.textContent = currentQ === total - 1 ? T[lang].finish : T[lang].next;
  next.style.display = isAnswered(currentQ) ? '' : 'none';
  next.onclick = nextQuestion;
  const prev = document.getElementById('btn-prev');
  prev.textContent = T[lang].prev;
  prev.style.display = currentQ > 0 ? '' : 'none';
  prev.onclick = prevQuestion;
}

// No feedback shown during the test, so the next employee cannot learn the answers.
// The employee can change the answer on the same question, or go back to earlier questions.
function selectOption(pos) {
  answers[currentQ] = pos;
  renderQuestion();
}

// ───── MATCHING (tap a left item, then a right item, to join them with a line) ─────
// answers[currentQ][i] = the right slot k joined to left item i, or null.
let matchSel = null; // { side: 'L' | 'R', idx } while the employee is choosing the first item

function renderMatch(item, bq) {
  const wrap = document.getElementById('options');
  const a = answers[currentQ];
  const box = document.createElement('div');
  box.className = 'match-box';
  const cols = document.createElement('div');
  cols.className = 'match-cols';
  const colL = document.createElement('div'); colL.className = 'match-col';
  const colR = document.createElement('div'); colR.className = 'match-col';
  const used = new Set(a.filter(v => v !== null));
  bq.l[lang].forEach((txt, i) => {
    const b = document.createElement('button');
    b.className = 'match-item' + (a[i] !== null ? ' linked' : '') + (matchSel && matchSel.side === 'L' && matchSel.idx === i ? ' sel' : '');
    b.dataset.side = 'L'; b.dataset.idx = i;
    b.textContent = txt;
    b.addEventListener('click', () => matchClick('L', i));
    colL.appendChild(b);
  });
  item.order.forEach((pairIdx, k) => {
    const b = document.createElement('button');
    b.className = 'match-item' + (used.has(k) ? ' linked' : '') + (matchSel && matchSel.side === 'R' && matchSel.idx === k ? ' sel' : '');
    b.dataset.side = 'R'; b.dataset.idx = k;
    b.textContent = bq.r[lang][pairIdx];
    b.addEventListener('click', () => matchClick('R', k));
    colR.appendChild(b);
  });
  cols.appendChild(colL); cols.appendChild(colR);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'match-svg');
  box.appendChild(svg);
  box.appendChild(cols);
  wrap.appendChild(box);
  drawMatchLines();
}

function drawMatchLines() {
  const box = document.querySelector('#options .match-box');
  const item = quiz[currentQ];
  if (!box || !item || !item.matching) return;
  const svg = box.querySelector('svg.match-svg');
  const br = box.getBoundingClientRect();
  svg.setAttribute('width', br.width); svg.setAttribute('height', br.height);
  svg.setAttribute('viewBox', '0 0 ' + br.width + ' ' + br.height);
  svg.innerHTML = '';
  const a = answers[currentQ];
  a.forEach((k, i) => {
    if (k === null) return;
    const l = box.querySelector('[data-side="L"][data-idx="' + i + '"]');
    const r = box.querySelector('[data-side="R"][data-idx="' + k + '"]');
    if (!l || !r) return;
    const lr = l.getBoundingClientRect(), rr = r.getBoundingClientRect();
    // Left column is on the right of the screen (RTL): line leaves its left edge and enters the right column's right edge.
    const x1 = lr.left - br.left, y1 = lr.top + lr.height / 2 - br.top;
    const x2 = rr.right - br.left, y2 = rr.top + rr.height / 2 - br.top;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('class', 'match-line');
    svg.appendChild(line);
  });
}

window.addEventListener('resize', () => { if (quiz[currentQ] && quiz[currentQ].matching) drawMatchLines(); });

function matchClick(side, idx) {
  const a = answers[currentQ].slice();
  // Second tap on the other side: join the two items (a previous link on either item is replaced).
  if (matchSel && matchSel.side !== side) {
    const li = side === 'L' ? idx : matchSel.idx;
    const rk = side === 'L' ? matchSel.idx : idx;
    for (let j = 0; j < a.length; j++) if (a[j] === rk) a[j] = null;
    a[li] = rk;
    answers[currentQ] = a; matchSel = null; renderQuestion(); return;
  }
  // Tapping an item that is already joined removes that line.
  const linkedLeft = side === 'L' && a[idx] !== null;
  const linkedRight = side === 'R' && a.indexOf(idx) !== -1;
  if (linkedLeft || linkedRight) {
    if (side === 'L') a[idx] = null; else a[a.indexOf(idx)] = null;
    answers[currentQ] = a; matchSel = null; renderQuestion(); return;
  }
  // First tap: remember the item and wait for the other side.
  matchSel = { side, idx }; renderQuestion();
}

function isAnswered(i) {
  const a = answers[i];
  if (quiz[i].matching) return Array.isArray(a) && a.every(v => v !== null);
  if (quiz[i].ordering) return Array.isArray(a) && a.every(v => v !== null);
  return a !== null && a !== undefined;
}

// Give step k the rank n. If another step already has rank n, that step takes k's old rank (swap).
function setRank(k, n) {
  const arr = answers[currentQ].slice();
  const other = arr.indexOf(n);
  if (other !== -1 && other !== k) arr[other] = arr[k];
  arr[k] = n;
  answers[currentQ] = arr;
  renderQuestion();
}

// Points: ordering questions are worth 1-4 by difficulty (BANK pts); every other question is worth 1.
function itemPoints(item) { return 2; } // every question is worth 2 points: 50 x 2 = 100

function isCorrect(item, a) {
  if (item.matching) return a.every((k, i) => k !== null && item.order[k] === i);
  if (item.ordering) return a.every((n, k) => n - 1 === item.order[k]);
  return a === item.correctPos;
}

function nextQuestion() {
  if (!isAnswered(currentQ)) return;
  matchSel = null;
  currentQ++;
  if (currentQ >= quiz.length) { showResult(); return; }
  renderQuestion();
}

function prevQuestion() {
  if (currentQ === 0) return;
  matchSel = null;
  currentQ--;
  renderQuestion();
}
