'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadKB } = require('../src/kb');
const kb = loadKB();

test('knowledge base has about 40 guides across all categories', () => {
  assert.ok(kb.problems.length >= 40, `${kb.problems.length} guides`);
  for (const c of kb.categories) assert.ok(kb.inCategory(c.id).length >= 2, `category ${c.id} is thin`);
});

test('every guide is complete in English and Malayalam', () => {
  const ids = new Set();
  for (const p of kb.problems) {
    assert.match(p.id, /^[a-z0-9-]+$/, p.id);
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`); ids.add(p.id);
    assert.ok(kb.category(p.category), `${p.id}: unknown category ${p.category}`);
    assert.ok(['pc', 'phone', 'any'].includes(p.device), `${p.id}: device`);
    for (const lang of ['en', 'ml']) {
      assert.ok(p.title[lang], `${p.id}: title.${lang}`);
      assert.ok(p.technician[lang], `${p.id}: technician.${lang}`);
      assert.ok(p.quick[lang].length >= 2, `${p.id}: quick.${lang}`);
      assert.ok(p.steps[lang].length >= 4, `${p.id}: steps.${lang}`);
      for (const s of p.steps[lang].concat(p.quick[lang])) assert.ok(s.length > 10 && s.length < 700, `${p.id}: odd step length`);
    }
    assert.equal(p.steps.en.length, p.steps.ml.length, `${p.id}: en/ml step count differs`);
    assert.equal(p.quick.en.length, p.quick.ml.length, `${p.id}: en/ml quick-check count differs`);
    assert.equal(Boolean(p.safety.en), Boolean(p.safety.ml), `${p.id}: safety note in one language only`);
    assert.ok(p.keywords.length >= 3, `${p.id}: keywords`);
  }
});

test('Malayalam text really is Malayalam', () => {
  for (const p of kb.problems) {
    assert.match(p.title.ml, /[\u0D00-\u0D7F]/, p.id);
    for (const s of p.steps.ml) assert.match(s, /[\u0D00-\u0D7F]/, `${p.id}: "${s.slice(0, 40)}"`);
  }
});

test('Telegram callback data fits the 64-byte limit for every guide and page', () => {
  for (const p of kb.problems) {
    const last = p.steps.en.length + 1;
    for (const d of [`lp:en:${p.id}:${last}`, `p:${p.id}:${last}:ml`, `f:${p.id}:n:ml`, `c:${p.category}:ml`]) assert.ok(Buffer.byteLength(d) <= 64, d);
    assert.ok(Buffer.byteLength(`p_${p.id}`) <= 64);
  }
});

test('keyword concepts are known to the matcher (no typos in the knowledge base)', () => {
  const syn = require('../data/synonyms.json');
  const concepts = new Set(Object.keys(syn));
  const raw = [];
  for (const p of kb.problems) for (const k of p.keywords) for (const c of k.split('^')[0].trim().split(/\s+/)) {
    if (!concepts.has(c) && !kb.matcher.conceptOf(c)) raw.push(`${p.id}: ${c}`);
  }
  assert.deepEqual(raw, []);
});
