# CryptoOwnBank — To-Do List & Decision Log

**Last updated: 2026-03-24 (evening update) by main agent**

**This file is the official memory for pending items, decisions made, and things to revisit. Every session MUST read this file and update it when items are completed or new ones are added. Update the "Last updated" line above with the current date every time you make changes. Every entry MUST include the date it was added. Completed items MUST include the date completed.**

---

## PENDING — Referral / Affiliate Links

| Provider | Status | Action Needed | Date Added |
|----------|--------|---------------|------------|
| Gnosis Pay | LIVE — Partner ID `cmn4r1myk000jxy2lnjzzhtzw` in URL | None | 2026-03-23 |
| CypheRock | LIVE — `ref=PETER.WINT` | None | pre-2026-03-23 |
| Ledger | LIVE — `referral_code=H7DFZEAP8RPK4` | None | pre-2026-03-23 |
| ELLIPAL | LIVE — `rfsn=9012773.864657d` | None | pre-2026-03-23 |
| Bleap | LIVE — `code=FMWHK7IM` | None | 2026-03-24 |
| MetaMask Card | NO REFERRAL — referral program suspended Feb 2026 | Swap in referral link when program reopens | 2026-03-24 |
| MoonPay | Generic link — awaiting partner approval | Embed widget once approved | 2026-03-24 |
| Transak | Generic link — awaiting partner approval | Embed widget once approved | 2026-03-24 |
| NoOnes | Generic link | Check if affiliate program exists | 2026-03-24 |
| ByBarter | Generic link | Check if affiliate program exists | 2026-03-24 |
| Narfex | Generic link | Check if affiliate program exists | 2026-03-24 |
| Onramp.money | Generic link | Check if affiliate program exists | 2026-03-24 |
| Digitap | Generic link | Check if affiliate program exists | 2026-03-24 |
| Onramper | Awaiting API key | Embed aggregator widget once key received (email was sent previously) | 2026-03-23 |

---

## PENDING — External Approvals

- [2026-03-23] Onramper API key (email sent — would enable embedded aggregator widget covering multiple providers in one UI)
- [2026-03-24] MoonPay partner approval (would enable embedded buy widget on our site)
- [2026-03-24] Transak partner approval (would enable embedded buy widget on our site)
- [2026-03-24] Stellar Development Foundation grant
- [2026-03-24] Ripple grant (Spring 2026 application window)
- [2026-03-24] XLS-65/66 XRPL validator activation (for native lending)

---

## PENDING — Revisit When Legislation Passes

- [2026-03-24] **Stablecoin yield legislation (GENIUS Act / STABLE Act / Clarity Act)**: When it passes, review the actual language and decide:
  - Add jurisdiction disclaimer to yield-related pages (Soil Protocol vault, RWA Yields)
  - Evaluate whether geo-restriction is needed based on the actual law
  - Review any impact on RLUSD yield messaging
  - **Reason**: We decided to wait because the bill hasn't passed and the final language could look very different from what's being debated. Non-custodial positioning already gives strong standing.

---

## PENDING — Future Improvements

- [2026-03-24] **Embedded on-ramp widget**: Currently all buy-crypto paths are outbound links. Once MoonPay or Transak approves, embed their widget so members can buy crypto without leaving CryptoOwnBank.
- [2026-03-24] **Telegram Mini-App**: A simplified version of the dashboard inside Telegram. Good for emerging markets (Nigeria, Philippines, Kenya). Available to ALL members, not restricted to any group. Worth exploring as a growth channel.
- [2026-03-24] **Backup domains**: cryptoownbank.com is the production domain. crypto-ledger--pawint.replit.app is the Replit domain (also serves production). Both serve the same deployed app. Buying a backup domain (.xyz, .io) is cheap insurance but not urgent since the Replit domain already works as a fallback.
- [2026-03-24] **Off-ramp / cash-out guide**: Buy Crypto page covers getting into crypto but doesn't guide users on converting back to fiat. Crypto Debit Cards partially fills this gap.
- [2026-03-24] **Ledger 4.0 platform update**: Review new features and update Buy Crypto / Crypto Debit Cards pages if new on-ramp providers or capabilities were added.
- [2026-03-24] **Noah Cash-to-Stablecoin on-ramp (inside Ledger)**: Added late 2025, now prominently pushed by Ledger. Direct bank transfer (USD/EUR) to instant USDC/USDT inside Ledger Wallet — no credit card needed. One of their easiest fiat on-ramps alongside MoonPay, Coinify, Transak, BTC Direct. **Action**: Add to Buy Crypto page as an on-ramp path for Ledger users.
- [2026-03-24] **CL Card (Ledger Visa debit by Baanx)**: Ledger's promoted crypto debit card. Spend directly from Ledger Wallet balance, 1% cashback in BTC/USDC/USDT, Apple Pay and Google Pay supported. **Action**: Add to Crypto Debit Cards page alongside Gnosis Pay, MetaMask Card, Bleap. Include Ledger referral link (`referral_code=H7DFZEAP8RPK4`).
- [2026-03-23] **AI Portfolio Assistant**: GPT-4o-mini to start, upgrade to GPT-4o when needed. Pay-as-you-go pricing (~$0.01-$0.03 per conversation). Free = 0 AI chats, Premium = 50/month, Pro = unlimited. Must include "not financial advice" in every response. Need to sign up for OpenAI API key at platform.openai.com when ready.
- [2026-03-23] **Open Wallet Standard (OWS)**: Research noted — potential fit for future AI assistant (agent proposes, user approves on Ledger), Legacy Plan automated disbursement (policy engine), and adding new chains later. Not a replacement for Xaman or WalletConnect. Clone repo and experiment when ready.
- [2026-03-23] **Borrow Against Vaults**: Interface-only approach — CryptoOwnBank as dashboard to external lending protocols (Morpho, Aave-style, or XRPL-native via XLS-65/66). We are NOT the lender. Language: "borrow through the protocol via our interface." Blocked until XLS-65/66 activates on XRPL.
- [2026-03-23] **MoonPay Agents / x402 protocol**: Worth watching for B2B and AI agent features. When MoonPay approves our on-ramp application, explore whether their CLI/API could power more than buy/sell.
- [2026-03-23] **GitHub push**: User needs to push from Shell tab manually. Pending.

---

## PENDING — Known Data Issues

- [2026-03-23] **40 inflated manual wallet balances** (Coinbase, Uphold, Crypto.com) — user will fix manually
- [2026-03-23] **1,406 Yahoo import transactions** still in production DB
- [2026-03-23] **102 positions with no matching price** in price_cache — adding exchange imports will help fill gaps
- [2026-03-23] **Position symbols with suffixes**: Yahoo CSV import creates symbols like `ALI16876`, `APT21794`. Normalizer handles this for price matching but raw symbols remain in DB.
- [2026-03-23] **FRED API key needed** for real estate live data
- [2026-03-23] **XDC on MetaMask iOS doesn't work** — known limitation, not our bug

---

## PENDING — Features Needing User Testing

- [2026-03-23] Legacy Plan
- [2026-03-23] Earn & Accumulate
- [2026-03-23] Cross-Chain Swap
- [2026-03-23] XRPL Bridge
- [2026-03-23] Recurring Payments
- [2026-03-23] Invoices
- [2026-03-23] ~~Flare FTSO~~ — TESTED by user (2026-03-23)
- [2026-03-23] ~~DCA Orders~~ — TESTED by user (2026-03-23)

---

## DECISIONS MADE — For Reference

| Date | Decision | Reason |
|------|----------|--------|
| 2026-03-24 | No geo-blocking for yield pages yet | Wait for stablecoin legislation to pass first |
| 2026-03-24 | No IPFS/decentralized hosting yet | Site has a backend (database, APIs) that can't run on IPFS; only static sites work there |
| 2026-03-24 | Hardware wallet section added to Crypto Debit Cards page | CypheRock, Ledger, ELLIPAL with affiliate links |
| 2026-03-24 | Bleap referral code added | `FMWHK7IM` — user provided the code |
| 2026-03-24 | MetaMask Card stays with generic link | Referral program suspended since Feb 2026 — not the card itself |
| 2026-03-24 | Buy Crypto page is outbound links + instructions for now | No embedded widget until MoonPay/Transak approves; value today is personalized guidance and wallet detection |
| 2026-03-24 | Both domains serve production | cryptoownbank.com and crypto-ledger--pawint.replit.app are the same deployed app — user uses replit.app link at work because employer blocks cryptoownbank.com |
| 2026-03-24 | TODO.md created as official to-do list | Previous sessions claimed it existed but it did not. Now referenced in replit.md so every session reads it. |
| 2026-03-23 | Stripe on-ramp evaluated and rejected | No off-ramp support — we need both directions |
| 2026-03-23 | Borrow Against Vaults = interface only | CryptoOwnBank is NOT the lender — dashboard to external protocols only. Avoids money transmission / securities issues |
| 2026-03-23 | AI model: GPT-4o-mini to start | ~1/10th cost of GPT-4o, good enough for simple queries, upgrade with one line of code when needed |
| 2026-03-23 | Onramper is preferred on-ramp solution | Aggregates multiple providers in one embedded UI — better than individual MoonPay/Transak widgets |

---

## COMPLETED

- [2026-03-24] Server startup crash fixed ("app is not defined" — Gnosis Pay code was placed inside `startPriceAlertChecker()` which has no `app` in scope; moved to `registerRoutes()`)
- [2026-03-24] Bleap referral code added to Crypto Debit Cards page (`code=FMWHK7IM`)
- [2026-03-24] Hardware wallet recommendation section added to Crypto Debit Cards (CypheRock, Ledger, ELLIPAL with affiliate links)
- [2026-03-23] Tax Harvest AI built and deployed (scans positions for unrealized losses, calculates tax savings at 24/32/37%, suggests harvest & rebuy or conservative swap)
- [2026-03-23] Tax Harvest AI bug fix (price_cache uses `priceUsd` not `price`, symbol normalizer added for Yahoo import suffixes, WLFI erroneous lot deleted)
- [2026-03-23] Security hardening (Helmet headers, rate limiting 300/15min API + 30/15min auth, sameSite cookies)
- [2026-03-23] Unit test suite (68 tests for financial math — FIFO/LIFO, portfolio value, cost basis, SMA, EMA, RSI, MACD, Bollinger Bands)
- [2026-03-23] Precision rounding added (round2/round8 throughout financial calculations)
- [2026-03-23] Buy Crypto improvements (FLR token added, swap suggestions, desktop "Visit Website" vs mobile "Open App" deep links)
- [2026-03-23] Squid Router confirmed configured (SQUID_INTEGRATOR_ID env var set, XRPL Bridge functional)
- [2026-03-23] Sidebar reorganized (XRPL+Stellar merged into "OwnBank" with chain switcher, EVM items into "Swap & Bridge")
- [2026-03-23] Mobile bottom tab bar added (Home, Portfolio, OwnBank, Market, More)
- [2026-03-23] Disclaimer language tightened (Tax Reports, Recommendations Hub, EVM Swap fee disclosure, DCA Orders, Legacy Plan)
- [2026-03-23] Gnosis Pay PSE integration (backend mTLS endpoint + frontend component for card details viewing)
- [2026-03-23] Crypto Debit Cards page built with Gnosis Pay, MetaMask Card, Bleap as featured cards
- [2026-03-23] "Spend Crypto" sidebar entry added with CreditCard icon
- [2026-03-23] Cross-links between Buy Crypto and Crypto Debit Cards pages
- [2026-03-23] All announcement drafts cleaned (no emoji — strictly enforced)
- [pre-2026-03-23] Buy Crypto page with 17 tokens, 11 wallets, 9 on-ramp providers, P2P section (NoOnes, ByBarter, Narfex), emerging market ramps (Onramp.money, Digitap), Telegram Wallet, FAQ
