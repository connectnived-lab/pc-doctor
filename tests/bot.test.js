'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadKB } = require('../src/kb');
const { createStore } = require('../src/bot/store');
const { createBot } = require('../src/bot/handlers');
const { mockApi, user, msg, cb, buttons } = require('./helpers');

const kb = loadKB();
function setup(opts = {}) {
  const api = mockApi();
  const store = createStore(null);
  const bot = createBot({ api, kb, store, botUsername: 'pcdoctor_test_bot', log: { log() {}, error() {} }, ...opts });
  return { api, store, bot };
}
const guideMessage = (body, id = 777) => ({ message_id: id, chat: { id: body.chat_id }, text: body.text, reply_markup: body.reply_markup });

test('/start sends welcome and a language picker for a new user', async () => {
  const { api, bot } = setup();
  await bot.handleUpdate(msg('/start', user()));
  const sent = api.sent();
  assert.match(sent[0].text, /PC Doctor/);
  assert.deepEqual(buttons(sent[1]).map((b) => b.callback_data), ['l:en', 'l:ml']);
});

test('/start p_<id> deep link opens that guide', async () => {
  const { api, bot } = setup();
  await bot.handleUpdate(msg('/start p_paper-jam', user()));
  assert.match(api.sent()[0].text, /paper jam/i);
});

test('/help and /about reply', async () => {
  const { api, bot } = setup();
  const u = user();
  await bot.handleUpdate(msg('/help', u));
  await bot.handleUpdate(msg('/about', u));
  assert.match(api.sent()[0].text, /categories/);
  assert.match(api.sent()[1].text, /Nived NS/);
});

test('free-text question returns the guide with paging and feedback buttons', async () => {
  const { api, bot, store } = setup();
  await bot.handleUpdate(msg('laptop slow aanu', user()));
  const first = api.sent()[0];
  assert.match(first.text, /slow/i);
  assert.equal(first.parse_mode, 'HTML');
  const data = buttons(first).map((b) => b.callback_data);
  assert.ok(data.includes('p:laptop-slow:1:en'), 'Start fix button');
  assert.ok(data.includes('lp:ml:laptop-slow:0'), 'language toggle');
  assert.equal(store.stats().views['laptop-slow'], 1);
  assert.equal(store.stats().searches, 1);
});

test('"Next step" edits the same message and walks through every step to the feedback page', async () => {
  const { api, bot } = setup();
  const u = user();
  await bot.handleUpdate(msg('printer offline', u));
  let body = api.sent()[0];
  const p = kb.get('printer-offline');
  for (let page = 1; page <= p.steps.en.length + 1; page++) {
    api.reset();
    await bot.handleUpdate(cb(`p:printer-offline:${page}`, u, guideMessage(body)));
    const e = api.of('editMessageText')[0];
    assert.ok(e, `page ${page} edited in place`);
    assert.equal(e.message_id, 777);
    if (page <= p.steps.en.length) assert.match(e.text, new RegExp(`Step ${page} of ${p.steps.en.length}`));
    else assert.match(e.text, /When to call a technician/);
    const data = buttons(e).map((b) => b.callback_data);
    assert.ok(data.includes('f:printer-offline:y:en') && data.includes('f:printer-offline:n:en'));
    assert.equal(api.of('answerCallbackQuery').length, 1);
    body = { chat_id: u.id, text: e.text, reply_markup: e.reply_markup };
  }
});

test('Fixed ✅ is counted once and the feedback row is removed', async () => {
  const { api, bot, store } = setup();
  const u = user();
  await bot.handleUpdate(msg('paper jam', u));
  const m = guideMessage(api.sent()[0], 900);
  await bot.handleUpdate(cb('f:paper-jam:y', u, m));
  await bot.handleUpdate(cb('f:paper-jam:y', u, m));       // second press
  assert.equal(store.stats().fixed['paper-jam'], 1);
  const markup = api.of('editMessageReplyMarkup')[0].reply_markup;
  assert.ok(!markup.inline_keyboard.flat().some((b) => b.callback_data.startsWith('f:')));
  assert.match(api.sent().at(-1).text, /Glad|സന്തോഷം/);
  assert.equal(api.of('answerCallbackQuery').at(-1).text !== undefined, true, 'second press gets a toast');
});

test('Still not working ❌ shows technician advice and related guides', async () => {
  const { api, bot, store } = setup();
  const u = user();
  await bot.handleUpdate(msg('no sound', u));
  await bot.handleUpdate(cb('f:no-sound:n', u, guideMessage(api.sent()[0], 901)));
  assert.equal(store.stats().notFixed['no-sound'], 1);
  const reply = api.sent().at(-1);
  assert.match(reply.text, /technician/i);
  assert.ok(buttons(reply).some((b) => b.callback_data === 'p:mic-not-working:0:en'));
});

test('Malayalam question gets a Malayalam answer automatically', async () => {
  const { api, bot } = setup();
  await bot.handleUpdate(msg('നെറ്റ് കിട്ടുന്നില്ല', user()));
  assert.match(api.sent()[0].text, /internet ഇല്ല/);
  assert.match(api.sent()[0].text, /ആദ്യം ഇവ നോക്കൂ/);
});

test('a guide opened in Malayalam stays Malayalam while paging and on feedback (language rides in the button data)', async () => {
  const { api, bot } = setup();
  const u = user({ language_code: 'en' });                 // no saved preference, English phone
  await bot.handleUpdate(msg('നെറ്റ് കിട്ടുന്നില്ല', u)); // Malayalam question -> Malayalam guide
  const first = api.sent()[0];
  const start = buttons(first).find((x) => x.callback_data.startsWith('p:wifi-no-internet:1'));
  assert.equal(start.callback_data, 'p:wifi-no-internet:1:ml');
  await bot.handleUpdate(cb(start.callback_data, u, guideMessage(first)));
  const step = api.of('editMessageText')[0];
  assert.match(step.text, /Step 1 \//);
  assert.match(step.text, /Router restart ചെയ്യുക/);
  await bot.handleUpdate(cb('f:wifi-no-internet:y:ml', u, guideMessage({ chat_id: u.id, text: step.text, reply_markup: step.reply_markup }, 778)));
  assert.match(api.sent().at(-1).text, /സന്തോഷം/);
  const kept = api.of('editMessageReplyMarkup')[0].reply_markup.inline_keyboard.flat().map((x) => x.callback_data);
  assert.ok(kept.includes('p:wifi-no-internet:2:ml'), 'navigation kept after voting');
});

test('language toggle per user: /lang ml, then English questions get Malayalam guides', async () => {
  const { api, bot } = setup();
  const u = user(), other = user();
  await bot.handleUpdate(msg('/lang ml', u));
  assert.match(api.sent()[0].text, /മലയാളം/);
  await bot.handleUpdate(msg('printer offline', u));
  assert.match(api.sent()[1].text, /കാണിക്കുന്നു/);
  await bot.handleUpdate(msg('printer offline', other));     // other user unaffected
  assert.match(api.sent().at(-1).text, /Printer shows/);
});

test('language button on a guide switches and re-renders the same page', async () => {
  const { api, bot, store } = setup();
  const u = user();
  await bot.handleUpdate(msg('mouse not working', u));
  await bot.handleUpdate(cb('lp:ml:mouse-not-working:2', u, guideMessage(api.sent()[0])));
  const e = api.of('editMessageText')[0];
  assert.match(e.text, /Step 2 \//);
  assert.equal(store.getLang(u.id), 'ml');
});

test('language picker buttons save the choice', async () => {
  const { api, bot, store } = setup();
  const u = user();
  await bot.handleUpdate(cb('l:ml', u, { message_id: 5, chat: { id: u.id } }));
  assert.equal(store.getLang(u.id), 'ml');
  assert.match(api.of('editMessageText')[0].text, /മലയാളം/);
});

test('/categories → category → guide list', async () => {
  const { api, bot } = setup();
  const u = user();
  await bot.handleUpdate(msg('/categories', u));
  const cats = buttons(api.sent()[0]).map((b) => b.callback_data);
  assert.equal(cats.length, kb.categories.length);
  await bot.handleUpdate(cb('c:printer', u, { message_id: 1, chat: { id: u.id } }));
  const list = buttons(api.sent()[1]).map((b) => b.callback_data);
  assert.ok(list.includes('p:paper-jam:0:en'));
  // opening a guide from a list sends a NEW message (doesn't overwrite the list)
  await bot.handleUpdate(cb('p:paper-jam:0', u, { message_id: 2, chat: { id: u.id }, reply_markup: api.sent()[1].reply_markup }));
  assert.match(api.sent()[2].text, /paper jam/i);
});

test('ambiguous question shows choices as buttons', async () => {
  const { api, bot } = setup();
  await bot.handleUpdate(msg('laptop not working', user()));
  const body = api.sent()[0];
  assert.match(body.text, /which one/);
  assert.ok(buttons(body).length >= 2);
});

test('unmatched question without AI key: helpful fallback, counted as unmatched', async () => {
  const { api, bot, store } = setup();
  await bot.handleUpdate(msg('how to cook biriyani', user()));
  assert.match(api.sent()[0].text, /couldn't find/);
  assert.equal(store.stats().unmatched, 1);
});

test('unmatched question WITH AI configured uses the AI answer, escaped and labelled', async () => {
  const asked = [];
  const ai = { async ask(q, lang) { asked.push([q, lang]); return 'Try <restarting> the app'; } };
  const { api, bot, store } = setup({ ai });
  await bot.handleUpdate(msg('my smartwatch strap broke', user()));
  assert.deepEqual(asked, [['my smartwatch strap broke', 'en']]);
  const reply = api.sent().at(-1);
  assert.match(reply.text, /&lt;restarting&gt;/);
  assert.match(reply.text, /AI answer/);
  assert.equal(store.stats().ai, 1);
});

test('AI is not called when the knowledge base matches', async () => {
  let called = false;
  const { bot } = setup({ ai: { async ask() { called = true; return 'x'; } } });
  await bot.handleUpdate(msg('printer offline', user()));
  assert.equal(called, false);
});

test('groups: ignores chatter, answers when mentioned or on commands', async () => {
  const { api, bot } = setup();
  const u = user();
  const group = { id: -100123, type: 'supergroup' };
  await bot.handleUpdate(msg('laptop slow aanu', u, group));
  assert.equal(api.sent().length, 0);
  await bot.handleUpdate(msg('@pcdoctor_test_bot laptop slow aanu', u, group));
  assert.match(api.sent()[0].text, /slow/i);
  const before = api.sent().length;
  await bot.handleUpdate(msg('/help@pcdoctor_test_bot', u, group));
  assert.equal(api.sent().length, before + 1);
  assert.match(api.sent().at(-1).text, /How to use/);
});

test('flood protection', async () => {
  const { api, bot } = setup({ rateLimit: { max: 3, perMs: 60000 } });
  const u = user();
  for (let i = 0; i < 5; i++) await bot.handleUpdate(msg('/help', u));
  assert.match(api.sent().at(-1).text, /wait/);
});

test('unknown callback data is answered without crashing', async () => {
  const { api, bot } = setup();
  const u = user();
  await bot.handleUpdate(cb('p:does-not-exist:3', u, { message_id: 1, chat: { id: u.id } }));
  await bot.handleUpdate(cb('garbage', u, { message_id: 1, chat: { id: u.id } }));
  assert.equal(api.of('answerCallbackQuery').length, 2);
  assert.equal(api.sent().length, 0);
});

test('store keeps no raw user ids or message text, and persists to disk', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pcd-'));
  const api = mockApi();
  const store = createStore(dir, { saveDelayMs: 1 });
  const bot = createBot({ api, kb, store, log: { log() {}, error() {} } });
  const u = user({ id: 987654321 });
  await bot.handleUpdate(msg('/lang ml', u));
  await bot.handleUpdate(msg('my secret question about printer offline', u));
  store.flush();
  const raw = fs.readFileSync(path.join(dir, 'pcdoctor-store.json'), 'utf8');
  assert.ok(!raw.includes('987654321'), 'raw user id stored');
  assert.ok(!raw.includes('secret'), 'message text stored');
  const again = createStore(dir);
  assert.equal(again.getLang(987654321), 'ml');
  assert.equal(again.stats().views['printer-offline'], 1);
});
