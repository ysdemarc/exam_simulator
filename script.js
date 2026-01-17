let allQuestions = [];
let sessionQuestions = [];
let userAnswers = []; // Salva l'indice della risposta data per ogni domanda
let currentIndex = 0;
let passingThreshold = 10;

// Elementi DOM
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const optionsContainer = document.getElementById('options-container');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');

document.getElementById('start-btn').addEventListener('click', initExam);
nextBtn.addEventListener('click', () => { currentIndex++; renderQuestion(); });
prevBtn.addEventListener('click', () => { currentIndex--; renderQuestion(); });

async function initExam() {
    const jsonFile = document.getElementById('json-select').value;
    const countVal = document.getElementById('count-select').value;
    passingThreshold = parseInt(document.getElementById('threshold-input').value);

    try {
        const response = await fetch(jsonFile);
        allQuestions = await response.json();
        
        // Mischia e taglia
        let shuffled = shuffleArray([...allQuestions]);
        let limit = countVal === 'all' ? shuffled.length : parseInt(countVal);
        sessionQuestions = shuffled.slice(0, limit);
        
        // Inizializza risposte utente (null = non ancora data)
        userAnswers = new Array(sessionQuestions.length).fill(null);
        currentIndex = 0;

        startScreen.classList.add('hidden');
        quizScreen.classList.remove('hidden');
        renderQuestion();
    } catch (error) {
        alert("Errore nel caricamento del file JSON. Assicurati di usare un server locale.");
        console.error(error);
    }
}

function renderQuestion() {
    const q = sessionQuestions[currentIndex];
    const savedAnswer = userAnswers[currentIndex];
    
    // UI Updates
    document.getElementById('question-text').textContent = q.domanda;
    document.getElementById('question-counter').textContent = `Domanda ${currentIndex + 1}/${sessionQuestions.length}`;
    document.getElementById('progress-bar').style.width = `${((currentIndex + 1) / sessionQuestions.length) * 100}%`;
    
    // Gestione pulsanti navigazione
    prevBtn.disabled = currentIndex === 0;
    nextBtn.classList.toggle('hidden', savedAnswer === null);
    
    optionsContainer.innerHTML = '';
    document.getElementById('feedback-area').classList.add('hidden');

    q.opzioni.forEach((opt) => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        btn.textContent = opt;

        // Se la domanda ha già una risposta
        if (savedAnswer !== null) {
            btn.style.cursor = 'default';
            const correct = decodeB64(q.risposta_corretta);
            
            if (opt === correct) btn.classList.add('correct');
            if (opt === savedAnswer && opt !== correct) btn.classList.add('wrong');
            
            showFeedback(q, savedAnswer);
        } else {
            btn.onclick = () => handleSelection(opt);
        }
        optionsContainer.appendChild(btn);
    });
}

function handleSelection(selected) {
    userAnswers[currentIndex] = selected;
    
    // Se è l'ultima domanda, mostra il tasto "Fine" invece di "Prossima"
    if (currentIndex === sessionQuestions.length - 1) {
        nextBtn.textContent = "Vedi Risultati";
        nextBtn.onclick = showResults;
    } else {
        nextBtn.textContent = "Prossima";
        nextBtn.onclick = () => { currentIndex++; renderQuestion(); };
    }
    
    renderQuestion();
}

function showFeedback(q, selected) {
    const feedbackArea = document.getElementById('feedback-area');
    const correct = decodeB64(q.risposta_corretta);
    const isCorrect = selected === correct;

    feedbackArea.classList.remove('hidden');
    document.getElementById('feedback-title').textContent = isCorrect ? "Corretto!" : "Sbagliato";
    document.getElementById('feedback-text').textContent = q.spiegazione;
    feedbackArea.style.backgroundColor = isCorrect ? "var(--success-bg)" : "var(--error-bg)";
}

function showResults() {
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    let score = 0;
    const reviewList = document.getElementById('review-list');
    reviewList.innerHTML = '';

    sessionQuestions.forEach((q, i) => {
        const correct = decodeB64(q.risposta_corretta);
        const userAns = userAnswers[i];
        const isCorrect = userAns === correct;
        if (isCorrect) score++;

        // Crea elemento riepilogo
        const item = document.createElement('div');
        item.className = `review-item ${isCorrect ? 'rev-correct' : 'rev-wrong'}`;
        item.innerHTML = `
            <p><strong>${i+1}. ${q.domanda}</strong></p>
            <p>Tua risposta: ${userAns || 'Non data'} ${isCorrect ? '✅' : '❌'}</p>
            ${!isCorrect ? `<p>Corretta: ${correct}</p>` : ''}
            <p class="small-text"><em>Spiegazione: ${q.spiegazione}</em></p>
        `;
        reviewList.appendChild(item);
    });

    document.getElementById('final-score').textContent = score;
    document.getElementById('total-possible').textContent = sessionQuestions.length;
    
    const passed = score >= passingThreshold;
    document.getElementById('result-title').textContent = passed ? "Promosso! 🎉" : "Bocciato 😔";
    document.getElementById('result-message').textContent = passed ? 
        `Ottimo! Hai raggiunto la soglia di ${passingThreshold}.` : 
        `Sotto la soglia di ${passingThreshold}. Devi studiare di più!`;
}

function resetApp() {
    location.reload();
}

// Utility
function decodeB64(str) {
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
