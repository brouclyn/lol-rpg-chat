// server.js

require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const path    = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY      = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;
const MODEL        = process.env.OPENAI_MODEL;
const BASE_URL     = 'https://api.openai.com/v1';

app.use(express.json());
app.use(express.static('public'));

const openaiHeaders = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type':  'application/json',
  'OpenAI-Beta':   'assistants=v2',
};

// Route racine
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrer une nouvelle partie
app.post('/api/newgame', async (req, res) => {
  try {
    // 1) Créer le thread
    const threadResp = await axios.post(
      `${BASE_URL}/threads`,
      {},
      { headers: openaiHeaders }
    );
    const thread_id = threadResp.data.id;

    // 2) Lancer un run pour générer l'intro
    const runResp = await axios.post(
      `${BASE_URL}/threads/${thread_id}/runs`,
      { assistant_id: ASSISTANT_ID, model: MODEL },
      { headers: openaiHeaders }
    );
    let run_id    = runResp.data.id;
    let runStatus = runResp.data.status;

    // 3) Poller jusqu'à completion
    while (runStatus === 'running') {
      await new Promise(r => setTimeout(r, 500));
      const statusCheck = await axios.get(
        `${BASE_URL}/threads/${thread_id}/runs/${run_id}`,
        { headers: openaiHeaders }
      );
      runStatus = statusCheck.data.status;
    }
    if (runStatus !== 'completed') {
      return res.status(500).send('Le run n’a pas pu se terminer.');
    }

    // 4) Récupérer le premier message assistant
    const messagesResp = await axios.get(
      `${BASE_URL}/threads/${thread_id}/messages`,
      { headers: openaiHeaders }
    );
    const firstAssistant = messagesResp.data.data.find(m => m.role === 'assistant');
    const initial = firstAssistant?.content?.[0]?.text?.value || '';

    // 5) Retourner en camelCase pour le front
    res.json({ threadId: thread_id, initial });

  } catch (err) {
    console.error('Erreur /api/newgame :', err.response?.data || err.message);
    res.status(500).send('Impossible de démarrer la partie.');
  }
});

// Envoyer une action du joueur
app.post('/api/message', async (req, res) => {
  const { threadId, message } = req.body;
  if (!threadId || !message) {
    return res.status(400).send('Paramètres manquants.');
  }

  try {
    // 1) Ajouter le message utilisateur
    await axios.post(
      `${BASE_URL}/threads/${threadId}/messages`,
      { role: 'user', content: message },
      { headers: openaiHeaders }
    );

    // 2) Lancer le run
    const runResp = await axios.post(
      `${BASE_URL}/threads/${threadId}/runs`,
      { assistant_id: ASSISTANT_ID, model: MODEL },
      { headers: openaiHeaders }
    );
    let run_id    = runResp.data.id;
    let runStatus = runResp.data.status;

    // 3) Poller jusqu'à completion
    while (runStatus === 'running') {
      await new Promise(r => setTimeout(r, 500));
      const statusCheck = await axios.get(
        `${BASE_URL}/threads/${threadId}/runs/${run_id}`,
        { headers: openaiHeaders }
      );
      runStatus = statusCheck.data.status;
    }
    if (runStatus !== 'completed') {
      return res.status(500).send('Le run n’a pas pu se terminer.');
    }

    // 4) Récupérer la dernière réponse assistant
    const messagesResp = await axios.get(
      `${BASE_URL}/threads/${threadId}/messages`,
      { headers: openaiHeaders }
    );
    const assistantMsgs = messagesResp.data.data.filter(m => m.role === 'assistant');
    const lastMsg       = assistantMsgs[assistantMsgs.length - 1];
    const reply         = lastMsg?.content?.[0]?.text?.value || '';

    // 5) Retourner reply + threadId
    res.json({ reply, threadId });

  } catch (err) {
    console.error('Erreur /api/message :', err.response?.data || err.message);
    res.status(500).send('Erreur lors de l’appel à l’Assistant.');
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
