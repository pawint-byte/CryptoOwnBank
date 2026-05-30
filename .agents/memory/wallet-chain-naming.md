---
name: Saved wallet chain naming is not uniform
description: savedWallets.chain uses two different naming conventions depending on how the wallet was added; address-by-chain lookups must handle both.
---

# Saved wallet `chain` values come in two flavors

A user's saved wallets (`/api/wallets`) can store the **same logical chain under different `chain` strings** depending on how the row was created:

- **Keygen / multi-chain derive** (e.g. wallet-create "save all chains") stores generic, derivation-style keys: `evm`, `btc`, `sol`, `stellar`, `ltc`, `doge`, `bch`, `tron`, `cosmos`, `xrp`.
- **Manually added** rows (e.g. the Buy Crypto add-address flow) store `tokenToChain[symbol]` values: `ethereum`, `bitcoin`, `solana`, `polygon`, `avalanche`, etc.

So one EVM `0x…` address might be saved as `evm` (keygen) or as `ethereum`/`polygon`/`avalanche` (manual). A naive `savedWallets.find(w => w.chain === tokenToChain[symbol])` silently misses keygen-saved wallets, leaving destination addresses blank.

**How to apply:** when resolving a saved address by coin symbol, match against a *list of chain aliases* (canonical chain first, then the generic `evm` fallback), not a single chain string. Iterate aliases in priority order so an exact match (`polygon`) wins over a generic one (`evm`) regardless of wallet list order. For EVM coins (ETH/AVAX/MATIC) the single EVM address is valid across all EVM networks, so reusing it as the Stripe/onramp destination for polygon/avalanche is correct.

**Why:** discovered while consolidating buy providers on `/buy-crypto` — the Changelly/Stripe address pre-fill only worked for some coins because the lookup assumed one naming convention.
