'use strict';
// OPTIONAL AI fallback for questions the knowledge base can't match.
// Disabled unless AI_API_KEY is set. Speaks the OpenAI-compatible /chat/completions API, so it works with
// OpenAI, Groq, OpenRouter, a local Ollama server, etc. (set AI_BASE_URL and AI_MODEL).

const SYSTEM = `You are PC Doctor, a patient IT support technician in Kerala, India, helping ordinary people.
Answer only computer, phone, printer, network and everyday IT questions. If the question is not about IT, say so briefly.
Reply in {lang}. Use at most 6 short numbered steps with exact Windows 10/11 menu paths where relevant.
Never suggest piracy, password cracking or bypassing security on devices the person doesn't own.
End with one line on when to call a technician. Keep it under 900 characters. Plain text only, no markdown.`;

function createAI({ apiKey, baseUrl = 'https://api.openai.com/v1', model = 'gpt-4o-mini', dailyCap = 200, fetchImpl = globalThis.fetch, timeoutMs = 25000, now = () => Date.now() } = {}) {
  if (!apiKey) return null;
  let day = '', used = 0;
  return {
    model,
    async ask(question, lang) {
      const today = new Date(now()).toISOString().slice(0, 10);
      if (today !== day) { day = today; used = 0; }
      if (used >= dailyCap) return null;
      used++;
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const res = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST', signal: ac.signal,
          headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model, temperature: 0.2, max_tokens: 500,
            messages: [
              { role: 'system', content: SYSTEM.replace('{lang}', lang === 'ml' ? 'simple Malayalam (keep menu names and technical terms in English)' : 'simple English') },
              { role: 'user', content: String(question).slice(0, 500) },
            ],
          }),
        });
        if (!res.ok) return null;
        const json = await res.json();
        const text = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
        return text ? String(text).trim().slice(0, 3500) : null;
      } catch { return null; } finally { clearTimeout(timer); }
    },
  };
}

module.exports = { createAI };
