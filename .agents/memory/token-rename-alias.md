---
name: Token rename / alias handling
description: How ticker rebrands (same chain, new name, no swap) are handled across pricing, display, and tax.
---

A coin can rebrand its ticker/name while keeping the same blockchain, addresses,
and balances (no swap, no migration) — e.g. TON→GRAM. These are handled by a
single source-of-truth alias module, NOT by auto-following whatever a price feed
labels a coin.

**Rule:** add ONE entry to the rename list to handle a rebrand. Pricing then
works automatically because the canonical price is fanned out to every alias
ticker (both at fetch time and read time), and the lookup resolves through a
canonical-symbol helper. Display shows a transition label like
"Gram (prev. Toncoin)".

**Why deliberate, not auto:** an auto-rename-from-feed is exactly how scam/bad
data ("claim GRAM") slips in; the non-custodial brand doctrine is "be the
explainer, member says yes" — rebrands are intentional, verified updates.

**Known gap (decide before relying on it for tax):** pricing + display continuity
are covered, but FIFO lot matching / cost-basis / harvest still compare RAW
symbols. So historical lots under the OLD ticker will NOT auto-merge with new
activity recorded under the NEW ticker. Existing holdings stay stored under the
old symbol, so the common case is fine — but full tax-lot unification requires
routing the canonical-symbol resolver through every accounting boundary, which is
tax-sensitive and was intentionally deferred for founder sign-off.
**How to apply:** if asked to "make the rename also work for cost basis/tax,"
this is the missing piece — wire canonical resolution into lot selection,
disposal matching, and harvest scans, carefully (this area has broken before).
