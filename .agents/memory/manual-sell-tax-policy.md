---
name: Manual off-site sell/swap tax policy
description: Product rules for how a manually-recorded sale or swap realizes gain/loss against tax lots
---

A manually-entered "Sell" (off-site sale or swap) realizes gain/loss against the
member's recorded tax lots, mirroring how CSV import handles sells.

Policy decisions (not code-derivable rationale):
- A sell is REJECTED (with a friendly message) when the member has no recorded
  purchase lots for that coin, or when the sell quantity exceeds the total
  tracked lot remainder. **Why:** we never silently assume a $0 cost basis or
  silently leave disposed quantity unmatched — that would produce a wrong tax
  report the member can't see. Better to tell them to record the missing buy(s).
- A swap is recorded as a disposal of the OLD coin only (realizes its gain/loss).
  The new coin is NOT auto-created; the member is told to add it as a separate
  Buy so its fresh cost basis is tracked. **Why:** keeps the entry simple and
  avoids guessing the new coin's acquisition price.
- Method follows the member's userSettings.taxMethod (FIFO default; only FIFO and
  LIFO are supported — no HIFO/specific-lot).

Import vs. template: CSV import (Yahoo/Ledger Live) already records sells and
creates gain events. The downloadable Quick Start "Portfolio Template" only has
rows for holdings/purchases (cost basis), so it cannot capture a sale/swap.

Known limitation: the sell write path is non-atomic (multi-await, no DB
transaction), matching the existing record-sale and import sell paths. Upfront
validation catches the most likely failure; full atomicity is a broader refactor.
