'use strict';

// UI
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');

const jsonSelect = document.getElementById('json-select');
const examStatus = document.getElementById('exam-status');

const questionCountSelect = document.getElementById('question-count');
const thresholdInput = document.getElementById('threshold');
const thresholdHelp = document.getElementById('threshold-help');

const startBtn = document.getElementById('start-btn');
const backBtn = document.getElementById('back-btn');
const confirmBtn = document.getElementById('confirm-btn');
const nextBtn = document.getElementById('next-btn');

const progressBar = document.getElementById('progress-bar');
const questionCounter = document.getElementById('question-counter');
const scoreCounter = document.getElementById('score-counter');

const questionText = document.getElementById('question-text');
const multiHint = document.getElementById('multi-hint');
const optionsContainer = document.getElementById('options-container');

const feedbackBox = document.getElementById('feedback-box');

const resultTitle = document.getElementById('result-title');
const resultSubtitle = document.getElementById('result-subtitle');
const finalScore = document.getElementById('final-score');
const finalThreshold = document.getElementById('final-threshold');
const finalTotal = document.getElementById('final-total');
const reviewBox = document.getElementById('review-box');
const retryBtn = document.getElementById('retry-btn');

// DATA
let allQuestions = [];          // tutte dal json selezionato
let questions = [];             // subset per quiz
let currentIndex = 0;
let score = 0;

let answers = [];               // risposte confermate: array di array di string
let tempSelections = [];        // selezioni non confermate
let confirmed = [];             // bool per domanda

let optionOrders = [];          // per evitare shuffle ad ogni click (shuffle una sola volta per domanda)

let passThreshold = 16;         // default (si ricalcola in base alle domande)

// -------------------- UTIL --------------------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeCorrect(q) {
  // supporta: string | array | numero indice (se presente)
  const rc = q.risposta_corretta ?? q.correct ?? q.answer;
  if (Array.isArray(rc)) return rc.map(String);
  if (rc === undefined || rc === null) return [];
  return [String(rc)];
}

function normalizeQuestion(raw) {
  return {
    domanda: raw.domanda ?? raw.question ?? '',
    opzioni: raw.opzioni ?? raw.options ?? [],
    risposta_corretta: normalizeCorrect(raw),
    spiegazione: raw.spiegazione ?? raw.explanation ?? ''
  };
}

function setStatus(msg) {
  examStatus.textContent = msg;
}

// -------------------- LISTA ESAMI (data/index.json) --------------------
async function loadExamList() {
  try {
    jsonSelect.disabled = true;
    jsonSelect.innerHTML = '<option value="">Caricamento...</option>';
    setStatus('Caricamento lista esami...');

    const res = await fetch('data/index.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Impossibile leggere data/index.json');

    const files = await res.json();
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('data/index.json è vuoto o non valido');
    }

    jsonSelect.innerHTML = '<option value="">-- seleziona esame --</option>';
    for (const file of files) {
      const opt = document.createElement('option');
      opt.value = file;
      opt.textContent = String(file).replace(/\.json$/i, '');
      jsonSelect.appendChild(opt);
    }

    jsonSelect.disabled = false;
    setStatus('Seleziona un esame.');
  } catch (e) {
    jsonSelect.innerHTML = '<option value="">Errore</option>';
    setStatus('Errore: controlla data/index.json e che tu stia usando un server HTTP (non file://).');
  }
}

// -------------------- CARICAMENTO JSON ESAME --------------------
async function loadSelectedExam(fileName) {
  try {
    setStatus(`Caricamento: ${fileName}...`);
    startBtn.disabled = true;
    questionCountSelect.disabled = true;
    thresholdInput.disabled = true;

    const res = await fetch(`data/${fileName}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Impossibile leggere data/${fileName}`);

    const json = await res.json();
    const list = Array.isArray(json) ? json : (json.domande || json.questions);

    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('Formato JSON non valido o vuoto');
    }

    allQuestions = list.map(normalizeQuestion).filter(q => q.domanda && Array.isArray(q.opzioni) && q.opzioni.length);

    if (!allQuestions.length) throw new Error('Nessuna domanda valida trovata');

    // abilita opzioni
    questionCountSelect.disabled = false;
    thresholdInput.disabled = false;
    startBtn.disabled = false;

    // default soglia: 80% arrotondato (min 1)
    const defaultCount = getSelectedQuestionCount();
    const t = Math.max(1, Math.round(defaultCount * 0.8));
    thresholdInput.value = String(t);
    thresholdInput.max = String(defaultCount);
    thresholdHelp.textContent = `Soglia consigliata ~80% (${t}/${defaultCount})`;

    setStatus(`Caricate ${allQuestions.length} domande. Pronto.`);
  } catch (e) {
    allQuestions = [];
    startBtn.disabled = true;
    questionCountSelect.disabled = true;
    thresholdInput.disabled = true;
    thresholdHelp.textContent = 'Seleziona un esame valido';
    setStatus(`Errore caricamento esame. (${e.message})`);
  }
}

function getSelectedQuestionCount() {
  const v = questionCountSelect.value;
  if (!v) return allQuestions.length;
  const n = parseInt(v, 10);
  return Math.min(n, allQuestions.length);
}

function validateThreshold() {
  const total = getSelectedQuestionCount();
  let t = parseInt(thresholdInput.value, 10);
  if (!Number.isFinite(t)) t = Math.max(1, Math.round(total * 0.8));
  if (t < 1) t = 1;
  if (t > total) t = total;
  thresholdInput.value = String(t);
  thresholdInput.max = String(total);
  passThreshold = t;
  thresholdHelp.textContent = `Devi fare almeno ${passThreshold}/${total} corrette.`;
}

// -------------------- QUIZ CONFIG --------------------
function configureFromOptions() {
  const total = getSelectedQuestionCount();
  validateThreshold();

  questions = shuffle(allQuestions).slice(0, total);

  currentIndex = 0;
  score = 0;

  answers = Array.from({ length: questions.length }, () => []);
  tempSelections = Array.from({ length: questions.length }, () => []);
  confirmed = Array.from({ length: questions.length }, () => false);

  // prepara ordine opzioni (shuffle 1 volta per domanda)
  optionOrders = questions.map(q => shuffle(q.opzioni));
}

// -------------------- RENDER --------------------
function renderQuestion() {
  const q = questions[currentIndex];
  const total = questions.length;

  // progress
  questionCounter.textContent = `Domanda ${currentIndex + 1}/${total}`;
  scoreCounter.textContent = `Punteggio: ${score}`;
  progressBar.style.width = `${((currentIndex + 1) / total) * 100}%`;

  // testo domanda
  questionText.textContent = q.domanda;

  // hint multi: SOLO se >1
  const correctCount = q.risposta_corretta.length;
  if (correctCount > 1) {
    multiHint.textContent = `(Seleziona ${correctCount} risposte)`;
  } else {
    multiHint.textContent = '';
  }

  // opzioni: usa ordine stabile
  optionsContainer.innerHTML = '';
  const ordered = optionOrders[currentIndex];

  const selected = tempSelections[currentIndex] || [];
  const isConfirmed = confirmed[currentIndex];

  ordered.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option';

    // selected style
    if (selected.includes(opt)) btn.classList.add('selected');

    // se confermato, marca corrette/errate
    if (isConfirmed) {
      const correctSet = new Set(q.risposta_corretta.map(String));
      const picked = new Set((answers[currentIndex] || []).map(String));
      const isCorrectOpt = correctSet.has(String(opt));
      const isPicked = picked.has(String(opt));

      if (isCorrectOpt) btn.classList.add('correct');
      if (isPicked && !isCorrectOpt) btn.classList.add('wrong');

      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => toggleSelection(opt, correctCount));
    }

    btn.textContent = opt;
    optionsContainer.appendChild(btn);
  });

  // --- Bottoni ---
backBtn.disabled = (currentIndex === 0);

// MODIFICA QUI: Il tasto next non deve essere disabilitato se siamo all'ultima domanda, 
// a patto che la risposta sia stata confermata.
nextBtn.disabled = !confirmed[currentIndex];

// Opzionale: Cambia il testo del pulsante all'ultima domanda per chiarezza
if (currentIndex === total - 1) {
  nextBtn.textContent = 'Termina Esame';
} else {
  nextBtn.textContent = 'Avanti';
}

confirmBtn.disabled = confirmed[currentIndex] || (tempSelections[currentIndex].length === 0);

  // feedback
  if (!confirmed[currentIndex]) {
    feedbackBox.classList.add('hidden');
    feedbackBox.textContent = '';
  } else {
    feedbackBox.classList.remove('hidden');
  }
}

function toggleSelection(option, required) {
  if (confirmed[currentIndex]) return;

  // SINGLE: selezione esclusiva + auto-conferma
  if (required === 1) {
    const current = tempSelections[currentIndex];
    const newSel = (current.length === 1 && current[0] === option) ? [] : [option];
    tempSelections[currentIndex] = newSel;

    if (newSel.length === 1) {
      confirmAnswer(); // auto conferma
    } else {
      renderQuestion();
    }
    return;
  }

  // MULTI
  const sel = tempSelections[currentIndex];
  const idx = sel.indexOf(option);
  if (idx >= 0) sel.splice(idx, 1);
  else {
    if (sel.length < required) sel.push(option);
  }
  renderQuestion();
}

// -------------------- LOGICA QUIZ --------------------
function arraysEqualAsSets(a, b) {
  const sa = new Set(a.map(String));
  const sb = new Set(b.map(String));
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

function confirmAnswer() {
  if (confirmed[currentIndex]) return;

  const q = questions[currentIndex];
  const required = q.risposta_corretta.length;
  const sel = tempSelections[currentIndex];

  // se multi, obbliga esattamente N selezioni prima di confermare
  if (required > 1 && sel.length !== required) {
    feedbackBox.classList.remove('hidden');
    feedbackBox.textContent = `Devi selezionare ${required} risposte prima di confermare.`;
    return;
  }

  // salva confermata
  answers[currentIndex] = sel.slice();
  confirmed[currentIndex] = true;

  // valuta
  const ok = arraysEqualAsSets(answers[currentIndex], q.risposta_corretta);
  if (ok) score++;

  // feedback
  const parts = [];
  parts.push(ok ? 'Risposta corretta.' : 'Risposta errata.');
  if (q.spiegazione) parts.push(q.spiegazione);

  feedbackBox.classList.remove('hidden');
  feedbackBox.textContent = parts.join(' ');

  renderQuestion();
}

function nextQuestion() {
  if (!confirmed[currentIndex]) return;
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    finishGame();
  }
}

function prevQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
}

function startGame() {
  startScreen.classList.add('hidden');
  quizScreen.classList.remove('hidden');
  resultScreen.classList.add('hidden');
  renderQuestion();
}

function finishGame() {
  quizScreen.classList.add('hidden');
  resultScreen.classList.remove('hidden');

  const total = questions.length;
  const passed = score >= passThreshold;

  resultTitle.textContent = passed ? 'PROMOSSO' : 'BOCCIATO';
  resultSubtitle.textContent = passed
    ? 'Hai superato la simulazione.'
    : 'Non hai raggiunto la soglia.';

  finalScore.textContent = String(score);
  finalThreshold.textContent = String(passThreshold);
  finalTotal.textContent = String(total);

  // review errori
  reviewBox.innerHTML = '';
  const wrongs = [];
  for (let i = 0; i < total; i++) {
    const ok = arraysEqualAsSets(answers[i], questions[i].risposta_corretta);
    if (!ok) wrongs.push(i);
  }

  if (!wrongs.length) {
    const div = document.createElement('div');
    div.className = 'review-item';
    div.innerHTML = `<h3>Nessun errore 🎉</h3>`;
    reviewBox.appendChild(div);
    return;
  }

  wrongs.forEach(i => {
    const q = questions[i];
    const div = document.createElement('div');
    div.className = 'review-item';

    const you = (answers[i] || []).join(', ') || '(nessuna)';
    const corr = (q.risposta_corretta || []).join(', ');

    div.innerHTML = `
      <div class="pill pill-ko">Errore</div>
      <h3>${q.domanda}</h3>
      <p><b>Tua risposta:</b> ${you}</p>
      <p><b>Corretta:</b> ${corr}</p>
      ${q.spiegazione ? `<p><b>Spiegazione:</b> ${q.spiegazione}</p>` : ''}
    `;
    reviewBox.appendChild(div);
  });
}

// -------------------- EVENTI --------------------
jsonSelect.addEventListener('change', async () => {
  const file = jsonSelect.value;
  if (!file) {
    allQuestions = [];
    startBtn.disabled = true;
    questionCountSelect.disabled = true;
    thresholdInput.disabled = true;
    thresholdHelp.textContent = 'Seleziona prima un esame';
    setStatus('Seleziona un esame.');
    return;
  }
  await loadSelectedExam(file);
});

questionCountSelect.addEventListener('change', () => {
  if (!allQuestions.length) return;
  const total = getSelectedQuestionCount();
  thresholdInput.max = String(total);

  // aggiorna soglia consigliata ~80%
  const t = Math.max(1, Math.round(total * 0.8));
  thresholdInput.value = String(Math.min(t, total));
  validateThreshold();
});

thresholdInput.addEventListener('input', () => {
  if (!allQuestions.length) return;
  validateThreshold();
});

startBtn.addEventListener('click', () => {
  if (!allQuestions.length) return;
  configureFromOptions();
  validateThreshold();
  startGame();
});

backBtn.addEventListener('click', prevQuestion);
confirmBtn.addEventListener('click', confirmAnswer);
nextBtn.addEventListener('click', nextQuestion);

retryBtn.addEventListener('click', () => location.reload());

// Security deterrente base (come exam simulator)
document.addEventListener('contextmenu', event => event.preventDefault());

// init
loadExamList();



