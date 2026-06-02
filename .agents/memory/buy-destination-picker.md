---
name: Buy/destination wallet picker
description: How the Buy Crypto "Your wallet" step must surface saved addresses.
---

# Buy/destination wallet picker

The "Your wallet" step in the Buy Crypto flow is the founder's safety net: it exists
to guarantee a bought coin has a home on CryptoOwnBank, and to spare members from
re-pasting an address they already saved.

**Rule:** a destination/receive step must surface **all** of a member's saved
addresses for the chosen coin as a selectable list — not just the first match.
Power members keep several wallets per coin (the founder has ~6 XRP addresses across
Ledger/Xaman/SafePal/etc.). Resolve them via the coin's chain aliases, dedupe by
address, default to the first, and keep the selection valid when the coin changes.

**Why:** an earlier version resolved only the first matching saved wallet and showed
it as a fixed card, so members couldn't choose where the coin landed — and on a
fresh account it fell back to a blank paste box, which read as "the safety net is
gone."

**How to apply:** when building any buy/receive/send destination step, (1) list all
matching saved wallets selectably, (2) include an "add a different address" path, and
(3) make "save & use this new address" actually select the newly saved address (the
selection-preserving effect will otherwise keep the prior one). Feed the *chosen*
address — not the first — into every downstream provider (Stripe/Changelly/MoonPay/
Transak).
