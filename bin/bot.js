#!/usr/bin/env node
'use strict';
// Runs the Telegram bot with long polling.  TELEGRAM_BOT_TOKEN=123:abc node bin/bot.js
const { startBot } = require('../src/app');
const config = require('../src/config').load();
if (!config.token) {
  console.error('TELEGRAM_BOT_TOKEN is not set. Create a bot with @BotFather, then run:\n  TELEGRAM_BOT_TOKEN=<token> npm run bot');
  process.exit(1);
}
startBot(config).then((bot) => {
  const stop = async () => { await bot.stop(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
});
