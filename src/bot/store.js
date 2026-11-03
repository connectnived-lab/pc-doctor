'use strict';
// Tiny JSON-file store. Holds ONLY:
//  - per-user language preference, keyed by a salted hash of the Telegram user id (raw ids are never written)
//  - aggregate counters (views / fixed / not fixed per guide, searches, unmatched searches)
// No message text, names or usernames are ever stored.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createStore(dir, { saveDelayMs = 2000 } = {}) {
  let file = null;
  let data = { salt: null, prefs: {}, stats: { views: {}, fixed: {}, notFixed: {}, searches: 0, unmatched: 0, ai: 0 } };
  if (dir) {
    fs.mkdirSync(dir, { recursive: true });
    file = path.join(dir, 'pcdoctor-store.json');
    try {
      const loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
      data = { ...data, ...loaded, stats: { ...data.stats, ...(loaded.stats || {}) } };
    } catch (e) { if (e.code !== 'ENOENT') console.error('store: could not read, starting fresh:', e.message); }
  }
  if (!data.salt) data.salt = crypto.randomBytes(16).toString('hex');

  let timer = null;
  function saveNow() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!file) return;
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
    fs.renameSync(tmp, file);
  }
  function save() { if (!file || timer) return; timer = setTimeout(saveNow, saveDelayMs); if (timer.unref) timer.unref(); }

  const hash = (userId) => crypto.createHash('sha256').update(data.salt + ':' + userId).digest('hex').slice(0, 20);
  const bump = (bucket, id) => { data.stats[bucket][id] = (data.stats[bucket][id] || 0) + 1; save(); };

  return {
    getLang: (userId) => data.prefs[hash(userId)] || null,
    setLang: (userId, lang) => { data.prefs[hash(userId)] = lang; save(); },
    view: (id) => bump('views', id),
    feedback: (id, fixed) => bump(fixed ? 'fixed' : 'notFixed', id),
    search: (matched) => { data.stats.searches++; if (!matched) data.stats.unmatched++; save(); },
    aiAnswer: () => { data.stats.ai++; save(); },
    stats: () => JSON.parse(JSON.stringify(data.stats)),
    flush: saveNow,
    _data: () => data,
  };
}

module.exports = { createStore };
