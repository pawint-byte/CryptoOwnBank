---
name: Route Planner capability matrix
description: When generating guided multi-step crypto routes, only emit hops the linked tool can actually execute.
---

A "do X to get Y" guided planner (e.g. the destination-first Route Planner) must never link a step to a tool that cannot perform that hop. A path that *looks* connected but sends the member to a tool that can't do the leg is worse than a shorter, honest path.

**Why:** First draft routed privacy buys as buy USDC → swap USDC→ETH (1inch) → swap ETH→BTC (cross-chain) → external XMR. But the in-app cross-chain swap UI is **EVM-only** — its chain/token menus are EVM chains and EVM token lists (it offers WBTC, not native BTC). So the ETH→BTC hop was un-executable and misleading. The honest XMR route is just buy native **BTC with a card** (Stripe supports BTC) → external no-KYC BTC→XMR. Truthful + executable beats a longer fake "demo" of swaps.

**How to apply:** Match each generated step to a real tool capability:
- `/buy-crypto` (Stripe onramp): native delivery of USDC/ETH/BTC/SOL/XLM/POL/AVAX. NOT XRP/XMR.
- `/ownbank/evm-swap` (1inch): same-chain EVM token swaps only.
- `/ownbank/cross-chain` (LI.FI): EVM↔EVM only — no native BTC/XRP/SOL destinations.
- `/ownbank/xrpl-bridge` (Squid/Axelar): EVM asset → native XRP. This is the right tool for XRP, not the generic cross-chain page.
- `/own-privately`: external no-KYC handoff for XMR/ZEC (we never custody; member picks the third party).
Also always short-circuit when the member already holds the destination coin (return a "done" step, no buy/swap) — but let the member override this.

**Tax override:** swaps/bridges are taxable disposals; buying with a card is not. Members may deliberately want to buy fresh even when they already hold a swappable coin (to avoid realizing a gain). The planner has a "Buy fresh instead of swapping what I own" toggle (default off) that makes `buildPlan` ignore holdings and prefer card buys, including overriding the already-hold-destination short-circuit. Honest nuance: XRP/XMR have no card rail to the final coin, so at least one swap/bridge is unavoidable — buying fresh immediately before it keeps the realized gain ~0.
