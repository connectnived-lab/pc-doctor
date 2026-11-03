'use strict';
// End-to-end: real HTTP long polling against a local fake Telegram server.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createApi, startPolling } = require('../src/bot/telegram');
const { createBot } = require('../src/bot/handlers');
const { createStore } = require('../src/bot/store');
const { loadKB } = require('../src/kb');
const { createAI } = require('../src/bot/ai');

function fakeTelegram(updates) {
  const received = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const method = req.url.split('/').pop();
      const json = body ? JSON.parse(body) : {};
      received.push({ path: req.url, method, json });
      res.setHeader('content-type', 'application/json');
      if (method === 'getUpdates') {
        const batch = updates.filter((u) => u.update_id >= (json.offset || 0));
        if (batch.length) return res.end(JSON.stringify({ ok: true, result: batch }));
        return setTimeout(() => res.end(JSON.stringify({ ok: true, result: [] })), 50);
      }
      res.end(JSON.stringify({ ok: true, result: { message_id: 1 } }));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, received, url: `http://127.0.0.1:${server.address().port}` })));
}

test('long polling delivers updates once, advances the offset, and replies through the Bot API', async () => {
  const from = { id: 42, first_name: 'A', language_code: 'en' };
  const updates = [
    { update_id: 10, message: { message_id: 1, from, chat: { id: 42, type: 'private' }, text: '/start' } },
    { update_id: 11, message: { message_id: 2, from, chat: { id: 42, type: 'private' }, text: 'wifi connected but no internet' } },
  ];
  const tg = await fakeTelegram(updates);
  const api = createApi({ token: 'TEST:TOKEN', baseUrl: tg.url, log: { error() {} } });
  const bot = createBot({ api, kb: loadKB(), store: createStore(null), log: { log() {}, error() {} } });
  const poller = startPolling({ api, onUpdate: bot.handleUpdate, timeout: 1, log: { error() {} } });
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && tg.received.filter((r) => r.method === 'sendMessage').length < 3) await new Promise((r) => setTimeout(r, 20));
  await poller.stop();
  tg.server.close();
  const sends = tg.received.filter((r) => r.method === 'sendMessage');
  assert.ok(tg.received[0].path.startsWith('/botTEST:TOKEN/'), 'token in path');
  assert.equal(tg.received[0].method, 'deleteWebhook');
  assert.match(sends[0].json.text, /PC Doctor/);
  assert.ok(sends.some((s) => /no internet/i.test(s.json.text)));
  const offsets = tg.received.filter((r) => r.method === 'getUpdates').map((r) => r.json.offset);
  assert.ok(offsets.includes(12), 'offset advanced past last update');
  assert.equal(sends.filter((s) => /no internet/i.test(s.json.text) && /Quick checks/.test(s.json.text)).length, 1, 'no duplicate handling');
});

test('createApi refuses to start without a token', () => {
  assert.throws(() => createApi({ token: '' }), /TELEGRAM_BOT_TOKEN/);
});

test('polling stops on 401 (bad token)', async () => {
  const api = { calls: 0, async call(m) { this.calls++; return m === 'getUpdates' ? { ok: false, error_code: 401, description: 'Unauthorized' } : { ok: true }; } };
  const p = startPolling({ api, onUpdate() {}, timeout: 1, log: { error() {} } });
  await p.done;
  assert.equal(api.calls, 2);
});

test('AI fallback is off without a key, and calls an OpenAI-compatible endpoint with one', async () => {
  assert.equal(createAI({ apiKey: '' }), null);
  let seen;
  const fetchImpl = async (url, opts) => { seen = { url, opts: JSON.parse(opts.body), auth: opts.headers.authorization };
    return { ok: true, json: async () => ({ choices: [{ message: { content: '1. Restart the router.' } }] }) }; };
  const ai = createAI({ apiKey: 'k', baseUrl: 'https://example.test/v1', model: 'm', fetchImpl, dailyCap: 1 });
  assert.equal(await ai.ask('router question', 'ml'), '1. Restart the router.');
  assert.equal(seen.url, 'https://example.test/v1/chat/completions');
  assert.equal(seen.auth, 'Bearer k');
  assert.match(seen.opts.messages[0].content, /Malayalam/);
  assert.equal(await ai.ask('again', 'en'), null, 'daily cap enforced');
});

test('AI failure returns null instead of throwing', async () => {
  const ai = createAI({ apiKey: 'k', fetchImpl: async () => { throw new Error('down'); } });
  assert.equal(await ai.ask('x', 'en'), null);
});
