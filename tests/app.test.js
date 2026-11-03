'use strict';
// startBot() wiring (getMe, setMyCommands, polling, store on disk) against a local fake Telegram server.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startBot } = require('../src/app');
const { load } = require('../src/config');

test('startBot registers commands, answers a message and saves counters', async () => {
  const seen = [];
  let served = false;
  const server = http.createServer((req, res) => {
    let body = ''; req.on('data', (c) => (body += c));
    req.on('end', () => {
      const method = req.url.split('/').pop(); seen.push({ method, json: body ? JSON.parse(body) : {} });
      res.setHeader('content-type', 'application/json');
      if (method === 'getMe') return res.end(JSON.stringify({ ok: true, result: { id: 1, is_bot: true, username: 'pcdoctor_test_bot' } }));
      if (method === 'getUpdates') {
        if (!served) { served = true; return res.end(JSON.stringify({ ok: true, result: [{ update_id: 1, message: { message_id: 1, from: { id: 7, language_code: 'en' }, chat: { id: 7, type: 'private' }, text: 'paper jam' } }] })); }
        return setTimeout(() => res.end(JSON.stringify({ ok: true, result: [] })), 50);
      }
      res.end(JSON.stringify({ ok: true, result: { message_id: 5 } }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pcd-app-'));
  const config = load({ TELEGRAM_BOT_TOKEN: 'T:1', TELEGRAM_API_BASE: `http://127.0.0.1:${server.address().port}`, DATA_DIR: dataDir }, os.tmpdir());
  const bot = await startBot(config, { log: { log() {}, error() {} } });
  for (let i = 0; i < 100 && !seen.some((s) => s.method === 'sendMessage'); i++) await new Promise((r) => setTimeout(r, 20));
  assert.equal(bot.running(), true);
  await bot.stop();
  server.close();
  assert.equal(bot.username, 'pcdoctor_test_bot');
  const cmds = seen.find((s) => s.method === 'setMyCommands').json.commands.map((c) => c.command);
  assert.deepEqual(cmds, ['start', 'categories', 'lang', 'help', 'about']);
  assert.match(seen.find((s) => s.method === 'sendMessage').json.text, /paper jam/i);
  const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'pcdoctor-store.json'), 'utf8'));
  assert.equal(saved.stats.views['paper-jam'], 1);
});

test('startBot fails loudly on a rejected token', async () => {
  const server = http.createServer((req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' })); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const config = load({ TELEGRAM_BOT_TOKEN: 'bad', TELEGRAM_API_BASE: `http://127.0.0.1:${server.address().port}`, DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'pcd-')) }, os.tmpdir());
  await assert.rejects(startBot(config, { log: { log() {}, error() {} } }), /401/);
  server.close();
});

test('config reads env first, then secrets.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pcd-cfg-'));
  fs.writeFileSync(path.join(dir, 'secrets.json'), JSON.stringify({ TELEGRAM_BOT_TOKEN: 'from-file', PORT: 9000 }));
  assert.equal(load({}, dir).token, 'from-file');
  assert.equal(load({}, dir).port, 9000);
  assert.equal(load({ TELEGRAM_BOT_TOKEN: 'from-env' }, dir).token, 'from-env');
  assert.equal(load({}, os.tmpdir() + '/nope').aiKey, '');
});
