'use strict';
// Configuration from environment variables, with an optional secrets.json next to package.json
// (handy on hosts where setting env vars is awkward). secrets.json is git-ignored.
const fs = require('fs');
const path = require('path');

function load(env = process.env, root = path.join(__dirname, '..')) {
  let file = {};
  try { file = JSON.parse(fs.readFileSync(path.join(root, 'secrets.json'), 'utf8')); } catch { /* optional */ }
  const get = (k, d) => (env[k] != null && env[k] !== '' ? env[k] : (file[k] != null ? file[k] : d));
  return {
    token: get('TELEGRAM_BOT_TOKEN', ''),
    telegramApi: get('TELEGRAM_API_BASE', 'https://api.telegram.org'),
    dataDir: get('DATA_DIR', path.join(root, '.data')),
    port: Number(get('PORT', 8080)),
    aiKey: get('AI_API_KEY', ''),
    aiBaseUrl: get('AI_BASE_URL', 'https://api.openai.com/v1'),
    aiModel: get('AI_MODEL', 'gpt-4o-mini'),
    aiDailyCap: Number(get('AI_DAILY_CAP', 200)),
  };
}

module.exports = { load };
