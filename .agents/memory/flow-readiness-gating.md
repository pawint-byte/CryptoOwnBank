---
name: Flow readiness gating (trust line + reserve)
description: How to compute live "can the member do this?" gates for XRPL/Stellar guided flows without false greens or false locks.
---

# Flow readiness gating

For any guided-flow / readiness check that gates a chain action on XRPL or Stellar:

## Trust-line presence
Detect a trust line from the LIVE `account_lines` query (XRPL `getAccountTrustlines`
/ Stellar balances list), NOT from a token balance and NEVER from a persisted/cached
store value.

**Why:** a trust line exists even at a zero balance (so a balance check false-LOCKS a
member who trusts but holds 0), and a stale persisted balance false-GREENS a line that
isn't really there. A live positive balance is an acceptable *additional* proof (you
can't hold a token without the line), but the persisted fallback must only feed display,
never the gate decision.

**How to apply:** `hasTrust = liveLines.some(match currency+issuer) || (liveBalance ?? 0) > 0`.
Match BOTH currency/asset_code AND issuer/asset_issuer (see rlusd-iou-issuer-gating).

## Reserve / fee gating
Compute the required-free native balance DYNAMICALLY from owner objects, not a fixed
buffer. XRPL: base + perObject*(objects held) + small fee headroom. Stellar:
minAccount + perEntry*(entries held) + small fee headroom.

**Why:** a fixed "+0.5 coin" block falsely LOCKS a member sitting right at their true
reserve floor (e.g. someone with exactly base+1-trustline reserve who only needs a
tiny fee). Keep the fee headroom small (~0.05) — the real network fee is ~0.00001;
the headroom is comfort, not a half-coin gate.

**How to apply:** add the per-object/per-entry reserve only when the relevant trust
line is actually held; under-estimating other unrelated objects is fine because the
send page is the final authority — bias toward fewer false locks, never false greens.
