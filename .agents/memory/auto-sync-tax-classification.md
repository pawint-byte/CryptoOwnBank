---
name: Auto-sync outgoing-transfer tax classification
description: Why outgoing crypto transfers are held for review instead of auto-taxed as sales, and the rules for idempotent tax recompute.
---

# Outgoing transfers must not auto-become taxable sales

When wallet auto-sync sees an outgoing crypto movement it cannot positively classify, it must HOLD it (reviewStatus="pending") and ask the member to label it, NOT mark it a taxable sale. Only positively-identified disposals (member-labeled sale/swap) count toward tax.

**Why:** Treating every outgoing transfer as a sale invented phantom capital gains for moves between a member's own wallets and for vault deposits. This is a trust-critical correctness issue for a non-custodial app — a wrong "sale" overstates the member's tax bill.

**How to apply:**
- Classify incoming = buy; send to a known own wallet = transfer; send to a known vault = transfer; everything else outgoing = sell with reviewStatus="pending" + an explicit review note, excluded from tax until labeled.
- Known vault recipients live behind one helper (`isKnownVaultAddress`, case-insensitive) so SOIL/DOPPLER addresses aren't duplicated across sync paths.

# Tax recompute and gain-event clearing must be idempotent

Any operation that recomputes gain events (full year recompute, or converting a sell to a non-taxable transfer) must first DELETE the existing gain events it owns AND restore the affected lots' remainingQuantity before recreating anything.

**Why:** "Calculate Taxes" previously re-created gain events without clearing, so a second click doubled the year's gains. Reclassifying a sell to a transfer without restoring lots leaves consumed lot quantity permanently lost.

**How to apply:** delete-owned-events → restore lot remainders → recompute. Skip reviewStatus==="pending" sells in any tax computation. A historical-cleanup path (flag imported/auto-synced sells → pending + wipe their phantom gains) lets already-corrupted data be fixed post-deploy, followed by Calculate Taxes + recalc-positions-from-lots.

# Labeling a held transfer as a sale must realize gains immediately

When a member labels a held transfer as sale/swap, run the FIFO/LIFO lot-matching disposal engine right then (gain events keyed to the sell tx id + lot decrements), idempotently (clear that sell's existing gain events + restore lots first). Don't just flip a flag and defer to the next "Calculate Taxes".

**Why:** a review rejected deferring — the member expects the gain reflected on the spot, and deferring left the labeled sale silently unaccounted until a separate recompute. Crypto-to-crypto swaps are taxable disposals (consistent across manual-sell, record-sale, and the UI copy), so swap label = taxable, same as sale.

**How to apply:** reuse one helper for label-time realization; it stays consistent with the yearly recompute because both are idempotent (clear-then-rebuild), so running both can't double-count.

**Caveat:** these multi-step ops are non-transactional (matches the existing record-sale/import convention). Concurrent calls or mid-op failure can leave lots/events temporarily inconsistent — wrap in a DB transaction / per-user lock if revisited.
