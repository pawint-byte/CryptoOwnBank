---
name: Transaction notes must stay isolated from the tax ledger
description: Why private per-transaction notes live in their own table keyed by txHash, never in transactions.notes
---

Private free-text notes attached to a transaction (UI: "My Note" in history, "Private note" on Send) live in their OWN table `transaction_notes` keyed by `(userId, txHash)` — NOT in the tax-ledger `transactions.notes` column.

**Why:** A note is human context for one event ("test deposit — ignore", "rent to landlord"). The tax engine classifies disposals (sale vs self-transfer) and computes gains. If notes shared storage with anything the tax path reads, a stray note could nudge classification or look authoritative — a real money/tax risk. Keeping them in a physically separate table makes it impossible for a note to ever feed tax logic.

**How to apply:** Anything that adds context/labels to a transaction for the member's own recall must stay out of the structures the tax recompute reads (lots, gain events, `transactions.notes`/classification fields). Keep notes by `txHash` so they survive the fact that the XRPL history page reads chain LIVE by hash (not DB-backed) — DB row IDs don't exist there. Note save from Send must use the canonical 64-hex XRPL hash, never the UUID fallback `signPayment` can return, or the note won't match the on-chain tx in history.
