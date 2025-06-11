const startBtn = document.getElementById('startBtn');
const backBtn = document.getElementById('backBtn');
const chatScreen = document.getElementById('chat-screen');
const welcomeScreen = document.getElementById('welcome-screen');
const chatWindow = document.getElementById('chat-window');
const inputMessage = document.getElementById('inputMessage');
const sendBtn = document.getElementById('sendBtn');

let currentThread = null;  // stockera l'ID du thread de la partie en cours

// Fonction pour afficher un message dans la fenêtre de chat
function addMessage(content, sender) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message');
  msgDiv.classList.add(sender); // 'mj' ou 'player'
  msgDiv.innerText = content;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight; // fait défiler vers le bas
}

// Clic sur "Commencer l’aventure"
startBtn.addEventListener('click', async () => {
  // Appeler le backend pour créer un nouveau thread
  try {
    const res = await fetch('/api/newgame', { method: 'POST' });
    const data = await res.json();
    currentThread = data.threadId;
    // Basculer l'affichage vers l'écran de chat
    welcomeScreen.style.display = 'none';
    chatScreen.style.display = 'block';
    chatWindow.innerHTML = ''; // on vide d'éventuels anciens messages
    // (Optionnel) On peut demander au MJ de présenter le scénario initial :
    // addMessage("Le MJ attend votre première action...", 'mj');
  } catch (err) {
    console.error("Erreur lors de la création de partie :", err);
    alert("Impossible de démarrer une nouvelle partie.");
  }
});

// Clic sur "Retour" pour revenir à l'accueil (fin de partie)
backBtn.addEventListener('click', () => {
  chatScreen.style.display = 'none';
  welcomeScreen.style.display = 'block';
  currentThread = null;
});

// Clic sur "Envoyer" pour envoyer l'action du joueur
sendBtn.addEventListener('click', async () => {
  const message = inputMessage.value.trim();
  if (!message || !currentThread) return;
  // Afficher le message du joueur dans l'UI
  addMessage(message, 'player');
  inputMessage.value = '';  // vider le champ
  try {
    // Envoyer le message au backend
    const res = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: currentThread, message: message })
    });
    const data = await res.json();
    if (data.reply) {
      // Afficher la réponse du MJ dans l'UI
      addMessage(data.reply, 'mj');
    } else {
      console.error("Réponse invalide du serveur.");
    }
  } catch (err) {
    console.error("Erreur lors de l'envoi du message :", err);
    alert("Une erreur est survenue en envoyant l'action.");
  }
});
