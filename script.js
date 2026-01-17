let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let isAnswered = false;

let threshold = 0;
let totalQuestions = 0;
let quizData = [];


// Elementi DOM
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const progressBar = document.getElementById('progress-bar');
const questionCounter = document.getElementById('question-counter');
const scoreCounter = document.getElementById('score-counter');
const feedbackArea = document.getElementById('feedback-area');
const feedbackTitle = document.getElementById('feedback-title');
const feedbackText = document.getElementById('feedback-text');
const feedbackIcon = document.getElementById('feedback-icon');
const nextBtn = document.getElementById('next-btn');

const jsonSelect = document.getElementById('json-select');
const questionCountSelect = document.getElementById('question-count');
const thresholdInput = document.getElementById('threshold');
const thresholdHelp = document.getElementById('threshold-help');



function startGame() {
    score = 0;
    currentQuestionIndex = 0;

    currentQuestions = shuffleArray([...quizData]).slice(0, totalQuestions);

    startScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');

    renderQuestion();
}


function renderQuestion() {
    isAnswered = false;
    const q = currentQuestions[currentQuestionIndex];
	
	console.log(q, currentQuestionIndex, currentQuestions.length);
    
    // Aggiorna UI
    questionText.textContent = q.domanda;
    questionCounter.textContent = `Domanda ${currentQuestionIndex + 1}/${totalQuestions}`;
    scoreCounter.textContent = `Punteggio: ${score}`;
    progressBar.style.width = `${((currentQuestionIndex) / totalQuestions) * 100}%`;
    
    // Resetta feedback
    feedbackArea.classList.add('hidden');
    optionsContainer.innerHTML = '';
    
    // Mischia opzioni
    const shuffledOptions = shuffleArray([...q.opzioni]);
    
    shuffledOptions.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        btn.textContent = opt;
        // Passiamo l'intera riga dati per sicurezza
        btn.onclick = () => checkAnswer(opt, q.risposta_corretta, q.spiegazione, btn);
        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(selectedOption, encodedCorrectAnswer, explanation, btnElement) {
    if (isAnswered) return; // Evita doppi click
    isAnswered = true;

    // --- FIX UTF-8 ---
    // Decodifica corretta per caratteri accentati (à, è, ì, ò, ù)
    // 1. Decodifica Base64 in stringa binaria
    const binaryString = decodeB64(encodedCorrectAnswer);
    // 2. Converti in array di bytes
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    // 3. Decodifica i bytes come UTF-8
    const correctAnswer = new TextDecoder().decode(bytes);
    // -----------------

    // Normalizziamo le stringhe (rimuove spazi extra invisibili)
    const isCorrect = selectedOption.trim() === correctAnswer.trim();
    
    // Stile bottoni
    const allBtns = optionsContainer.children;
    for (let btn of allBtns) {
        btn.style.cursor = 'default';
        btn.onclick = null; // Disabilita ulteriori click
        
        // Cerca il bottone che contiene la risposta giusta e coloralo di VERDE
        // Usiamo trim() anche qui per sicurezza
        if (btn.textContent.trim() === correctAnswer.trim()) {
            btn.classList.add('correct');
            // Aggiungiamo un'icona check visiva
            btn.innerHTML += ' <span style="float:right">✅</span>';
        }
    }

    if (isCorrect) {
        score++;
        feedbackTitle.textContent = "Corretto!";
        feedbackTitle.style.color = "var(--success-text)";
        feedbackIcon.textContent = "✅";
        feedbackArea.style.backgroundColor = "var(--success-bg)";
        feedbackArea.style.borderColor = "#bbf7d0";
    } else {
        // Se hai sbagliato, colora il tuo di ROSSO
        btnElement.classList.add('wrong');
        btnElement.innerHTML += ' <span style="float:right">❌</span>';
        
        feedbackTitle.textContent = "Sbagliato";
        feedbackTitle.style.color = "var(--error-text)";
        feedbackIcon.textContent = "❌";
        feedbackArea.style.backgroundColor = "var(--error-bg)";
        feedbackArea.style.borderColor = "#fecaca";
    }
    
    // Mostra spiegazione
    feedbackText.textContent = explanation;
    feedbackArea.classList.remove('hidden');
    
    // Aggiorna punteggio live
    scoreCounter.textContent = `Punteggio: ${score}`;
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < totalQuestions) {
        renderQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    const finalScoreEl = document.getElementById('final-score');
    const resultMessage = document.getElementById('result-message');
    const resultIcon = document.getElementById('result-icon');
    const percentageDisplay = document.getElementById('percentage-display');
    const resultTitle = document.getElementById('result-title');
    
    finalScoreEl.textContent = score;
    const percentage = Math.round((score / totalQuestions) * 100);
    percentageDisplay.textContent = `${percentage}% di risposte esatte`;

    if (score >= threshold) {
        resultTitle.textContent = "Promosso! 🎉";
        resultMessage.textContent = "Ottimo lavoro, hai superato l'esame.";
        resultIcon.textContent = "🏆";
        resultScreen.style.borderTop = "8px solid var(--success-text)";
    } else {
        resultTitle.textContent = "Bocciato 😔";
        resultMessage.textContent = `Non hai raggiunto la soglia sufficiente (${threshold}/${totalQuestions}). Ripassa e riprova.`;
        resultIcon.textContent = "📚";
        resultScreen.style.borderTop = "8px solid var(--error-text)";
    }
}

// Utility: Fisher-Yates Shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Security: Disabilita tasto destro (deterrente base)
document.addEventListener('contextmenu', event => event.preventDefault());

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    await loadAvailableExams();
    setupEventListeners();
});

async function loadAvailableExams() {
    try {        
		const response = await fetch('data/index.json');
		if (!response.ok) throw new Error("File index.json non trovato");
        const examFiles = await response.json();
        
        jsonSelect.innerHTML = '';
        
        examFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = file;
            option.textContent = formatExamName(file);
            jsonSelect.appendChild(option);
        });
        
        jsonSelect.disabled = false;
		updateThreshold();
    } catch (error) {
        console.error('Error loading exams:', error);
        jsonSelect.innerHTML = '<option value="">Errore caricamento</option>';
    }
}



function formatExamName(filename) {
    return filename
        .replace('.json', '')
        .replace(/_/g, ' ')
        .toUpperCase();
}

function setupEventListeners() {
    jsonSelect.addEventListener('change', handleExamSelection);
    questionCountSelect.addEventListener('change', updateThreshold);	
    thresholdInput.addEventListener('input', validateThreshold);
	
	// Funzione di Start
	document.getElementById('start-btn').addEventListener('click', startGame);
	nextBtn.addEventListener('click', nextQuestion);
}

function handleExamSelection() {
    const selectedFile = jsonSelect.value;
    if (!selectedFile) return;

    fetch(`data/${selectedFile}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Errore caricamento JSON');
            }
            return response.json();
        })
        .then(data => {
            // Normalizzazione: quizData È SEMPRE UN ARRAY
            quizData = Array.isArray(data) ? data : data.questions || [];

            totalQuestions = quizData.length;

            document.getElementById('start-btn').disabled = false;
            questionCountSelect.disabled = false;

            updateThreshold(); // chiamata sicura e sequenziale
        })
        .catch(error => {
            console.error(error);
            alert('Errore nel caricamento del file esame');
        });
}

function updateThreshold() {
    if (!quizData.length) return;

    const selected = questionCountSelect.value;

    totalQuestions = (selected !== '')
        ? parseInt(selected, 10)
        : quizData.length;

    if (!Number.isFinite(totalQuestions) || totalQuestions <= 0) return;

    threshold = Math.ceil(totalQuestions * 0.8);

    thresholdInput.min = Math.ceil(totalQuestions * 0.5);
    thresholdInput.max = totalQuestions;
    thresholdInput.value = threshold;

    thresholdHelp.textContent =
        `Minimo: ${thresholdInput.min} | Massimo: ${thresholdInput.max} (${threshold} consigliato)`;
}


function validateThreshold() {
    const min = parseInt(thresholdInput.min);
    const max = parseInt(thresholdInput.max);
    const value = parseInt(thresholdInput.value);
    
    if (value < min) thresholdInput.value = min;
    if (value > max) thresholdInput.value = max;
    
    threshold = parseInt(thresholdInput.value);
}


function decodeB64(base64) {
    // Tabella Base64 standard
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    let buffer = [];
    let bits = 0;
    let bitCount = 0;

    // Decodifica Base64 in bytes
    for (let i = 0; i < base64.length; i++) {
        const c = base64[i];
        if (c === '=') break;

        const value = chars.indexOf(c);
        if (value === -1) continue; // ignora caratteri non validi

        bits = (bits << 6) | value;
        bitCount += 6;

        if (bitCount >= 8) {
            bitCount -= 8;
            buffer.push((bits >> bitCount) & 0xff);
        }
    }

    // Conversione bytes → stringa UTF-8
    return new TextDecoder('utf-8').decode(new Uint8Array(buffer));
}

