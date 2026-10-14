// T9: wrong-answer details for every question type (all answers wrong), 5 random quizzes.
// Expected text is built here from BANK (not copied from the site's own formatter), then compared
// with the text the site puts in the Google Sheets payload. Real browser, network blocked, sheet call stubbed.
const { launch, isolate, SITE_URL, check, emit } = require('./lib');

const RUNS = 5;

(async () => {
  const checks = [];
  const browser = await launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await isolate(page);
  await page.goto(SITE_URL);

  const runs = await page.evaluate((runs) => {
    const out = [];
    for (let r = 0; r < runs; r++) {
      window.__sent = [];
      window.sendToSheet = (d) => window.__sent.push(d); // stub: capture, do not send
      localStorage.removeItem('health_quiz_records');
      records = [];
      document.getElementById('emp-name').value = 'T9-' + (r + 1);
      document.getElementById('test-code').value = TEST_CODE;
      startQuiz();
      // every answer wrong
      answers = quiz.map((item) => {
        if (item.matching) return item.order.map((_, pair) => (item.order.indexOf(pair) + 1) % 4);
        if (item.ordering) return item.order.map((o) => ((o + 1) % 4) + 1);
        return item.correctPos === 0 ? 1 : 0;
      });
      showResult();
      const d = window.__sent[0];
      const wrongBlocks = d.wrong.split('\n\n');
      const exp = quiz.map((item, i) => {
        const bq = BANK[item.qi];
        const head = (i + 1) + ') ' + bq.q.ar;
        const a = answers[i];
        if (item.matching) {
          const chosen = a.map((k, j) => '   ✗ ' + bq.l.ar[j] + ' ↔ ' + bq.r.ar[item.order[k]]).join('\n');
          const correct = bq.l.ar.map((x, j) => '   ✓ ' + x + ' ↔ ' + bq.r.ar[j]).join('\n');
          return { text: head + '\n  إجابتك:\n' + chosen + '\n  الصحيح:\n' + correct, type: 'matching' };
        }
        if (item.ordering) {
          const chosen = [1, 2, 3, 4].map((rank) => { const k = a.indexOf(rank); return '   ' + rank + '. ' + (k === -1 ? '—' : bq.o.ar[item.order[k]]); }).join('\n');
          const correct = bq.o.ar.map((x, j) => '   ' + (j + 1) + '. ' + x).join('\n');
          return { text: head + '\n  إجابتك:\n' + chosen + '\n  الصحيح:\n' + correct, type: 'ordering' };
        }
        const txt = head + '\n  إجابتك: ' + bq.o.ar[item.order[a]] + '\n  الصحيح: ' + bq.o.ar[item.order[item.correctPos]];
        return { text: txt, type: bq.tf ? 'truefalse' : 'mc' };
      });
      const detail = JSON.parse(d.detail);
      const mismatches = [];
      let matched = 0;
      const byType = {};
      exp.forEach((e, i) => {
        byType[e.type] = byType[e.type] || { n: 0, ok: 0 };
        byType[e.type].n++;
        if (wrongBlocks[i] === e.text) { byType[e.type].ok++; matched++; }
        else mismatches.push({ i: i + 1, type: e.type, expected: e.text.slice(0, 160), got: (wrongBlocks[i] || '').slice(0, 160) });
      });
      out.push({
        total: quiz.length,
        blocks: wrongBlocks.length,
        matched,
        byType,
        mismatches: mismatches.slice(0, 3),
        detailLen: detail.length,
        detailOk: detail.length === quiz.length && detail.every((x) => x[1] === false && Array.isArray(x[2]) && x[2].length > 0),
      });
    }
    return out;
  }, RUNS);

  runs.forEach((r, i) => {
    const p = `run${i + 1}`;
    const types = Object.entries(r.byType).map(([t, v]) => `${t}:${v.ok}/${v.n}`).join(' ');
    checks.push(check(`${p}.text-matches-BANK`, r.matched === r.total, `${r.matched}/${r.total} blocks match (${types})${r.mismatches.length ? ' first mismatch: ' + JSON.stringify(r.mismatches[0]) : ''}`));
    checks.push(check(`${p}.block-count`, r.blocks === r.total, `blocks=${r.blocks} questions=${r.total}`));
    checks.push(check(`${p}.detail-array`, r.detailOk, `entries=${r.detailLen}, each ok=false with tokens`));
  });
  checks.push(check('no-page-errors', errors.length === 0, errors.join(' | ')));

  await browser.close();
  emit('T9-wrong-details', 'real browser, network blocked, sheet call stubbed', checks);
})().catch((e) => { emit('T9-wrong-details', 'error', [check('runner', false, e.message)]); process.exit(1); });
