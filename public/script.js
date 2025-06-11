// public/script.js

const startBtn        = document.getElementById('startBtn');
const backBtn         = document.getElementById('backBtn');
const chatScreen      = document.getElementById('chat-screen');
const welcomeScreen   = document.getElementById('welcome-screen');
const chatWindow      = document.getElementById('chat-window');
const inputMessage    = document.getElementById('inputMessage');
const sendBtn         = document.getElementById('sendBtn');
const loadingOverlay  = document.getElementById('loading-overlay');

let currentThread = null;

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
  if (sender === 'mj') {
    // injecte du HTML pour le formatage markdown
    msgDiv.innerHTML = renderMarkdown(content);
  } else {
    msgDiv.innerText = content;
  }
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Démarrage d'une nouvelle partie
startBtn.addEventListener('click', async () => {
  loadingOverlay.style.display = 'flex';
  try {
    const res = await fetch('/api/newgame', { method: 'POST' });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }
    const data = await res.json();
    currentThread = data.threadId;

    // bascule vers l'écran de chat
    welcomeScreen.style.display = 'none';
    chatScreen.style.display   = 'block';
    chatWindow.innerHTML       = '';

    // affiche l'intro du MJ
    if (data.initial) {
      addMessage(data.initial, 'mj');
    }
  } catch (err) {
    console.error("Erreur lors de la création de partie :", err);
    alert("Impossible de démarrer une nouvelle partie :\n" + err.message);
  } finally {
    loadingOverlay.style.display = 'none';
  }
});

// Retour à l'écran d'accueil
backBtn.addEventListener('click', () => {
  chatScreen.style.display    = 'none';
  welcomeScreen.style.display = 'block';
  currentThread               = null;
});

// Envoi d'un message du joueur
sendBtn.addEventListener('click', async () => {
  const message = inputMessage.value.trim();
  if (!message || !currentThread) return;

  // 1) affiche le message du joueur
  addMessage(message, 'player');
  inputMessage.value = '';

  // 2) crée et affiche le loader MJ
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
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }
    const data = await res.json();

    // retire le loader
    loaderDiv.remove();

    // affiche la vraie réponse
    if (data.reply) {
      addMessage(data.reply, 'mj');
    } else {
      console.error("Réponse invalide du serveur.");
    }
  } catch (err) {
    // retire le loader même en cas d'erreur
    loaderDiv.remove();
    console.error("Erreur lors de l'envoi du message :", err);
    alert("Une erreur est survenue en envoyant l'action :\n" + err.message);
  }
});
