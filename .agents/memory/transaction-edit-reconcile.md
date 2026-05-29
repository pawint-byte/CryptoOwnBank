---
name: Editing/deleting transactions must reconcile lots + positions
description: Rules for safely letting users edit/delete transactions without desyncing tax lots, gain events, and positions
---

Transactions are not standalone rows: a buy/income creates a tax lot and updates a position; a sell consumes lots (FIFO/LIFO) and creates gain events. Any edit or delete path must keep all three consistent or holdings/cost-basis silently drift.

**Rules:**
- Only `buy`/`income` are editable, and only amount/price/date/notes. Asset/account/type changes must be delete-then-re-add, because changing them would require unwinding and rebuilding lots.
- Refuse to edit or delete a buy whose lot has already been partly sold (remaining < original) — its cost basis is baked into realized gains.
- Deleting a sale must *unwind*: restore each consumed lot's remaining quantity, delete the linked gain events, and rebuild the position. A sale with **no** linked gain events must be refused (409), never deleted — with nothing to unwind from, deleting would understate holdings/cost basis permanently.

**Why:** A member needed to fix bad imported buys (placeholder prices, duplicates). The first cut gated eligibility only in the UI and deleted sales using whatever gain events existed.

**How to apply:** Enforce eligibility server-side (provider must be `manual` or `*_import`; reject on-chain rows; restrict PATCH to buy/income) — never trust client gating. Treat missing gain events on a sale as a stop condition, not an empty restore.
