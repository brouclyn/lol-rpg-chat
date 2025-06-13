// public/script.js

// On attend que le contenu de la page soit entièrement chargé avant d'exécuter le script.
// C'est une bonne pratique pour éviter les erreurs.
document.addEventListener('DOMContentLoaded', () => {

    // --- ÉLÉMENTS DU DOM ---
    const startBtn = document.getElementById('startBtn');
    const backBtn = document.getElementById('backBtn');
    const chatScreen = document.getElementById('chat-screen');
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatWindow = document.getElementById('chat-window');
    const inputMessage = document.getElementById('inputMessage');
    const sendBtn = document.getElementById('sendBtn');
    const loadingOverlay = document.getElementById('loading-overlay');

    // --- VARIABLE D'ÉTAT ---
    let currentThread = null;


    // --- FONCTIONS UTILITAIRES ---

    // ==================== MODIFICATION APPLIQUÉE ICI ====================
    /**
     * Transforme le texte avec des démarques (Markdown) en HTML.
     * Gère les titres (#, ##, ###), le gras (**) et les sauts de ligne.
     */
    function renderMarkdown(text) {
        // On initialise une variable avec le texte brut.
        let html = text;

        // On applique une série de remplacements pour convertir les démarques en balises HTML.
        // L'ordre est important : on traite les titres les plus spécifiques (###) en premier.
        html = html
            .replace(/^###\s*(.+)/gm, '<h3>$1</h3>')      // Titres H3 pour "### Titre"
            .replace(/^##\s*(.+)/gm, '<h2>$1</h2>')       // Titres H2 pour "## Titre"
            .replace(/^#\s*(.+)/gm, '<h1>$1</h1>')        // Titres H1 pour "# Titre"
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Gras pour "**texte**"
            .replace(/\n/g, '<br>');                      // Sauts de ligne

        // On retourne le HTML final.
        return html;
    }
    // ===================================================================


    // Ajoute un message dans la fenêtre de chat
    function addMessage(content, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        
        if (sender === 'mj') {
            // La fonction renderMarkdown est maintenant plus puissante !
            msgDiv.innerHTML = renderMarkdown(content);
        } else {
            msgDiv.innerText = content;
        }
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // --- LOGIQUE PRINCIPALE (INCHANGÉE) ---

    // Démarrage d'une nouvelle partie
    async function handleStartGame() {
        loadingOverlay.style.display = 'flex';
        try {
            const res = await fetch('/api/newgame', { method: 'POST' });
            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();
            currentThread = data.threadId;

            welcomeScreen.style.display = 'none';
            chatScreen.style.display = 'block';
            chatWindow.innerHTML = '';
            inputMessage.focus();

            if (data.initial) {
                addMessage(data.initial, 'mj');
            }
        } catch (err) {
            console.error("Erreur lors de la création de partie :", err);
            alert("Impossible de démarrer une nouvelle partie :\n" + err.message);
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    // Envoi d'un message du joueur
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
                console.error("Réponse invalide du serveur.");
                addMessage("<i>Le MJ semble confus et ne répond pas...</i>", 'mj');
            }
        } catch (err) {
            loaderDiv.remove();
            console.error("Erreur lors de l'envoi du message :", err);
            addMessage(`<i>Une erreur est survenue : ${err.message}</i>`, 'mj');
        }
    }

    // Retour à l'écran d'accueil
    function handleGoBack() {
        chatScreen.style.display = 'none';
        welcomeScreen.style.display = 'block';
        currentThread = null;
    }


    // --- ÉCOUTEURS D'ÉVÉNEMENTS (INCHANGÉS) ---
    startBtn.addEventListener('click', handleStartGame);
    backBtn.addEventListener('click', handleGoBack);
    sendBtn.addEventListener('click', handleSendMessage);
    inputMessage.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSendMessage();
        }
    });

});
