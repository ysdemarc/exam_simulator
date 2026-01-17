let allQuestions = [];
let sessionQuestions = [];
let userAnswers = []; 
let currentIndex = 0;
let examThreshold = 0;

// DOM Elements
const jsonSelect = document.getElementById('json-select');
const countSelect = document.getElementById('count-select');
const thresholdInput = document.getElementById('threshold-input');
const minHint = document.getElementById('min-hint');
const maxHint = document.getElementById('max-hint');

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
        updateThresholdUI();
    } catch (e) {
        console.error("Errore caricamento index.json", e);
    }
}

// 2. Calcolo 80% e vincoli Min/Max
function updateThresholdUI() {
    // Usiamo un valore indicativo finché non carichiamo il file reale
    const selectedQty = countSelect.value === 'all' ? 50 : parseInt(countSelect.value);
    
    const defaultThreshold = Math.ceil(selectedQty * 0.8);
    const minThreshold = Math.ceil(selectedQty / 2);
    
    thresholdInput.value = defaultThreshold;
    thresholdInput.min = minThreshold;
    thresholdInput.max = selectedQty;
    
    minHint.textContent = minThreshold;
    maxHint.textContent = selectedQty;
}

countSelect.addEventListener('change', updateThresholdUI);
window.onload = loadConfig;

// 3. Inizio Simulazione
async function startExam() {
    try {
        const response = await fetch(jsonSelect.value);
        allQuestions = await response.json();
        
        let limit = countSelect.value === 'all' ? allQuestions.length : parseInt(countSelect.value);
        if (limit > allQuestions.length) limit = allQuestions.length;

        // Validazione finale soglia
        examThreshold = parseInt(thresholdInput.value);
        if (examThreshold < Math.ceil(limit / 2)) examThreshold = Math.ceil(limit / 2);
        if (examThreshold > limit) examThreshold = limit;

        sessionQuestions = shuffleArray([...allQuestions]).slice(0, limit);
        userAnswers = new Array(sessionQuestions.length).fill(null);
        currentIndex = 0;

        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('quiz-screen').classList.remove('hidden');
        renderQuestion();
    } catch (e) {
        alert("Errore caricamento file JSON.");
    }
}

document.getElementById('start-btn').addEventListener('click', startExam);

// 4. Rendering Domanda
function renderQuestion() {
    const q = sessionQuestions[currentIndex];
    const savedAns = userAnswers[currentIndex];
    
    document.getElementById('question-text').textContent = q.domanda;
    document.getElementById('question-counter').textContent = `Domanda ${currentIndex + 1}/${sessionQuestions.length}`;
    document.getElementById('progress-bar').style.width = `${((currentIndex + 1) / sessionQuestions.length) * 100}%`;
    
    const container = document.getElementById('options-container');
    const feedback = document.getElementById('feedback-area');
    const nextContainer = document.getElementById('next-container');
    
    container.innerHTML = '';
    feedback.classList.add('hidden');
    nextContainer.innerHTML = '';
    
    document.getElementById('prev-btn').disabled = currentIndex === 0;

    q.opzioni.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;

        if (savedAns !== null) {
            const correct = decodeB64(q.risposta_corretta);
            if (opt === correct) btn.classList.add('correct');
            if (opt === savedAns && opt !== correct) btn.classList.add('wrong');
            btn.disabled = true;
            showFeedback(q, savedAns);
        } else {
            btn.onclick = () => {
                userAnswers[currentIndex] = opt;
                renderQuestion();
            };
        }
        container.appendChild(btn);
    });

    if (savedAns !== null) {
        const isLast = currentIndex === sessionQuestions.length - 1;
        const nBtn = document.createElement('button');
        nBtn.className = 'btn-primary';
        nBtn.textContent = isLast ? "Termina Esame" : "Prossima Domanda";
        nBtn.onclick = isLast ? showResults : () => { currentIndex++; renderQuestion(); };
        nextContainer.appendChild(nBtn);
    }
}

function showFeedback(q, selected) {
    const isCorrect = selected === decodeB64(q.risposta_corretta);
    const area = document.getElementById('feedback-area');
    area.classList.remove('hidden');
    document.getElementById('feedback-title').textContent = isCorrect ? "Corretto!" : "Sbagliato";
    document.getElementById('feedback-text').textContent = q.spiegazione;
    area.className = `feedback-box ${isCorrect ? 'success' : 'error'}`;
}

function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    
    let score = 0;
    const review = document.getElementById('review-list');
    review.innerHTML = '';

    sessionQuestions.forEach((q, i) => {
        const correct = decodeB64(q.risposta_corretta);
        const userAns = userAnswers[i];
        const isCorrect = userAns === correct;
        if (isCorrect) score++;

        const div = document.createElement('div');
        div.className = `review-item ${isCorrect ? 'rev-correct' : 'rev-wrong'}`;
        div.innerHTML = `
            <p><strong>${i+1}. ${q.domanda}</strong></p>
            <p>Tua: ${userAns || 'Non data'} | Corretta: ${correct}</p>
            <p class="small-spiegazione">${q.spiegazione}</p>
        `;
        review.appendChild(div);
    });

    const passed = score >= examThreshold;
    document.getElementById('final-score').textContent = score;
    document.getElementById('total-possible').textContent = sessionQuestions.length;
    document.getElementById('result-title').textContent = passed ? "SUPERATO! 🎉" : "NON SUPERATO 📚";
    document.getElementById('result-message').textContent = `Soglia: ${examThreshold} - Punteggio: ${score}`;
}

function decodeB64(s) { return decodeURIComponent(escape(atob(s))); }
function shuffleArray(arr) { return arr.sort(() => Math.random() - 0.5); }
