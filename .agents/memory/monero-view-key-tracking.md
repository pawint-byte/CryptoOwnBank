---
name: Monero view-key balance tracking
description: Why CryptoOwnBank does NOT read Monero balances via view keys; manual entry is the deliberate choice.
---

# Monero balance tracking — manual only, no view keys

A Monero **view-only wallet** exposes the **private view key** + address. Holding that pair is the only way to read a Monero balance from outside the wallet. It is tempting because it would replace manual balance entry with a live figure.

**Decision: we do NOT collect, store, or transmit Monero view keys. Monero balances stay manual (member types the amount).**

**Why:**
- It breaks the core promise. The whole platform is non-custodial specifically so there is nothing a government could subpoena. A stored view key is exactly that — it reveals every payment a wallet ever received. Keeping it server-side would un-hide the one thing privacy users come to us to protect.
- It is not even accurate. A view key sees incoming funds but is partly blind to outgoing (spends). True spendable balance needs periodic key-image import from the real spendable wallet, so a view-only figure can read too high without ongoing manual syncing.
- It is irreversible. A view key cannot be rotated; once shared it is shared for the life of the wallet (only fix is moving all funds to a new wallet).
- Founder value (Peter Wint, explicit): "easier should never be used to compromise privacy and anonymity." Making repeat buying faster is fine; doing it by holding keys is not.

**How to apply:**
- If anyone proposes Monero (or similar privacy-coin) live balance tracking, default to NO for any server-side key handling.
- The ONLY acceptable live-balance variant would be view-key scanning that runs **entirely in the member's own browser and is never persisted anywhere** — and even that is a large build, still spend-blind, and leaks the key to whatever node scans. Do not rush it; treat as a values decision for the founder, not a default.
- "Make it easier next time" is a legitimate, separate goal — achieve it with privacy-safe memory only (auto-fill saved address, remember last coin/method, one-tap repeat). Never via keys or anything subpoena-able.
- Browsers also cannot detect whether a wallet app is installed (no API; it would be a fingerprinting leak), so wallet deep-links/launch buttons can only ever be a best-effort "open if you have one," never a verified/detected state.
