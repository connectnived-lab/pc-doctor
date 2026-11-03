'use strict';
// Wires the pieces together: knowledge base + store + optional AI + Telegram polling.
const { loadKB } = require('./kb');
const { createStore } = require('./bot/store');
const { createApi, startPolling } = require('./bot/telegram');
const { createBot } = require('./bot/handlers');
const { createAI } = require('./bot/ai');

async function startBot(config, { log = console } = {}) {
  const kb = loadKB();
  const store = createStore(config.dataDir);
  const ai = createAI({ apiKey: config.aiKey, baseUrl: config.aiBaseUrl, model: config.aiModel, dailyCap: config.aiDailyCap });
  const api = createApi({ token: config.token, baseUrl: config.telegramApi, log });
  const me = await api.call('getMe');
  if (!me.ok && me.error_code === 401) throw new Error('Telegram rejected the bot token (401). Check TELEGRAM_BOT_TOKEN.');
  const username = me.ok ? me.result.username : '';
  if (!me.ok) log.error('getMe failed:', me.description);
  await api.call('setMyCommands', { commands: [
    { command: 'start', description: 'Start / welcome' },
    { command: 'categories', description: 'Browse problems by category' },
    { command: 'lang', description: 'English / മലയാളം' },
    { command: 'help', description: 'How to use' },
    { command: 'about', description: 'About PC Doctor' },
  ] });
  const bot = createBot({ api, kb, store, ai, botUsername: username, log });
  const poller = startPolling({ api, onUpdate: bot.handleUpdate, log });
  let polling = true;
  poller.done.then(() => { polling = false; });
  log.log(`PC Doctor bot running as @${username || '?'} — ${kb.problems.length} guides, AI fallback ${ai ? 'ON (' + ai.model + ')' : 'off'}`);
  return {
    username, store, kb, done: poller.done,
    running: () => polling,
    async stop() { await poller.stop(); store.flush(); },
  };
}

module.exports = { startBot };
