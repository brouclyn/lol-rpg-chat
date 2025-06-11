// 1. Imports et configuration
require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 2. Variables d'environnement de ton assistant
const ASSISTANT_ID = process.env.ASSISTANT_ID;
const MODEL        = process.env.OPENAI_MODEL;  // ton assistant utilise déjà le modèle configuré

// 3. Middlewares
app.use(express.json());
app.use(express.static('public'));  // sert index.html, CSS, JS, images…

// 4. Initialisation du client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 5. Route racine (envoie index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 6. Démarrer une nouvelle partie (nouveau thread + premier run)
app.post('/api/newgame', async (req, res) => {
  try {
    // 6.1) Création du thread (pas d’argument ici)
    const thread = await openai.beta.threads.create();
    const threadId = thread.id;

    // 6.2) Premier run pour générer l'intro du MJ
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID
      // on peut omettre model, l’assistant utilisera le modèle configuré par défaut
    });

    // 6.3) Attendre la fin du run
    let status = run.status;
    while (status !== 'completed') {
      const info = await openai.beta.threads.runs.retrieve(threadId, run.id);
      status = info.status;
    }

    // 6.4) Récupérer la réponse initiale
    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMsg = messages.data.find(m => m.role === 'assistant');
    const initial = assistantMsg?.content?.[0]?.text?.value || '';

    // 6.5) Renvoyer l'ID et le texte d'introduction
    res.json({ threadId, initial });

  } catch (err) {
    console.error('Erreur newgame :', err);
    res.status(500).send("Impossible de démarrer la partie.");
  }
});

// 7. Envoyer une action du joueur (run suivant)
app.post('/api/message', async (req, res) => {
  const { threadId, message } = req.body;
  if (!threadId) {
    return res.status(400).send("Thread manquant.");
  }

  try {
    // 7.1) Ajouter le message du joueur
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message
    });

    // 7.2) Lancer un nouveau run
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID
    });

    // 7.3) Attendre la fin du run
    let status = run.status;
    while (status !== 'completed') {
      const info = await openai.beta.threads.runs.retrieve(threadId, run.id);
      status = info.status;
    }

    // 7.4) Récupérer la dernière réponse
    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMsgs = messages.data.filter(m => m.role === 'assistant');
    const lastMsg = assistantMsgs[assistantMsgs.length - 1];
    const reply = lastMsg?.content?.[0]?.text?.value || '';

    // 7.5) Renvoyer la réponse
    res.json({ reply });

  } catch (err) {
    console.error('Erreur message :', err);
    res.status(500).send("Erreur lors de l'appel à l'assistant.");
  }
});

// 8. Lancement du serveur
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
