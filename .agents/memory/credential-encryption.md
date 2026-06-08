---
name: Exchange API-key encryption & live-sync gating
description: How stored exchange credentials are encrypted, and which exchanges may be offered as live API connect vs CSV-only.
---

# Stored exchange credential encryption

Exchange API keys/secrets are encrypted by `server/credential-crypto.ts`
(`encryptCredential`/`decryptCredential`), imported by both `server/storage.ts` and
`server/services/exchange-sync.ts`. Keep that module the single source — the old code had the
crypto duplicated in both files, which is how a weak scheme drifts.

- Scheme: AES-256-GCM (authenticated), random 16-byte salt + 12-byte IV per record, scrypt KDF,
  payload format `v2:salt:iv:tag:ciphertext` (hex). Legacy `iv:ciphertext` AES-256-CBC payloads
  (key = scrypt(SESSION_SECRET, "salt")) still decrypt for back-compat.
- Key source: prefers `CREDENTIAL_ENCRYPTION_KEY` secret; falls back to `SESSION_SECRET` with a
  console warning so boot never breaks.

**Why:** the original scheme used unauthenticated CBC + a hardcoded salt `"salt"` + reused
SESSION_SECRET. GCM + random salt fixes the cryptographically serious parts; the dedicated key is
defense-in-depth (don't let one secret guard both sessions and stored keys).

**How to apply:** never reintroduce a local encrypt/decrypt in storage/exchange-sync — import the
shared module. If you ever rotate to a new key, keep the legacy decrypt branch until all rows are
re-encrypted (the table was empty when v2 landed, so there was no migration then).

# Live exchange connect vs CSV-only

Live connect is allowlisted in TWO places that must stay in sync:
- Frontend: `client/src/pages/integrations.tsx` `LIVE_API_EXCHANGES = ["kraken","binance_us","crypto_com"]`
  (dropdown only offers these); CSV-only providers live in `NO_API_EXCHANGES`.
- Backend (the real gate): `server/routes/holdings.ts` `POST /api/credentials` rejects any provider
  not in its `liveProviders = ["kraken","binance_us","crypto_com"]` allowlist with CSV guidance.

Note: `server/services/exchange-sync.ts` `syncExchange` still has switch cases for
`coinbase`/`uphold`/`binance` too — those are dead code for live sync because the route blocks
creating their credentials. Don't trust the switch as the allowlist; the route is the gate.

**Why:** offering a live connect for a provider the backend returns "Sync not yet supported" for
(or whose key method is dead, e.g. Coinbase legacy keys retired May 2024) stores a useless key and
is dishonest. Founder stance: be explicit that exchanges are best-effort/temporary and self-custody
is the destination — the connect dialog carries an "exchange is in control, not us, not you"
warning and the page carries a cockpit banner.

**How to apply:** to add a live exchange you must update BOTH `LIVE_API_EXCHANGES` (frontend) and
`liveProviders` (backend route), confirm a real `case` exists in `syncExchange`, and that its
read-only key method is still alive.
