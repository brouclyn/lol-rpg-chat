// public/script.js

const startBtn       = document.getElementById('startBtn');
const backBtn        = document.getElementById('backBtn');
const chatScreen     = document.getElementById('chat-screen');
const welcomeScreen  = document.getElementById('welcome-screen');
const chatWindow     = document.getElementById('chat-window');
const inputMessage   = document.getElementById('inputMessage');
const sendBtn        = document.getElementById('sendBtn');

let currentThread = null;

// Ajoute un message dans la fenêtre de chat
function addMessage(content, sender) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', sender);
  msgDiv.innerText = content;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Démarrer une nouvelle partie
startBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/newgame', { method: 'POST' });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }
    const data = await res.json();
    currentThread = data.threadId;

    welcomeScreen.style.display = 'none';
    chatScreen.style.display   = 'block';
    chatWindow.innerHTML       = '';

    // Affiche l'intro du MJ
    if (data.initial) {
      addMessage(data.initial, 'mj');
    }
  } catch (err) {
    console.error("Erreur lors de la création de partie :", err);
    alert("Impossible de démarrer une nouvelle partie :\n" + err.message);
  }
});

// Revenir à l'écran d'accueil
backBtn.addEventListener('click', () => {
  chatScreen.style.display    = 'none';
  welcomeScreen.style.display = 'block';
  currentThread               = null;
});

// Envoyer l'action du joueur
sendBtn.addEventListener('click', async () => {
  const message = inputMessage.value.trim();
  if (!message || !currentThread) return;

  addMessage(message, 'player');
  inputMessage.value = '';

  try {
    const res = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: currentThread, message })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }
    const data = await res.json();
    if (data.reply) {
      addMessage(data.reply, 'mj');
    } else {
      console.error("Réponse invalide du serveur.");
    }
  } catch (err) {
    console.error("Erreur lors de l'envoi du message :", err);
    alert("Une erreur est survenue en envoyant l'action :\n" + err.message);
  }
});
