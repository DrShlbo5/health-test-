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
  document.querySelector('.header').style.display = id === 'study' ? 'none' : '';
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

// Add a locked test entry after the last lesson. It uses the existing name and manager code form.
const renderStudyWithoutTestEntry = renderStudy;
renderStudy = function() {
  renderStudyWithoutTestEntry();
  addTestEntryCard();
};

function addTestEntryCard() {
  const lessonList = document.querySelector('#study-body .lesson-list');
  if (!lessonList) return;

  const labels = {
    ar: {
      test: ['الاختبار', 'أدخل اسمك ورمز الاختبار للبدء'],
      results: ['النتائج 🔒', 'أدخل كلمة مرور المدير لعرض النتائج']
    },
    en: {
      test: ['Test', 'Enter your name and test code to begin'],
      results: ['Results 🔒', 'Enter the manager password to view results']
    },
    hi: {
      test: ['परीक्षा', 'शुरू करने के लिए अपना नाम और परीक्षा कोड लिखें'],
      results: ['परिणाम 🔒', 'परिणाम देखने के लिए प्रबंधक का पासवर्ड लिखें']
    },
    bn: {
      test: ['পরীক্ষা', 'শুরু করতে আপনার নাম ও পরীক্ষার কোড লিখুন'],
      results: ['ফলাফল 🔒', 'ফলাফল দেখতে ম্যানেজারের পাসওয়ার্ড লিখুন']
    },
    id: {
      test: ['Tes', 'Masukkan nama dan kode tes untuk memulai'],
      results: ['Hasil 🔒', 'Masukkan kata sandi manajer untuk melihat hasil']
    },
    ne: {
      test: ['परीक्षा', 'सुरु गर्न आफ्नो नाम र परीक्षा कोड लेख्नुहोस्'],
      results: ['नतिजा 🔒', 'नतिजा हेर्न व्यवस्थापकको पासवर्ड लेख्नुहोस्']
    },
    te: {
      test: ['పరీక్ష', 'ప్రారంభించడానికి మీ పేరు, పరీక్ష కోడ్ నమోదు చేయండి'],
      results: ['ఫలితాలు 🔒', 'ఫలితాలు చూడటానికి నిర్వాహక పాస్‌వర్డ్ నమోదు చేయండి']
    }
  };
  const text = labels[lang] || labels.ar;
  createStudyActionCard(lessonList, 'test-entry-card', 'test-entry-card', text.test, openInlineTestForm);
  createStudyActionCard(lessonList, 'results-entry-card', 'results-entry-card', text.results, showRecords);
  createInlineTestForm();
}

function createStudyActionCard(lessonList, id, kind, text, action) {
  if (document.getElementById(id)) return;

  const card = document.createElement('button');
  card.type = 'button';
  card.id = id;
  card.className = 'lesson-card ' + kind;
  card.setAttribute('aria-label', text[0] + '. ' + text[1]);

  const info = document.createElement('span');
  info.className = 'lesson-info';
  const title = document.createElement('span');
  title.className = 'lesson-name';
  title.textContent = text[0];
  const detail = document.createElement('span');
  detail.className = 'lesson-meta';
  detail.textContent = text[1];
  info.append(title, detail);

  const lock = document.createElement('span');
  lock.className = 'lesson-state test-entry-lock';
  lock.textContent = '🔒';
  lock.setAttribute('aria-hidden', 'true');

  card.append(info, lock);
  card.addEventListener('click', action);
  lessonList.appendChild(card);
}

function createInlineTestForm() {
  if (document.getElementById('inline-test-form')) return;

  const form = document.createElement('form');
  form.id = 'inline-test-form';
  form.className = 'inline-test-form';
  form.hidden = true;

  const nameLabel = document.createElement('label');
  nameLabel.className = 'inline-test-label';
  nameLabel.htmlFor = 'inline-emp-name';
  nameLabel.textContent = T[lang].lblName;
  const nameInput = document.createElement('input');
  nameInput.id = 'inline-emp-name';
  nameInput.className = 'text-input';
  nameInput.type = 'text';
  nameInput.autocomplete = 'name';
  nameInput.required = true;

  const codeLabel = document.createElement('label');
  codeLabel.className = 'inline-test-label';
  codeLabel.htmlFor = 'inline-test-code';
  codeLabel.textContent = CODE_T[lang].lbl;
  const codeInput = document.createElement('input');
  codeInput.id = 'inline-test-code';
  codeInput.className = 'text-input';
  codeInput.type = 'password';
  codeInput.autocomplete = 'off';
  codeInput.required = true;

  const error = document.createElement('p');
  error.id = 'inline-test-error';
  error.className = 'error-msg';
  error.hidden = true;

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'btn btn-primary btn-block';
  submit.textContent = T[lang].btnStart;

  form.append(nameLabel, nameInput, codeLabel, codeInput, error, submit);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    if (!name) {
      error.textContent = T[lang].enterName;
      error.hidden = false;
      nameInput.focus();
      return;
    }
    if (code !== TEST_CODE) {
      error.textContent = CODE_T[lang].err;
      error.hidden = false;
      codeInput.focus();
      return;
    }
    document.getElementById('emp-name').value = name;
    document.getElementById('test-code').value = code;
    startQuiz();
  });

  document.getElementById('study-body').appendChild(form);
}

function openInlineTestForm() {
  const form = document.getElementById('inline-test-form');
  if (!form) return;
  form.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  form.querySelector('input').focus();
}


applyTranslations();
showStudy(); // the site is the study notes only; the test screens stay in the code but are not reachable
