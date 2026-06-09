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

## The evaluation lens (added 2026-06-09)
Read every shared article/intel through one primary question: **"Does this point to something ON-CHAIN that a MEMBER could use to complete an expected action themselves — with just their own wallet/keys + code (computers), no human middleman, no gatekeeper, and without us holding anything?"** The more power stays with **member + computers** (trustless, self-executable) and the less it leans on an intermediary (including us), the more aligned it is.

**Why:** founder's framing (2026-06-09) — "how can things on the blockchain be used by the member to complete expected actions on-chain… as much as we can keep the power just with the member and computers, the better." This nests with the consent doctrine (member-orchestration-consent-model.md): the platform aligns/assures, the member approves and executes.

**How to apply:** the lens sits ON TOP of the two-filter rule (TODO.md) — must still pass Filter 1 (non-custodial, no regulatory trap) and Filter 2 (works end-to-end on a chain/standard we support). KEEP/ACT when the piece surfaces a concrete on-chain primitive/standard a member on a supported chain can self-execute; DROP/NOTE when it's narrative/price commentary, needs an intermediary or makes us a gatekeeper, or needs an unsupported chain/standard. (Cardano "trust layer" piece = NOTE/no-action: vision narrative, no member-executable capability, unsupported chain.)

**The five action buckets (founder's sharpened model, 2026-06-09 — sort every shared item into one; "best mental model for everything sent going forward"):** sharper question = *does this help the member PROVE, APPROVE, SIGN, AUTOMATE, or VERIFY something on-chain while control stays with the member + cryptographic systems, not us/another middleman?*
- **PROVE** — prove a fact (age/residency/KYC-done/credential) without oversharing → identity stays user-owned (verifiable credentials / SSI / selective disclosure).
- **APPROVE** — grant a *scoped, limited* permission (asset/amount/time/session limits), not a blank check → action without surrendering the wallet.
- **SIGN** — member signs the real tx or delegated scope → non-custodial control preserved.
- **AUTOMATE** — computers execute PRE-APPROVED actions inside cryptographic guardrails/rules → works while the member sleeps, only within limits they set.
- **VERIFY** — member can later confirm, inspect, audit, and REVOKE → trust + cleanup after action.

Useful = more trust in math/policy/signatures, less trust in people; **member intent first, machine execution second.** If an item doesn't strengthen one of the five (or shifts power to a middleman), discuss-and-drop.

## Honesty notes
- Mark weak sources (e.g. a YouTube interview) as "verify before publishing."
- Negative findings ("quiet month, nothing happened on XRPL/Stellar") are valid output — say so
  plainly instead of padding. Perplexity's general index is thin on XRPL/Stellar specifics;
  offer a narrower targeted sweep (specific anchors/issuers/amendments) when those matter.
