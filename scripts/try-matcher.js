// Usage: node scripts/try-matcher.js "laptop slow aanu"   (or with no args: run the sample question set)
const path = require('path');
const Matcher = require('../src/matcher');
const kb = require('../data/problems.json'), syn = require('../data/synonyms.json');
const m = new Matcher(kb, syn);
const args = process.argv.slice(2);
if (args.length) {
  const q = args.join(' ');
  console.log(m.analyze(q));
  for (const r of m.search(q)) console.log(r.score.toFixed(2).padStart(6), r.id, r.hits.join(' | '));
} else {
  const qs = require('../tests/fixtures-questions.json'); let ok = 0, top3 = 0;
  for (const { q, expect } of qs) {
    const r = m.search(q, { limit: 3 });
    if (r[0] && r[0].id === expect) ok++;
    else { if (r.some(x => x.id === expect)) top3++; console.log('MISS', JSON.stringify(q), '→', r.map(x => x.id + ':' + x.score).join(', '), '| want', expect, '| concepts', Object.keys(m.analyze(q).concepts).join(',')); }
  }
  console.log(`top1 ${ok}/${qs.length}, in top3 (not top1) ${top3}`);
}
