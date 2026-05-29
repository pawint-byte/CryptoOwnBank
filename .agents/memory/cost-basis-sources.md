---
name: Cost basis sources for tax tools
description: Which input paths actually populate position cost basis that the tax harvest scan and gain/loss report depend on
---

# Cost basis sources for the tax tools

The Tax Harvest AI scan reads cost basis from `position.totalCostBasis` (tax lots are only used to derive the holding-period short/long split). Positions with `totalCostBasis <= 0` are silently **skipped** in `scanForHarvestOpportunities`. The gain/loss report is built from recorded sells with a known cost basis.

**Which inputs set a non-zero position cost basis:**
- CSV / Yahoo import — yes (sets `averageCost`/`totalCostBasis` from unit price)
- On-site trades (DEX swaps, DCA) — yes (updates position cost basis + creates tax lots)
- Manual lot / balance entry — yes (when cost data provided)
- **Exchange API sync — NO.** It imports trades as transactions (with `pricePerUnit`) but creates/updates the balance-derived position with `totalCostBasis: "0"` and never calls `createTaxLot`. So exchange-synced holdings are skipped by the harvest scan.

**Why this matters:** Do NOT write user-facing copy claiming "connect an exchange to improve your tax-harvesting results." Connecting an exchange populates the transactions list and balances, but not the cost basis the harvest scan needs. Accurate cost-basis sources to cite: import history, manual entry, on-site trades. An admin "Sync Positions from Lots" action exists to rebuild position cost basis from lots.

**How to apply:** When describing what feeds tax reports / harvest opportunities, only credit import + manual + on-site trades for cost basis. If product later wants exchange sync to count, the sync flow must create tax lots / set position cost basis from imported buys.
