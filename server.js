// server.js

require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const path    = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY      = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;
const MODEL        = process.env.OPENAI_MODEL;     // facultatif
const BASE_URL     = 'https://api.openai.com/v1';

app.use(express.json());
app.use(express.static('public'));

const openaiHeaders = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type':  'application/json',
  'OpenAI-Beta':   'assistants=v2',
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/newgame', async (req, res) => {
  try {
    // 1) créer le thread
    const threadResp = await axios.post(
      `${BASE_URL}/threads`,
      {},
      { headers: openaiHeaders }
    );
    const thread_id = threadResp.data.id;

    // 2) lancer un run
    const runPayload = { assistant_id: ASSISTANT_ID };
    if (MODEL) runPayload.model = MODEL;
    let runResp = await axios.post(
      `${BASE_URL}/threads/${thread_id}/runs`,
      runPayload,
      { headers: openaiHeaders }
    );
    let run_id    = runResp.data.id;
    let runStatus = runResp.data.status;

    // 3) poller jusqu’à completion ou timeout
    const maxAttempts = 40;
    let attempts = 0;
    let statusCheck;
    while (runStatus === 'running' && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
      statusCheck = await axios.get(
        `${BASE_URL}/threads/${thread_id}/runs/${run_id}`,
        { headers: openaiHeaders }
      );
      runStatus = statusCheck.data.status;
    }

    if (runStatus !== 'completed') {
      console.error('Run échoué ou timeout:', runStatus, statusCheck?.data);
      return res
        .status(500)
        .send(`Le run a échoué (${runStatus}). Vérifiez les logs serveur.`);
    }

    // 4) récupérer le premier message assistant
    const messagesResp = await axios.get(
      `${BASE_URL}/threads/${thread_id}/messages`,
      { headers: openaiHeaders }
    );
    const firstAssistant = messagesResp.data.data.find(m => m.role === 'assistant');
    const initial = firstAssistant?.content?.[0]?.text?.value || '';

    // 5) renvoyer en camelCase pour le front
    res.json({ threadId: thread_id, initial });

  } catch (err) {
    console.error('Erreur /api/newgame :', err.response?.data || err.message);
    res.status(500).send('Impossible de démarrer la partie : ' + (err.response?.data?.error?.message || err.message));
  }
});

app.post('/api/message', async (req, res) => {
  const { threadId, message } = req.body;
  if (!threadId || !message) {
    return res.status(400).send('Paramètres manquants.');
  }

  try {
    // 1) ajouter le message utilisateur
    await axios.post(
      `${BASE_URL}/threads/${threadId}/messages`,
      { role: 'user', content: message },
      { headers: openaiHeaders }
    );

    // 2) lancer un run
    const runPayload = { assistant_id: ASSISTANT_ID };
    if (MODEL) runPayload.model = MODEL;
    let runResp = await axios.post(
      `${BASE_URL}/threads/${threadId}/runs`,
      runPayload,
      { headers: openaiHeaders }
    );
    let run_id    = runResp.data.id;
    let runStatus = runResp.data.status;

    // 3) poller
    const maxAttempts = 40;
    let attempts = 0;
    let statusCheck;
    while (runStatus === 'running' && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
      statusCheck = await axios.get(
        `${BASE_URL}/threads/${threadId}/runs/${run_id}`,
        { headers: openaiHeaders }
      );
      runStatus = statusCheck.data.status;
    }

    if (runStatus !== 'completed') {
      console.error('Run échoué ou timeout:', runStatus, statusCheck?.data);
      return res
        .status(500)
        .send(`Le run a échoué (${runStatus}). Vérifiez les logs serveur.`);
    }

    // 4) récupérer le dernier message assistant
    const messagesResp = await axios.get(
      `${BASE_URL}/threads/${threadId}/messages`,
      { headers: openaiHeaders }
    );
    const assistantMsgs = messagesResp.data.data.filter(m => m.role === 'assistant');
    const lastMsg       = assistantMsgs[assistantMsgs.length - 1];
    const reply         = lastMsg?.content?.[0]?.text?.value || '';

    res.json({ reply, threadId });

  } catch (err) {
    console.error('Erreur /api/message :', err.response?.data || err.message);
    res.status(500).send('Erreur lors de l’appel à l’Assistant : ' + (err.response?.data?.error?.message || err.message));
  }
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
