'use strict';
// Loads the knowledge base and builds a matcher. Shared by the bot, the server and the tests.
const Matcher = require('./matcher');

function loadKB(kb = require('../data/problems.json'), synonyms = require('../data/synonyms.json')) {
  const matcher = new Matcher(kb, synonyms);
  const byId = new Map(kb.problems.map((p) => [p.id, p]));
  const categories = kb.categories;
  const byCategory = new Map(categories.map((c) => [c.id, kb.problems.filter((p) => p.category === c.id)]));
  return {
    raw: kb, matcher, categories, problems: kb.problems,
    get: (id) => byId.get(id) || null,
    category: (id) => categories.find((c) => c.id === id) || null,
    inCategory: (id) => byCategory.get(id) || [],
  };
}

module.exports = { loadKB, Matcher };
