---
name: Chain portability — no single rail load-bearing
description: Architectural rule that CryptoOwnBank's survival must never depend on one chain's governance/features; keep integrations swappable.
---

# Leverage everything, depend on nothing

**Rule:** CryptoOwnBank must never let its survival depend on a single chain's governance vote, amendment, or proprietary feature. Every integrated rail (chain, lending protocol, swap aggregator, wallet, data source) must be swappable so no single one can kill the platform.

**Why:** The founder built toward XRPL's XLS-66 native-lending amendment as if the business needed it "to survive," then it stalled at ~23% validator support (needs 80%) for months. A platform whose whole thesis is "minimize gatekeeper interference" had quietly made a single gatekeeper vote load-bearing. That's a self-inflicted version of the exact problem the product exists to solve.

**How to apply:**
- Treat protocol features that aren't live yet as *upside*, not oxygen. Before calling anything survival-critical, ask what it actually adds vs. what's already shipping (e.g. yield already works today via Soil vaults + RWA discovery + AMMs — XLS-66 is not required for yield to exist).
- XRP/XLM are excellent payment/settlement rails (cheap settlement, RLUSD/USDC, Soil vaults). Keep them for that. They are NOT permissionless build-anything platforms — new capabilities require validator-voted amendments.
- For permissionless build + already-live DeFi (lending/borrow/yield), EVM L2s (Base/Arbitrum/Optimism) are the better-fit rail — added as one MORE rail on the table, NOT a migration off XRPL.
- Wrap each integration behind an adapter so a dead/stalled provider degrades gracefully to an alternative (1inch ↔ LI.FI, one chain ↔ another). The day one assimilated piece can kill you, you've rebuilt the gatekeeper problem inside your own walls.
- This is the "be the table, not the toll booth" doctrine (see member-orchestration-consent-model.md) extended to infrastructure: assimilate the best open, permissionless, non-custodial-compatible building blocks; build only the orchestration + sovereignty UX + honesty + teaching.
