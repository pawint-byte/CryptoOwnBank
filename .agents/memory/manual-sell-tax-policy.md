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
- A swap is ONE entry that does both legs: it disposes the OLD coin (realizes
  gain/loss vs lots) AND auto-creates the RECEIVED coin as a new holding (buy
  txn + position + tax lot). The received coin's cost basis = the value given up
  (old-coin proceeds = qty*price), acquired at the swap date. **Why:** a
  crypto-to-crypto swap is simultaneously a taxable disposal and an acquisition;
  forcing the member to add the new coin as a separate Buy was error-prone and
  left holdings/tax reports incomplete. The received-coin fields are required
  both client-side (zod superRefine) and server-side (400 if missing/≤0).
- Method follows the member's userSettings.taxMethod (FIFO default; only FIFO and
  LIFO are supported — no HIFO/specific-lot).

Import vs. template: CSV import (Yahoo/Ledger Live) already records sells and
creates gain events. The downloadable Quick Start "Portfolio Template" only has
rows for holdings/purchases (cost basis), so it cannot capture a sale/swap.

Known limitation: the sell write path is non-atomic (multi-await, no DB
transaction), matching the existing record-sale and import sell paths. Upfront
validation catches the most likely failure; full atomicity is a broader refactor.
