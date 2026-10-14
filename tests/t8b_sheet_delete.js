// T8b: deleting one row from the sheet. MOCKED network: a fake sheet records what the site sends.
// It proves the request the site SENDS, not what Google Sheets does with it (that is manual, see T10).
const { launch, isolate, SITE_URL, check, emit } = require('./lib');
const ROWS = [
  ['date', 'name', 'score', 'pct', 'verdict', 'wrong', 'detail'],
  ['d', 'Test-01', '53/100', '53%', 'راسب', 'x', '[]'],
  ['d', 'Test-02', '39/100', '39%', 'راسب', 'x', '[]'],
  ['d', 'Test-03', '76/100', '76%', 'ناجح', 'x', '[]'],
];
(async () => {
  const checks = [];
  const browser = await launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const posts = [];
  await isolate(page, async (route) => {
    const req = route.request();
    if (req.method() === 'POST') { posts.push(JSON.parse(req.postData())); return route.fulfill({ status: 200, body: '' }); }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rows: ROWS }) });
  });
  await page.goto(SITE_URL);
  await page.evaluate(() => { window.confirm = () => true; });
  await page.evaluate(() => importFromSheet());
  const imported = await page.evaluate(() => importedRows.map((x) => ({ row: x.row, name: x.name })));
  const wantRows = [{ row: 2, name: 'Test-01' }, { row: 3, name: 'Test-02' }, { row: 4, name: 'Test-03' }];
  checks.push(check('import.row-numbers', JSON.stringify(imported) === JSON.stringify(wantRows), JSON.stringify(imported)));
  await page.evaluate(() => deleteFromSheet(importedRows.find((x) => x.name === 'Test-02')));
  await page.waitForTimeout(400);
  checks.push(check('delete.one-request', posts.length === 1, `requests=${posts.length}`));
  const p0 = posts[0] || {};
  checks.push(check('delete.action', p0.action === 'delete', p0.action));
  checks.push(check('delete.target-row', p0.row === 3, `row=${p0.row}`));
  checks.push(check('delete.target-name', p0.name === 'Test-02', p0.name));
  const keyOk = await page.evaluate((k) => PASSWORD === k, p0.key);
  checks.push(check('delete.key-matches-site', keyOk, keyOk ? 'match' : 'mismatch'));
  checks.push(check('no-page-errors', errors.length === 0, errors.join(' | ')));
  await browser.close();
  emit('T8b-sheet-delete-request', 'MOCKED network (fake sheet); real Google Sheets NOT contacted', checks);
})().catch((e) => { emit('T8b-sheet-delete-request', 'error', [check('runner', false, e.message)]); process.exit(1); });
