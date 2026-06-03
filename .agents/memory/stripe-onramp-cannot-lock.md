---
name: Stripe onramp cannot lock coin/wallet on this account
description: Why the in-site "instant card" Stripe Crypto Onramp drifts to ETH and can't prefill the destination wallet
---

# Stripe Crypto Onramp cannot lock coin/wallet on this account

The in-site "Card, Apple Pay or Google Pay — Instant — lands in your own wallet"
path mints a `POST /v1/crypto/onramp_sessions` (server/stripe-onramp.ts) and
redirects to `crypto.link.com`. On THIS live account it cannot lock the chosen
coin or the destination wallet, so it opens with an ETH default and no locked
address — a member "buying XLM" can end up buying ETH to an un-locked destination.

**What the API does on this account (verified by direct create+retrieve tests):**
- `transaction_details[destination_currencies]` / `[destination_networks]` (the
  documented *restrict* arrays) → `400 parameter_unknown "Did you mean
  destination_currency…"` in EVERY form tested: `[]`, `[0]`, and the
  `wallet_addresses[network]` hash, and under Stripe-Version 2022-11-15 →
  2025-03-31.basil. They simply don't exist in the API surface this account hits.
- Setting `transaction_details[wallet_address]` *requires* `destination_networks`
  ("wallet_address is set, but destination_networks is not set") — which is the
  very array the account rejects. Contradiction → wallet locking is impossible.
- Singular `destination_currency` / `destination_network` + `wallet_address` +
  `lock_wallet_address` → `200 OK` but ALL read back null and `lock=false`;
  `destination_currencies` shows the full default list. i.e. silently ignored.

**Why:** this is an account-level Crypto Onramp limitation/state, NOT a code bug
and NOT a Stripe-Version issue. Stripe's public docs say the arrays exist; this
account's onramp surface does not expose them. The onramp product itself is NOT
deprecated (confirmed 2026) — it's specific to this account's configuration.

**How to apply:**
- Do NOT send the restrict arrays from server/stripe-onramp.ts — they hard-400
  the endpoint. Keep singular params only (returns 200, even though ignored).
- Treat the in-site Stripe "instant" path as UNABLE to guarantee coin+wallet.
  Don't advertise "lands in your own wallet" for it until Stripe enables
  destination locking on the account (a Stripe-side onboarding/support action).
- Reliable non-custodial card rails that DO prefill the address are the external
  providers (MoonPay/Transak via URL params) and wallet-app buys (Xaman for XRP).
  Note MoonPay region-blocks XLM via Changelly's partner doorway.
