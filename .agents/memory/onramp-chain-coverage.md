---
name: Card on-ramp chain coverage
description: Which card-to-crypto rails cover which chains — needed before writing buy/fund guidance so it doesn't mislead users
---

# Card on-ramp chain coverage

Three separate rails fund a wallet with a card, each covering DIFFERENT chains. Before
writing any "buy/fund with card" copy or guide, check which rail actually applies — they
do NOT all cover XRP.

- **Stripe embedded onramp** (one-tap "Buy with card" in the wallet flow): EVM
  (ETH/USDC/POL/AVAX), BTC, SOL+USDC, XLM+USDC **only**. Does **NOT** support XRP.
- **THORChain bridge** (Card→USDC via Stripe, then USDC→coin swap): BTC, LTC, DOGE, BCH
  **only**. Does **NOT** support XRP. (And BTC is excluded from the bridge button since
  Stripe sells BTC directly.)
- **External onramps** (open a partner app/site): XRP → "Buy XRP in Xaman" or Sologenic.
  The accurate XRP card path is: import the SAME 12-word seed into Xaman → tap Buy →
  Transak/MoonPay/Topper → crypto lands at the same address.

**Why:** The default product recommendation is to make an XRP wallet first, but XRP is the
one chain none of the instant card rails cover. A guide that says "tap Buy with card" for
XRP would be false. The honest path is the Xaman seed-import route (still non-custodial —
same seed, same address, user keeps the keys).

**How to apply:** When the chain is XRP, route to Xaman, never imply a one-tap Stripe or
THORChain card buy. When it's an EVM coin / BTC / SOL / XLM, the one-tap Stripe button is
real. Ground truth lives in the chain maps in the stripe-onramp and thorchain client libs.
