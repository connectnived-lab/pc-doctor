/* PC Doctor — web version. Runs fully in the browser; what you type is never sent anywhere. count.js keeps anonymous totals (event names only). */
(function () {
  'use strict';
  var KB = window.PCD_DATA.kb, SYN = window.PCD_DATA.synonyms, CFG = window.PCD_CONFIG || {};
  var matcher = new window.PCDoctorMatcher(KB, SYN);
  var byId = {}; KB.problems.forEach(function (p) { byId[p.id] = p; });

  var UI = {
    en: {
      heroTitle: "What's wrong with your PC or phone?", heroSub: "Type it the way you'd say it — English, Manglish or Malayalam.",
      searchLabel: 'Describe your problem', placeholder: 'e.g. laptop slow aanu, printer offline, നെറ്റ് കിട്ടുന്നില്ല',
      categories: 'Browse by category', popular: 'Common problems', results: 'Best matches', noResults: "No guide found for that yet. Try other words — e.g. “printer offline”, “no sound”, “laptop slow” — or browse the categories below.",
      guides: 'guides', back: '← All problems', quick: '🔍 Quick checks first', steps: '🛠️ Step-by-step fix', tech: '🧑‍🔧 When to call a technician', safety: '⚠️ Safety',
      tapHint: 'Tap a step to mark it done', done: 'done', didItWork: 'Did this fix it?', fixed: '✅ Fixed', notFixed: '❌ Still not working',
      thanks: '🎉 Great! Glad it’s fixed. Share PC Doctor with someone who needs it.', sorry: '😕 Sorry it’s still not working. Here’s when to get a technician, and some related guides:',
      related: 'Related guides', share: 'Share on WhatsApp', telegram: 'Open in Telegram', privacy: 'Nothing you type leaves this page. No cookies; we only count anonymous visits (no personal data).', shareTitle: 'Know someone who always calls you for PC help?', shareText: 'Send them PC Doctor. Fixes in English and Malayalam, free.', shareNative: 'Share', copyLink: 'Copy link', copied: 'Copied ✓', shareMsg: '🩺 PC Doctor: laptop slow, printer offline, net kittunnilla? Step-by-step fixes in English & മലയാളം. Free 👉 ',
      madeBy: 'Made by', role: 'IT Executive, Kerala', disclaimer: "General guidance only. For office PCs, follow your IT team's policy.", openSource: 'Open source (MIT)',
      examples: ['laptop slow aanu', 'printer offline', 'net kittunnilla', 'no sound', 'phone storage full', 'blue screen'],
    },
    ml: {
      heroTitle: 'നിങ്ങളുടെ PC-ക്കോ ഫോണിനോ എന്താണ് പ്രശ്നം?', heroSub: 'സാധാരണ പറയുന്ന പോലെ type ചെയ്യൂ — മലയാളം, Manglish, English.',
      searchLabel: 'പ്രശ്നം എഴുതൂ', placeholder: 'ഉദാ: laptop slow aanu, printer offline, നെറ്റ് കിട്ടുന്നില്ല',
      categories: 'Category അനുസരിച്ച്', popular: 'സാധാരണ പ്രശ്നങ്ങൾ', results: 'ഏറ്റവും അടുത്തവ', noResults: 'ഇതിന് ഇപ്പോൾ guide ഇല്ല. വേറെ വാക്കുകളിൽ നോക്കൂ — ഉദാ: “printer offline”, “sound illa”, “laptop slow” — അല്ലെങ്കിൽ താഴെയുള്ള categories നോക്കൂ.',
      guides: 'guides', back: '← എല്ലാ പ്രശ്നങ്ങളും', quick: '🔍 ആദ്യം ഇവ നോക്കൂ', steps: '🛠️ Step by step പരിഹാരം', tech: '🧑‍🔧 Technician-നെ എപ്പോൾ വിളിക്കണം', safety: '⚠️ സുരക്ഷ',
      tapHint: 'ചെയ്ത step-ൽ tap ചെയ്ത് mark ചെയ്യാം', done: 'കഴിഞ്ഞു', didItWork: 'പ്രശ്നം മാറിയോ?', fixed: '✅ ശരിയായി', notFixed: '❌ ഇപ്പോഴും ശരിയായില്ല',
      thanks: '🎉 സന്തോഷം! പ്രശ്നം മാറിയല്ലോ. ആവശ്യമുള്ളവർക്ക് PC Doctor share ചെയ്യൂ.', sorry: '😕 ഇപ്പോഴും ശരിയായില്ലേ? Technician-നെ എപ്പോൾ വിളിക്കണം എന്നും ബന്ധപ്പെട്ട guides-ഉം താഴെ:',
      related: 'ബന്ധപ്പെട്ട guides', share: 'WhatsApp-ൽ share ചെയ്യൂ', telegram: 'Telegram-ൽ തുറക്കൂ', privacy: 'നിങ്ങൾ type ചെയ്യുന്നത് ഒന്നും ഈ page-ന് പുറത്ത് പോകില്ല. Cookies ഇല്ല; സന്ദർശകരുടെ എണ്ണം മാത്രം അജ്ഞാതമായി കണക്കാക്കുന്നു.', shareTitle: 'PC help-nu എപ്പോഴും നിങ്ങളെ വിളിക്കുന്ന ആരെങ്കിലും ഉണ്ടോ?', shareText: 'അവർക്ക് PC Doctor അയക്കൂ. English-ലും മലയാളത്തിലും fixes, free.', shareNative: 'ഷെയർ', copyLink: 'ലിങ്ക് കോപ്പി ചെയ്യുക', copied: 'കോപ്പി ചെയ്തു ✓', shareMsg: '🩺 PC Doctor: laptop slow, printer offline, നെറ്റ് കിട്ടുന്നില്ല? English & മലയാളം step-by-step fixes. Free 👉 ',
      madeBy: 'നിർമ്മിച്ചത്', role: 'IT Executive, കേരളം', disclaimer: 'പൊതുവായ നിർദ്ദേശങ്ങൾ മാത്രം. Office PC-കൾക്ക് IT team-ന്റെ നിയമങ്ങൾ പാലിക്കുക.', openSource: 'Open source (MIT)',
      examples: ['laptop slow aanu', 'പ്രിന്റർ വർക്ക് ആകുന്നില്ല', 'നെറ്റ് കിട്ടുന്നില്ല', 'sound illa', 'ഫോൺ മെമ്മറി നിറഞ്ഞു', 'blue screen'],
    },
  };
  var POPULAR = ['laptop-slow', 'wifi-no-internet', 'printer-offline', 'print-queue-stuck', 'phone-storage-full', 'whatsapp-backup'];

  var lang = 'en';
  try { lang = localStorage.getItem('pcd-lang') || ((navigator.language || '').indexOf('ml') === 0 ? 'ml' : 'en'); } catch (e) {}
  var $ = function (s) { return document.querySelector(s); };
  var q = $('#q'), results = $('#results'), view = $('#view'), hero = $('#hero');
  function u(k) { return UI[lang][k]; }
  function L(o) { return (o && (o[lang] || o.en)) || ''; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function item(p) { return '<a class="item" href="#/g/' + p.id + '"><span class="ic">' + p.icon + '</span><span class="t">' + esc(L(p.title)) + '</span><span class="arrow">›</span></a>'; }

  function applyLang() {
    document.documentElement.lang = lang;
    document.body.classList.toggle('ml', lang === 'ml');
    document.querySelectorAll('[data-t]').forEach(function (el) { el.textContent = u(el.getAttribute('data-t')); });
    document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    q.placeholder = u('placeholder');
    $('#chips').innerHTML = u('examples').map(function (e) { return '<button type="button" class="chip">' + esc(e) + '</button>'; }).join('');
    var links = [];
    if (CFG.githubUrl) links.push('<a href="' + esc(CFG.githubUrl) + '" rel="noopener">GitHub</a>');
    if (CFG.linkedinUrl) links.push('<a href="' + esc(CFG.linkedinUrl) + '" rel="noopener">LinkedIn</a>');
    $('#links').innerHTML = links.length ? ' · ' + links.join(' · ') : '';
  }

  function home() {
    hero.hidden = false; view.innerHTML = '';
    var cats = KB.categories.map(function (c) {
      var n = KB.problems.filter(function (p) { return p.category === c.id; }).length;
      return '<a class="cat" href="#/c/' + c.id + '"><span class="ic">' + c.icon + '</span><b>' + esc(L(c.title)) + '</b><small>' + n + ' ' + u('guides') + '</small></a>';
    }).join('');
    var pop = POPULAR.map(function (id) { return item(byId[id]); }).join('');
    view.innerHTML = '<h2>' + u('popular') + '</h2><div class="list">' + pop + '</div><h2>' + u('categories') + '</h2><div class="grid">' + cats + '</div>';
    search();
  }

  var searchTimer;
  function search() {
    var text = q.value.trim();
    if (!text) { results.innerHTML = ''; return; }
    clearTimeout(searchTimer);
    if (text.length >= 3) searchTimer = setTimeout(function () { count('search', 20); }, 1500);
    var r = matcher.search(text, { limit: 6 });
    results.innerHTML = '<h2>' + u('results') + '</h2>' + (r.length ? '<div class="list">' + r.map(function (x) { return item(x.problem); }).join('') + '</div>' : '<div class="empty">' + esc(u('noResults')) + '</div>');
  }

  function category(id) {
    var c = KB.categories.filter(function (x) { return x.id === id; })[0];
    if (!c) return home();
    hero.hidden = true; results.innerHTML = '';
    var list = KB.problems.filter(function (p) { return p.category === id; }).map(item).join('');
    view.innerHTML = '<a class="crumb" href="#/">' + u('back') + '</a><div class="guide"><h1>' + c.icon + ' ' + esc(L(c.title)) + '</h1></div><div class="list">' + list + '</div>';
    window.scrollTo(0, 0);
  }

  var SITE_URL = 'https://pc-doctor.sites.tab.bot/';
  var count = function (ev, max) { if (window.nivedCount) window.nivedCount(ev, null, max); };
  function shareUrl(p) { return SITE_URL + '?utm_source=share-whatsapp#/g/' + p.id; }

  function guide(id) {
    var p = byId[id];
    if (!p) return home();
    count('fix_open', 30);
    hero.hidden = true; results.innerHTML = '';
    var steps = p.steps[lang] || p.steps.en;
    var tg = CFG.telegramBot ? '<a class="btn tg" href="https://t.me/' + encodeURIComponent(CFG.telegramBot) + '?start=p_' + p.id + '" rel="noopener">✈️ ' + u('telegram') + '</a>' : '';
    var wa = '<a class="btn wa" href="https://wa.me/?text=' + encodeURIComponent(L(p.title) + ' — ' + shareUrl(p)) + '" rel="noopener">💬 ' + u('share') + '</a>';
    var safety = L(p.safety) ? '<div class="box safety"><h3>' + u('safety') + '</h3><p style="margin:0">' + esc(L(p.safety)) + '</p></div>' : '';
    view.innerHTML =
      '<a class="crumb" href="#/c/' + p.category + '">' + u('back') + '</a>' +
      '<article class="guide"><h1>' + p.icon + ' ' + esc(L(p.title)) + '</h1>' +
      '<div class="box"><h3>' + u('quick') + '</h3><ul>' + (p.quick[lang] || p.quick.en).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="box"><h3>' + u('steps') + '</h3><p class="progress" id="prog"></p><ol class="steps" id="steps">' + steps.map(function (s) { return '<li tabindex="0">' + esc(s) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="box tech"><h3>' + u('tech') + '</h3><p style="margin:0">' + esc(L(p.technician)) + '</p></div>' + safety +
      '<div class="box"><h3>' + u('didItWork') + '</h3><div class="feedback"><button class="btn ok" id="yes">' + u('fixed') + '</button><button class="btn no" id="no">' + u('notFixed') + '</button></div><div id="fb"></div></div>' +
      '<div class="actions">' + tg + wa + '</div></article>';
    var list = view.querySelectorAll('#steps li');
    function prog() { var d = view.querySelectorAll('#steps li.done').length; $('#prog').textContent = d ? d + ' / ' + list.length + ' ' + u('done') : u('tapHint'); }
    list.forEach(function (li) {
      var toggle = function () { li.classList.toggle('done'); prog(); };
      li.addEventListener('click', toggle);
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
    prog();
    $('#yes').onclick = function () { $('#fb').innerHTML = '<div class="note">' + esc(u('thanks')) + '</div>'; };
    $('#no').onclick = function () {
      var rel = KB.problems.filter(function (x) { return x.category === p.category && x.id !== p.id; }).slice(0, 4);
      $('#fb').innerHTML = '<div class="note">' + esc(u('sorry')) + '<p><b>' + esc(L(p.technician)) + '</b></p></div><h2>' + u('related') + '</h2><div class="list">' + rel.map(item).join('') + '</div>';
    };
    document.title = L(p.title) + ' — PC Doctor';
    window.scrollTo(0, 0);
  }

  function route() {
    var h = location.hash.replace(/^#\/?/, '').split('/');
    document.title = 'PC Doctor — fix common PC & phone problems (English / മലയാളം)';
    if (h[0] === 'g') return guide(h[1]);
    if (h[0] === 'c') return category(h[1]);
    return home();
  }

  var timer;
  q.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { if (location.hash && location.hash !== '#/') location.hash = '#/'; else search(); }, 120);
  });
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var first = results.querySelector('.item'); if (first) location.hash = first.getAttribute('href'); }
  });
  $('#chips').addEventListener('click', function (e) {
    if (e.target.classList.contains('chip')) { q.value = e.target.textContent; if (location.hash && location.hash !== '#/') location.hash = '#/'; else search(); q.focus(); }
  });
  document.querySelectorAll('.lang button').forEach(function (b) {
    b.addEventListener('click', function () { lang = b.getAttribute('data-lang'); try { localStorage.setItem('pcd-lang', lang); } catch (e) {} applyLang(); route(); });
  });
  window.addEventListener('hashchange', route);
  // Sharing: WhatsApp links (home + every guide), native share sheet, copy link.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.btn.wa');
    if (a) count('share_wa');
  });
  $('#shareCopy').addEventListener('click', function () {
    count('share_copy');
    var url = SITE_URL + '?utm_source=share-copy', label = $('#shareCopy span');
    var done = function () { label.textContent = u('copied'); setTimeout(function () { label.textContent = u('copyLink'); }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt('', url); }); else window.prompt('', url);
  });
  if (navigator.share) {
    $('#shareNative').hidden = false;
    $('#shareNative').addEventListener('click', function () {
      navigator.share({ title: 'PC Doctor', text: u('shareMsg').replace(/\s*👉\s*$/, ''), url: SITE_URL + '?utm_source=share-native' }).then(function () { count('share_native'); }, function () {});
    });
  }
  function setShareHref() { $('#shareWa').href = 'https://wa.me/?text=' + encodeURIComponent(u('shareMsg') + SITE_URL + '?utm_source=share-whatsapp'); }
  document.querySelectorAll('.lang button').forEach(function (b) { b.addEventListener('click', setShareHref); });
  setShareHref();
  applyLang(); route();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
