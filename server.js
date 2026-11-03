#!/usr/bin/env node
'use strict';
// One process for hosting: serves the web version (web/) and, if TELEGRAM_BOT_TOKEN is set,
// runs the Telegram bot with long polling alongside it.  PORT defaults to 8080.
const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./src/config').load();

const WEB = path.join(__dirname, 'web');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
let bot = null, botError = null;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, bot: bot ? (bot.running() ? 'running' : 'stopped') : (config.token ? (botError ? 'failed' : 'starting') : 'disabled (no TELEGRAM_BOT_TOKEN)'), botUsername: bot ? bot.username : null, error: botError }));
  }
  if (url.pathname === '/stats.json' && bot) {      // aggregate counters only
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(bot.store.stats()));
  }
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(WEB, rel));
  if (file !== WEB && !file.startsWith(WEB + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});

server.listen(config.port, () => {
  console.log(`PC Doctor web on :${config.port}`);
  if (config.token) {
    require('./src/app').startBot(config).then((b) => { bot = b; }).catch((e) => { botError = String(e.message || e); console.error('bot failed:', e); });
  } else console.log('No TELEGRAM_BOT_TOKEN — bot disabled, serving web only.');
});

const stop = async () => { if (bot) await bot.stop(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
