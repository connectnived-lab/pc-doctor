'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadKB, Matcher } = require('../src/kb');
const questions = require('./fixtures-questions.json');

const kb = loadKB();

test(`matcher: top result is correct for all ${questions.length} sample questions (English, Manglish, Malayalam)`, () => {
  const misses = [];
  for (const { q, expect } of questions) {
    const r = kb.matcher.search(q, { limit: 3 });
    if (!r[0] || r[0].id !== expect) misses.push(`${q} → ${r.map((x) => x.id).join(', ') || '(none)'} (want ${expect})`);
  }
  assert.deepEqual(misses, []);
});

test('fixture covers every guide and all three ways of writing', () => {
  const covered = new Set(questions.map((x) => x.expect));
  for (const p of kb.problems) assert.ok(covered.has(p.id), `no sample question for ${p.id}`);
  const ml = questions.filter((x) => Matcher.isMalayalam(x.q)).length;
  assert.ok(questions.length >= 60, 'at least 60 samples');
  assert.ok(ml >= 15, `at least 15 Malayalam-script samples (have ${ml})`);
  const manglish = questions.filter((x) => /\b(aanu|aakunnilla|kittunnilla|illa|aayi|aakunnu|undo|marannu|kudungi|varunnu|theerunnu)\b/.test(x.q)).length;
  assert.ok(manglish >= 15, `at least 15 Manglish samples (have ${manglish})`);
});

test('unrelated questions do not match anything', () => {
  for (const q of ['how to make tea', 'hello', 'what is the capital of france', 'നാളെ മഴ പെയ്യുമോ']) {
    assert.equal(kb.matcher.search(q).length, 0, q);
  }
});

test('normalize unifies Malayalam chillu encodings and zero-width joiners', () => {
  const atomic = '\u0D2A\u0D3E\u0D38\u0D4D\u0D35\u0D47\u0D7C\u0D21\u0D4D';        // പാസ്വേർഡ് (atomic chillu)
  const old = '\u0D2A\u0D3E\u0D38\u0D4D\u200C\u0D35\u0D47\u0D30\u0D4D\u200D\u0D21\u0D4D'; // ZWNJ + old chillu form
  assert.equal(Matcher.normalize(atomic), Matcher.normalize(old));
});

test('normalize splits mixed-script words and strips punctuation', () => {
  assert.deepEqual(Matcher.tokenize('Wi-Fi-യിൽ net illa!!'), ['wi', 'fi', 'യിൽ', 'net', 'illa']);
});

test('suffixed words still match by prefix (printeril, ലാപ്ടോപ്പിൽ)', () => {
  assert.equal(kb.matcher.search('printeril paper kudungi')[0].id, 'paper-jam');
  assert.equal(kb.matcher.search('ലാപ്ടോപ്പിൽ സൗണ്ട് ഇല്ല')[0].id, 'no-sound');
});

test('small typos are tolerated', () => {
  assert.equal(kb.matcher.search('bluetoth not conecting')[0].id, 'bluetooth-not-working');
  assert.equal(kb.matcher.search('printr ofline')[0].id, 'printer-offline');
});

test('negation is detected from -illa endings', () => {
  assert.ok(Matcher.isNegative('aakunnilla'));
  assert.ok(Matcher.isNegative('കിട്ടുന്നില്ല'));
  assert.ok(!Matcher.isNegative('laptop'));
});

test('device hint: phone questions prefer phone guides', () => {
  assert.equal(kb.matcher.search('phone slow')[0].id, 'phone-slow');
  assert.equal(kb.matcher.search('laptop slow')[0].id, 'laptop-slow');
  assert.equal(kb.matcher.search('phone memory full')[0].id, 'phone-storage-full');
  assert.equal(kb.matcher.search('laptop memory full')[0].id, 'disk-full');
});

test('best(): confident only when clearly ahead', () => {
  assert.equal(kb.matcher.best('printer offline').confident, true);
  assert.equal(kb.matcher.best('laptop not working').confident, false);
});
