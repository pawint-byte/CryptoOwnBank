---
name: Sell reconciliation — asset-global lots vs per-account positions
description: Why a "sell from this holding" action must carry the row's real accountId, and the cost-basis scope boundary behind it.
---

Tax lots are stored **asset-global per user** — the lots table has no account column, so a sell consumes the member's oldest/newest lots of that asset across ALL accounts (correct FIFO/LIFO for tax). But **positions are per-account**, and the sell endpoint reduces only the position matching the supplied accountId.

**Why:** cost basis is tracked once per asset per user (a deliberate tax model), while holdings are shown per account. This creates an inherent mismatch the UI must respect.

**How to apply:**
- Any "sell/dispose from this holding" shortcut must pass the **row's real accountId**, never a hard-coded "manual" — otherwise lots are consumed but the wrong/no position is reduced and holdings desync.
- Only expose such shortcuts on **per-account rows**. Aggregated/consolidated (multi-account) rows have no single position to reduce — don't silently pick one.
- It stays consistent only while sell qty ≤ that account's holding (default the prefill to the full row quantity).
- The create-transaction endpoint must verify a supplied non-manual accountId belongs to the caller (ownership check) — client deep-links make foreign IDs reachable.
- Making cost basis truly per-account = schema change + a universal-vs-per-account tax-semantics decision; treat as an owner decision, not a quiet refactor.

## Positions and tax lots are written on separate paths

A holding (position) and its cost-basis tax lot are created by **independent** code paths, and positions are maintained **incrementally** (no recompute-from-transactions job). Consequences:
- Any path that adds a holding must ALSO create a tax lot, or the holding has no cost basis and **cannot be sold** — the sell branch rejects with "No recorded purchases found" when an asset has no active lots.
- The Portfolio "+" add-holding endpoint historically created only a position (no lot/transaction), so those holdings were unsellable until it was changed to also write a buy transaction + lot.
- Because positions are incremental, you can safely insert a transaction row + lot WITHOUT touching the position again — `createTransaction` is a plain insert with no position side effects. Don't update the position twice.
- **Why:** "show a holding" and "make it sellable/tax-correct" are different guarantees; only the lot delivers the second. **How to apply:** when adding any new way to create/import a holding, mirror the buy flow (position + transaction + lot) or the asset's lifecycle breaks at disposal time.
