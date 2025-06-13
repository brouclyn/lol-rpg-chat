// Fichier : script.js

document.addEventListener('DOMContentLoaded', () => {

    // --- SÉLECTEURS DU DOM (inchangés) ---
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

    /**
     * Traite la réponse de l'assistant :
     * 1. Convertit le Markdown (titres, gras) en HTML.
     * 2. Convertit les listes numérotées en boutons cliquables.
     */
    function processAssistantReply(text) {
        let html = text || '';
        // D'abord, le markdown classique
        html = html
            .replace(/^###\s*(.+)/gm, '<h3>$1</h3>')
            .replace(/^##\s*(.+)/gm, '<h2>$1</h2>')
            .replace(/^#\s*(.+)/gm, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        // Ensuite, on transforme les listes numérotées en boutons
        // La regex cherche les lignes qui commencent par un ou plusieurs chiffres, un point et un espace.
        html = html.replace(/^\s*(\d+)\.\s+(.*)/gm, (match, number, choiceText) => {
            // Pour chaque correspondance, on crée un bouton.
            // On stocke le numéro du choix dans un attribut 'data-choice'
            return `<button class="choice-button" data-choice="${number}">${number}. ${choiceText}</button>`;
        });

        return html;
    }

    function addMessage(content, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        
        if (sender === 'mj') {
            // On utilise notre nouvelle fonction de traitement
            msgDiv.innerHTML = processAssistantReply(content);
        } else {
            msgDiv.innerText = content;
        }
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // --- FONCTIONS PRINCIPALES ---
    async function handleSendMessage() {
        const message = inputMessage.value.trim();
        if (!message || !currentThread) return;
        addMessage(message, 'player');
        inputMessage.value = '';
        inputMessage.focus();
        inputMessage.style.height = 'auto';

        const loaderDiv = document.createElement('div');
        loaderDiv.classList.add('message', 'mj', 'loading');
        loaderDiv.innerHTML = '<div class="small-spinner"></div>';
        chatWindow.appendChild(loaderDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        try {
            const res = await fetch('/api/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId: currentThread, message }) });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            loaderDiv.remove();
            if (data.reply) { addMessage(data.reply, 'mj'); } else { addMessage("<i>Le MJ semble confus et ne répond pas...</i>", 'mj'); }
        } catch (err) {
            loaderDiv.remove();
            addMessage(`<i>Une erreur est survenue : ${err.message}</i>`, 'mj');
        }
    }

    async function initiateGame() {
        // ... (votre fonction initiateGame reste inchangée) ...
    }

    // --- ÉCOUTEURS D'ÉVÉNEMENTS ---
    startBtn.addEventListener('click', initiateGame);
    newGameBtn.addEventListener('click', initiateGame);
    sendBtn.addEventListener('click', handleSendMessage);
    
    inputMessage.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.altKey) {
            event.preventDefault(); 
            handleSendMessage();
        }
    });

    inputMessage.addEventListener('input', () => {
        inputMessage.style.height = 'auto';
        inputMessage.style.height = (inputMessage.scrollHeight) + 'px';
    });

    // NOUVEL ÉCOUTEUR D'ÉVÉNEMENT POUR GÉRER LES CLICS SUR LES BOUTONS DE CHOIX
    chatWindow.addEventListener('click', (event) => {
        // On vérifie si l'élément cliqué est bien un bouton de choix
        if (event.target.matches('.choice-button')) {
            const choiceNumber = event.target.dataset.choice;
            
            // On met le numéro du choix dans la barre de saisie
            inputMessage.value = choiceNumber;
            
            // On envoie le message comme si l'utilisateur l'avait tapé
            handleSendMessage();

            // Pour une meilleure expérience, on désactive tous les boutons de ce bloc de choix
            const parentMessage = event.target.closest('.message');
            if (parentMessage) {
                parentMessage.querySelectorAll('.choice-button').forEach(button => {
                    button.disabled = true;
                });
            }
        }
    });
    
    // Pour ne rien oublier, voici la fonction initiateGame complète
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
            if (data.initial) { addMessage(data.initial, 'mj'); }
            progressBar.style.width = '100%';
            setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500);
        } catch (err) {
            loadingOverlay.style.display = 'none';
            alert("Impossible de démarrer une nouvelle partie :\n" + err.message);
        }
    }
});
