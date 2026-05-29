---
name: Deleting a sell under-restores the lot when duplicate gain_events exist
description: Why a deleted swap/sale leaves the tax lot short, and how to repair it cleanly through the UI
---

When a single sell/swap transaction has DUPLICATE gain_events (e.g. the same disposal
logged twice, both pointing at one sell_transaction_id), deleting that transaction
restores only ONE chunk back to the tax lot's remaining_quantity, not all of them.
The lot ends up short by the duplicated quantity and the user then hits
"only N is tracked from your recorded purchases" when re-recording the correct sale.

**Why:** the delete reconciliation is not idempotent across duplicate gain_events for
the same sell — it under-restores. Production tax_lots/gain_events can only be fixed
through app API/UI (production executeSql is read-only).

**How to apply (UI repair, no DB write):**
1. Record a compensating BUY of the missing quantity at the ORIGINAL cost_basis_per_unit
   and the ORIGINAL acquired date (keeps it long-term, keeps total cost basis correct).
2. Then re-record the real sell/swap for the FULL original quantity.
FIFO consumes both lots; total cost basis and loss come out exact. An orphaned import
lot (blank transaction_id) cannot be edited via transaction delete/add — the
compensating-buy route is the only clean fix.
