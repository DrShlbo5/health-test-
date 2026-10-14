// T7: every screen in every language. Real browser, network blocked.
const { launch, isolate, SITE_URL, check, emit } = require('./lib');
const LANGS = ['ar', 'en', 'hi', 'bn', 'id', 'ne', 'te'];
(async () => {
  const checks = [];
  const browser = await launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await isolate(page);
  await page.goto(SITE_URL);
  for (const L of LANGS) {
    const r = await page.evaluate((L) => {
      const out = {};
      try { setLang(L); out.lang = 'ok'; } catch (e) { out.lang = e.message; }
      try { showStudy(); studyLang = L; renderStudy(); out.study = document.getElementById('note-body') ? 'ok' : (document.getElementById('screen-study').textContent.length > 100 ? 'ok' : 'short'); } catch (e) { out.study = e.message; }
      try { showReview(); renderReview(); out.review = document.getElementById('review-body').children.length; } catch (e) { out.review = e.message; }
      try { showRecords(); renderRecords(); out.records = 'ok'; } catch (e) { out.records = e.message; }
      try { showStart(); out.start = document.getElementById('screen-start').classList.contains('active'); } catch (e) { out.start = e.message; }
      return out;
    }, L);
    checks.push(check(`${L}.setLang`, r.lang === 'ok', r.lang));
    checks.push(check(`${L}.study-renders`, r.study === 'ok', r.study));
    checks.push(check(`${L}.review-has-163`, r.review === 163, r.review));
    checks.push(check(`${L}.records-renders`, r.records === 'ok', r.records));
    checks.push(check(`${L}.start-screen`, r.start === true, r.start));
  }
  checks.push(check('no-page-errors', errors.length === 0, errors.join(' | ')));
  await browser.close();
  emit('T7-screens-all-languages', 'real browser, network blocked', checks);
})().catch((e) => { emit('T7-screens-all-languages', 'error', [check('runner', false, e.message)]); process.exit(1); });
