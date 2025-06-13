// public/script.js

document.addEventListener('DOMContentLoaded', () => {

    // --- SÉLECTEURS DU DOM ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const progressBar = document.querySelector('.progress-bar-inner');
    
    const welcomeScreen = document.getElementById('welcome-screen');
    const startBtn = document.getElementById('startBtn');
    
    const gameView = document.getElementById('game-view');
    const newGameBtn = document.getElementById('newGameBtn'); // Bouton dans la navbar
    const chatWindow = document.getElementById('chat-window');
    const inputMessage = document.getElementById('inputMessage');
    const sendBtn = document.getElementById('sendBtn');

    let currentThread = null;

    // --- FONCTIONS ---
    function renderMarkdown(text) { /* ...votre fonction est parfaite... */ }
    function addMessage(content, sender) { /* ...votre fonction est parfaite... */ }

    /**
     * Gère le lancement ou le redémarrage d'une partie.
     */
    async function initiateGame() {
        // 1. Affiche l'overlay de chargement et simule le progrès
        loadingOverlay.style.display = 'flex';
        progressBar.style.width = '0%';
        setTimeout(() => { progressBar.style.width = '50%'; }, 100); // Début du chargement

        try {
            const res = await fetch('/api/newgame', { method: 'POST' });
            if (!res.ok) throw new Error(await res.text());

            progressBar.style.width = '90%'; // API a répondu
            const data = await res.json();
            currentThread = data.threadId;

            // 2. Cache l'écran d'accueil (s'il est visible) et affiche la vue de jeu
            welcomeScreen.style.display = 'none';
            gameView.style.display = 'flex';
            
            chatWindow.innerHTML = '';
            inputMessage.focus();
            if (data.initial) {
                addMessage(data.initial, 'mj');
            }

            // 3. Termine le chargement et cache l'overlay
            progressBar.style.width = '100%';
            setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500);

        } catch (err) {
            loadingOverlay.style.display = 'none'; // Cache le loader en cas d'erreur
            alert("Impossible de démarrer une nouvelle partie :\n" + err.message);
        }
    }

    // handleSendMessage reste identique
    async function handleSendMessage() { /* ...votre fonction est parfaite... */ }

    // --- ÉCOUTEURS D'ÉVÉNEMENTS ---
    // Le bouton sur l'écran d'accueil lance le jeu
    startBtn.addEventListener('click', initiateGame);
    // Le bouton dans la navbar lance aussi une nouvelle partie
    newGameBtn.addEventListener('click', initiateGame);
    
    sendBtn.addEventListener('click', handleSendMessage);
    inputMessage.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSendMessage();
        }
    });

    // Note : On ne lance plus de partie au chargement de la page.
    // L'utilisateur doit cliquer sur "Commencer l'aventure".
});
