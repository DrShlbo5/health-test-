// T8: local results storage. Real browser, network blocked. Each case uses a fresh browser context (own localStorage).
const { launch, isolate, SITE_URL, check, emit } = require('./lib');
const SEED = [
  { name: 'A', score: 60, total: 100, pct: 60, pass: false, date: 'd1', sent: true },
  { name: 'B', score: 80, total: 100, pct: 80, pass: true, date: 'd2', sent: true },
  { name: 'C', score: 70, total: 100, pct: 70, pass: true, date: 'd3', sent: true },
];
async function freshPage(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await isolate(page);
  await page.goto(SITE_URL);
  return { ctx, page, errors };
}
(async () => {
  const checks = [];
  const browser = await launch();

  // A. stored results are loaded at startup
  {
    const { ctx, page, errors } = await freshPage(browser);
    await page.evaluate((s) => localStorage.setItem('health_quiz_records', JSON.stringify(s)), SEED);
    await page.reload();
    const names = await page.evaluate(() => records.map((r) => r.name).join(','));
    checks.push(check('A.loads-stored-results', names === 'A,B,C', names));
    await page.evaluate(() => { showRecords(); renderRecords(); });
    const rows = await page.evaluate(() => document.querySelectorAll('#records-body tr').length);
    checks.push(check('A.table-rows', rows === 3, rows));
    checks.push(check('A.no-page-errors', errors.length === 0, errors.join(' | ')));
    await ctx.close();
  }

  // B. a new test result is appended and earlier results are kept unchanged
  {
    const { ctx, page, errors } = await freshPage(browser);
    await page.evaluate((s) => localStorage.setItem('health_quiz_records', JSON.stringify(s)), SEED);
    await page.reload();
    await page.evaluate(() => {
      window.sendToSheet = () => {};
      document.getElementById('emp-name').value = 'NEW';
      document.getElementById('test-code').value = TEST_CODE;
      startQuiz();
      answers = quiz.map((item, i) => {
        const good = i < 40;
        if (item.matching) return [0, 1, 2, 3].map((pair) => (good ? item.order.indexOf(pair) : (item.order.indexOf(pair) + 1) % 4));
        if (item.ordering) return item.order.map((o) => (good ? o + 1 : ((o + 1) % 4) + 1));
        return good ? item.correctPos : (item.correctPos === 0 ? 1 : 0);
      });
      showResult();
    });
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('health_quiz_records')));
    checks.push(check('B.count-after-save', stored.length === 4, stored.length));
    const oldKept = JSON.stringify(stored.slice(0, 3)) === JSON.stringify(SEED);
    checks.push(check('B.old-results-unchanged', oldKept, oldKept ? 'identical' : JSON.stringify(stored.slice(0, 3))));
    const last = stored[3] || {};
    checks.push(check('B.new-result-fields', last.name === 'NEW' && last.score === 80 && last.total === 100 && last.pct === 80 && last.pass === true && last.sent === true && typeof last.date === 'string', JSON.stringify(last)));
    await page.reload();
    const after = await page.evaluate(() => records.length);
    checks.push(check('B.persists-after-reload', after === 4, after));
    checks.push(check('B.no-page-errors', errors.length === 0, errors.join(' | ')));
    await ctx.close();
  }

  // C. clearing all results needs two clicks, then empties storage
  {
    const { ctx, page, errors } = await freshPage(browser);
    await page.evaluate((s) => localStorage.setItem('health_quiz_records', JSON.stringify(s)), SEED);
    await page.reload();
    await page.evaluate(() => { showRecords(); renderRecords(); clearRecords(); });
    const afterOne = await page.evaluate(() => JSON.parse(localStorage.getItem('health_quiz_records')).length);
    checks.push(check('C.one-click-keeps-data', afterOne === 3, afterOne));
    await page.evaluate(() => clearRecords());
    const afterTwo = await page.evaluate(() => JSON.parse(localStorage.getItem('health_quiz_records')).length);
    checks.push(check('C.two-clicks-clears', afterTwo === 0, afterTwo));
    checks.push(check('C.no-page-errors', errors.length === 0, errors.join(' | ')));
    await ctx.close();
  }

  // D. description check: local records have no per-row delete button (only clear-all)
  {
    const { ctx, page } = await freshPage(browser);
    await page.evaluate((s) => localStorage.setItem('health_quiz_records', JSON.stringify(s)), SEED);
    await page.reload();
    const buttons = await page.evaluate(() => { showRecords(); renderRecords(); return document.querySelectorAll('#records-body button').length; });
    checks.push(check('D.no-local-per-row-delete', buttons === 0, `buttons in table=${buttons}`));
    await ctx.close();
  }
  await browser.close();
  emit('T8-local-records', 'real browser, network blocked, separate storage per case', checks);
})().catch((e) => { emit('T8-local-records', 'error', [check('runner', false, e.message)]); process.exit(1); });
