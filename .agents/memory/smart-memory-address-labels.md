---
name: Smart memory for transfer labels
description: How remembered address→label classification works and the casing pitfall that makes it tax-dangerous if done wrong.
---

When a member labels an outgoing transfer to a destination address, the label is
remembered per address and reused — retroactively on still-pending transfers to
the same address, and forward at every wallet sync. Own wallets, known vaults,
and member-labeled addresses are all resolved through one classifier.

**Rule:** EVM (0x) addresses MUST be canonicalized (lowercased) before being
stored as a remembered-address key.
**Why:** EVM addresses compare case-insensitively, but a unique (userId, address)
key stores them verbatim. Without canonicalization, the same address in different
casing creates two rows with possibly conflicting labels, and classification then
becomes nondeterministic (own_transfer vs sale) — which is tax-dangerous (phantom
or missed taxable disposals). Caught in architect review.
**How to apply:** canonicalize at write (upsert) so the unique constraint dedups;
keep case-sensitive chains (XRP, Solana, Cardano, Cosmos, Stellar) exact. Same
CASE_SENSITIVE_CHAINS list gates own-wallet lowercasing at sync time.

**Limitation to disclose:** grouping only works when the transaction recorded a
destination (counterpartyAddress). Very old imported txns with no destination
can't be grouped until a re-sync backfills them.
