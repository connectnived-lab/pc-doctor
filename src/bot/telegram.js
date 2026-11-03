'use strict';
// Minimal Telegram Bot API client + long-polling loop. Uses the global fetch (Node 18+). No dependencies.

function createApi({ token, baseUrl = 'https://api.telegram.org', fetchImpl = globalThis.fetch, log = console } = {}) {
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  const root = `${baseUrl.replace(/\/$/, '')}/bot${token}/`;
  async function call(method, body = {}, timeoutMs = 65000) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetchImpl(root + method, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal,
      });
      const json = await res.json();
      if (!json.ok && method !== 'getUpdates') log.error(`telegram ${method}: ${json.description || res.status}`);
      return json;
    } catch (e) {
      return { ok: false, description: String(e && e.message || e) };
    } finally { clearTimeout(timer); }
  }
  return { call };
}

// Long polling: asks Telegram for updates (waits up to `timeout` s), hands each to onUpdate, repeats.
function startPolling({ api, onUpdate, timeout = 50, log = console, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  let offset = 0, running = true, backoff = 1000;
  const loop = (async () => {
    // a webhook would block getUpdates — make sure none is set
    await api.call('deleteWebhook', { drop_pending_updates: false });
    while (running) {
      const r = await api.call('getUpdates', { offset, timeout, allowed_updates: ['message', 'callback_query'] }, (timeout + 15) * 1000);
      if (!running) break;
      if (!r.ok) {
        if (r.error_code === 401) { log.error('telegram: token rejected (401). Check TELEGRAM_BOT_TOKEN.'); running = false; break; }
        if (r.error_code === 409) log.error('telegram: another instance is polling this bot (409).');
        await sleep(backoff); backoff = Math.min(backoff * 2, 30000); continue;
      }
      backoff = 1000;
      for (const u of r.result) {
        offset = u.update_id + 1;
        try { await onUpdate(u); } catch (e) { log.error('update failed:', e && e.stack || e); }
      }
    }
  })();
  return { stop() { running = false; return loop; }, done: loop };
}

module.exports = { createApi, startPolling };
