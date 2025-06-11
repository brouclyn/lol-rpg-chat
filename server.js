// server.js

require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const path    = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY      = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;
const MODEL        = process.env.OPENAI_MODEL;    // facultatif
const BASE_URL     = 'https://api.openai.com/v1';

app.use(express.json());
app.use(express.static('public'));

const openaiHeaders = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type':  'application/json',
  'OpenAI-Beta':   'assistants=v2',
};

/**
 * Lance un run sur un thread existant, attend qu'il se termine (completed, failed ou cancelled),
 * puis renvoie le statut et les données brutes du run.
 */
async function runAssistant(threadId) {
  const payload = { assistant_id: ASSISTANT_ID };
  if (MODEL) payload.model = MODEL;

  // 1) Lancer le run
  const { data: runStart } = await axios.post(
    `${BASE_URL}/threads/${threadId}/runs`,
    payload,
    { headers: openaiHeaders }
  );
  const runId = runStart.id;

  // 2) Polling jusqu'à completed, failed ou cancelled
  const maxAttempts = 40;
  let attempt = 0;
  let status, runData;

  do {
    await new Promise(r => setTimeout(r, 1000));
    const resp = await axios.get(
      `${BASE_URL}/threads/${threadId}/runs/${runId}`,
      { headers: openaiHeaders }
    );
    status  = resp.data.status;
    runData = resp.data;
    attempt++;
  } while (
    status !== 'completed' &&
    status !== 'failed' &&
    status !== 'cancelled' &&
    attempt < maxAttempts
  );

  return { status, runData };
}

/**
 * Récupère le premier (ou le dernier) message rôle assistant sur un thread.
 * @param {string} threadId 
 * @param {'first'|'last'} which 
 */
async function getAssistantMessage(threadId, which = 'last') {
  const { data: messages } = await axios.get(
    `${BASE_URL}/threads/${threadId}/messages`,
    { headers: openaiHeaders }
  );
  const assistants = messages.data.filter(m => m.role === 'assistant');
  if (!assistants.length) return '';
  const msg = which === 'first'
    ? assistants[0]
    : assistants[assistants.length - 1];
  return msg.content?.[0]?.text?.value || '';
}

// Route racine
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Nouvelle partie
app.post('/api/newgame', async (req, res) => {
  try {
    // 1) créer un nouveau thread
    const { data: threadResp } = await axios.post(
      `${BASE_URL}/threads`,
      {},
      { headers: openaiHeaders }
    );
    const threadId = threadResp.id;
    console.log('Nouveau thread créé :', threadId);

    // 2) run assistant pour l'intro
    const { status, runData } = await runAssistant(threadId);

    if (status !== 'completed') {
      console.error('Run newgame échoué :', status, runData);
      return res.status(500).send(`Le run a échoué (${status}).`);
    }

    // 3) récupérer et renvoyer le premier message
    const initial = await getAssistantMessage(threadId, 'first');
    res.json({ threadId, initial });

  } catch (err) {
    console.error('Erreur /api/newgame :', err.response?.data || err.message);
    const msg = err.response?.data?.error?.message || err.message;
    res.status(500).send(`Impossible de démarrer la partie : ${msg}`);
  }
});

// Envoyer un message au MJ
app.post('/api/message', async (req, res) => {
  const { threadId, message } = req.body;
  if (!threadId || !message) {
    return res.status(400).send('Paramètres manquants.');
  }

  try {
    console.log(`Message reçu [thread ${threadId}] :`, message);

    // 1) poster le message du joueur
    await axios.post(
      `${BASE_URL}/threads/${threadId}/messages`,
      { role: 'user', content: message },
      { headers: openaiHeaders }
    );

    // 2) lancer un nouveau run et attendre
    const { status, runData } = await runAssistant(threadId);
    if (status !== 'completed') {
      console.error('Run /api/message échoué :', status, runData);
      return res.status(500).send(`Le run a échoué (${status}).`);
    }

    // 3) récupérer et renvoyer la réponse du MJ
    const reply = await getAssistantMessage(threadId, 'last');
    res.json({ reply, threadId });

  } catch (err) {
    console.error('Erreur /api/message :', err.response?.data || err.message);
    const msg = err.response?.data?.error?.message || err.message;
    res.status(500).send(`Erreur lors de l’appel à l’Assistant : ${msg}`);
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
