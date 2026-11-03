'use strict';
// Bot logic: turns a Telegram update into API calls. Network-free given an `api` object with call(method, body),
// so the tests drive it with a mocked Telegram.
const { t, LANGS } = require('./i18n');
const R = require('./render');
const Matcher = require('../matcher');

function createBot({ api, kb, store, ai = null, botUsername = '', log = console, rateLimit = { max: 20, perMs: 60000 }, now = () => Date.now() }) {
  const voted = new Set();            // `${chat}:${message}` — one vote per guide message (memory only)
  const hits = new Map();             // chat id -> recent timestamps, for simple flood protection

  function langFor(user, text) {
    const saved = user ? store.getLang(user.id) : null;
    if (saved) return saved;
    if (text && Matcher.isMalayalam(text)) return 'ml';
    if (user && user.language_code === 'ml') return 'ml';
    return 'en';
  }

  function limited(chatId) {
    const ts = now(), list = (hits.get(chatId) || []).filter((x) => ts - x < rateLimit.perMs);
    list.push(ts); hits.set(chatId, list);
    if (hits.size > 5000) hits.clear();
    return list.length > rateLimit.max;
  }

  const send = (chatId, msg, extra = {}) => api.call('sendMessage', { chat_id: chatId, text: msg.text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: msg.reply_markup, ...extra });
  const edit = (chatId, messageId, msg) => api.call('editMessageText', { chat_id: chatId, message_id: messageId, text: msg.text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: msg.reply_markup });

  async function showProblem(chatId, p, page, lang, messageId) {
    const msg = R.problemPage(p, page, lang);
    if (messageId) {
      const r = await edit(chatId, messageId, msg);
      if (r && r.ok === false && !/not modified/i.test(r.description || '')) return send(chatId, msg);
      return r;
    }
    store.view(p.id);
    return send(chatId, msg);
  }

  async function answerQuestion(chatId, user, text) {
    const lang = langFor(user, text);
    const { top, confident, results } = kb.matcher.best(text);
    store.search(!!top);
    if (top && confident) {
      await showProblem(chatId, top.problem, 0, lang);
      const rest = results.slice(1, 4).filter((r) => r.score >= top.score * 0.35);
      if (rest.length) await send(chatId, R.alternativesMessage(rest, lang));
      return;
    }
    if (results.length) return send(chatId, R.matchesMessage(results.slice(0, 5), lang));
    if (ai) {
      await api.call('sendChatAction', { chat_id: chatId, action: 'typing' });
      const answer = await ai.ask(text, lang);
      if (answer) {
        store.aiAnswer();
        return send(chatId, { text: `${R.esc(answer)}\n\n${t(lang, 'aiNote')}`, reply_markup: { inline_keyboard: [[{ text: t(lang, 'cats'), callback_data: `cats:${lang}` }]] } });
      }
    }
    return send(chatId, { text: t(lang, 'noMatch'), reply_markup: { inline_keyboard: [[{ text: t(lang, 'cats'), callback_data: `cats:${lang}` }]] } });
  }

  async function onMessage(m) {
    const chatId = m.chat.id, user = m.from || null;
    const text = (m.text || '').trim();
    if (!text) return;
    const isPrivate = m.chat.type === 'private';
    const mention = botUsername && new RegExp('@' + botUsername + '\\b', 'i').test(text);
    if (!isPrivate && !text.startsWith('/') && !mention) return;    // stay quiet in groups unless addressed
    if (limited(chatId)) return send(chatId, { text: t(langFor(user, text), 'slowDown') });

    if (text.startsWith('/')) {
      const [head, ...rest] = text.split(/\s+/);
      const cmd = head.slice(1).replace(/@.*$/, '').toLowerCase();
      const arg = rest.join(' ');
      const lang = langFor(user, arg);
      switch (cmd) {
        case 'start': {
          const deep = /^p_([a-z0-9-]+)$/.exec(arg);   // t.me/<bot>?start=p_<guide-id> opens a guide directly
          if (deep && kb.get(deep[1])) return showProblem(chatId, kb.get(deep[1]), 0, lang);
          await send(chatId, { text: t(lang, 'welcome') });
          if (!store.getLang(user && user.id)) return send(chatId, R.langMessage(lang));
          return;
        }
        case 'help': return send(chatId, { text: t(lang, 'help') });
        case 'about': return send(chatId, { text: t(lang, 'about') });
        case 'categories': case 'category': case 'cats': return send(chatId, R.categoriesMessage(kb, lang));
        case 'lang': case 'language': case 'malayalam': case 'english': {
          const want = cmd === 'malayalam' ? 'ml' : cmd === 'english' ? 'en' : (LANGS.includes(arg) ? arg : null);
          if (want && user) { store.setLang(user.id, want); return send(chatId, { text: t(want, 'langSet') }); }
          return send(chatId, R.langMessage(lang));
        }
        default:
          if (arg && !isPrivate) return answerQuestion(chatId, user, arg);
          return send(chatId, { text: t(lang, 'unknownCmd') });
      }
    }
    const question = botUsername ? text.replace(new RegExp('@' + botUsername + '\\b', 'ig'), ' ').trim() : text;
    if (!question) return send(chatId, { text: t(langFor(user, text), 'help') });
    return answerQuestion(chatId, user, question);
  }

  async function onCallback(q) {
    const data = q.data || '', user = q.from, msg = q.message;
    if (!msg) return api.call('answerCallbackQuery', { callback_query_id: q.id });
    const chatId = msg.chat.id, messageId = msg.message_id;
    const [kind, a, b, c] = data.split(':');
    // the language travels inside the button data (last field); fall back to the user's preference
    const tail = data.split(':').pop();
    const lang = LANGS.includes(tail) && kind !== 'lp' && kind !== 'l' ? tail : langFor(user);
    let toast;
    if (kind === 'p' && kb.get(a)) {
      // paging inside a guide edits that message; opening a guide from a list sends a new message
      await showProblem(chatId, kb.get(a), Number(b) || 0, lang, isGuideMessage(msg) ? messageId : null);
    } else if (kind === 'lp' && LANGS.includes(a) && kb.get(b)) {
      store.setLang(user.id, a);
      await showProblem(chatId, kb.get(b), Number(c) || 0, a, messageId);
    } else if (kind === 'l' && LANGS.includes(a)) {
      store.setLang(user.id, a);
      await edit(chatId, messageId, { text: t(a, 'langSet') });
      await send(chatId, { text: t(a, 'help') });
    } else if (kind === 'cats') {
      await send(chatId, R.categoriesMessage(kb, lang));
    } else if (kind === 'c') {
      await send(chatId, R.categoryMessage(kb, a, lang));
    } else if (kind === 'f' && kb.get(a)) {
      const key = `${chatId}:${messageId}`;
      if (voted.has(key)) toast = t(lang, 'alreadyVoted');
      else {
        voted.add(key); if (voted.size > 20000) voted.clear();
        const fixed = b === 'y';
        store.feedback(a, fixed);
        // drop the feedback row from the guide message so it can't be pressed twice
        const current = (msg.reply_markup && msg.reply_markup.inline_keyboard) || R.problemPage(kb.get(a), lastPageOf(kb.get(a)), lang).reply_markup.inline_keyboard;
        const kept = current.filter((row) => !row.some((x) => String(x.callback_data || '').startsWith('f:')));
        await api.call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: kept } });
        await send(chatId, fixed ? { text: t(lang, 'thanksFixed') } : R.notFixedMessage(kb, kb.get(a), lang));
      }
    }
    return api.call('answerCallbackQuery', toast ? { callback_query_id: q.id, text: toast } : { callback_query_id: q.id });
  }

  // a message we sent that shows a guide (so "Back" to page 0 edits it in place instead of sending a new one)
  function isGuideMessage(msg) {
    const kbd = msg.reply_markup && msg.reply_markup.inline_keyboard;
    return !!(kbd && kbd.some((row) => row.some((x) => /^lp:/.test(x.callback_data || ''))));
  }
  function lastPageOf(p) { return R.pageCount(p) - 1; }

  async function handleUpdate(u) {
    if (u.message) return onMessage(u.message);
    if (u.callback_query) return onCallback(u.callback_query);
  }

  return { handleUpdate, langFor };
}

module.exports = { createBot };
