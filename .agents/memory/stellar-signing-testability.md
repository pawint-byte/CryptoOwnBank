---
name: Stellar signing testability
description: Why the Stellar send/trade/trust flow is built signer+network-injectable, and the two boundaries that stay un-provable.
---

The Stellar build->sign->submit flow is structured so the SAME orchestrator the
live wallet path runs can also be driven by a software key on Testnet — proving
the real code, not a re-implementation.

**Why:** production signs via the Freighter browser extension against mainnet
Horizon; neither runs in Node. Expressing "the wallet" as an injectable signer +
network lets a Testnet harness (software keypair + Friendbot funding) exercise
the real orchestration end-to-end.

**How to apply:**
- Keep the orchestrator + builders in a pure module that imports ONLY the
  isomorphic stellar-sdk. NEVER import the browser-only freighter-api there — it
  crashes a tsx harness on import. The extension adapter stays separate.
- Preserve per-operation fallback error text when centralizing the catch block;
  a shared orchestrator otherwise flattens distinct messages into one (parity
  regression caught in review).
- Irreducible gaps (same as the XRP signing work): the user's own
  Freighter/Ledger approval (extension/hardware boundary) and a mainnet submit
  (needs real funds). Everything on the software side of those lines is testable.
