// Stato Globale
let sessionQuestions = [];
let userAnswers = []; 
let currentIndex = 0;
let examThreshold = 0;

// Elementi DOM
const jsonSelect = document.getElementById('json-select');
const countSelect = document.getElementById('count-select');
const thresholdInput = document.getElementById('threshold-input');
const minHint = document.getElementById('min-hint');

/**
 * 1. Caricamento Iniziale: Legge l'indice dei file JSON
 */
async function loadQuizIndex() {
    try {
        const response = await fetch('data/index.json');
        if (!response.ok) throw new Error("File index.json non trovato");
        const files = await response.json();
        
        jsonSelect.innerHTML = '';
        files.forEach(file => {
            const option = document.createElement('option');
            option.value = `data/${file}`;
            // Formatta il nome: "cloud_exam.json" -> "CLOUD EXAM"
            option.textContent = file.replace('.json', '').replace(/_/g, ' ').toUpperCase();
            jsonSelect.appendChild(option);
        });
        
        updateThresholdLogic();
    } catch (err) {
        console.error("Errore inizializzazione:", err);
        alert("Errore: Assicurati che la cartella /data contenga index.json e i file dei quiz.");
    }
}

/**
 * 2. Logica Soglia: Calcola l'80% e imposta i limiti Min/Max
 */
function updateThresholdLogic() {
    const totalSelected = countSelect.value === 'all' ? 50 : parseInt(countSelect.value); 
    
    const defaultThreshold = Math.ceil(totalSelected * 0.8);
    const minThreshold = Math.ceil(totalSelected / 2); // Minimo 50%
    
    thresholdInput.value = defaultThreshold;
    thresholdInput.min = minThreshold;
    thresholdInput.max = totalSelected;
    minHint.textContent = minThreshold;
}

// Event Listeners per la configurazione
countSelect.addEventListener('change', updateThresholdLogic);
window.onload = loadQuizIndex;

/**
 * 3. Inizio Esame
 */
async function initExam() {
    try {
        const response = await fetch(jsonSelect.value);
        const allData = await response.json();
        
        let limit = countSelect.value === 'all' ? allData.length : parseInt(countSelect.value);
        if (limit > allData.length) limit = allData.length;

        // Fissiamo la soglia scelta dall'utente
        examThreshold = parseInt(thresholdInput.value);

        sessionQuestions = shuffleArray([...allData]).slice(0, limit);
        userAnswers = new Array(sessionQuestions.length).fill(null);
        currentIndex = 0;

        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('quiz-screen').classList.remove('hidden');
        renderQuestion();
    } catch (e) {
        alert("Errore nel caricamento del quiz selezionato.");
    }
}

document.getElementById('start-btn').addEventListener('click', initExam);

/**
 * 4. Rendering Domanda e Navigazione
 */
function renderQuestion() {
    const q = sessionQuestions[currentIndex];
    const savedAns = userAnswers[currentIndex];
    
    // Aggiornamento Progressi
    document.getElementById('question-text').textContent = q.domanda;
    document.getElementById('question-counter').textContent = `Domanda ${currentIndex + 1}/${sessionQuestions.length}`;
    document.getElementById('progress-bar').style.width = `${((currentIndex + 1) / sessionQuestions.length) * 100}%`;
    
    // Gestione Pulsanti
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    const optionsContainer = document.getElementById('options-container');
    const nextContainer = document.getElementById('next-container');
    const feedbackArea = document.getElementById('feedback-area');
    
    optionsContainer.innerHTML = '';
    nextContainer.innerHTML = '';
    feedbackArea.classList.add('hidden');

    q.opzioni.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        if (savedAns === opt) btn.classList.add('selected'); // Evidenzia scelta fatta

        // Se la risposta è già stata data, mostra subito i risultati e blocca
        if (savedAns !== null) {
            const correct = decodeB64(q.risposta_corretta);
            if (opt === correct) btn.classList.add('correct');
            if (opt === savedAns && opt !== correct) btn.classList.add('wrong');
            showFeedback(q, savedAns);
        } else {
            btn.onclick = () => {
                userAnswers[currentIndex] = opt;
                renderQuestion();
            };
        }
        optionsContainer.appendChild(btn);
    });

    if (savedAns !== null) {
        const isLast = currentIndex === sessionQuestions.length - 1;
        const btn = document.createElement('button');
        btn.className = 'btn-primary';
        btn.textContent = isLast ? "Vedi Risultati" : "Prossima";
        btn.onclick = isLast ? showResults : () => { currentIndex++; renderQuestion(); };
        nextContainer.appendChild(btn);
    }
}

function showFeedback(q, selected) {
    const area = document.getElementById('feedback-area');
    const isCorrect = selected === decodeB64(q.risposta_corretta);
    area.classList.remove('hidden');
    document.getElementById('feedback-title').textContent = isCorrect ? "✅ Corretto" : "❌ Sbagliato";
    document.getElementById('feedback-text').textContent = q.spiegazione;
}

/**
 * 5. Risultati Finali
 */
function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    
    let score = 0;
    const list = document.getElementById('review-list');
    list.innerHTML = '';

    sessionQuestions.forEach((q, i) => {
        const correct = decodeB64(q.risposta_corretta);
        const userAns = userAnswers[i];
        const isCorrect = userAns === correct;
        if (isCorrect) score++;

        const item = document.createElement('div');
        item.className = `review-item ${isCorrect ? 'rev-correct' : 'rev-wrong'}`;
        item.innerHTML = `
            <p><strong>${i+1}. ${q.domanda}</strong></p>
            <p>Tua risposta: <span class="${isCorrect ? 'text-success' : 'text-error'}">${userAns || 'Non data'}</span></p>
            ${!isCorrect ? `<p>Risposta corretta: <strong>${correct}</strong></p>` : ''}
            <div class="review-explanation"><em>Spiegazione:</em> ${q.spiegazione}</div>
        `;
        list.appendChild(item);
    });

    const passed = score >= examThreshold;
    document.getElementById('final-score').textContent = score;
    document.getElementById('total-possible').textContent = sessionQuestions.length;
    document.getElementById('result-title').textContent = passed ? "Superato! 🏆" : "Non Superato 📚";
}

// Utility
function decodeB64(s) { return decodeURIComponent(escape(atob(s))); }
function shuffleArray(arr) { return arr.sort(() => Math.random() - 0.5); }
