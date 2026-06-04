---
name: Trocador pre-filled vs blank homepage
description: Why "buy XMR privately" CTAs must route into the in-app aggregator flow, not the Trocador directory link.
---

The pre-filled Trocador swap (receiving address already entered + from-coin preselected) exists in **only one place**: the `aggregator` method inside buy-crypto.tsx, which mints an AnonPay session (`POST /api/trocador/anonpay-session`) and opens Trocador with the member's address baked into the URL.

Every other route to Trocador — the `/own-privately` directory "Visit Trocador" cards, and the Route Planner's external "Open Own It Privately" step — points at the **bare** `https://trocador.app` homepage, where nothing is pre-filled and the member must manually set send coin / receive=Monero / paste their XMR address. That blank-screen landing is the #1 source of "this flow is confusing" friction.

**Rule:** any prominent "start the private swap" CTA must deep-link to `/buy-crypto?coin=XMR&method=aggregator`, NOT to trocador.app directly. The directory link is fine only as a secondary/advanced reference.

**Deep-link contract (buy-crypto.tsx):** `?coin=SYMBOL` preselects the coin and jumps to the "How to pay" step. Adding `&method=aggregator` jumps straight to the "Your wallet" (destination) step for that coin — correct because the aggregator method has `needsAddress: true`. After the member enters/confirms their address, the checkout's "Get my {coin} swap ready" button mints the pre-filled session.

**Why:** members kept getting routed through the directory and Route Planner onto the blank Trocador site, losing the address pre-fill the in-app flow already provides. The obvious next click must land them on the guided, pre-filled path.
