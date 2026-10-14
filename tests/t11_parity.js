// T11: parity between the ORIGINAL single-file site (ORIG_HTML) and the split site (REPO_DIR).
// T11a literal: every line of the original <style>/<script> content appears in css/style.css + js/*.js, and vice versa
//                (line multiset, order ignored). Markup lines of the original must appear in index.html. No browser.
// T11b semantic: the data constants and settings are equal after JSON conversion, read in a real browser.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { REPO_DIR, SITE_INDEX, SITE_URL, launch, isolate, check, emit } = require('./lib');

const ORIG = process.env.ORIG_HTML;
const MODE = 'T11a: file comparison, no browser | T11b: real browser, network blocked';

if (!ORIG || !fs.existsSync(ORIG)) {
  process.stdout.write(JSON.stringify({ test: 'T11-parity', mode: MODE, skipped: true, reason: 'ORIG_HTML not set or file missing' }) + '\n');
  process.exit(0);
}

const SEMANTIC_NAMES = ['BANK', 'STUDY_NOTES', 'T', 'CODE_T', 'RT', 'STUDY_T', 'REV_LANGS', 'NOTE_IDX', 'NOTE_TITLE_IDX',
  'PASS_POINTS', 'QUIZ_LENGTH', 'PASSWORD', 'TEST_CODE', 'SHEET_URL'];

function splitOriginal(text) {
  const code = [];
  let rest = text;
  // remove <style>…</style> and inline <script>…</script> (no src); keep their inner lines as code
  rest = rest.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, inner) => { code.push(...inner.split('\n')); return ''; });
  rest = rest.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (_, inner) => { code.push(...inner.split('\n')); return ''; });
  return { code, markup: rest.split('\n') };
}

function multisetDiff(a, b) {
  const count = (arr) => arr.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
  const ca = count(a), cb = count(b);
  const onlyA = [], onlyB = [];
  for (const [k, v] of ca) { const d = v - (cb.get(k) || 0); if (d > 0) onlyA.push({ line: k, count: d }); }
  for (const [k, v] of cb) { const d = v - (ca.get(k) || 0); if (d > 0) onlyB.push({ line: k, count: d }); }
  return { onlyA, onlyB };
}

(async () => {
  const checks = [];

  // ---- T11a literal ----
  const orig = splitOriginal(fs.readFileSync(ORIG, 'utf8'));
  const normalize = (arr) => arr.map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim() !== '');
  const newCode = [path.join(REPO_DIR, 'css', 'style.css'), ...fs.readdirSync(path.join(REPO_DIR, 'js')).filter((f) => f.endsWith('.js')).sort().map((f) => path.join(REPO_DIR, 'js', f))]
    .flatMap((f) => fs.readFileSync(f, 'utf8').split('\n'));
  const codeDiff = multisetDiff(normalize(orig.code), normalize(newCode));
  checks.push(check('T11a.code-lines-equal', codeDiff.onlyA.length === 0 && codeDiff.onlyB.length === 0,
    `original code lines=${normalize(orig.code).length}, new css+js lines=${normalize(newCode).length}, only in original=${JSON.stringify(codeDiff.onlyA).slice(0, 300)}, only in new=${JSON.stringify(codeDiff.onlyB).slice(0, 300)}`));
  const newIndex = fs.readFileSync(path.join(REPO_DIR, 'index.html'), 'utf8').split('\n');
  const markupDiff = multisetDiff(normalize(orig.markup), normalize(newIndex));
  checks.push(check('T11a.markup-lines-present', markupDiff.onlyA.length === 0,
    `original markup lines=${normalize(orig.markup).length}, missing in new index.html=${JSON.stringify(markupDiff.onlyA).slice(0, 300)}`));

  // ---- T11b semantic ----
  const browser = await launch();
  const grab = async (file) => {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await isolate(page);
    await page.goto(pathToFileURL(file).href);
    const out = await page.evaluate((names) => {
      const o = {};
      names.forEach((n) => { try { o[n] = JSON.stringify(eval(n)); } catch (e) { o[n] = 'ERR ' + e.message; } });
      return o;
    }, SEMANTIC_NAMES);
    await page.close();
    return { out, errs };
  };
  const a = await grab(ORIG);
  const b = await grab(SITE_INDEX);
  await browser.close();

  const diffs = SEMANTIC_NAMES.filter((n) => a.out[n] !== b.out[n] || String(a.out[n]).startsWith('ERR'));
  checks.push(check('T11b.data-constants-equal', diffs.length === 0, `${SEMANTIC_NAMES.length} constants compared, differences: ${JSON.stringify(diffs)}`));
  checks.push(check('T11b.no-page-errors', a.errs.length === 0 && b.errs.length === 0, `original=${JSON.stringify(a.errs)} new=${JSON.stringify(b.errs)}`));

  emit('T11-parity', MODE, checks);
})().catch((e) => { emit('T11-parity', MODE, [check('runner', false, e.message)]); process.exit(1); });
