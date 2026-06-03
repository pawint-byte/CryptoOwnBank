---
name: Route Planner capability matrix
description: When generating crypto acquisition routes, only emit hops the linked tool can actually execute, and only destinations the linked pages can actually select.
---

The Route Planner is a **route selector**: for a chosen destination coin it generates every realistic candidate route, scores them by a member-chosen priority (balanced/cheapest/easiest/lowest-tax/most-private), and shows them ranked with a "Best for you" badge plus honest pros/cons. A path that *looks* connected but sends the member to a tool that can't do the leg — or can't even select that coin — is worse than a shorter honest path.

**Why:** Two separate failures hit this surface. (1) An early draft routed privacy buys through an EVM cross-chain hop the in-app cross-chain UI can't do (it's EVM-only, offers WBTC not native BTC). (2) The route-selector rebuild listed destinations (USDC/USDT/POL/BCH) that the linked pages can't actually deliver — the canonical coin grid uses `MATIC` (not `POL`) and has no USDC/USDT/BCH, so those routes pointed members at a Swap Any Pair / Buy Crypto screen where the coin isn't selectable.

**How to apply:**
- **Destinations must be a subset of the canonical `tokens` grid in `buy-crypto.tsx`** (both `/buy-crypto` and `/swap-any-pair` render their coin pickers from it). If a coin isn't in that grid, the planner must not offer it as a destination. Use `MATIC` (the grid symbol), never `POL` (Stripe's currency code).
- Match each generated hop to a real tool capability:
  - `/buy-crypto` (Stripe onramp): native card delivery of grid coins ETH/BTC/SOL/XLM/AVAX/MATIC (Stripe also does USDC, but USDC isn't in the grid). NOT XRP/XMR.
  - `/ownbank/evm-swap` (1inch): same-chain EVM token swaps only — grid EVM coins are ETH/MATIC/AVAX.
  - `/ownbank/cross-chain` (LI.FI): EVM↔EVM only — no native BTC/XRP/SOL destinations.
  - `/ownbank/xrpl-bridge` (Squid/Axelar): EVM asset → native XRP. The right tool for XRP, not the generic cross-chain page.
  - `/swap-any-pair` (Trocador all-pairs): the catch-all from any crypto you already hold to almost any grid coin; a third party briefly holds funds in-flight (we never custody).
  - `/own-privately`: external no-KYC handoff for XMR/ZEC — privacy coins stay on this boundary and are NEVER routed through the Trocador aggregator.
- **Use ETH as the card-buyable intermediate** for cash-start routes (buy ETH → bridge/swap). It's in the grid, Stripe-buyable, and EVM — so both the buy leg and the next hop are executable. (Avoid USDC as the intermediate: not in the grid.)

**Member-first scoring (honesty requirement):** for EVM↔EVM pairs the on-chain DEX route must out-rank the Swap Any Pair (Trocador) route under Balanced/Cheapest — the selector steers members to the cheaper, self-custodial rail, NOT the one we earn affiliate revenue from. `costScore` (cheaper=higher) + self-custody bonus drive this; verify it holds if weights change.

**Tax nuance:** buying with a card is not a taxable disposal; swaps/bridges are (they realize gain/loss on the coin sold). The "Lowest tax bill" priority biases toward card buys / not selling held coins. XRP/XMR have no card rail straight to the final coin, so at least one swap/bridge is unavoidable for them.
