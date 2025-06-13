// public/script.js

// On attend que le contenu de la page soit entièrement chargé avant d'exécuter le script.
// C'est une bonne pratique pour éviter les erreurs.
document.addEventListener('DOMContentLoaded', () => {

    // --- ÉLÉMENTS DU DOM (VOS SÉLECTEURS SONT PARFAITS) ---
    const startBtn = document.getElementById('startBtn');
    const backBtn = document.getElementById('backBtn');
    const chatScreen = document.getElementById('chat-screen');
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatWindow = document.getElementById('chat-window');
    const inputMessage = document.getElementById('inputMessage');
    const sendBtn = document.getElementById('sendBtn');
    const loadingOverlay = document.getElementById('loading-overlay');

    // --- VARIABLE D'ÉTAT (LA CLÉ DE LA MÉMOIRE DE LA CONVERSATION) ---
    let currentThread = null;

    // --- FONCTIONS UTILITAIRES (VOS FONCTIONS SONT EXCELLENTES) ---

    // Parse **gras** et sauts de ligne en HTML
    function renderMarkdown(text) {
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    // Ajoute un message dans la fenêtre de chat
    function addMessage(content, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        // Vous gérez parfaitement la différence de rendu entre le joueur et le MJ
        if (sender === 'mj') {
            msgDiv.innerHTML = renderMarkdown(content);
        } else {
            msgDiv.innerText = content;
        }
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // --- LOGIQUE PRINCIPALE ---

    // Démarrage d'une nouvelle partie
    async function handleStartGame() {
        loadingOverlay.style.display = 'flex';
        try {
            const res = await fetch('/api/newgame', { method: 'POST' });
            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();
            // C'est ici que la magie opère : on sauvegarde l'ID du thread.
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
                // Et ici, on utilise l'ID sauvegardé pour continuer la bonne conversation.
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
        // On réinitialise l'ID pour la prochaine partie. C'est propre !
        currentThread = null;
    }


    // --- ÉCOUTEURS D'ÉVÉNEMENTS ---
    startBtn.addEventListener('click', handleStartGame);
    backBtn.addEventListener('click', handleGoBack);
    sendBtn.addEventListener('click', handleSendMessage);

    // Amélioration : Permet d'envoyer avec la touche "Entrée"
    inputMessage.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Empêche le comportement par défaut (comme soumettre un formulaire)
            handleSendMessage();
        }
    });

});
