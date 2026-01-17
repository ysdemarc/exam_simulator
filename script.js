// Application State
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let userAnswers = [];
let threshold = 16;
let totalQuestions = 20;
let quizData = [];

// DOM Elements
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const jsonSelect = document.getElementById('json-select');
const questionCountSelect = document.getElementById('question-count');
const thresholdInput = document.getElementById('threshold');
const thresholdHelp = document.getElementById('threshold-help');

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    await loadAvailableExams();
    setupEventListeners();
});

async function loadAvailableExams() {
    try {
        const response = await fetch('data/index.json');
        const examFiles = await response.json();
        
        jsonSelect.innerHTML = '<option value="">Seleziona un esame...</option>';
        
        examFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = file;
            option.textContent = formatExamName(file);
            jsonSelect.appendChild(option);
        });
        
        jsonSelect.disabled = false;
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
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('prev-btn').addEventListener('click', previousQuestion);
    document.getElementById('next-btn').addEventListener('click', nextQuestion);
    document.getElementById('continue-btn').addEventListener('click', continueQuiz);
    document.getElementById('restart-btn').addEventListener('click', restartQuiz);
}

async function handleExamSelection() {
    const selectedFile = jsonSelect.value;
    if (!selectedFile) return;

    try {
        const response = await fetch(`data/${selectedFile}`);
        quizData = await response.json();
        
        document.getElementById('start-btn').disabled = false;
        updateThreshold();
    } catch (error) {
        console.error('Error loading quiz data:', error);
        alert('Errore nel caricamento del file esame');
    }
}

function updateThreshold() {
    const count = questionCountSelect.value;
    const totalAvailable = quizData.length;
    
    if (count === 'all') {
        totalQuestions = totalAvailable;
    } else {
        totalQuestions = parseInt(count);
    }
    
    // Calculate 80% threshold
    threshold = Math.ceil(totalQuestions * 0.8);
    
    // Update UI
    thresholdInput.min = Math.ceil(totalQuestions * 0.5); // 50%
    thresholdInput.max = totalQuestions; // 100%
    thresholdInput.value = threshold;
    
    thresholdHelp.textContent = `Minimo: ${thresholdInput.min} | Massimo: ${thresholdInput.max} (${threshold} consigliato)`;
}

function validateThreshold() {
    const min = parseInt(thresholdInput.min);
    const max = parseInt(thresholdInput.max);
    const value = parseInt(thresholdInput.value);
    
    if (value < min) thresholdInput.value = min;
    if (value > max) thresholdInput.value = max;
    
    threshold = parseInt(thresholdInput.value);
}

function startGame() {
    if (!jsonSelect.value) {
        alert('Seleziona un esame!');
        return;
    }
    
    // Reset state
    score = 0;
    currentQuestionIndex = 0;
    userAnswers = new Array(totalQuestions).fill(null);
    
    // Select questions
    currentQuestions = shuffleArray([...quizData]).slice(0, totalQuestions);
    
    // Update UI
    startScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    
    renderQuestion();
}

function renderQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    const userAnswer = userAnswers[currentQuestionIndex];
    
    // Update UI
    document.getElementById('question-text').textContent = q.domanda;
    document.getElementById('question-counter').textContent = 
        `Domanda ${currentQuestionIndex + 1}/${totalQuestions}`;
    document.getElementById('score-counter').textContent = `Punteggio: ${score}`;
    
    updateProgressBar();
    renderOptions(q, userAnswer);
    updateNavigationButtons();
    
    // Show feedback if question was answered
    if (userAnswer !== null) {
        showFeedback(q, userAnswer);
    } else {
        hideFeedback();
    }
}

function renderOptions(question, userAnswer) {
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    const shuffledOptions = shuffleArray([...question.opzioni]);
    
    shuffledOptions.forEach(option => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        btn.textContent = option;
        
        if (userAnswer === null) {
            // Question not answered yet
            btn.onclick = () => selectAnswer(option, btn);
            btn.style.cursor = 'pointer';
        } else {
            // Question already answered - show results
            btn.style.cursor = 'default';
            const correctAnswer = decodeBase64UTF8(question.risposta_corretta);
            
            if (option === correctAnswer) {
                btn.classList.add('correct');
                btn.innerHTML += ' <span style="float:right">✅</span>';
            } else if (option === userAnswer && userAnswer !== correctAnswer) {
                btn.classList.add('wrong');
                btn.innerHTML += ' <span style="float:right">❌</span>';
            }
        }
        
        container.appendChild(btn);
    });
}

function selectAnswer(selectedOption, btnElement) {
    // Store user answer
    userAnswers[currentQuestionIndex] = selectedOption;
    
    const q = currentQuestions[currentQuestionIndex];
    const correctAnswer = decodeBase64UTF8(q.risposta_corretta);
    
    // Check if correct
    if (selectedOption.trim() === correctAnswer.trim()) {
        score++;
    }
    
    // Re-render to show results
    renderQuestion();
}

function showFeedback(question, userAnswer) {
    const correctAnswer = decodeBase64UTF8(question.risposta_corretta);
    const isCorrect = userAnswer === correctAnswer;
    
    const feedbackArea = document.getElementById('feedback-area');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackText = document.getElementById('feedback-text');
    const feedbackIcon = document.getElementById('feedback-icon');
    
    if (isCorrect) {
        feedbackTitle.textContent = "Corretto!";
        feedbackTitle.style.color = "var(--success-text)";
        feedbackIcon.textContent = "✅";
        feedbackArea.style.backgroundColor = "var(--success-bg)";
    } else {
        feedbackTitle.textContent = "Sbagliato";
        feedbackTitle.style.color = "var(--error-text)";
        feedbackIcon.textContent = "❌";
        feedbackArea.style.backgroundColor = "var(--error-bg)";
    }
    
    feedbackText.textContent = question.spiegazione;
    feedbackArea.classList.remove('hidden');
    
    // Show continue button only if all questions answered
    const continueBtn = document.getElementById('continue-btn');
    if (userAnswers.every(answer => answer !== null)) {
        continueBtn.textContent = 'Vedi Risultati';
        continueBtn.onclick = showResults;
    } else {
        continueBtn.textContent = 'Continua';
        continueBtn.onclick = continueQuiz;
    }
}

function hideFeedback() {
    document.getElementById('feedback-area').classList.add('hidden');
}

function continueQuiz() {
    if (currentQuestionIndex < totalQuestions - 1) {
        currentQuestionIndex++;
        renderQuestion();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

function nextQuestion() {
    if (currentQuestionIndex < totalQuestions - 1) {
        currentQuestionIndex++;
        renderQuestion();
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex === totalQuestions - 1;
}

function updateProgressBar() {
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
}

function showResults() {
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    const finalScoreEl = document.getElementById('final-score');
    const totalQuestionsEl = document.getElementById('total-questions');
    const resultMessage = document.getElementById('result-message');
    const resultIcon = document.getElementById('result-icon');
    const percentageDisplay = document.getElementById('percentage-display');
    const resultTitle = document.getElementById('result-title');
    
    finalScoreEl.textContent = score;
    totalQuestionsEl.textContent = totalQuestions;
    
    const percentage = Math.round((score / totalQuestions) * 100);
    percentageDisplay.textContent = `${percentage}% di risposte esatte`;
    
    const passed = score >= threshold;
    
    if (passed) {
        resultTitle.textContent = "Promosso! 🎉";
        resultMessage.textContent = `Ottimo lavoro! Hai superato l'esame con ${score}/${totalQuestions} risposte corrette.`;
        resultIcon.textContent = "🏆";
        resultScreen.style.borderTop = "8px solid var(--success-text)";
    } else {
        resultTitle.textContent = "Bocciato 😔";
        resultMessage.textContent = `Non hai raggiunto la soglia sufficiente (${threshold}/${totalQuestions}). Ripassa e riprova.`;
        resultIcon.textContent = "📚";
        resultScreen.style.borderTop = "8px solid var(--error-text)";
    }
    
    renderReviewList();
}

function renderReviewList() {
    const reviewList = document.getElementById('review-list');
    reviewList.innerHTML = '';
    
    currentQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = decodeBase64UTF8(question.risposta_corretta);
        const isCorrect = userAnswer === correctAnswer;
        
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${isCorrect ? 'correct' : 'wrong'}`;
        
        reviewItem.innerHTML = `
            <div class="review-header">
                <span class="question-number">Domanda ${index + 1}</span>
                <span class="result-badge">${isCorrect ? '✅ Corretta' : '❌ Sbagliata'}</span>
            </div>
            <div class="question-text">${question.domanda}</div>
            <div class="answer-comparison">
                <div class="user-answer">
                    <strong>La tua risposta:</strong> ${userAnswer || 'Non data'}
                </div>
                <div class="correct-answer">
                    <strong>Risposta corretta:</strong> ${correctAnswer}
                </div>
            </div>
            <div class="explanation">${question.spiegazione}</div>
        `;
        
        reviewList.appendChild(reviewItem);
    });
}

function restartQuiz() {
    // Reset all state
    score = 0;
    currentQuestionIndex = 0;
    userAnswers = [];
    currentQuestions = [];
    
    // Show start screen
    resultScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    
    // Reset form
    jsonSelect.value = '';
    document.getElementById('start-btn').disabled = true;
}

// Utility Functions
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function decodeBase64UTF8(encoded) {
    const binaryString = atob(encoded);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

// Security: Disable right click
document.addEventListener('contextmenu', event => event.preventDefault());
