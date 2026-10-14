// T1: scoring boundaries. Real browser, network blocked, sheet call captured (not sent).
const { launch, isolate, SITE_URL, check, emit } = require('./lib');

// expectedPass uses the rule in the code: score >= 65 with 2 points per question => 33 correct is the first pass.
const SCENARIOS = [
  { name: 'all correct', correct: 50, frac: '100/100', pass: true },
  { name: 'all wrong', correct: 0, frac: '0/100', pass: false },
  { name: 'below threshold (32 correct = 64)', correct: 32, frac: '64/100', pass: false },
  { name: 'first passing score (33 correct = 66)', correct: 33, frac: '66/100', pass: true },
  { name: 'middle (25 correct = 50)', correct: 25, frac: '50/100', pass: false },
];

(async () => {
  const checks = [];
  const browser = await launch();
  for (const sc of SCENARIOS) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await isolate(page);
    await page.goto(SITE_URL);
    const r = await page.evaluate((n) => {
      window.__sent = [];
      window.sendToSheet = (d) => window.__sent.push(d); // capture instead of sending
      localStorage.removeItem('health_quiz_records');
      records = [];
      document.getElementById('emp-name').value = 'T1';
      document.getElementById('test-code').value = TEST_CODE;
      startQuiz();
      answers = quiz.map((item, i) => {
        const good = i < n;
        if (item.matching) return [0, 1, 2, 3].map((pair) => (good ? item.order.indexOf(pair) : (item.order.indexOf(pair) + 1) % 4));
        if (item.ordering) return item.order.map((o) => (good ? o + 1 : ((o + 1) % 4) + 1));
        return good ? item.correctPos : (item.correctPos === 0 ? 1 : 0);
      });
      showResult();
      const rec = records[records.length - 1];
      const sent = window.__sent[0] || null;
      return {
        frac: document.getElementById('score-frac').textContent,
        pct: document.getElementById('score-pct').textContent,
        verdict: document.getElementById('res-verdict').textContent,
        circle: document.getElementById('score-circle').className,
        recCount: records.length,
        rec,
        sentCount: window.__sent.length,
        sent,
        detailOkCount: sent ? JSON.parse(sent.detail).filter((x) => x[1] === true).length : -1,
        detailLen: sent ? JSON.parse(sent.detail).length : -1,
      };
    }, sc.correct);
    const pre = `S(${sc.name})`;
    const wantVerdict = sc.pass ? 'ناجح ✅' : 'راسب ❌';
    checks.push(check(`${pre}.score-text`, r.frac === sc.frac, `${r.frac} (expected ${sc.frac})`));
    checks.push(check(`${pre}.percent`, r.pct === sc.frac.split('/')[0] + '%', r.pct));
    checks.push(check(`${pre}.verdict`, r.verdict === wantVerdict, `${r.verdict} (expected ${wantVerdict})`));
    checks.push(check(`${pre}.circle-class`, r.circle.includes(sc.pass ? 'pass' : 'fail'), r.circle));
    checks.push(check(`${pre}.record-saved`, r.recCount === 1 && r.rec.pass === sc.pass && r.rec.score === sc.correct * 2 && r.rec.total === 100, JSON.stringify({ score: r.rec.score, total: r.rec.total, pass: r.rec.pass })));
    checks.push(check(`${pre}.sheet-payload-once`, r.sentCount === 1, `calls=${r.sentCount}`));
    checks.push(check(`${pre}.sheet-payload-fields`, r.sent && r.sent.score === sc.correct * 2 && r.sent.total === 100 && r.sent.pass === sc.pass && typeof r.sent.wrong === 'string' && r.sent.name === 'T1', r.sent ? JSON.stringify({ score: r.sent.score, pass: r.sent.pass, name: r.sent.name }) : 'none'));
    checks.push(check(`${pre}.sheet-detail-length`, r.detailLen === 50, `detail items=${r.detailLen}`));
    checks.push(check(`${pre}.sheet-detail-correct-count`, r.detailOkCount === sc.correct, `ok items=${r.detailOkCount}`));
    checks.push(check(`${pre}.no-page-errors`, errors.length === 0, errors.join(' | ')));
    await page.close();
  }
  await browser.close();
  emit('T1-scoring', 'real browser, network blocked, sheet call captured', checks);
})().catch((e) => { emit('T1-scoring', 'error', [check('runner', false, e.message)]); process.exit(1); });
