---
name: Price cache field is priceUsd, not price
description: Reading the wrong field off the price cache silently poisons stored USD values with the string "NaN".
---

The `price_cache` table's value column is `price_usd` → Drizzle field `priceUsd`. There is **no** `.price` field.

**Why:** Several write paths historically read `priceEntry.price` (undefined) → `parseFloat(undefined)` = `NaN` → `usd_value` was persisted as the literal string `"NaN"`. Every manually-added coin (XMR, IOTA, SEI…) then showed $0 because downstream `Number.isFinite` checks drop `NaN`. This is a recurring class of bug, not a one-off.

**How to apply:**
- Any read off `priceCacheTable` (or the standalone `getCachedPrices()` in market-data.ts) must use `.priceUsd`. Grep for `.price` on price-cache rows before shipping.
- Note `storage.getCachedPrices()` does **not** exist — only the standalone export in `server/services/market-data.ts`. Use `db.select().from(priceCacheTable)` directly in routes.
- Defensive rule for wallet-balance USD math: before computing/persisting a new `usdValue`, treat any non-finite parse as `0` (`Number.isFinite(...) ? x : 0`), so a legacy `"NaN"` row can't propagate into new writes.
- Self-heal on read: `enrichWalletBalances` re-prices rows where `usdValue` is `0` **or non-finite** (bal > 0), independent of stablecoin/staked status, so the asset SYMBOL + amount × live cache price reflects value even when the address can't be polled (e.g. Monero privacy).
