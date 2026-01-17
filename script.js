let allQuestions = [];
let sessionQuestions = [];
let userAnswers = []; // Salva la stringa della risposta data dall'utente
let currentIndex = 0;
let score = 0;
let passingThreshold = 16;

// Elementi DOM
const jsonSelect = document.getElementById('json-select');
const countSelect = document.getElementById('count-select');
const thresholdInput = document.getElementById('threshold-input');

// 1. Caricamento nomi file da index.json
async function loadConfig() {
    try {
        const response = await fetch('data/index.json');
        const files = await response.json();
        jsonSelect.innerHTML = '';
        files.forEach(file => {
            const opt = document.createElement('option');
            opt.value = `data/${file}`;
            opt.textContent = file.replace('.json', '').replace(/_/g, ' ').toUpperCase();
            jsonSelect.appendChild(opt);
        });
        updateThresholdLimits();
    } catch (e) {
        console.error("Errore: Assicurati che data/index.json esista.");
    }
}

// 2. Calcolo automatico soglia 80% e limiti
function updateThresholdLimits() {
    // Valore fittizio se 'all' è selezionato prima del caricamento (assumiamo 50 come base)
    const numDomande = countSelect.value === 'all' ? 50 : parseInt(countSelect.value);
    
    const defaultThreshold = Math.ceil(numDomande * 0.8);
    const minThreshold = Math.ceil(numDomande / 2);

    thresholdInput.value = defaultThreshold;
    thresholdInput.min = minThreshold;
    thresholdInput.max = numDomande;
    document.getElementById('min-threshold').textContent = minThreshold;
    document.getElementById('max-threshold').textContent = numDomande;
}

countSelect.addEventListener('change', updateThresholdLimits);
window.onload = loadConfig;

// 3. Inizio Esame
async function startExam() {
    try {
        const response = await fetch(jsonSelect.value);
        allQuestions = await response.json();
        
        let limit = countSelect.value === 'all' ? allQuestions.length : parseInt(countSelect.value);
        if (limit > allQuestions.length) limit = allQuestions.length;

        passingThreshold = parseInt(thresholdInput.value);
        sessionQuestions = shuffleArray([...allQuestions]).slice(0, limit);
        userAnswers = new Array(sessionQuestions.length).fill(null);
        currentIndex = 0;

        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('quiz-screen').classList.remove('hidden');
        renderQuestion();
    } catch (e) {
        alert("Errore nel caricamento del file JSON.");
    }
}

document.getElementById('start-btn').addEventListener('click', startExam);

// 4. Visualizzazione Domanda
function renderQuestion() {
    const q = sessionQuestions[currentIndex];
    const savedAnswer = userAnswers[currentIndex];
    
    document.getElementById('question-text').textContent = q.domanda;
    document.getElementById('question-counter').textContent = `Domanda ${currentIndex + 1}/${sessionQuestions.length}`;
    document.getElementById('progress-bar').style.width = `${((currentIndex + 1) / sessionQuestions.length) * 100}%`;
    
    const optionsContainer = document.getElementById('options-container');
    const feedbackArea = document.getElementById('feedback-area');
    const nextBtnContainer = document.getElementById('next-btn-container');
    const prevBtn = document.getElementById('prev-btn');

    optionsContainer.innerHTML = '';
    nextBtnContainer.innerHTML = '';
    feedbackArea.classList.add('hidden');
    prevBtn.disabled = currentIndex === 0;

    q.opzioni.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;

        if (savedAnswer !== null) {
            const correct = decodeB64(q.risposta_corretta);
            if (opt === correct) btn.classList.add('correct');
            if (opt === savedAnswer && opt !== correct) btn.classList.add('wrong');
            btn.disabled = true;
            showFeedback(q, savedAnswer);
        } else {
            btn.onclick = () => {
                userAnswers[currentIndex] = opt;
                renderQuestion();
            };
        }
        optionsContainer.appendChild(btn);
    });

    // Se risposta data, mostra tasto Avanti o Fine
    if (savedAnswer !== null) {
        const isLast = currentIndex === sessionQuestions.length - 1;
        const btn = document.createElement('button');
        btn.className = 'btn-primary';
        btn.textContent = isLast ? "Vedi Risultati" : "Prossima";
        btn.onclick = isLast ? showResults : () => { currentIndex++; renderQuestion(); };
        nextBtnContainer.appendChild(btn);
    }
}

function showFeedback(q, selected) {
    const correct = decodeB64(q.risposta_corretta);
    const isCorrect = selected === correct;
    const area = document.getElementById('feedback-area');
    area.classList.remove('hidden');
    area.className = `feedback-box ${isCorrect ? 'success' : 'error'}`;
    document.getElementById('feedback-title').textContent = isCorrect ? "✅ Esatto!" : "❌ Sbagliato";
    document.getElementById('feedback-text').textContent = q.spiegazione;
}

document.getElementById('prev-btn').onclick = () => {
    currentIndex--;
    renderQuestion();
};

// 5. Risultati Finali
function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    
    let finalScore = 0;
    const reviewList = document.getElementById('review-list');
    reviewList.innerHTML = '';

    sessionQuestions.forEach((q, i) => {
        const correct = decodeB64(q.risposta_corretta);
        const userAns = userAnswers[i];
        const isCorrect = userAns === correct;
        if (isCorrect) finalScore++;

        const div = document.createElement('div');
        div.className = `review-item ${isCorrect ? 'rev-correct' : 'rev-wrong'}`;
        div.innerHTML = `
            <p><strong>${i+1}. ${q.domanda}</strong></p>
            <p>La tua risposta: ${userAns || 'Non data'} ${isCorrect ? '✅' : '❌'}</p>
            ${!isCorrect ? `<p>Risposta corretta: <strong>${correct}</strong></p>` : ''}
            <p class="review-explanation"><em>Spiegazione:</em> ${q.spiegazione}</p>
        `;
        reviewList.appendChild(div);
    });

    document.getElementById('final-score').textContent = finalScore;
    document.getElementById('total-questions-display').textContent = sessionQuestions.length;
    
    const passed = finalScore >= passingThreshold;
    document.getElementById('result-title').textContent = passed ? "Promosso! 🎉" : "Bocciato 😔";
    document.getElementById('result-message').textContent = passed ? 
        `Ottimo lavoro! Hai superato la soglia di ${passingThreshold}.` : 
        `Purtroppo non hai raggiunto la soglia di ${passingThreshold}.`;
}

// Utility
function decodeB64(s) { return decodeURIComponent(escape(atob(s))); }
function shuffleArray(arr) { return arr.sort(() => Math.random() - 0.5); }
