// public/script.js

document.addEventListener('DOMContentLoaded', () => {

    // --- SÉLECTEURS DU DOM MIS À JOUR ---
    const newGameBtn = document.getElementById('newGameBtn');
    const chatWindow = document.getElementById('chat-window');
    const inputMessage = document.getElementById('inputMessage');
    const sendBtn = document.getElementById('sendBtn');
    const loadingOverlay = document.getElementById('loading-overlay');

    // --- VARIABLE D'ÉTAT ---
    let currentThread = null;

    // --- FONCTIONS UTILITAIRES (INCHANGÉES) ---
    function renderMarkdown(text) {
        let html = text;
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

    // --- LOGIQUE PRINCIPALE ---

    // La fonction est simplifiée : elle ne change plus d'écran, elle réinitialise juste le chat.
    async function handleStartGame() {
        loadingOverlay.style.display = 'flex';
        chatWindow.innerHTML = ''; // On vide la fenêtre
        addMessage("Création d'une nouvelle aventure...", 'mj');

        try {
            const res = await fetch('/api/newgame', { method: 'POST' });
            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();
            currentThread = data.threadId;

            chatWindow.innerHTML = ''; // On vide à nouveau pour enlever le message "Création..."
            inputMessage.focus();

            if (data.initial) {
                addMessage(data.initial, 'mj');
            }
        } catch (err) {
            console.error("Erreur lors de la création de partie :", err);
            chatWindow.innerHTML = `<div class="message mj">Impossible de démarrer une nouvelle partie :<br>${err.message}</div>`;
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    // handleSendMessage reste identique
    async function handleSendMessage() {
        const message = inputMessage.value.trim();
        if (!message || !currentThread) return;

        addMessage(message, 'player');
        inputMessage.value = '';
        inputMessage.focus();

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
            loaderDiv.remove();

            if (data.reply) {
                addMessage(data.reply, 'mj');
            } else {
                addMessage("<i>Le MJ semble confus et ne répond pas...</i>", 'mj');
            }
        } catch (err) {
            loaderDiv.remove();
            addMessage(`<i>Une erreur est survenue : ${err.message}</i>`, 'mj');
        }
    }

    // --- ÉCOUTEURS D'ÉVÉNEMENTS ---
    newGameBtn.addEventListener('click', handleStartGame); // Le nouveau bouton est maintenant connecté
    sendBtn.addEventListener('click', handleSendMessage);
    inputMessage.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSendMessage();
        }
    });

    // On lance une partie dès que la page est chargée
    handleStartGame();
});
