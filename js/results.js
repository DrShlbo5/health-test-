// ───── RESULT ─────
function showResult() {
  const t = T[lang];
  const log = quiz.map((item, i) => ({ qi: item.qi, order: item.order, chosen: answers[i], correctPos: item.correctPos, ordering: !!item.ordering, matching: !!item.matching, ok: isCorrect(item, answers[i]), pts: itemPoints(item) }));
  const totalPts = log.reduce((sum, a) => sum + a.pts, 0);
  score = log.filter(a => a.ok).reduce((sum, a) => sum + a.pts, 0);
  const total = totalPts;
  const pct = Math.round((score / total) * 100);
  const pass = score >= PASS_POINTS;

  showScreen('result');
  const circle = document.getElementById('score-circle');
  circle.className = 'score-circle ' + (pass ? 'pass' : 'fail');
  document.getElementById('score-pct').textContent = pct + '%';
  document.getElementById('score-frac').textContent = score + '/' + totalPts;
  document.getElementById('res-name').textContent = empName;
  const verdict = document.getElementById('res-verdict');
  verdict.textContent = pass ? t.pass : t.fail;
  verdict.className = 'verdict ' + (pass ? 'verdict-pass' : 'verdict-fail');
  document.getElementById('btn-new-emp').onclick = newEmployee;
  document.getElementById('btn-back-start').onclick = showStart;

  const now = new Date();
  const date = now.toLocaleDateString('ar-SA') + ' ' + now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  records.push({ name: empName, score, total, pct, pass, date, sent: true });
  saveRecords();
  // List of wrong answers (Arabic text): question, what the employee chose, and the correct answer.
  const wrongLines = log
    .filter(a => !a.ok)
    .map((a, i) => {
      const bq = BANK[a.qi];
      const head = (i + 1) + ') ' + bq.q.ar;
      if (a.matching) {
        // Each joined pair on its own line: what the employee joined vs. the correct pairs.
        const chosen = a.chosen.map((k, j) => {
          const right = k === null ? '(بدون وصل)' : bq.r.ar[a.order[k]];
          const mark = (k !== null && a.order[k] === j) ? '✓' : '✗';
          return '   ' + mark + ' ' + bq.l.ar[j] + ' ↔ ' + right;
        }).join('\n');
        const correct = bq.l.ar.map((x, j) => '   ✓ ' + x + ' ↔ ' + bq.r.ar[j]).join('\n');
        return head + '\n  إجابتك:\n' + chosen + '\n  الصحيح:\n' + correct;
      }
      if (a.ordering) {
        // Steps listed in the order the employee ranked them, then the correct order.
        const chosenSeq = [1, 2, 3, 4].map(r => {
          const k = a.chosen.indexOf(r);
          return '   ' + r + '. ' + (k === -1 ? '—' : bq.o.ar[a.order[k]]);
        }).join('\n');
        const correct = bq.o.ar.map((x, j) => '   ' + (j + 1) + '. ' + x).join('\n');
        return head + '\n  إجابتك:\n' + chosenSeq + '\n  الصحيح:\n' + correct;
      }
      return head + '\n  إجابتك: ' + bq.o.ar[a.order[a.chosen]] + '\n  الصحيح: ' + bq.o.ar[a.order[a.correctPos]];
    });
  // Every answer in test order, so the results log can show the whole test: [question, correct?, employee's answer tokens]
  const detailArr = log.map(a => {
    const bq = BANK[a.qi];
    let tokens = [];
    if (a.matching) tokens = a.chosen.map((k, j) => k === null ? null : bq.l.ar[j] + ' ↔ ' + bq.r.ar[a.order[k]]).filter(Boolean);
    else if (a.ordering) tokens = [1, 2, 3, 4].map(r => { const k = a.chosen.indexOf(r); return k === -1 ? null : bq.o.ar[a.order[k]]; }).filter(Boolean);
    else if (a.chosen !== null && a.chosen !== undefined) tokens = [bq.o.ar[a.order[a.chosen]]];
    return [bq.q.ar, !!a.ok, tokens];
  });
  sendToSheet({ name: empName, score, total, pct, pass, wrong: wrongLines.join('\n\n') || 'لا يوجد', detail: JSON.stringify(detailArr) });
}

function newEmployee() {
  document.getElementById('emp-name').value = '';
  showScreen('start');
}
