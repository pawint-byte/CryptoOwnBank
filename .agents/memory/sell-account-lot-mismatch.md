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
