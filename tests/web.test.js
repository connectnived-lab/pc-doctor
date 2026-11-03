'use strict';
// The static site ships its own copy of the matcher and data — make sure it is current and works.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { outputs } = require('../scripts/build-web');

const root = path.join(__dirname, '..');

test('web/matcher.js and web/data.js match the sources (run npm run build:web if this fails)', () => {
  for (const [rel, content] of Object.entries(outputs())) {
    assert.equal(fs.readFileSync(path.join(root, rel), 'utf8'), content, rel);
  }
});

test('the browser bundle loads and searches without Node', () => {
  const sandbox = { window: {}, self: {} };
  sandbox.self = sandbox.window;
  vm.createContext(sandbox);
  for (const f of ['config.js', 'matcher.js', 'data.js']) vm.runInContext(fs.readFileSync(path.join(root, 'web', f), 'utf8'), sandbox, { filename: f });
  const M = sandbox.window.PCDoctorMatcher, D = sandbox.window.PCD_DATA;
  const m = new M(D.kb, D.synonyms);
  assert.equal(m.search('printer work aakunnilla')[0].id, 'print-queue-stuck');
  assert.equal(m.search('നെറ്റ് കിട്ടുന്നില്ല')[0].id, 'wifi-no-internet');
  assert.equal(sandbox.window.PCD_CONFIG.telegramBot, '');
});

test('index.html references every script and asset that exists', () => {
  const html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  for (const m of html.matchAll(/(?:src|href)="([^"#:]+?)(?:\?[^"]*)?"/g)) {
    assert.ok(fs.existsSync(path.join(root, 'web', m[1])), `missing web/${m[1]}`);
  }
});

test('server.js serves the web app and /health without a token', async () => {
  const { spawn } = require('child_process');
  const port = 18000 + Math.floor(Math.random() * 2000);
  const child = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port), TELEGRAM_BOT_TOKEN: '' }, stdio: 'ignore' });
  try {
    let health;
    for (let i = 0; i < 50 && !health; i++) {
      await new Promise((r) => setTimeout(r, 100));
      try { health = await (await fetch(`http://127.0.0.1:${port}/health`)).json(); } catch { /* not up yet */ }
    }
    assert.equal(health.ok, true);
    assert.match(health.bot, /disabled/);
    const page = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /PC Doctor/);
    for (const p of ['/%2e%2e/package.json', '/..%2fpackage.json', '/%2e%2e%2fserver.js']) {
      assert.notEqual((await fetch(`http://127.0.0.1:${port}${p}`)).status, 200, `no path traversal: ${p}`);
    }
    assert.equal((await fetch(`http://127.0.0.1:${port}/nope.txt`)).status, 404);
  } finally { child.kill(); }
});
