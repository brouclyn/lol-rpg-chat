// 1. Imports et configuration
require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const { v4: uuidv4 } = require('uuid');
const path = require('path');              // <-- ajout

const app = express();
const PORT = process.env.PORT || 3000;

// 2. Middlewares
app.use(express.json());
app.use(express.static('public'));         // sert index.html, style.css, script.js, images…

// 3. Initialisation de l'API OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 4. Stockage en mémoire des threads
let threads = {};

// 5. Route racine : envoie index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 6. Nouvelle partie
app.post('/api/newgame', (req, res) => {
  const threadId = uuidv4();
  threads[threadId] = [{
    role: 'system',
    content: `Tu es un Maître du Jeu…`  // ton prompt système
  }];
  res.json({ threadId });
});

// 7. Envoyer un message / action
app.post('/api/message', async (req, res) => {
  const { threadId, message } = req.body;
  if (!threadId || !threads[threadId]) {
    return res.status(400).send("Thread inconnu. Commencez une nouvelle partie.");
  }
  threads[threadId].push({ role: 'user', content: message });
  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: threads[threadId]
    });
    const reply = chatCompletion.choices[0].message.content;
    threads[threadId].push({ role: 'assistant', content: reply });
    res.json({ reply });
  } catch (error) {
    console.error('Erreur OpenAI :', error);
    res.status(500).send("Erreur du serveur ou de l'API OpenAI");
  }
});

// 8. Lancement du serveur
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});