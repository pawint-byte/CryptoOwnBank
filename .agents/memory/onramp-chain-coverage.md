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

## Stripe onramp silently falls back to ETH — and on this account it CANNOT be locked

Stripe's `crypto/onramp_sessions` treats `transaction_details[destination_currency]`
and `[destination_network]` as a *default*, not a constraint. When that coin isn't
available in the buyer's region, Stripe SILENTLY switches the session to its
ETH-on-Ethereum default — a member trying to buy XLM/BTC/SOL lands on an ETH screen.

**SUPERSEDED earlier guidance:** previously this note said to send single-value
`supported_destination_currencies[]` / `supported_destination_networks[]` arrays to
restrict the set. That was DISPROVEN by direct API testing — see
`stripe-onramp-cannot-lock.md`. Those arrays live behind the `crypto_onramp_beta=v2`
entitlement, which this account does not have; sending them hard-400s the endpoint, and
the singular fields are silently ignored (read back null, lock=false). Server-side
coin/wallet locking is therefore IMPOSSIBLE on this account until Stripe support enables
the v2 beta.

**Current resolution (the real fix shipped):** ETH is the only coin whose Stripe default
already matches the request, so it cannot mis-deliver. The server `createOnrampSession`
guard (`ONRAMP_LOCKABLE_CURRENCIES = {eth}`) rejects every non-ETH session as the single
source of truth, and both UIs (`buy-crypto.tsx`, `wallet-create.tsx`) only show the
instant Stripe button for ETH. All other coins route to external providers / swaps.

**How to apply:** do NOT reintroduce the supported_* arrays unless Stripe confirms the
v2 beta is enabled. Keep Stripe instant buys ETH-only until then. XRP is not a Stripe
coin at all (use the Xaman in-app buy rail).

## Chain-aware in-app wallet-app buy rail (LOBSTR for USDC/XLM, Xaman for XRP)

The "Buy inside your wallet app" rail (the region-block-dodging path) is provider-driven,
not hardcoded to Xaman. Each provider declares `landsInShownAddress`:
- **Xaman = true** (XRP): the card buy delivers to the EXACT address we show (seed import),
  so the destination/address step is kept and the address is displayed.
- **LOBSTR = false** (USDC/XLM on Stellar): the buy lands in the member's own LOBSTR
  Stellar wallet, NOT an address we hold.

**Why (funds-safety, the whole point):** USDC's on-file address is **EVM/0x**
(tokenToChain[USDC]=ethereum). USDC also lives on Stellar via LOBSTR. If the LOBSTR buy
card showed that 0x address, a member could send Stellar-USDC to an Ethereum address →
funds lost. So `landsInShownAddress=false` must (1) gate OFF any address display on the
checkout card, and (2) set the method's `needsAddress=false` so the wizard SKIPS the
address step entirely. Never put LOBSTR in `walletsByToken[USDC]` either — saving a Stellar
address under the EVM USDC chain is the same trap.

**How to apply:** new in-app wallet rails go in `WALLET_APP_META` + `EXTERNAL_ONRAMP_BY_CHAIN`
(keyed by lowercased **symbol**, not chain — `rlusd`/`xrp`/`xlm`/`usdc` are symbol keys despite
the `_BY_CHAIN` name; `kind:"buy"`). RLUSD = XRPL → Xaman (tokenToChain[RLUSD]="xrp", lands in
shown XRPL r-address). Honest copy only: guide up to the wallet's own Buy screen, never imply
funds pass through us.

**Auto-select default (founder ask "it should launch Xaman/LOBSTR"):** picking a coin that has
a wallet-app buy now auto-selects the `wallet_app` method and jumps straight to its launch
screen — both in `handleCoinSelect` and the `?coin=` deep-link effect. `landsInShownAddress`
true → go to `destination` step first (confirm the address the coin lands in); false (LOBSTR)
→ straight to `checkout`. Don't revert this to the generic method list for these coins.
