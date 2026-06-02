---
name: Industry radar ritual
description: How the founder wants the "industry radar / morning brief" run — on-demand, founder-filtered, not an automated feed.
---

# Industry radar — how the founder wants it run

The founder asked for a way to get "more relevant information for the site" beyond the
existing **Crypto News** page (`/crypto-news`, headline aggregator from CoinDesk/CoinTelegraph/
Decrypt/The Block, 15-min refresh, "For You" asset match). He did NOT want another automated feed.

## The decided shape (confirmed 2026-06-02)
- **On-demand, not scheduled.** The agent pulls intel only when asked. No daily cron, no
  member-facing auto-publish.
- **Hands-on / founder is the editor.** He wants to review and decide, to "learn and grow,"
  not outsource judgment. He explicitly chose "I review and approve before members see it."
- **Two-step pull:** Perplexity (`PERPLEXITY_API_KEY`, model `sonar-pro`, POST
  `https://api.perplexity.ai/chat/completions`) for live sourced findings → agent filters out
  the noise, surfaces only the few "diamonds," each framed in CryptoOwnBank's principle terms
  with a source link. (OpenAI synthesis optional; agent's own filtering has been enough.)
- **Per-item decision:** present each finding tagged ACT vs discuss-and-drop. Founder picks the
  keepers (use a multi-select question). Keepers get written to `TODO.md`.

## Where keepers live
`TODO.md` → section **"📡 RADAR — Watching & To Discuss (industry intelligence)"** (added
2026-06-02, near top). Each entry: dated, What / Why-it-matters-to-us / Status (WATCH | STORY
ANGLE | NOTE) / Source URL. Non-keepers are just discussed and dropped (save nothing).

**Why:** he said "not everything will be publishable but i do want to have the conversation to
determine if we hold onto this to take action or we just discuss it and move on." The value is
the conversation + his decision, not volume.

## Honesty notes
- Mark weak sources (e.g. a YouTube interview) as "verify before publishing."
- Negative findings ("quiet month, nothing happened on XRPL/Stellar") are valid output — say so
  plainly instead of padding. Perplexity's general index is thin on XRPL/Stellar specifics;
  offer a narrower targeted sweep (specific anchors/issuers/amendments) when those matter.
