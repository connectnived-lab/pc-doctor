#!/usr/bin/env node
'use strict';
// Copies the shared matcher and the knowledge base into web/ so the static site has no build step at runtime.
// Run after editing data/*.json or src/matcher.js:  npm run build:web
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const kb = JSON.parse(fs.readFileSync(path.join(root, 'data/problems.json'), 'utf8'));
const synonyms = JSON.parse(fs.readFileSync(path.join(root, 'data/synonyms.json'), 'utf8'));

function outputs() {
  return {
    'web/matcher.js': '/* Generated from src/matcher.js by scripts/build-web.js — do not edit here. */\n' + fs.readFileSync(path.join(root, 'src/matcher.js'), 'utf8'),
    'web/data.js': '/* Generated from data/*.json by scripts/build-web.js — do not edit here. */\nwindow.PCD_DATA = ' + JSON.stringify({ kb, synonyms }) + ';\n',
  };
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  let stale = [];
  for (const [rel, content] of Object.entries(outputs())) {
    const file = path.join(root, rel);
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (current === content) continue;
    if (check) stale.push(rel); else { fs.writeFileSync(file, content); console.log('wrote', rel); }
  }
  if (check && stale.length) { console.error('Out of date (run npm run build:web):', stale.join(', ')); process.exit(1); }
}
module.exports = { outputs };
