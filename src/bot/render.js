'use strict';
// Builds Telegram messages (HTML text + inline keyboards) from knowledge-base entries.
// Pure functions: no network, no state — easy to test.
const { t } = require('./i18n');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const btn = (text, data) => ({ text, callback_data: data });
const L = (o, lang) => (o && (o[lang] || o.en)) || '';
const other = (lang) => (lang === 'ml' ? 'en' : 'ml');

// Every callback carries the language the message was shown in (…:en / …:ml), so paging never switches language.
// A problem is shown as pages: 0 = quick checks, 1..N = one step each, N+1 = technician + safety + feedback.
function pageCount(p) { return (p.steps.en.length) + 2; }

function problemPage(p, page, lang) {
  const steps = p.steps[lang] || p.steps.en;
  const total = steps.length, last = total + 1;
  page = Math.max(0, Math.min(last, Number(page) || 0));
  const title = `${p.icon} <b>${esc(L(p.title, lang))}</b>`;
  let body;
  if (page === 0) {
    const quick = (p.quick[lang] || p.quick.en).map((q) => `• ${esc(q)}`).join('\n');
    body = `${title}\n\n${t(lang, 'quick')}\n${quick}`;
  } else if (page <= total) {
    body = `${title}\n\n${t(lang, 'stepOf', { n: page, total })}\n${esc(steps[page - 1])}`;
  } else {
    body = `${title}\n\n${t(lang, 'techTitle')}\n${esc(L(p.technician, lang))}`;
    const safety = L(p.safety, lang);
    if (safety) body += `\n\n${t(lang, 'safetyTitle')}\n${esc(safety)}`;
    body += `\n\n<b>${t(lang, 'didItWork')}</b>`;
  }
  const rows = [];
  const nav = [];
  if (page > 0) nav.push(btn(t(lang, 'back'), `p:${p.id}:${page - 1}:${lang}`));
  if (page === 0) nav.push(btn(t(lang, 'start'), `p:${p.id}:1:${lang}`));
  else if (page < total) nav.push(btn(t(lang, 'next'), `p:${p.id}:${page + 1}:${lang}`));
  else if (page === total) nav.push(btn(t(lang, 'finish'), `p:${p.id}:${last}:${lang}`));
  rows.push(nav);
  if (page > 0) rows.push([btn(t(lang, 'fixed'), `f:${p.id}:y:${lang}`), btn(t(lang, 'notFixed'), `f:${p.id}:n:${lang}`)]);
  rows.push([btn(t(lang, 'otherLang'), `lp:${other(lang)}:${p.id}:${page}`), btn(t(lang, 'cats'), `cats:${lang}`)]);
  return { text: body, reply_markup: { inline_keyboard: rows }, page };
}

function problemButtons(list, lang) {
  return list.map((p) => [btn(`${p.icon} ${L(p.title, lang)}`.slice(0, 60), `p:${p.id}:0:${lang}`)]);
}

function categoriesMessage(kb, lang) {
  const rows = [];
  for (let i = 0; i < kb.categories.length; i += 2) {
    rows.push(kb.categories.slice(i, i + 2).map((c) => btn(`${c.icon} ${L(c.title, lang)}`, `c:${c.id}:${lang}`)));
  }
  return { text: t(lang, 'categories'), reply_markup: { inline_keyboard: rows } };
}

function categoryMessage(kb, catId, lang) {
  const c = kb.category(catId);
  if (!c) return categoriesMessage(kb, lang);
  const rows = problemButtons(kb.inCategory(catId), lang);
  rows.push([btn(t(lang, 'allCats'), `cats:${lang}`)]);
  return { text: t(lang, 'categoryList', { icon: c.icon, title: esc(L(c.title, lang)) }), reply_markup: { inline_keyboard: rows } };
}

function matchesMessage(results, lang) {
  return { text: t(lang, 'matches'), reply_markup: { inline_keyboard: problemButtons(results.map((r) => r.problem), lang) } };
}

function alternativesMessage(results, lang) {
  return { text: t(lang, 'best'), reply_markup: { inline_keyboard: problemButtons(results.map((r) => r.problem), lang) } };
}

function langMessage(lang) {
  return { text: t(lang, 'chooseLang'), reply_markup: { inline_keyboard: [[btn('English', 'l:en'), btn('മലയാളം', 'l:ml')]] } };
}

function notFixedMessage(kb, p, lang) {
  const related = kb.inCategory(p.category).filter((x) => x.id !== p.id).slice(0, 4);
  const rows = problemButtons(related, lang);
  rows.push([btn(t(lang, 'cats'), `cats:${lang}`)]);
  return { text: t(lang, 'thanksNotFixed', { tech: `${t(lang, 'techTitle')}\n${esc(L(p.technician, lang))}` }), reply_markup: { inline_keyboard: rows } };
}

module.exports = { esc, problemPage, pageCount, categoriesMessage, categoryMessage, matchesMessage, alternativesMessage, langMessage, notFixedMessage, problemButtons };
