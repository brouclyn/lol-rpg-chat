// 1. Imports et configuration
require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const path    = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 2. Variables d'environnement
const API_KEY      = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;
const MODEL        = process.env.OPENAI_MODEL;       // optionnel
const BASE_URL     = 'https://api.openai.com/v1';

// 3. Middlewares
app.use(express.json());
app.use(express.static('public'));  // sert index.html, CSS, JS, images…

// 4. Préparer les headers pour axios
const openaiHeaders = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type':  'application/json',
  'OpenAI-Beta':   'assistants=v2',
};

// 5. Route racine (envoie index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 6. Démarrer une nouvelle partie (thread + intro)
app.post('/api/newgame', async (req, res) => {
  try {
    // 6.1) Créer le thread
    const threadResp = await axios.post(
      `${BASE_URL}/threads`,
      {},
      { headers: openaiHeaders }
    );
    const thread_id = threadResp.data.id;

    // 6.2) Lancer un run pour générer l'intro du MJ
    const runResp = await axios.post(
      `${BASE_URL}/threads/${thread_id}/runs`,
      { assistant_id: ASSISTANT_ID, model: MODEL },
      { headers: openaiHeaders }
    );
    let run_id    = runResp.data.id;
    let runStatus = runResp.data.status;

    // 6.3) Poller jusqu'à completion
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

    // 6.4) Récupérer les messages et prendre le premier assistant
    const messagesResp = await axios.get(
      `${BASE_URL}/threads/${thread_id}/messages`,
      { headers: openaiHeaders }
    );
    const firstAssistant = messagesResp.data.data.find(m => m.role === 'assistant');
    const initial = firstAssistant?.content?.[0]?.text?.value || '';

    // 6.5) Retourner thread_id + intro
    res.json({ thread_id, initial });

  } catch (err) {
    console.error('Erreur /api/newgame :', err.response?.data || err.message);
    res.status(500).send('Impossible de démarrer la partie.');
  }
});

// 7. Envoyer une action du joueur (ajout message + run suivant)
app.post('/api/message', async (req, res) => {
  const { thread_id, message } = req.body;
  if (!thread_id || !message) {
    return res.status(400).send('Paramètres manquants.');
  }

  try {
    // 7.1) Ajouter le message utilisateur
    await axios.post(
      `${BASE_URL}/threads/${thread_id}/messages`,
      { role: 'user', content: message },
      { headers: openaiHeaders }
    );

    // 7.2) Lancer un nouveau run
    const runResp = await axios.post(
      `${BASE_URL}/threads/${thread_id}/runs`,
      { assistant_id: ASSISTANT_ID, model: MODEL },
      { headers: openaiHeaders }
    );
    let run_id    = runResp.data.id;
    let runStatus = runResp.data.status;

    // 7.3) Poller jusqu'à completion
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

    // 7.4) Récupérer tous les messages, prendre le dernier assistant
    const messagesResp = await axios.get(
      `${BASE_URL}/threads/${thread_id}/messages`,
      { headers: openaiHeaders }
    );
    const assistantMsgs = messagesResp.data.data.filter(m => m.role === 'assistant');
    const lastMsg       = assistantMsgs[assistantMsgs.length - 1];
    const reply         = lastMsg?.content?.[0]?.text?.value || '';

    // 7.5) Renvoyer la réponse et l’ID de thread
    res.json({ reply, thread_id });

  } catch (err) {
    console.error('Erreur /api/message :', err.response?.data || err.message);
    res.status(500).send('Erreur lors de l’appel à l’Assistant.');
  }
});

// 8. Lancement du serveur
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
