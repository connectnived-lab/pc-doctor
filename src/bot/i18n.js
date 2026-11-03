'use strict';
// All user-facing bot strings, English + Malayalam. {placeholders} are filled by t().
const S = {
  en: {
    welcome: '👋 <b>Hi! I\'m PC Doctor.</b>\nTell me your computer or phone problem in English, Manglish or Malayalam and I\'ll walk you through the fix step by step.\n\nTry: <i>laptop slow aanu</i>, <i>printer offline</i>, <i>net kittunnilla</i>\n\nOr browse with /categories.',
    help: '🩺 <b>How to use PC Doctor</b>\n• Just type your problem — e.g. <i>wifi connected but no internet</i>, <i>printer work aakunnilla</i>, <i>ഫോൺ മെമ്മറി നിറഞ്ഞു</i>\n• Tap <b>Next step ➡️</b> to go through the fix one step at a time\n• Tell me if it worked with ✅ / ❌ — it helps improve the guides\n\n/categories — browse all problems\n/lang — switch English / മലയാളം\n/about — about this bot',
    about: '🩺 <b>PC Doctor</b> — free, open-source IT help in English and Malayalam.\nMade by <b>Nived NS</b>, IT Support Executive, Kerala.\nOnly anonymous totals (how often a fix worked) are stored — never your messages.',
    chooseLang: '🌐 Choose your language:',
    langSet: '✅ Language set to English.',
    categories: '📚 <b>Categories</b> — pick one:',
    categoryList: '{icon} <b>{title}</b> — pick your problem:',
    matches: '🔎 I found these — which one matches your problem?',
    best: '🔎 Best match below. Not quite right? Try one of these:',
    noMatch: '🤔 I couldn\'t find a guide for that yet.\nTry different words (e.g. <i>printer offline</i>, <i>no sound</i>, <i>laptop slow</i>) or browse /categories.',
    aiNote: '🤖 <i>AI answer — general advice, not a tested guide. If unsure, ask a technician.</i>',
    quick: '🔍 <b>Quick checks first</b>',
    stepOf: '<b>Step {n} of {total}</b>',
    techTitle: '🧑‍🔧 <b>When to call a technician</b>',
    safetyTitle: '⚠️ <b>Safety</b>',
    didItWork: 'Did this fix it?',
    start: 'Start fix ➡️', next: 'Next step ➡️', back: '⬅️ Back', finish: 'Finish ✔️',
    fixed: '✅ Fixed', notFixed: '❌ Still not working',
    cats: '📚 Categories', otherLang: '🌐 മലയാളം', allCats: '⬅️ All categories',
    thanksFixed: '🎉 Great! Glad it\'s fixed. Ask me anything else anytime.',
    thanksNotFixed: '😕 Sorry it\'s still not working.\n\n{tech}\n\nYou can also describe the problem in different words, or check a related guide:',
    alreadyVoted: 'Thanks, already noted 👍',
    slowDown: '⏳ Too many messages — please wait a few seconds.',
    unknownCmd: 'Type your problem, or use /help.',
    groupHint: 'Send me your problem in a private chat for step-by-step help.',
  },
  ml: {
    welcome: '👋 <b>ഹായ്! ഞാൻ PC Doctor.</b>\nനിങ്ങളുടെ computer / ഫോൺ പ്രശ്നം മലയാളത്തിലോ Manglish-ലോ English-ലോ പറയൂ — step by step ആയി ശരിയാക്കാൻ സഹായിക്കാം.\n\nഉദാ: <i>laptop slow aanu</i>, <i>printer offline</i>, <i>നെറ്റ് കിട്ടുന്നില്ല</i>\n\nഅല്ലെങ്കിൽ /categories നോക്കൂ.',
    help: '🩺 <b>PC Doctor എങ്ങനെ ഉപയോഗിക്കാം</b>\n• പ്രശ്നം type ചെയ്താൽ മതി — ഉദാ: <i>wifi connected but no internet</i>, <i>printer work aakunnilla</i>, <i>ഫോൺ മെമ്മറി നിറഞ്ഞു</i>\n• <b>അടുത്ത step ➡️</b> അമർത്തി ഓരോ step ആയി ചെയ്യുക\n• ശരിയായോ എന്ന് ✅ / ❌ കൊണ്ട് പറയൂ — guides മെച്ചപ്പെടുത്താൻ സഹായിക്കും\n\n/categories — എല്ലാ പ്രശ്നങ്ങളും\n/lang — English / മലയാളം മാറ്റാൻ\n/about — ഈ bot-നെക്കുറിച്ച്',
    about: '🩺 <b>PC Doctor</b> — English-ലും മലയാളത്തിലും സൗജന്യ, open-source IT സഹായം.\nനിർമ്മിച്ചത് <b>Nived NS</b>, IT Support Executive, കേരളം.\nഒരു fix എത്ര തവണ ശരിയായി എന്ന ആകെ എണ്ണം മാത്രം സൂക്ഷിക്കുന്നു — നിങ്ങളുടെ messages ഒരിക്കലും സൂക്ഷിക്കില്ല.',
    chooseLang: '🌐 ഭാഷ തിരഞ്ഞെടുക്കൂ:',
    langSet: '✅ ഭാഷ മലയാളം ആക്കി.',
    categories: '📚 <b>Categories</b> — ഒന്ന് തിരഞ്ഞെടുക്കൂ:',
    categoryList: '{icon} <b>{title}</b> — നിങ്ങളുടെ പ്രശ്നം തിരഞ്ഞെടുക്കൂ:',
    matches: '🔎 ഇവ കണ്ടെത്തി — ഏതാണ് നിങ്ങളുടെ പ്രശ്നം?',
    best: '🔎 ഏറ്റവും അടുത്തത് താഴെ. ശരിയല്ലേ? ഇവയിൽ ഒന്ന് നോക്കൂ:',
    noMatch: '🤔 ഇതിന് ഇപ്പോൾ guide ഇല്ല.\nവേറെ വാക്കുകളിൽ പറഞ്ഞു നോക്കൂ (ഉദാ: <i>printer offline</i>, <i>sound illa</i>, <i>laptop slow</i>) അല്ലെങ്കിൽ /categories നോക്കൂ.',
    aiNote: '🤖 <i>AI ഉത്തരം — പൊതുവായ ഉപദേശം മാത്രം, test ചെയ്ത guide അല്ല. സംശയമുണ്ടെങ്കിൽ technician-നോട് ചോദിക്കുക.</i>',
    quick: '🔍 <b>ആദ്യം ഇവ നോക്കൂ</b>',
    stepOf: '<b>Step {n} / {total}</b>',
    techTitle: '🧑‍🔧 <b>Technician-നെ എപ്പോൾ വിളിക്കണം</b>',
    safetyTitle: '⚠️ <b>സുരക്ഷ</b>',
    didItWork: 'പ്രശ്നം മാറിയോ?',
    start: 'തുടങ്ങാം ➡️', next: 'അടുത്ത step ➡️', back: '⬅️ പിന്നോട്ട്', finish: 'കഴിഞ്ഞു ✔️',
    fixed: '✅ ശരിയായി', notFixed: '❌ ഇപ്പോഴും ശരിയായില്ല',
    cats: '📚 Categories', otherLang: '🌐 English', allCats: '⬅️ എല്ലാ categories',
    thanksFixed: '🎉 സന്തോഷം! പ്രശ്നം മാറിയല്ലോ. എന്ത് സംശയവും എപ്പോൾ വേണമെങ്കിലും ചോദിക്കൂ.',
    thanksNotFixed: '😕 ഇപ്പോഴും ശരിയായില്ലേ, ക്ഷമിക്കണം.\n\n{tech}\n\nപ്രശ്നം വേറെ വാക്കുകളിൽ പറഞ്ഞു നോക്കാം, അല്ലെങ്കിൽ ബന്ധപ്പെട്ട guide നോക്കൂ:',
    alreadyVoted: 'നന്ദി, രേഖപ്പെടുത്തി 👍',
    slowDown: '⏳ ഒരുപാട് messages — കുറച്ച് സെക്കൻഡ് കാത്തിരിക്കൂ.',
    unknownCmd: 'പ്രശ്നം type ചെയ്യൂ, അല്ലെങ്കിൽ /help.',
    groupHint: 'Step-by-step സഹായത്തിന് private chat-ൽ പ്രശ്നം അയക്കൂ.',
  },
};

function t(lang, key, vars) {
  const table = S[lang] || S.en;
  let s = table[key] != null ? table[key] : S.en[key];
  if (s == null) return key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return s;
}

module.exports = { t, STRINGS: S, LANGS: ['en', 'ml'] };
