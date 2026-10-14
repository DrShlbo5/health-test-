// Runs every automated check, then writes report.md and results.json next to this file.
// Does not modify the site. Works on Windows and Linux (plain Node, no shell scripts).
//
// Usage:
//   node run_all.js                      (REPO_DIR defaults to the folder above this one)
//   REPO_DIR=/path/to/site ORIG_HTML=/path/to/original.html node run_all.js
//   (Windows PowerShell)  $env:REPO_DIR="C:\path\to\site"; $env:ORIG_HTML="C:\path\to\original.html"; node run_all.js
//
// Exit code: 1 if any automated check FAILs; 0 otherwise. SKIPPED and MANUAL do not fail the run.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const REPO = process.env.REPO_DIR ? path.resolve(process.env.REPO_DIR) : path.resolve(HERE, '..');
const ORIG = process.env.ORIG_HTML ? path.resolve(process.env.ORIG_HTML) : '';

const TESTS = [
  { file: 't1_scoring.js', title: 'T1 الدرجات والنجاح عند الحدود (0، 25، 32، 33، 50 إجابة صح)' },
  { file: 't7_smoke.js', title: 'T7 كل الشاشات بكل اللغات السبع' },
  { file: 't8_records.js', title: 'T8 السجل المحلي (تحميل، إضافة نتيجة جديدة مع بقاء القديمة، مسح بضغطتين)' },
  { file: 't8b_sheet_delete.js', title: 'T8b الحذف من الشيت يستهدف الصف المحدد فقط (شبكة وهمية)' },
  { file: 't9_details.js', title: 'T9 تفاصيل الإجابات الخاطئة لكل الأنواع (5 اختبارات عشوائية)' },
  { file: 't11_parity.js', title: 'T11 التطابق مع الملف الأصلي (حرفي ودلالي)' },
];

// Checks that only a person can run on the live site. Never reported as PASS.
const MANUAL = [
  {
    title: 'T10 Google Sheets: إرسال نتيجة حقيقية، استيراد، حذف صف',
    note: 'لم يُختبر هنا: الاتصال بـ script.google.com محجوب في بيئة الاختبار، والسكربت الحقيقي ليس في المستودع.',
    steps: [
      'افتح الموقع المنشور، أدخل اسماً تجريبياً (مثلاً TEST-SHEET) ورمز الاختبار، وأكمل الاختبار.',
      'تأكد أن الشيت استقبل صفاً جديداً فيه الاسم والدرجة والنسبة والنجاح والتفاصيل.',
      'ادخل السجل بكلمة المرور، واضغط استيراد من الشيت، وتأكد أن الصف ظهر.',
      'اضغط حذف على الصف التجريبي فقط وأكّد. بعد ثانيتين تأكد أنه اختفى وأن بقية الصفوف موجودة.',
      'أعد الاستيراد وقارن عدد الصفوف (ناقص واحد عن قبل الحذف).',
    ],
  },
];

const MODE_LABEL = {
  't1_scoring.js': 'محاكاة: المتصفح بلا شبكة، وإرسال الشيت مُلتقَط لا يُرسل',
  't7_smoke.js': 'متصفح حقيقي بلا شبكة',
  't8_records.js': 'متصفح حقيقي بلا شبكة، كل حالة في سياق نظيف',
  't8b_sheet_delete.js': 'شبكة وهمية: خادم شيت مزيّف، لا يوجد اتصال بـ Google',
  't9_details.js': 'متصفح حقيقي بلا شبكة، إرسال الشيت مُلتقَط',
  't11_parity.js': 'حرفي: مقارنة ملفات بلا متصفح | دلالي: متصفح بلا شبكة',
};

function git(args) {
  const r = spawnSync('git', ['-C', REPO, ...args], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : 'غير متاح';
}

function runTest(t) {
  const env = { ...process.env, REPO_DIR: REPO };
  if (ORIG) env.ORIG_HTML = ORIG;
  const r = spawnSync(process.execPath, [path.join(HERE, t.file)], { env, encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024 });
  const lines = (r.stdout || '').split('\n').filter((l) => l.trim().startsWith('{'));
  let parsed = null;
  for (let i = lines.length - 1; i >= 0 && !parsed; i--) {
    try { parsed = JSON.parse(lines[i]); } catch (_) { /* keep looking */ }
  }
  if (!parsed) {
    return { file: t.file, title: t.title, status: 'FAIL', mode: MODE_LABEL[t.file] || '', checks: [{ id: 'runner', ok: false, detail: `no JSON result (exit ${r.status}). ${(r.stderr || '').slice(-400)}`, mode: '' }] };
  }
  if (parsed.skipped) {
    return { file: t.file, title: t.title, status: 'SKIPPED', mode: parsed.mode, checks: [{ id: 'skipped', ok: null, detail: parsed.reason, mode: parsed.mode }] };
  }
  const checks = parsed.checks.map((c) => ({ ...c, mode: parsed.mode }));
  const failed = checks.some((c) => !c.ok) || r.status !== 0;
  return { file: t.file, title: t.title, status: failed ? 'FAIL' : 'PASS', mode: parsed.mode, checks, exit: r.status };
}

function cell(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

(async () => {
  const started = new Date();
  const statusBefore = git(['status', '--porcelain']);
  const results = TESTS.map(runTest);
  const counts = { PASS: 0, FAIL: 0, SKIPPED: 0, MANUAL: MANUAL.length };
  results.forEach((r) => { counts[r.status]++; });
  const checkCount = results.reduce((n, r) => n + r.checks.filter((c) => c.ok !== null).length, 0);
  const checkPass = results.reduce((n, r) => n + r.checks.filter((c) => c.ok === true).length, 0);

  const out = {
    generatedAt: started.toISOString(),
    site: REPO,
    originalFile: ORIG || null,
    gitHead: git(['rev-parse', '--short', 'HEAD']),
    gitStatusBefore: statusBefore || '(نظيف)',
    gitStatusAfter: git(['status', '--porcelain']) || '(نظيف: لا تغييرات في الموقع)',
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
    summary: { ...counts, checksRun: checkCount, checksPassed: checkPass },
    results,
    manual: MANUAL,
  };
  fs.writeFileSync(path.join(HERE, 'results.json'), JSON.stringify(out, null, 2), 'utf8');

  const L = [];
  L.push('# تقرير الاختبارات', '');
  L.push(`- التاريخ: ${started.toISOString().replace('T', ' ').slice(0, 16)} UTC`);
  L.push(`- الموقع: \`${REPO}\``);
  L.push(`- الملف الأصلي للمقارنة: ${ORIG ? '`' + ORIG + '`' : 'لم يُعطَ (T11 متخطّى)'}`);
  L.push(`- آخر commit في الموقع: \`${out.gitHead}\``);
  L.push(`- حالة الموقع بعد الاختبار (git status): ${out.gitStatusAfter === '' ? '(نظيف)' : '```\n' + out.gitStatusAfter + '\n```'}`);
  L.push(`- Node ${out.nodeVersion} على ${out.platform}`, '');

  L.push('## الملخص', '');
  L.push('| الحالة | العدد |', '|---|---|');
  L.push(`| PASS | ${counts.PASS} |`, `| FAIL | ${counts.FAIL} |`, `| SKIPPED | ${counts.SKIPPED} |`, `| يدوي (MANUAL) - لم يُنفّذ | ${counts.MANUAL} |`);
  L.push('', `الفحوص الآلية: ${checkPass} نجحت من ${checkCount}.`, '');

  L.push('## الجدول', '');
  L.push('| الاختبار | الحالة | نوع المحاكاة |', '|---|---|---|');
  results.forEach((r) => L.push(`| ${cell(r.title)} | ${r.status} | ${cell(r.mode)} |`));
  MANUAL.forEach((m) => L.push(`| ${cell(m.title)} | MANUAL (لم يُنفّذ) | حقيقي على الموقع المنشور - يدوي |`));
  L.push('');

  L.push('## تفاصيل كل فحص', '');
  results.forEach((r) => {
    L.push(`### ${r.title} — ${r.status}`, '');
    if (r.status === 'SKIPPED') { L.push(`سبب التخطي: ${r.checks[0].detail}`, ''); return; }
    L.push('| الفحص | النتيجة | التفاصيل |', '|---|---|---|');
    r.checks.forEach((c) => L.push(`| \`${cell(c.id)}\` | ${c.ok === null ? '—' : c.ok ? 'PASS' : 'FAIL'} | ${cell(c.detail)} |`));
    L.push('');
  });

  L.push('## يدوي: Google Sheets على الموقع المنشور (لم يُختبر هنا)', '');
  MANUAL.forEach((m) => {
    L.push(`**${m.title}** — ${m.note}`, '');
    m.steps.forEach((s, i) => L.push(`${i + 1}. ${s}`));
    L.push('');
  });

  L.push('## أنواع المحاكاة', '');
  L.push('- **متصفح حقيقي بلا شبكة:** Chromium يفتح الملف المحلي، وكل طلب خارجي محجوب.');
  L.push('- **إرسال الشيت مُلتقَط:** الدالة sendToSheet تُستبدل داخل الصفحة لتسجيل البيانات المرسلة بدل إرسالها. يثبت ما يرسله الموقع، لا ما يفعله Google.');
  L.push('- **شبكة وهمية:** ردود مزيّفة من خادم الشيت (T8b). يثبت الطلب الذي يرسله الموقع، لا النتيجة على الشيت.');
  L.push('- **مقارنة ملفات:** T11a يقارن الأسطر بين الملف الأصلي والملفات الجديدة بدون ترتيب. يكشف الأسطر المفقودة أو الزائدة، ولا يثبت ترتيب الكود أو سلوكه.');
  L.push('- **يدوي:** خطوات لا تُنفّذ آلياً، ولا تُعتبر ناجحة إلا إذا نفّذها شخص على الموقع الفعلي.');

  fs.writeFileSync(path.join(HERE, 'report.md'), L.join('\n') + '\n', 'utf8');

  console.log(`PASS=${counts.PASS} FAIL=${counts.FAIL} SKIPPED=${counts.SKIPPED} MANUAL=${counts.MANUAL} checks=${checkPass}/${checkCount}`);
  results.forEach((r) => console.log(`${r.status.padEnd(8)} ${r.file}`));
  console.log('report: ' + path.join(HERE, 'report.md'));
  process.exit(counts.FAIL > 0 ? 1 : 0);
})();
