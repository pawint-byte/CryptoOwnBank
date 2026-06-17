---
name: Token catalog — grandfather + open-feed merge
description: How token menus should stay current — merge our verified list on top of the open approved feed, not hardcode.
---

# Token catalog: grandfather our list + merge the open approved feed

The chosen direction (founder, Option D) for keeping token/chain menus current without manual upkeep:
**merge our hand-curated list (grandfathered, marked CryptoOwnBank-verified) on top of an open approved provider feed**, deduped so ours always win. Never hardcode the whole menu.

**Why:** menus were hardcoded (e.g. RLUSD missing) → constant manual upkeep. Founder wants to leverage others' curation AND have our own effort recognized (two-way attribution).

**How to apply (first proof = Cross-Chain Swap):**
- Grandfathered list is the SSOT in `client/src/lib/token-catalog.ts` (`source: "cryptoownbank"`, `verified: true`). `mergeCatalog(chainId, feed)` prepends ours, appends feed tokens deduped by **lowercased** address.
- "Open approved" = LI.FI `/api/cross-chain/tokens?chains=N` → shape `{ tokens: { "<chainId>": Token[] } }`; each token carries `verificationStatus`. Filter feed to `verificationStatus === "verified"` (≈4000/chain still) — that IS the "approved" gate.
- EVM addresses vary in casing across sources/refetches — **all token lookups must be case-insensitive** (compare `.toLowerCase()`), or a selected feed token resolves to undefined → quote/balance silently break.
- Feed is huge → token picker must be a SEARCHABLE combobox (Popover+Command), render a cap (~60) and filter across all; a plain `<Select>` is unusable.
- Provenance must be visible: "Verified" badge on grandfathered items + caption crediting the feed.

**Deferred later phases (not built yet):** admin review queue, DB-backed catalog, daily cron, and publishing OUR OWN signed `tokenlist.json` to the open standard (the "our efforts recognized outward" half). Chains list (POPULAR_CHAINS) is still hardcoded — only the token menu was made dynamic.
