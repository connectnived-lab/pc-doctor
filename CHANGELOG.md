# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-11-03

### Added
- Knowledge base of 42 troubleshooting guides in 10 categories, in English and Malayalam (quick checks, steps with Windows 10/11 paths, when to call a technician, safety notes).
- Concept matcher for English, Manglish and Malayalam questions: synonym table, prefix matching for Malayalam/Manglish suffixes, chillu normalisation, typo tolerance, negation, device hint.
- Telegram bot (no dependencies, long polling): /start, /help, /categories, /lang, /about, step paging with in-place edits, Fixed / Still not working feedback, per-user language, deep links, group mentions, flood protection.
- Anonymous store: language preference by salted hash, aggregate counters only.
- Optional AI fallback through any OpenAI-compatible API (off unless AI_API_KEY is set).
- Static web app with search, categories, step checklist, Malayalam/English toggle, WhatsApp share, offline support.
- `server.js` to serve the web app and run the bot in one process, with `/health`.
- Test suite (node:test) incl. 155 sample questions, mocked Telegram handlers and a fake Telegram server; GitHub Actions CI on Node 18/20/22.
