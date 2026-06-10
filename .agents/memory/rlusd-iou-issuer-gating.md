---
name: RLUSD / IOU issuer-strict gating
description: XRPL IOU identity is (currency + issuer); any readiness check keyed on currency code alone can false-green and fail at submit.
---

On the XRP Ledger an IOU's identity is the pair **(currency code, issuer)** — NOT
the currency code alone. Two different issuers can use the same currency code
(e.g. the RLUSD hex `524C555344...`). RLUSD's canonical issuer is in
`client/src/lib/constants.ts` (`RLUSD.issuer`).

**Rule:** every check that drives UX or signing decisions for RLUSD (or any IOU)
must match BOTH the currency code AND the issuer. Matching currency alone lets a
trustline/balance from a *different* issuer light a "ready" state green, then the
deposit fails on submit — a dead-end and a broken "driven by real state" promise.

**Where this bites (all fixed issuer-strict):**
- `getBalances` RLUSD balance lookup in `xrpl-client.ts`
- the `getAccountTrustlines` normalizer in `xrpl-client.ts` (only label a line
  "RLUSD" when issuer matches, so downstream `currency === "RLUSD"` is safe)
- the clear-lane `hasRlusdTrust` gate in `components/vault-clear-lane.tsx`

**Why:** caught by architect review of the vault clear-lane signing work
(2026-06-10). A currency-only match is a real correctness/UX bug, not cosmetic.

**Signer reality for an RLUSD deposit (it's an IOU Payment):** only Xaman (both
platforms) and Ledger over USB (desktop only) can sign it. Keystone/Trezor are
native-XRP-only today (no IOU). Phones can't do WebUSB, so a Ledger member on
mobile must be routed to desktop or Xaman — never a silent fail or fake success.

**Proving the signing pipeline:** `scripts/test-xrpl-signing.ts` funds XRPL
Testnet wallets and asserts our hand-assembled blob (build → autofill → set
SigningPubKey → encode → sign → attach → submit) is **byte-identical** to xrpl
`Wallet.sign` for native XRP, TrustSet, and IOU Payment, and that all land
tesSUCCESS. Run with `npx tsx scripts/test-xrpl-signing.ts`.
