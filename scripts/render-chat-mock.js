#!/usr/bin/env node
'use strict';
// Renders a Telegram-style chat mock (docs/chat-mock.html) from the bot's REAL replies, using a mocked Telegram API.
// Used to make README screenshots without a live bot token.
const fs = require('fs');
const path = require('path');
const { loadKB } = require('../src/kb');
const { createStore } = require('../src/bot/store');
const { createBot } = require('../src/bot/handlers');

async function conversation(steps) {
  const out = [];
  const api = { async call(method, body) {
    if (method === 'sendMessage') out.push({ who: 'bot', text: body.text, kb: body.reply_markup && body.reply_markup.inline_keyboard });
    if (method === 'editMessageText') out.push({ who: 'bot', text: body.text, kb: body.reply_markup && body.reply_markup.inline_keyboard, edited: true });
    return { ok: true, result: { message_id: out.length } };
  } };
  const bot = createBot({ api, kb: loadKB(), store: createStore(null), log: { log() {}, error() {} } });
  const from = { id: 1, first_name: 'User', language_code: 'en' };
  for (const s of steps) {
    if (s.say) { out.push({ who: 'me', text: s.say }); await bot.handleUpdate({ message: { message_id: 1, from, chat: { id: 1, type: 'private' }, text: s.say } }); }
    if (s.tap) {
      const last = [...out].reverse().find((m) => m.kb && m.kb.flat().some((b) => b.callback_data === s.tap));
      out.push({ who: 'tap', text: last.kb.flat().find((b) => b.callback_data === s.tap).text });
      await bot.handleUpdate({ callback_query: { id: 'x', from, data: s.tap, message: { message_id: 9, chat: { id: 1 }, reply_markup: { inline_keyboard: last.kb } } } });
    }
    if (s.only) out.splice(0, out.length, ...out.filter(s.only));
  }
  return out;
}

let minute = 40;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function bubble(m) {
  if (m.who === 'tap') return `<div class="tap">tapped “${esc(m.text)}”</div>`;
  const keys = m.kb ? `<div class="kb">${m.kb.map((row) => `<div class="row">${row.map((b) => `<span>${esc(b.text)}</span>`).join('')}</div>`).join('')}</div>` : '';
  const text = m.who === 'me' ? esc(m.text) : m.text; // bot text is already Telegram HTML (b, i)
  return `<div class="msg ${m.who}"><div class="b">${text.replace(/\n/g, '<br>')}<span class="tm">${m.edited ? 'edited ' : ''}10:${minute++}</span></div>${keys}</div>`;
}

function page(title, msgs) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
  body{margin:0;font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Malayalam",sans-serif;background:#cfe3c9 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='1.5' fill='%23b6d2ae'/%3E%3C/svg%3E")}
  .bar{position:sticky;top:0;display:flex;gap:10px;align-items:center;padding:10px 14px;background:#517da2;color:#fff}
  .av{width:38px;height:38px;border-radius:50%;background:#0f766e;display:grid;place-items:center;font-size:20px}
  .bar b{display:block}.bar small{opacity:.8}
  .chat{padding:10px 10px 30px;display:flex;flex-direction:column;gap:6px}
  .msg{max-width:86%}.msg.me{align-self:flex-end}.msg.bot{align-self:flex-start}
  .b{padding:7px 10px 18px;border-radius:12px;position:relative;box-shadow:0 1px 1px rgba(0,0,0,.12);word-wrap:break-word}
  .me .b{background:#effdde;border-bottom-right-radius:4px}.bot .b{background:#fff;border-bottom-left-radius:4px}
  .tm{position:absolute;right:8px;bottom:3px;font-size:11px;color:#8a9aa6}
  .kb{margin-top:3px;display:flex;flex-direction:column;gap:3px}.row{display:flex;gap:3px}
  .row span{flex:1;text-align:center;padding:8px 6px;background:rgba(80,110,90,.45);color:#fff;border-radius:8px;font-weight:600;font-size:13.5px}
  .tap{align-self:center;font-size:12px;color:#fff;background:rgba(60,90,70,.45);padding:2px 10px;border-radius:10px}
  </style></head><body><div class="bar"><div class="av">🩺</div><div><b>PC Doctor</b><small>bot</small></div></div><div class="chat">${msgs.map(bubble).join('')}</div></body></html>`;
}

async function main() {
  const docs = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(docs, { recursive: true });
  const en = await conversation([{ say: 'printer work aakunnilla' }, { tap: 'p:print-queue-stuck:1:en' }, { tap: 'p:print-queue-stuck:2:en' }]);
  // keep: question, first page, the two step pages (drop the "other matches" helper message for a cleaner shot)
  fs.writeFileSync(path.join(docs, 'chat-mock-en.html'), page('PC Doctor bot — English', en.filter((m) => !(m.who === 'bot' && /Best match|ഏറ്റവും/.test(m.text)))));
  const ml = await conversation([{ say: 'നെറ്റ് കിട്ടുന്നില്ല' }, { tap: 'p:wifi-no-internet:1:ml' }, { tap: 'f:wifi-no-internet:y:ml' }]);
  fs.writeFileSync(path.join(docs, 'chat-mock-ml.html'), page('PC Doctor bot — Malayalam', ml.filter((m) => !(m.who === 'bot' && /Best match|ഏറ്റവും/.test(m.text)))));
  console.log('wrote docs/chat-mock-en.html, docs/chat-mock-ml.html');
}
main();
