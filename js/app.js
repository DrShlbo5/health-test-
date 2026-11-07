const PASS_POINTS = 65;       // pass at 65 points out of 100
const SHEET_URL = "https://script.google.com/macros/s/AKfycbyX4Quq5LQE5yF3o3q0x133Zy8iGzNGBosmgFONFS1s4EUhrX_ACRNfgUHyZEUJfS_P/exec";

const QUIZ_LENGTH = 50;       // 10 each: food-safety MC, math, true/false, ordering, matching
const PASSWORD = "5555"; // manager password for the results
const TEST_CODES = ["1009", "5413", "3004", "3329", "3324"]; // branch-specific test codes

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
  const testForm = document.getElementById('inline-test-form');
  const testOpen = !!testForm && !testForm.hidden;
  const testValues = testOpen ? [document.getElementById('inline-emp-name')?.value || '', document.getElementById('inline-test-code')?.value || ''] : null;
  const resultsForm = document.getElementById('inline-results-form');
  const resultsOpen = !!resultsForm && !resultsForm.hidden;
  const resultsValue = resultsOpen ? (document.getElementById('inline-results-password')?.value || '') : '';
  lang = l;
  if (typeof studyLang !== 'undefined') studyLang = l;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === l));
  applyTranslations();
  if (testOpen) { document.getElementById('inline-emp-name').value = testValues[0]; document.getElementById('inline-test-code').value = testValues[1]; revealInlineForm('inline-test-form','test-entry-card','inline-emp-name'); }
  if (resultsOpen) { document.getElementById('inline-results-password').value = resultsValue; revealInlineForm('inline-results-form','results-entry-card','inline-results-password'); }
  if (document.getElementById('screen-quiz').classList.contains('active')) renderQuestion();
  if (document.getElementById('screen-records').classList.contains('active')) renderRecords();
}

function applyTranslations(skipStudyRender = false) {
  const t = T[lang];
  document.documentElement.lang = lang;
  document.getElementById('lbl-lang').textContent = t.lbl;
  document.getElementById('hdr-title').textContent = t.hdrTitle;
  document.getElementById('hdr-sub').textContent = t.hdrSub;
  document.getElementById('btn-new-emp').textContent = t.btnNew;
  document.getElementById('btn-back-start').textContent = t.btnHome;
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
  document.getElementById('study-title').textContent = STUDY_T[lang].title;
  document.getElementById('btn-study-back').textContent = STUDY_T[lang].back;
  if (!skipStudyRender && document.getElementById('screen-study').classList.contains('active')) renderStudy();
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  // The study screen has its own language chips, so hide the global language bar there.
  document.querySelector('.lang-bar').style.display = id === 'study' ? 'none' : '';
  document.querySelector('.header').style.display = id === 'study' ? 'none' : '';
}
function showStart() { showStudy(); }

// ───── WIRING ─────
document.getElementById('btn-study-back').addEventListener('click', showStart);
document.getElementById('btn-review').addEventListener('click', showReview);
document.getElementById('btn-rev-back').addEventListener('click', () => { renderRecords(); showScreen('records'); });
document.querySelectorAll('.lang-btn').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
document.getElementById('btn-rec-back').addEventListener('click', showStart);
document.getElementById('btn-clear').addEventListener('click', clearRecords);
document.getElementById('btn-upload').addEventListener('click', uploadRecords);
document.getElementById('btn-back-start').addEventListener('click', showStart);

// Add a locked test entry after the last lesson. It uses the existing name and manager code form.
const renderStudyWithoutTestEntry = renderStudy;
renderStudy = function() {
  renderStudyWithoutTestEntry();
  addTestEntryCard();
};

// Append the test and protected-results controls after the last lesson.
const renderStudyWithoutActions = renderStudy;
renderStudy = function() {
  if (typeof studyLang !== 'undefined' && T[studyLang] && lang !== studyLang) {
    lang = studyLang;
    document.documentElement.lang = lang;
    document.querySelectorAll('.lang-btn[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    applyTranslations(true);
  }
  renderStudyWithoutActions();
  addTestEntryCard();
};

function addTestEntryCard() {
  const lessonList = document.querySelector('#study-body .lesson-list');
  if (!lessonList) return;

  const labels = {
    ar: { test:['الاختبار','أدخل اسمك ورمز الاختبار للبدء'], results:['النتائج','أدخل كلمة مرور المدير لعرض النتائج'] },
    en: { test:['Test','Enter your name and test code to begin'], results:['Results','Enter the manager password to view results'] },
    hi: { test:['परीक्षा','शुरू करने के लिए अपना नाम और परीक्षा कोड लिखें'], results:['परिणाम','परिणाम देखने के लिए प्रबंधक का पासवर्ड लिखें'] },
    bn: { test:['পরীক্ষা','শুরু করতে আপনার নাম ও পরীক্ষার কোড লিখুন'], results:['ফলাফল','ফলাফল দেখতে ম্যানেজারের পাসওয়ার্ড লিখুন'] },
    id: { test:['Tes','Masukkan nama dan kode tes untuk memulai'], results:['Hasil','Masukkan kata sandi manajer untuk melihat hasil'] },
    ne: { test:['परीक्षा','सुरु गर्न आफ्नो नाम र परीक्षा कोड लेख्नुहोस्'], results:['नतिजा','नतिजा हेर्न व्यवस्थापकको पासवर्ड लेख्नुहोस्'] },
    te: { test:['పరీక్ష','ప్రారంభించడానికి మీ పేరు, పరీక్ష కోడ్ నమోదు చేయండి'], results:['ఫలితాలు','ఫలితాలు చూడటానికి నిర్వాహక పాస్‌వర్డ్ నమోదు చేయండి'] }
  };
  const text = labels[lang] || labels.ar;
  const testCard = createStudyActionCard(lessonList,'test-entry-card','test-entry-card',text.test,openInlineTestForm);
  const resultsCard = createStudyActionCard(lessonList,'results-entry-card','results-entry-card',text.results,openInlineResultsForm);
  createInlineTestForm(testCard);
  createInlineResultsForm(resultsCard);
}

function createStudyActionCard(lessonList,id,kind,text,action) {
  let card = document.getElementById(id);
  if (!card) {
    card = document.createElement('button');
    card.type = 'button';
    card.id = id;
    card.className = 'lesson-card ' + kind;
    card.addEventListener('click', action);
    lessonList.appendChild(card);
  }
  const info = document.createElement('span');
  info.className = 'lesson-info';
  const title = document.createElement('span');
  title.className = 'lesson-name';
  title.textContent = text[0];
  const detail = document.createElement('span');
  detail.className = 'lesson-meta';
  detail.textContent = text[1];
  info.append(title,detail);
  const lock = document.createElement('span');
  lock.className = 'lesson-state test-entry-lock';
  lock.textContent = '🔒';
  lock.setAttribute('aria-hidden','true');
  card.replaceChildren(info,lock);
  card.setAttribute('aria-label',text[0] + '. ' + text[1]);
  card.setAttribute('aria-controls',id === 'test-entry-card' ? 'inline-test-form' : 'inline-results-form');
  return card;
}

function createInlineTestForm(card) {
  let form = document.getElementById('inline-test-form');
  if (!form) {
    form = document.createElement('form');
    form.id = 'inline-test-form';
    form.className = 'inline-test-form';
    form.hidden = true;
    form.innerHTML = '<label class="inline-test-label" for="inline-emp-name"></label><input id="inline-emp-name" class="text-input" type="text" autocomplete="name" required><label class="inline-test-label" for="inline-test-code"></label><input id="inline-test-code" class="text-input" type="password" autocomplete="off" required><p id="inline-test-error" class="error-msg" hidden></p><button class="btn btn-primary btn-block" type="submit"></button>';
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = document.getElementById('inline-emp-name').value.trim();
      const code = document.getElementById('inline-test-code').value.trim();
      const error = document.getElementById('inline-test-error');
      if (!name) { error.textContent = T[lang].enterName; error.hidden = false; return; }
      if (!TEST_CODES.includes(code)) { error.textContent = CODE_T[lang].err; error.hidden = false; return; }
      error.hidden = true;
      startQuiz(name,code);
    });
  }
  form.querySelector('label[for="inline-emp-name"]').textContent = T[lang].lblName;
  form.querySelector('label[for="inline-test-code"]').textContent = CODE_T[lang].lbl;
  form.querySelector('button[type="submit"]').textContent = T[lang].btnStart;
  card.insertAdjacentElement('afterend',form);
}

function createInlineResultsForm(card) {
  let form = document.getElementById('inline-results-form');
  if (!form) {
    form = document.createElement('form');
    form.id = 'inline-results-form';
    form.className = 'inline-test-form';
    form.hidden = true;
    form.innerHTML = '<label class="inline-test-label" for="inline-results-password"></label><input id="inline-results-password" class="text-input" type="password" autocomplete="off" required><p id="inline-results-error" class="error-msg" hidden></p><button class="btn btn-primary btn-block" type="submit"></button>';
    form.addEventListener('submit', event => {
      event.preventDefault();
      const error = document.getElementById('inline-results-error');
      if (document.getElementById('inline-results-password').value !== PASSWORD) {
        error.textContent = T[lang].pwWrong;
        error.hidden = false;
        return;
      }
      error.hidden = true;
      renderRecords();
      showScreen('records');
    });
  }
  form.querySelector('label').textContent = T[lang].pwTitle;
  form.querySelector('button[type="submit"]').textContent = T[lang].btnUnlock;
  card.insertAdjacentElement('afterend',form);
}

function openInlineTestForm() { toggleInlineForm('inline-test-form','test-entry-card','inline-emp-name'); }
function openInlineResultsForm() { toggleInlineForm('inline-results-form','results-entry-card','inline-results-password'); }
function toggleInlineForm(formId,cardId,inputId) {
  const form = document.getElementById(formId);
  if (!form) return;
  if (form.hidden) revealInlineForm(formId,cardId,inputId);
  else {
    form.hidden = true;
    document.getElementById(cardId).setAttribute('aria-expanded','false');
  }
}

function revealInlineForm(formId,cardId,inputId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.hidden = false;
  document.getElementById(cardId).setAttribute('aria-expanded','true');
  form.scrollIntoView({behavior:'smooth',block:'nearest'});
  document.getElementById(inputId).focus();
}

newEmployee = function() {
  empName = '';
  showStudy();
  const name = document.getElementById('inline-emp-name');
  const code = document.getElementById('inline-test-code');
  if (name) name.value = '';
  if (code) code.value = '';
  openInlineTestForm();
};


applyTranslations();
showStudy(); // the site is the study notes only; the test screens stay in the code but are not reachable
