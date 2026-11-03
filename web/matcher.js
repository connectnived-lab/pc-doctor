/* Generated from src/matcher.js by scripts/build-web.js — do not edit here. */
/*
 * PC Doctor matcher — finds the knowledge-base entries that best match a free-text
 * question written in English, Manglish (Malayalam in Latin letters) or Malayalam.
 *
 * Works in Node (require) and in the browser (window.PCDoctorMatcher). No dependencies.
 *
 * How it works
 *  1. normalize(): lower-case, unify Malayalam chillu forms, drop zero-width joiners,
 *     split Latin and Malayalam runs, strip punctuation.
 *  2. Each token (and 2-3 word phrase) is mapped to a "concept" using synonyms.json.
 *     Matching is exact, then longest-prefix (handles "printeril", "ലാപ്ടോപ്പിൽ"),
 *     then a small typo allowance (edit distance 1-2) for longer Latin words.
 *     Words ending in -illa / ഇല്ല also add the concept "not".
 *  3. Every problem lists keyword phrases made of concepts ("printer offline").
 *     A phrase scores when all its concepts are present; longer phrases score more.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PCDoctorMatcher = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ML_RANGE = /[\u0D00-\u0D7F]/;
  // consonant + virama + ZWJ -> atomic chillu (old and new encodings become identical)
  var CHILLU = { '\u0D23': '\u0D7A', '\u0D28': '\u0D7B', '\u0D30': '\u0D7C', '\u0D32': '\u0D7D', '\u0D33': '\u0D7E', '\u0D15': '\u0D7F' };

  function normalize(text) {
    var s = String(text || '');
    if (s.normalize) s = s.normalize('NFC');
    s = s.toLowerCase();
    s = s.replace(/([\u0D23\u0D28\u0D30\u0D32\u0D33\u0D15])\u0D4D\u200D/g, function (_, c) { return CHILLU[c]; });
    s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
    s = s.replace(/[’']/g, '');                                  // don't -> dont
    s = s.replace(/([a-z0-9])([\u0D00-\u0D7F])/g, '$1 $2')        // split scripts
         .replace(/([\u0D00-\u0D7F])([a-z0-9])/g, '$1 $2');
    s = s.replace(/[^a-z0-9\u0D00-\u0D7F]+/g, ' ');
    return s.trim();
  }

  function tokenize(text) {
    var n = normalize(text);
    return n ? n.split(' ') : [];
  }

  function editDistance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i]; var best = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  var NEG_WORDS = { not: 1, no: 1, illa: 1, ila: 1, alla: 1, nahi: 1, cant: 1, cannot: 1, dont: 1, doesnt: 1, didnt: 1,
    wont: 1, isnt: 1, arent: 1, never: 1, unable: 1, nothing: 1, '\u0D07\u0D32\u0D4D\u0D32': 1, '\u0D05\u0D32\u0D4D\u0D32': 1 };
  // filler words that never carry meaning on their own (English + Manglish)
  var STOP = {};
  ('a an the is are am was be been my me i we our your you it its this that to of in at for and or but with from by ' +
   'how what why when where which can could should would please pls plz sir hi hello ' +
   'aanu anu aano ano aakunnu aavunnu akunnu avunnu aayi ayi aakum aavum cheyyunnu cheyyum cheyyan cheyyaan cheythu ' +
   'und undu undo ente ende enikku enik ennu enn oru ithu ith athu ath ee aa pakshe valare vallathe kure ' +
   'ippo ippol enthu entha enthanu engane enganeya pattunnilla pattunilla pattum patto venam venda').split(' ')
    .forEach(function (w) { STOP[w] = 1; });

  function isNegative(tok) {
    if (NEG_WORDS[tok]) return true;
    if (/^[a-z]+$/.test(tok)) return tok.length > 5 && /(illa|illaa|ilaa|ila|alla|ella|nilla|lla)$/.test(tok);
    return /\u0D32\u0D4D\u0D32$/.test(tok) && tok.length > 3; // ...ല്ല (ഇല്ല / അല്ല)
  }

  function Matcher(kb, synonyms) {
    if (!(this instanceof Matcher)) return new Matcher(kb, synonyms);
    this.problems = kb.problems || kb;
    this.single = Object.create(null);  // variant -> concept
    this.multi = Object.create(null);   // "w1 w2" -> concept
    this.maxGram = 1;
    this.prefixLatin = []; this.prefixMl = []; this.fuzzy = [];
    var self = this;
    Object.keys(synonyms).forEach(function (concept) {
      if (concept.charAt(0) === '_') return;
      var vars = [concept].concat(synonyms[concept]);
      vars.forEach(function (v) {
        var toks = tokenize(v);
        if (!toks.length) return;
        if (toks.length > 1) {
          self.multi[toks.join(' ')] = concept;
          if (toks.length > self.maxGram) self.maxGram = toks.length;
          return;
        }
        var t = toks[0];
        if (!self.single[t]) self.single[t] = concept;
        if (ML_RANGE.test(t)) { if (t.length >= 3) self.prefixMl.push([t, concept]); }
        else {
          if (t.length >= 4) self.prefixLatin.push([t, concept]);
          if (t.length >= 5) self.fuzzy.push([t, concept]);
        }
      });
    });
    this.prefixLatin.sort(function (a, b) { return b[0].length - a[0].length; });
    this.prefixMl.sort(function (a, b) { return b[0].length - a[0].length; });
    // pre-split problem keyword phrases into concept lists
    this.index = this.problems.map(function (p) {
      return (p.keywords || []).map(function (k) {
        var parts = String(k).split('^');
        var concepts = parts[0].trim().split(/\s+/).map(function (c) { return self.conceptOf(c) || c; });
        var weight = parts[1] ? Number(parts[1]) : concepts.length * concepts.length;
        return { concepts: concepts, weight: weight, raw: parts[0].trim() };
      });
    });
  }

  // concept for a single normalized token, or null
  Matcher.prototype.conceptOf = function (tok) {
    if (this.single[tok]) return this.single[tok];
    if (STOP[tok]) return null;
    var list = ML_RANGE.test(tok) ? this.prefixMl : this.prefixLatin, i;
    for (i = 0; i < list.length; i++) if (tok.length > list[i][0].length && tok.indexOf(list[i][0]) === 0) return list[i][1];
    if (!ML_RANGE.test(tok) && tok.length >= 5 && !isNegative(tok)) {
      var max = tok.length >= 10 ? 2 : 1, best = null, bestD = max + 1;
      for (i = 0; i < this.fuzzy.length; i++) {
        var d = editDistance(tok, this.fuzzy[i][0], max);
        if (d < bestD) { bestD = d; best = this.fuzzy[i][1]; }
      }
      if (best) return best;
    }
    return null;
  };

  // question -> { concepts: Set-like object, tokens: [...] }
  Matcher.prototype.analyze = function (text) {
    var toks = tokenize(text), concepts = Object.create(null), used = [], i = 0, n;
    while (i < toks.length) {
      var hit = null;
      for (n = Math.min(this.maxGram, toks.length - i); n >= 2; n--) {
        var g = toks.slice(i, i + n).join(' ');
        if (this.multi[g]) { hit = [this.multi[g], n]; break; }
      }
      if (hit) {
        concepts[hit[0]] = 1; used.push(hit[0]);
        for (var k = i; k < i + hit[1]; k++) if (isNegative(toks[k])) concepts.not = 1;
        i += hit[1]; continue;
      }
      var t = toks[i], c = this.conceptOf(t);
      if (c) { concepts[c] = 1; used.push(c); } else if (!STOP[t]) { concepts[t] = 1; }
      if (isNegative(t)) concepts.not = 1;
      i++;
    }
    return { tokens: toks, concepts: concepts, known: used };
  };

  Matcher.prototype.search = function (text, opts) {
    opts = opts || {};
    var limit = opts.limit || 5, a = this.analyze(text), C = a.concepts, out = [];
    var hasPhone = !!C.phone, hasPc = !!C.pc;
    for (var p = 0; p < this.problems.length; p++) {
      var phrases = this.index[p], best = 0, sum = 0, hits = [];
      for (var j = 0; j < phrases.length; j++) {
        var ph = phrases[j], ok = true;
        for (var c = 0; c < ph.concepts.length; c++) if (!C[ph.concepts[c]]) { ok = false; break; }
        if (!ok) continue;
        hits.push(ph.raw); sum += ph.weight; if (ph.weight > best) best = ph.weight;
      }
      if (!best) continue;
      var score = best + 0.35 * (sum - best), dev = this.problems[p].device;
      if (dev === 'pc' && hasPhone && !hasPc) score *= 0.5;
      if (dev === 'phone' && hasPc && !hasPhone) score *= 0.5;
      out.push({ id: this.problems[p].id, order: p, score: Math.round(score * 100) / 100, hits: hits, problem: this.problems[p] });
    }
    out.sort(function (x, y) { return y.score - x.score || x.order - y.order; });
    return out.slice(0, limit);
  };

  // A match is "confident" when it is strong and clearly ahead of the next one.
  Matcher.prototype.best = function (text) {
    var r = this.search(text, { limit: 5 });
    var top = r[0], second = r[1];
    var confident = !!top && top.score >= 4 && (!second || second.score <= top.score * 0.8);
    return { top: top || null, confident: confident, results: r };
  };

  Matcher.normalize = normalize;
  Matcher.tokenize = tokenize;
  Matcher.isNegative = isNegative;
  Matcher.STOP = STOP;
  Matcher.editDistance = editDistance;
  Matcher.isMalayalam = function (text) { return ML_RANGE.test(String(text || '')); };
  return Matcher;
});
