---
name: Saved wallet chain naming & coin-map completeness
description: How a coin symbol resolves to a chain when saving/looking up addresses, and the silent-failure trap when a coin is missing from the maps.
---

Saving or resolving a destination address in `buy-crypto.tsx` depends on three lookup maps keyed by coin symbol:
- `tokenToChain` — symbol → keygen-style chain string used when SAVING a new wallet (e.g. `XMR: "monero"`, `MATIC: "polygon"`).
- `SYMBOL_CHAIN_ALIASES` — symbol → list of accepted chain spellings, used when LOOKING UP an existing saved wallet for that coin (covers both keygen-style `evm/btc/sol` and manual `ethereum/bitcoin` origins; resolve via the alias list, exact-chain first).
- The grid `tokens` array — every coin shown in the picker.

**The trap (caused a real "I hit Save and nothing happened" report):** `handleSaveAddress` did `const chain = tokenToChain[selectedToken]; if (!chain) return;`. When a coin is in the `tokens` grid but MISSING from `tokenToChain`, the click silently no-ops — no toast, no error, no step advance. The save button is enabled (it only checks the address is non-empty), so the member just sees a dead button.

**Why:** the maps are hand-maintained and drift. A coin can be added to the grid (so it's selectable) without being added to `tokenToChain`/`SYMBOL_CHAIN_ALIASES`. The server `POST /api/wallets` accepts ANY chain string (no whitelist, `chain` is just `varchar(20)`), so the gap is purely client-side.

**How to apply:**
- Invariant: **every symbol in the `tokens` grid must also exist in `tokenToChain` AND `SYMBOL_CHAIN_ALIASES`.** When adding a coin to the grid, add it to all three in the same change.
- Never let a missing-map case silently `return` — surface a toast so a future gap is visible, not invisible.
- The chain string is free-form on the server; pick the canonical lowercase chain name (`monero`, `polygon`, `bitcoin`) and reuse it consistently.
