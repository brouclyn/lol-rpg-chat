// public/script.js

document.addEventListener('DOMContentLoaded', () => {

    // --- SÉLECTEURS DU DOM ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const progressBar = document.querySelector('.progress-bar-inner');
    const welcomeScreen = document.getElementById('welcome-screen');
    const startBtn = document.getElementById('startBtn');
    const gameView = document.getElementById('game-view');
    const newGameBtn = document.getElementById('newGameBtn');
    const chatWindow = document.getElementById('chat-window');
    const inputMessage = document.getElementById('inputMessage');
    const sendBtn = document.getElementById('sendBtn');
    let currentThread = null;

    // --- FONCTIONS UTILITAIRES ---
    function renderMarkdown(text) {
        let html = text || '';
        html = html
            .replace(/^###\s*(.+)/gm, '<h3>$1</h3>')
            .replace(/^##\s*(.+)/gm, '<h2>$1</h2>')
            .replace(/^#\s*(.+)/gm, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        return html;
    }
    function addMessage(content, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        if (sender === 'mj') {
            msgDiv.innerHTML = renderMarkdown(content);
        } else {
            msgDiv.innerText = content;
        }
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // --- FONCTION DE GESTION DES MESSAGES (MODIFIÉE) ---
    async function handleSendMessage() {
        const message = inputMessage.value.trim();
        if (!message || !currentThread) return;

        addMessage(message, 'player');
        inputMessage.value = '';
        inputMessage.focus();

        // 1. CRÉATION ET AFFICHAGE DU LOADER
        const loaderDiv = document.createElement('div');
        loaderDiv.classList.add('message', 'mj', 'loading');
        loaderDiv.innerHTML = '<div class="small-spinner"></div>';
        chatWindow.appendChild(loaderDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        try {
            const res = await fetch('/api/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threadId: currentThread, message })
            });
            if (!res.ok) throw new Error(await res.text());
            
            const data = await res.json();
            
            // 2. SUPPRESSION DU LOADER
            loaderDiv.remove();

            // 3. AFFICHAGE DE LA RÉPONSE
            if (data.reply) {
                addMessage(data.reply, 'mj');
            } else {
                addMessage("<i>Le MJ semble confus et ne répond pas...</i>", 'mj');
            }
        } catch (err) {
            // 4. SUPPRESSION DU LOADER EN CAS D'ERREUR
            loaderDiv.remove();
            addMessage(`<i>Une erreur est survenue : ${err.message}</i>`, 'mj');
        }
    }

    // --- FONCTION DE LANCEMENT DE PARTIE (INCHANGÉE) ---
    async function initiateGame() {
        loadingOverlay.style.display = 'flex';
        progressBar.style.width = '0%';
        setTimeout(() => { progressBar.style.width = '50%'; }, 100);
        try {
            const res = await fetch('/api/newgame', { method: 'POST' });
            if (!res.ok) throw new Error(await res.text());
            progressBar.style.width = '90%';
            const data = await res.json();
            currentThread = data.threadId;
            welcomeScreen.style.display = 'none';
            gameView.style.display = 'flex';
            chatWindow.innerHTML = '';
            inputMessage.focus();
            if (data.initial) {
                addMessage(data.initial, 'mj');
            }
            progressBar.style.width = '100%';
            setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500);
        } catch (err) {
            loadingOverlay.style.display = 'none';
            alert("Impossible de démarrer une nouvelle partie :\n" + err.message);
        }
    }

    // --- ÉCOUTEURS D'ÉVÉNEMENTS (INCHANGÉS) ---
    startBtn.addEventListener('click', initiateGame);
    newGameBtn.addEventListener('click', initiateGame);
    sendBtn.addEventListener('click', handleSendMessage);
    inputMessage.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSendMessage();
        }
    });
});
