---
name: Browser-persisted wallet state must bind to the logged-in account
description: Why the XRPL wallet connection bled across accounts in one browser, and the rule to prevent it
---

The XRPL connection (connected address, balances, vault deposits, referral state) lives in a Zustand `persist` store keyed only by a fixed localStorage name (`ownbank-xrpl-storage`). localStorage is **per-browser, not per-account**, and login/logout never touched it. Result: connect a Xaman wallet under account A, log out, log into account B in the same browser → the OwnBank dashboard still read the persisted connection and showed A's live wallet + balance under B. Not a server leak (no other device sees it; signing still needs Xaman) but a real privacy hole on shared computers, and very alarming to see.

**Rule:** any browser-persisted wallet/connection/sensitive state must be (a) tagged with the user id that created it and (b) cleared when the logged-in account changes or on logout. A persisted connection with no owner tag (legacy/pre-fix) must be treated as untrusted and cleared, not adopted by whoever logs in next.

**Why:** self-custody/privacy is the product's whole promise; one member seeing another's address+balance — even just visually, even just their own other account — breaks trust instantly.

**How to apply:** the store carries `ownerUserId` + `syncOwner(currentUserId)` (clears when connected under a different/unknown account, else stamps) + `resetWallet()`. A top-level guard runs `syncOwner(user?.id ?? null)` once auth resolves (gate on `!isLoading` so the brief null-during-load doesn't wipe a valid same-user connection). Logout also calls `resetWallet()`. Note: stamping happens via the guard before the user can reach the connect button, not inside `connect()` — if the connect flow ever moves earlier, stamp owner at connect time too. Any NEW persisted-across-sessions store holding wallet/account data needs the same owner-binding treatment.
