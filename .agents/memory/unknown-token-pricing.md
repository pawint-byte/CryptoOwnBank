---
name: Unknown token pricing
description: Safe valuation rule for synced tokens that lack a verified market price.
---

Never use a chain's native-coin price as a fallback for an unknown token on that chain. If a token-specific price cannot be verified, its current market value must remain zero/unknown rather than falling back to ETH, XRP, BTC, acquisition cost, or wallet cost basis.

**Why:** A wallet can contain hundreds of millions of low-value or dust tokens. Applying the native coin's historical price to that quantity can fabricate a portfolio worth hundreds of billions and contaminate tax-lot cost basis.

**How to apply:** Historical-price imports, wallet sync, portfolio summaries, and reconciliation must require a token-specific price. Stablecoin par pricing additionally requires verified contract/mint or XRPL issuer identity, not ticker text alone.