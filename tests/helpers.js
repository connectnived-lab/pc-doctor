'use strict';
// Mock Telegram API: records every call and returns plausible results.
function mockApi() {
  const calls = [];
  let nextId = 100;
  return {
    calls,
    async call(method, body) {
      calls.push({ method, body });
      if (method === 'sendMessage') return { ok: true, result: { message_id: nextId++, chat: { id: body.chat_id }, text: body.text } };
      return { ok: true, result: true };
    },
    sent() { return calls.filter((c) => c.method === 'sendMessage').map((c) => c.body); },
    of(method) { return calls.filter((c) => c.method === method).map((c) => c.body); },
    reset() { calls.length = 0; },
  };
}

let uid = 1;
const user = (extra = {}) => ({ id: 5000 + uid++, is_bot: false, first_name: 'Test', language_code: 'en', ...extra });
const msg = (text, from, chat = { id: from.id, type: 'private' }) => ({ message: { message_id: Math.floor(Math.random() * 1e6), from, chat, date: 0, text } });
const cb = (data, from, message) => ({ callback_query: { id: String(Math.random()), from, data, message } });
const buttons = (body) => (body.reply_markup ? body.reply_markup.inline_keyboard.flat() : []);

module.exports = { mockApi, user, msg, cb, buttons };
