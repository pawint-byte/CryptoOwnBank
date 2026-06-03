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

## Monero (XMR) / no-in-app-rail handoffs

XMR has NO card rail and we're non-custodial, so the buy finishes on a third-party
service (no-KYC swap or P2P), and the coin lands in the user's own wallet — never through
us. The `/own-privately` page is the handoff target.

**Lesson (from a non-technical founder getting lost):** a handoff to external services must
lead with an ORDERED, numbered action path (get wallet → do the buy → done), not just a
"wall of options" with honest concept copy. The confusion was thinking the downloaded
wallet app was where you complete the purchase — the wallet is only where the coin LANDS;
the actual buy happens on the swap/P2P service.

**Accuracy trap:** among the listed P2P venues, only **Haveno** buys Monero directly from
cash. Bisq / Hodl Hodl / RoboSats are Bitcoin-first (buy BTC, then swap to XMR). Don't
imply any P2P venue gives Monero-from-cash directly.

**No fiat→XMR anywhere — it's always two moves.** No service sells Monero straight from
dollars/card; a "Buy with US Dollars" box returns NO results for XMR. XMR acquisition is
always: get an ordinary coin first, then SWAP that coin into Monero. On aggregators like
Trocador this means the **Swap** tab, NOT the **Buy/Sell** (fiat) tab — a non-technical
founder hit exactly this wall (typed "xmr" in the dollars Buy box, got nothing). Guidance
must say this explicitly or members assume XMR is simply unavailable.

**The swap checkout flow must be spelled out, incl. the MEMO/TAG trap.** A no-account swap
checkout asks for 4 things: (1) send-coin + receive=Monero + amount, (2) your XMR receive
address, (3) send the exact amount to the provider's deposit address, (4) wait — XMR
arrives automatically. The dangerous step: send-coins that use a **Memo / Destination
Tag** (XRP, XLM, ATOM, …) REQUIRE that tag alongside the deposit address — omitting it (or
wrong tag) can lose the funds permanently. Any "how to swap into XMR" copy must call out
the memo/tag explicitly for memo-chains; coins without a memo field have nothing to add.

**#1 user mix-up: address DIRECTION.** Non-technical members get lost on which address goes
where. The ONLY address you type INTO the swap site is your **Monero receiving address**.
You do NOT enter your send-coin's address on the swap site. The swap site GIVES YOU the
send-coin **deposit address + memo** on the next page, and you paste THOSE into your source
(e.g. Uphold → Send / Withdraw crypto → To a crypto address + Destination Tag). Always
state both directions explicitly: your-XMR-addr → into swap site; their deposit-addr+memo →
into Uphold's send screen.

## Stripe onramp silently falls back to ETH — lock the coin

Stripe's `crypto/onramp_sessions` treats `transaction_details[destination_currency]`
and `[destination_network]` as a *default*, not a constraint. When that coin isn't
available in the buyer's region (e.g. XLM/Stellar is region-gated, not in NY), Stripe
SILENTLY switches the session to its ETH-on-Ethereum default and asks for an Ethereum
address — a member trying to buy XLM lands on an ETH purchase screen.

**Fix:** also send single-value arrays
`transaction_details[supported_destination_currencies][]` and
`[supported_destination_networks][]`. These RESTRICT the allowed set (user can't
override), so an unavailable coin produces a clean Stripe error instead of a wrong-asset
fallback. `lock_wallet_address` alone does NOT prevent the coin swap.

**Why:** silent asset substitution in a buy flow is dangerous — someone could buy ETH
thinking it's XLM. Also keep a server-side allowlist of currency:network pairs so a
malformed payload can never reach Stripe.

**How to apply:** any change to the Stripe onramp must send the supported_* arrays in
lockstep with the default currency/network. Stripe onramp supported coins: ETH(eth/base),
BTC, SOL, AVAX, POL/MATIC(polygon), XLM(stellar), USDC(multi) — XRP is NOT supported
(use the Xaman in-app buy rail instead).
