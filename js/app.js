const PASS_POINTS = 65;       // pass at 65 points out of 100
const SHEET_URL = "https://script.google.com/macros/s/AKfycbyX4Quq5LQE5yF3o3q0x133Zy8iGzNGBosmgFONFS1s4EUhrX_ACRNfgUHyZEUJfS_P/exec";

const QUIZ_LENGTH = 50;       // 10 each: food-safety MC, math, true/false, ordering, matching
const PASSWORD = "1122";
const TEST_CODE = "1234"; // code the manager gives employees when they are allowed to take the test

// ───── STATE ─────
let lang = 'ar';
let quiz = [];        // [{ qi, order }] built per employee: 20 random questions, shuffled options
let currentQ = 0;
let score = 0;
let picked = null;
let empName = '';
let records = [];
let answers = [];     // per-question record for the current employee: which option they chose

try {
  const saved = localStorage.getItem('health_quiz_records');
  if (saved) records = JSON.parse(saved);
} catch (e) {}
function saveRecords() {
  try { localStorage.setItem('health_quiz_records', JSON.stringify(records)); } catch (e) {}
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ───── LANGUAGE ─────
function setLang(l) {
  lang = l;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === l));
  applyTranslations();
  if (document.getElementById('screen-quiz').classList.contains('active')) renderQuestion();
  if (document.getElementById('screen-records').classList.contains('active')) renderRecords();
}

function applyTranslations() {
  const t = T[lang];
  document.documentElement.lang = lang;
  document.getElementById('lbl-lang').textContent = t.lbl;
  document.getElementById('hdr-title').textContent = t.hdrTitle;
  document.getElementById('hdr-sub').textContent = t.hdrSub;
  document.getElementById('s-title').textContent = t.startTitle;
  document.getElementById('s-sub').textContent = t.startSub;
  document.getElementById('lbl-name').textContent = t.lblName;
  document.getElementById('lbl-code').textContent = CODE_T[lang].lbl;
  document.getElementById('btn-start').textContent = t.btnStart;
  document.getElementById('nav-records').textContent = t.navRec;
  document.getElementById('btn-new-emp').textContent = t.btnNew;
  document.getElementById('btn-back-start').textContent = t.btnHome;
  document.getElementById('pw-title').textContent = t.pwTitle;
  document.getElementById('pw-sub').textContent = t.pwSub;
  document.getElementById('btn-unlock').textContent = t.btnUnlock;
  document.getElementById('btn-pw-back').textContent = t.btnPwBack;
  document.getElementById('rec-title').textContent = t.recTitle;
  document.getElementById('btn-clear').textContent = t.btnClear;
  document.getElementById('btn-import').textContent = t.btnImport;
  document.getElementById('btn-upload').textContent = t.btnUpload;
  document.getElementById('btn-prev').textContent = t.prev;
  document.getElementById('btn-rec-back').textContent = t.btnRecBack;
  document.getElementById('th-name').textContent = t.thName;
  document.getElementById('th-score').textContent = t.thScore;
  document.getElementById('th-pct').textContent = t.thPct;
  document.getElementById('th-verdict').textContent = t.thVerdict;
  document.getElementById('th-date').textContent = t.thDate;
  const rt = RT[lang];
  document.getElementById('btn-review').textContent = rt.btnReview;
  document.getElementById('rev-title').textContent = rt.revTitle;
  document.getElementById('btn-rev-back').textContent = rt.btnRevBack;
  document.getElementById('nav-study').textContent = STUDY_T[lang].btn;
  document.getElementById('study-title').textContent = STUDY_T[lang].title;
  document.getElementById('btn-study-back').textContent = STUDY_T[lang].back;
  if (document.getElementById('screen-study').classList.contains('active')) renderStudy();
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  // The study screen has its own language chips, so hide the global language bar there.
  document.querySelector('.lang-bar').style.display = id === 'study' ? 'none' : '';
}
function showStart() { showScreen('start'); }

// ───── WIRING ─────
document.getElementById('nav-study').addEventListener('click', showStudy);
document.getElementById('btn-study-back').addEventListener('click', showStart);
document.getElementById('btn-review').addEventListener('click', showReview);
document.getElementById('btn-rev-back').addEventListener('click', () => { renderRecords(); showScreen('records'); });
document.querySelectorAll('.lang-btn').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
document.getElementById('btn-start').addEventListener('click', startQuiz);
document.getElementById('emp-name').addEventListener('keydown', e => { if (e.key === 'Enter') startQuiz(); });
document.getElementById('nav-records').addEventListener('click', showRecords);
document.getElementById('btn-unlock').addEventListener('click', checkPassword);
document.getElementById('pw-input').addEventListener('keydown', e => { if (e.key === 'Enter') checkPassword(); });
document.getElementById('btn-pw-back').addEventListener('click', showStart);
document.getElementById('btn-rec-back').addEventListener('click', showStart);
document.getElementById('btn-clear').addEventListener('click', clearRecords);
document.getElementById('btn-upload').addEventListener('click', uploadRecords);
document.getElementById('btn-new-emp').addEventListener('click', newEmployee);
document.getElementById('btn-back-start').addEventListener('click', showStart);

applyTranslations();
