---
name: Renamed-token consent nudge (not auto-relabel)
description: Why renamed tokens (TON->GRAM) are surfaced as a member-approved nudge, never an automatic relabel
---

When a coin rebrands its ticker but keeps the same chain/addresses/balances, the
portfolio must NOT auto-change the displayed name. Show the raw stored ticker by
default; only when a holding is saved under the OLD ticker, surface a small
"Name update" nudge offering: accept (show transition label e.g. "Gram (prev.
Toncoin)"), keep old, or dismiss. The member is the only one who says yes.

**Why:** founder doctrine — be the explainer/checklist, member approves. An
earlier build auto-relabeled and the founder rejected it ("you decided for me").

**How to apply:**
- The decision must be persisted PER authenticated user id, not globally — a
  shared-browser localStorage key without a user namespace leaks one member's
  choice onto another's holdings (same class of bug as the wallet/account bleed).
- Nudge only when the stored ticker is the legacy/from name; a holding typed as
  the NEW name should not nudge (the member already knows it).
- Pricing is independent of the label choice — the price service fans the
  canonical price across old+new tickers regardless of what's displayed.
