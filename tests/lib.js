// Shared helpers for all test files. Nothing here changes the site.
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const REPO_DIR = process.env.REPO_DIR || path.resolve(__dirname, '..');
const SITE_INDEX = path.join(REPO_DIR, 'index.html');
const SITE_URL = pathToFileURL(SITE_INDEX).href;

// Uses CHROME_PATH if set; otherwise the browser installed by `npx playwright install chromium`.
async function launch() {
  const opts = { headless: true, args: ['--no-sandbox'] };
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  return chromium.launch(opts);
}

// Blocks every request except local files. Optional mock handler for Google Sheets (script.google.com).
async function isolate(page, sheetMock) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith('file://')) return route.continue();
    if (sheetMock && url.includes('script.google.com')) return sheetMock(route);
    return route.abort();
  });
}

function check(id, ok, detail) {
  return { id, ok: !!ok, detail: detail === undefined ? '' : String(detail) };
}

// Each test file prints exactly one JSON object on stdout: { test, mode, checks: [...] }
function emit(test, mode, checks) {
  process.stdout.write(JSON.stringify({ test, mode, checks }) + '\n');
}

module.exports = { REPO_DIR, SITE_INDEX, SITE_URL, launch, isolate, check, emit };
