# CryptoOwnBank — To-Do List & Decision Log

**Last updated: 2026-03-29 by main agent (on-ramp provider updates)**

**This file is the official memory for pending items, decisions made, and things to revisit. Every session MUST read this file and update it when items are completed or new ones are added. Update the "Last updated" line above with the current date every time you make changes. Every entry MUST include the date it was added. Completed items MUST include the date completed.**

---

## DOG FOOD CHECKLIST — Test Every Section With Real Data (Added 2026-03-26)

Use your real account (pawint@me.com) to go through every feature. Goal: have real data in every section so you can demo confidently and catch bugs before members do. Check off as you complete each one.

### Portfolio & Tracking
- [ ] **Wallets & Addresses** — Verify all your chain addresses are added and balances show correctly
- [ ] **Portfolio** — Confirm pie chart, allocations, and total value look accurate
- [ ] **Transactions** — Check transaction history is populated and accurate
- [ ] **Reconciliation** — Run a reconciliation to make sure balances match
- [x] **Import Data (CSV)** — DONE (pre-2026-03-26)
- [x] **Statement Insights** — DONE (pre-2026-03-26)

### XRPL Features
- [ ] **Soil RLUSD Vaults** — Verify active positions, earnings tracker, deposit/withdraw flow
- [ ] **XRPL DEX** — Place a real small trade, confirm order book and history
- [ ] **DCA Orders** — Verify active orders are running correctly, check run history
- [ ] **Trustline Management** — Add/remove a trustline, verify it works
- [ ] **AMM Pools** — If you have LP positions, verify they show correctly
- [ ] **XRPL Bridge** — Do a small real bridge transaction (EVM to XRPL or XRPL to EVM)

### Stellar Features
- [ ] **Stellar Wallet** — Connect your Stellar address, verify balances
- [ ] **Stellar DEX** — Place a real small trade
- [ ] **Stellar Send/Receive** — Send a real payment to someone (even yourself on another address)
- [ ] **Stellar Invoicing** — Create and send a real invoice
- [ ] **Stellar Recurring Payments** — Set up a small recurring payment
- [ ] **Stellar Remittances** — Test the remittance flow

### EVM / Cross-Chain
- [ ] **EVM Swap** — Do a real small swap on Ethereum, Polygon, or Arbitrum
- [ ] **Cross-Chain Swap** — Do a real small cross-chain transfer via LI.FI

### Payments & Commerce
- [ ] **Payments Hub** — Review all six tools, make sure links/flows work
- [ ] **XRPL Invoicing** — Create and send a real XRPL invoice
- [ ] **XRPL Recurring Payments** — Set up a small recurring XRPL payment
- [ ] **POS / OwnCoin** — Generate a QR code, scan it, complete a payment
- [ ] **Payment Queue** — Check if any queued payments show correctly

### Yield & Market Data
- [x] **Recommendations Hub** — DONE (pre-2026-03-26)
- [x] **Earn & Yield (RWA)** — DONE (pre-2026-03-26)
- [x] **Native Staking** — DONE (pre-2026-03-26) — HBAR, ADA verified; Cardano HD wallet fix deployed 2026-03-27 (uses stake account UTxO for full balance)
- [x] **Flare FTSO** — DONE (pre-2026-03-26) — staking and tracking verified
- [x] **Stablecoin Dashboard** — DONE (pre-2026-03-26)
- [x] **Yield Calculator** — DONE (pre-2026-03-26)

### Market Intelligence
- [x] **Crypto News** — DONE (pre-2026-03-26)
- [ ] **Price Alerts** — Set a real alert, wait for it to trigger, verify email notification
- [ ] **Whale Alerts** — Verify recent whale transactions are showing
- [ ] **Technical Analysis** — Run analysis on XRP, check patterns make sense

### Planning & Protection
- [ ] **Legacy Plan** — Verify your plan is configured and check-in flow works
- [ ] **Tax Reports** — Generate a real report for your transactions, check accuracy
- [ ] **Insurance** — Review the page, confirm info is current
- [ ] **DeFi Borrowing Hub** — Browse, confirm data is current
- [ ] **Chain Guide** — Read through, verify accuracy

### Account & Misc
- [ ] **Quick Start** — Walk through as if you're a new member
- [ ] **Buy Crypto** — Check on-ramp links work
- [ ] **Spend Crypto** — Check debit card info is current
- [ ] **Roadmap** — Verify it reflects current status
- [ ] **Contact & Feedback** — Submit a test feedback item

---

## ACTION REQUIRED — Complete From Phone

- [x] **NOWPayments IPN callback URL** — DONE (2026-03-26). Webhook URL set to `https://cryptoownbank.com/api/nowpayments/ipn` in NOWPayments dashboard. IPN secret configured. Backend endpoint live.
- [x] **LI.FI portal setup** — DONE (2026-03-30). Registered "CryptoOwnBank" integrator at portal.li.fi. EVM payout wallet added. API key generated and saved as LIFI_API_KEY env var. Backend already sends x-lifi-api-key header + 1% fee param with all cross-chain swap requests.

---

## PENDING — Referral / Affiliate Links

| Provider | Status | Action Needed | Date Added |
|----------|--------|---------------|------------|
| Gnosis Pay | LIVE — Partner ID `cmn4r1myk000jxy2lnjzzhtzw` in URL | None | 2026-03-23 |
| CypheRock | LIVE — `ref=PETER.WINT` | None | pre-2026-03-23 |
| Ledger | LIVE — `referral_code=H7DFZEAP8RPK4` | None | pre-2026-03-23 |
| ELLIPAL | LIVE — `rfsn=9012773.864657d` | None | pre-2026-03-23 |
| Bleap | LIVE — `code=FMWHK7IM` | None | 2026-03-24 |
| Arculus | LIVE — `arculusholdingsllc.pxf.io/9VVWge` (Impact, 15% commission, 30-day cookie) | None | 2026-03-25 |
| MetaMask Card | NO REFERRAL — referral program suspended Feb 2026 | Swap in referral link when program reopens | 2026-03-24 |
| MoonPay | Generic link — awaiting partner approval | Embed widget once approved | 2026-03-24 |
| Transak | Generic link — awaiting partner approval | Embed widget once approved | 2026-03-24 |
| NoOnes | LIVE — `noones.com/r/EasyMora369` (multi-tier lifetime commissions) | None | 2026-03-25 |
| ByBarter | Generic link | Check if affiliate program exists | 2026-03-24 |
| Narfex | Generic link | Check if affiliate program exists | 2026-03-24 |
| Onramp.money | Generic link — NO REFERRAL (blocks US citizens from affiliate signup) | None available | 2026-03-25 |
| Digitap | LIVE — `my.digitap.app/en/sign-up/a5ddfe70-5c63-4aea-94de-1ff0741c56ec` (up to 40% commission) | None | 2026-03-25 |
| Changelly | LIVE — ref_id `10R13NwGw_eGfrd_`, on-ramp widget (merchant_id `U-FDw3yOEYkT06Im`), exchange widget (merchant_id `17hPNKintbYkms_z`) | Ask Ana for off-ramp F2C API keys | 2026-03-30 |
| Onramper | Awaiting API key | Embed aggregator widget once key received (email was sent previously) | 2026-03-23 |

---

## PENDING — External Approvals

- [2026-03-23] Onramper — Rigved Bhatt (rigs@onramper.com) scheduled call March 27, was a no-show. Then sent onboarding steps requiring $199/mo minimum subscription + KYB documents without prior discussion. Not pursuing at this stage — pricing too high for current volume. Revisit when membership grows.
- [2026-03-24] MoonPay — Partner application submitted. Declined without reason provided. Follow-up email sent requesting reconsideration (platform is non-custodial, no licensing requirements). No response received.
- [2026-03-24] Transak — Partner application submitted. Status unknown (may have been the one that declined). Follow-up sent, no response.
- [2026-03-25] Ramp Network — DECLINED for now. They responded (Faris Riaz, partner@ramp.network): require ~$1M/month volume to waive annual recurring fee. Not viable at current stage.
- [2026-03-25] Alchemy Pay — EVALUATE. Full on-ramp/off-ramp. 173 countries, 300+ payment methods. Widget embed supported. Volume-friendly pricing (0.5-2% per transaction). No $1M volume requirement. Ramp page: https://ramp.alchemypay.org/
- [2026-03-29] Guardarian — Application submitted (Widget integration, On-ramp + Off-ramp, Crypto industry). Awaiting response. No monthly fee expected — transaction-based pricing. guardarian.com
- [2026-03-29] Changelly — LIVE (2026-03-30). Affiliate account registered. Referral ID: m3ht8dcdorn4xrdg. Fiat on-ramp widget embedded on Buy Crypto page (merchant_id: U-FDw3yOEYkT06Im). Crypto-to-crypto exchange widget also embedded (merchant_id: 17hPNKintbYkms_z). Referral link: https://changelly.com/?from=btc&to=eth&amount=0.1&ref_id=10R13NwGw_eGfrd_ . Fiat off-ramp API — need to ask Ana (mschweizburg@changelly.com) for F2C API keys. changelly.com
- [2026-03-25] NOWPayments — IPN webhook LIVE (`/api/nowpayments/ipn`). IPN secret configured. Callback URL needs to be set in NOWPayments dashboard to `https://cryptoownbank.com/api/nowpayments/ipn`. On-ramp/off-ramp widget embed still pending evaluation. Pricing: 0.5% (no conversion) or 1% (with conversion). On-ramp: https://nowpayments.io/fiat-on-ramp | Off-ramp: https://nowpayments.io/off-ramp
- [2026-03-24] Stellar Development Foundation grant
- [2026-03-24] Ripple grant (Spring 2026 application window)
- [2026-03-24] XLS-65/66 XRPL validator activation (for native lending)
- [2026-03-26] Stellar Sponsored Fees — Stellar allows an account to pay transaction fees on behalf of another account. This could eliminate the onboarding friction where new members need XLM before they can do anything on Stellar. We could sponsor the tiny base fees (fractions of a cent) for new members so they can send their first RLUSD or USDC payment without owning any XLM. Low cost at scale, significant UX improvement for first-time Stellar users. Revisit when member volume on Stellar payments grows.
- [2026-03-26] Stellar Soroban DeFi — Soroban smart contracts are live on Stellar mainnet. DeFi protocols are starting to deploy (lending, AMMs, yield vaults). As the ecosystem matures, the portfolio tracker could read Soroban contract positions and show members their Stellar DeFi holdings alongside their XRPL vaults and other chain balances. Not urgent today (ecosystem is still small), but worth monitoring quarterly. If a major Stellar DeFi protocol gains traction, adding position tracking would reinforce the BYOW "one dashboard for everything" story.
- [2026-03-26] ~~LI.FI portal setup~~ — COMPLETED 2026-03-30. "CryptoOwnBank" integrator registered at portal.li.fi. EVM payout wallet configured. API key generated and stored as LIFI_API_KEY. Backend sends x-lifi-api-key header with all cross-chain swap requests. 1% fee parameter already in code. Fee collection is live.
- [2026-03-26] Squid Router fee setup — integrator ID already configured but no fee param in API calls yet. Check Squid partner dashboard to see if fee collection is available. Email Squid partnerships to enable integrator fee if not self-service.

---

## PENDING — Revisit When Legislation Passes

- [2026-03-24] **Stablecoin yield legislation (GENIUS Act / STABLE Act / Clarity Act)**: When it passes, review the actual language and decide:
  - Add jurisdiction disclaimer to yield-related pages (Soil Protocol vault, RWA Yields)
  - Evaluate whether geo-restriction is needed based on the actual law
  - Review any impact on RLUSD yield messaging
  - **Reason**: We decided to wait because the bill hasn't passed and the final language could look very different from what's being debated. Non-custodial positioning already gives strong standing.

---

## PENDING — Future Improvements

- ~~[2026-03-27] **Freighter Integration — In-Site Stellar Signing**~~ — COMPLETED 2026-03-27.
  - **Done**: `@stellar/freighter-api` + `@stellar/stellar-sdk` installed. `client/src/lib/freighter-connector.ts` built with `isFreighterInstalled`, `connectFreighter`, `buildAndSignOffer`, `buildAndSignPayment`, `buildAndSignChangeTrust`.
  - **Stellar DEX** (`stellar-dex.tsx`): Freighter connect banner. Trade dialog shows "Sign with Freighter" as primary option (signs in-browser). Success state shows tx hash with Stellar Explorer link. LOBSTR/StellarTerm/StellarX remain as fallback.
  - **Stellar Send** (`stellar-send.tsx`): "Sign & Send with Freighter" button as primary flow when connected. Success dialog shows tx hash. Manual/external wallet path preserved.
  - **Stellar DCA Execute Now** (`dca-orders.tsx`): Attempts Freighter signing when extension detected. Falls back to LOBSTR redirect if Freighter not installed.
  - **Stellar Token Manager** (`stellar-tokens.tsx`): "Sign with Freighter" as primary for add/remove trustline. External wallet links (LOBSTR, StellarTerm, Stellar URI) remain as fallback. Install Freighter tip shown when extension not detected.
  - **Coverage summary**: EVM (MetaMask/WalletConnect), XRPL (Xaman QR/deep link), Stellar (Freighter in-browser) — all three chains now sign in-site on desktop. Mobile fallback remains app deep links.
  - **Remaining**: Payment Queue (Stellar payments) — minor, can be done when queue is actively used.
- [2026-03-24] **Embedded on-ramp widget**: Currently all buy-crypto paths are outbound links. Once MoonPay or Transak approves, embed their widget so members can buy crypto without leaving CryptoOwnBank.
- [2026-03-24] **Telegram Mini-App**: A simplified version of the dashboard inside Telegram. Good for emerging markets (Nigeria, Philippines, Kenya). Available to ALL members, not restricted to any group. Worth exploring as a growth channel.
- [2026-03-24] **Backup domains**: cryptoownbank.com is the production domain. crypto-ledger--pawint.replit.app is the Replit domain (also serves production). Both serve the same deployed app. Buying a backup domain (.xyz, .io) is cheap insurance but not urgent since the Replit domain already works as a fallback.
- [2026-03-24] **Off-ramp / cash-out guide**: Buy Crypto page covers getting into crypto but doesn't guide users on converting back to fiat. Crypto Debit Cards partially fills this gap.
- [2026-03-24] **Ledger 4.0 platform update**: Review new features and update Buy Crypto / Crypto Debit Cards pages if new on-ramp providers or capabilities were added.
- [2026-03-24] **Archax tokenized securities section added to RWA Yields page**: Live assets: abrdn Lux MMF, State Street, Fidelity International, LGIM, Federated Hermes UCITS, UK Gilts. Coming Soon: UK Equities, US Equities. All on XRPL via Archax (FCA-regulated). Comparison table updated. Next step: integrate when Archax issuer addresses are available (trustline setup + DEX trading).
- ~~[2026-03-24] **Noah Cash-to-Stablecoin on-ramp (inside Ledger)**~~ — COMPLETED 2026-03-24. Added to all 16 Ledger entries on Buy Crypto page + FAQ entry.
- ~~[2026-03-24] **CL Card (Ledger Visa debit by Baanx)**~~ — COMPLETED 2026-03-24. Added to Crypto Debit Cards page as featured card with Ledger referral link + FAQ updated.
- [2026-03-23] **AI Portfolio Assistant**: GPT-4o-mini to start, upgrade to GPT-4o when needed. Pay-as-you-go pricing (~$0.01-$0.03 per conversation). Free = 0 AI chats, Premium = 50/month, Pro = unlimited. Must include "not financial advice" in every response. Need to sign up for OpenAI API key at platform.openai.com when ready.
- [2026-03-23] **Open Wallet Standard (OWS)**: Research noted — potential fit for future AI assistant (agent proposes, user approves on Ledger), Legacy Plan automated disbursement (policy engine), and adding new chains later. Not a replacement for Xaman or WalletConnect. Clone repo and experiment when ready.
- [2026-03-25] **Token Buckets — Requires Architecture Decision Before Building**:
  - **Status**: Code and DB tables preserved but hidden from UI. Not ready for users.
  - **Why hidden**: XRPL-only token selection doesn't deliver true diversified baskets. The feature name promises cross-asset-class diversification but the execution only works within ~40 XRPL DEX tokens.
  - **Smart contract approach (EVM)**: A Solidity contract on Polygon or Arbitrum could batch multiple swaps into one transaction (one signature instead of five). Thousands of tokens available. Gas is cheap on L2s. BUT: (1) We'd be deploying our own contract — users send funds to it, even as a pass-through. For a non-custodial platform, this creates a trust/messaging problem. (2) Requires professional security audit before launch — the contract handles real money. (3) Still doesn't solve automated recurring execution.
  - **Recurring DCA problem**: "Set and forget" DCA requires either: (a) Pre-approved ERC-20 spending allowance + keeper bot that triggers the contract on schedule — user must trust the keeper and contract, or (b) User shows up manually each run and clicks "Execute Now" then signs — defeats the purpose of automation. Neither option matches user expectations for what "DCA" means. On XRPL today, DCA is already a reminder system with manual execute — extending that to multi-token buckets means 5+ separate Xaman signatures per run (bad UX).
  - **Multi-chain orchestration problem**: A true bucket spanning XRPL + EVM + Stellar needs three different wallets, three different signing flows, three different swap engines in one "purchase." User would sign via Xaman, then MetaMask, then Freighter, all in sequence. If one fails mid-way, partial execution with no rollback.
  - **Conclusion**: Best version is a professionally audited batch-swap contract on a cheap EVM L2 (Polygon/Arbitrum), with manual "Execute Now" per run (one signature, all swaps). Cross-chain buckets are not practical without a unified wallet standard. This is an architecture + contract development project, not a frontend task.
  - **Files preserved**: `shared/xrpl-token-registry.ts`, `client/src/pages/token-buckets.tsx`, `server/routes.ts` (token-buckets section), `server/storage.ts` (CRUD methods), `shared/schema.ts` (token_buckets + token_bucket_items tables).
- [2026-03-25] **AI Agent + Smart Contract Execution (Watch List)**: Could an embedded AI autonomously execute token bucket purchases via smart contracts? Analysis: (1) The custody dealbreaker — AI needs to sign transactions, but non-custodial means user holds keys. AI can build/prepare transactions but user still signs via Xaman/MetaMask/hardware wallet. Doesn't eliminate the signing bottleneck. (2) Session keys / ERC-4337 account abstraction — closest real solution. User creates a smart contract wallet, grants AI a "session key" with spending limits. AI executes within those limits without per-trade approval. Exists on EVM chains today but adoption is early, requires users to migrate from regular wallets. (3) XRPL has no account abstraction — every transaction needs direct signature. Until XRPL adds hooks or equivalent, autonomous execution on XRPL isn't possible. (4) Trust/liability — AI autonomously spending user funds contradicts "non-custodial, not financial advice." Who's liable for bad execution? Timeline: Now = not viable. 6-12 months = possible on EVM with smart contract wallets. 1-2 years = possible cross-chain if XRPL adds hooks + Open Wallet Standard matures. Watch: Coinbase AgentKit, Circle agent framework, MoonPay Agents, ERC-4337 adoption, XRPL Hooks amendment progress.
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

- [2026-03-23] Legacy Plan — UPGRADED (2026-03-24): wallet-specific templates (16 wallet types: Ledger, CypheRock, Trezor, ELLIPAL, Tangem, Coldcard, Keystone, BitBox, Xaman, MetaMask, Trust, Phantom, Exodus, Coinbase Wallet, exchange accounts, other), pre-fill from connected wallets, client-side AES-256-GCM encrypted vault, standalone /decrypt page for survivors. Still needs user testing.
- ~~[2026-03-23] Earn & Accumulate~~ — TESTED by user (Soil RLUSD vaults verified)
- [2026-03-23] Cross-Chain Swap
- [2026-03-23] XRPL Bridge
- [2026-03-23] Recurring Payments
- [2026-03-23] Invoices
- [2026-03-25] ~~Token Buckets~~ — HIDDEN from UI (2026-03-25). Code and DB tables preserved. Needs cross-chain execution (XRPL + EVM + Stellar) before launch. See PENDING below.
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

## DO NOT CHANGE — Critical Code That Works (Added 2026-03-29)

**XRPL OfferCreate flags — verified against live order book 2026-03-29. Do NOT change without running the test simulation first.**

XRPL flag reference: `tfPassive`=0x00010000, `tfImmediateOrCancel`=0x00020000, `tfFillOrKill`=0x00040000, `tfSell`=0x00080000

| File | Context | Flag | Actual XRPL Meaning | Notes |
|------|---------|------|---------------------|-------|
| `dca-orders.tsx` | DCA Execute Now | `0x00080000` | tfSell | Sells all TakerGets, gets as much as possible. Correct for DCA — maximizes fill. |
| `ownbank-dex.tsx` | Quick swap | `0x00040000` | tfFillOrKill | Market swap. Works because bid depth is typically deep enough. |
| `ownbank-dex.tsx` | Limit GTC | `0` (no flag) | Standard offer | Sits on book until filled. |
| `ownbank-dex.tsx` | Limit FOK | `0x00040000` | tfFillOrKill | Correct. |
| `ownbank-dex.tsx` | Limit IOC | `0x00080000` | tfSell (NOT tfImmediateOrCancel) | Known mismatch — labeled IOC but behaves as tfSell. Has not caused user issues. Real IOC would be 0x00020000. |

**Debugging `tecKILLED`**: Usually means tfFillOrKill couldn't fill the full amount. Check order book depth on BOTH sides. The XRPL matches your offer against the OPPOSITE side of the book. Test with the simulation script before changing any flags.

---

## COMPLETED

- [2026-03-24] Noah Cash-to-Stablecoin on-ramp added to all 16 Ledger entries on Buy Crypto page (bank transfer USD/EUR to instant USDC/USDT, no credit card needed) + FAQ entry added
- [2026-03-24] CL Card (Ledger Visa debit by Baanx) added to Crypto Debit Cards page as featured card — 1% cashback in BTC/USDC/USDT, Apple/Google Pay, hardware wallet security — uses Ledger referral link. FAQ updated to mention CL Card.
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
- [2026-03-26] Multi-language i18n wired into landing page: 7 languages (English, Spanish, Portuguese, French, Turkish, Hindi, Mandarin). Language switcher component in nav header. Sections translated: hero, spotlight (legacy/banking/yield), break-the-loop, nav links, beta banner, tagline/motto. Browser auto-detection with zustand persist. Files: `client/src/i18n/` (en/es/pt/fr/tr/hi/zh.ts, store.ts, index.ts), `client/src/components/language-switcher.tsx`.
- [2026-03-24] Legacy Plan upgraded: wallet-specific templates for 16 wallet types (cold: Ledger, CypheRock, Trezor, ELLIPAL, Tangem, Coldcard, Keystone, BitBox; hot: Xaman, MetaMask, Trust, Phantom, Exodus, Coinbase Wallet; exchange: any custodial exchange; other). Pre-fill from connected wallets. Client-side AES-256-GCM encrypted vault. Standalone /decrypt page for survivors. Schema: `hardwareDevice` on wallets, `encryptedVault`+`encryptedVaultHint`+`walletAssetSummary` on legacy_beneficiaries.
- [2026-03-24] Edit Beneficiary UI built: pencil icon on each BeneficiaryCard opens 3-step dialog pre-filled with existing data (name, email, relationship, wallet type, device/seed instructions, template fields parsed from additionalNotes, encrypted vault, asset summary, split pieces). Uses existing PATCH `/api/legacy-beneficiaries/:id` endpoint. Proper useEffect initialization, form reset on close.
- [2026-03-25] Token Buckets feature built: schema (token_buckets + token_bucket_items tables), storage CRUD, 6 curated buckets (Top 5 L1, DeFi, AI, L2, Gaming, Blue Chip), portfolio category analysis endpoint, pre-flight wallet readiness checker (trustline detection, XRP reserve calculator, per-token readiness), create/edit/delete custom buckets, allocation % validation (must sum to 100%), per-run cost estimate, DCA frequency settings. Backend hardened: input validation/sanitization, field whitelisting on PATCH (no userId overwrite). Sidebar entry under OwnBank.
- [2026-03-25] DCA auto-push to Xaman: When a DCA order is due, the server now fetches the XRPL order book price, builds an OfferCreate with 3% slippage tolerance and tfImmediateOrCancel, and pushes a signing request to the user's Xaman app. Payload result checker runs every 15min to confirm signed/rejected/expired. Scheduler: due orders checked every 30min (offset 5min), payloads every 15min (offset 10min). New statuses: pushed, rejected, expired. Frontend updated with Bell icon for "Sent to Xaman" badge. Manual "Execute Now" still available as fallback. Storage: added getPendingDcaExecutions(). Files: `server/services/payment-scheduler.ts`, `server/storage.ts`, `client/src/pages/dca-orders.tsx`.
- [2026-03-26] Payment SEO + Payments Hub: Added SeoHead to `ownbank-send.tsx`, `ownbank-invoices.tsx`, `recurring-payments.tsx`, `payment-queue.tsx`. Improved `stellar-invoices.tsx` SeoHead copy. Built `/payments` Payments Hub page (outcome-based: Send Money, Get Paid, Invoice a Client, Auto-Pay, Send Money Home, Pay Your Team). Each card routes to correct XRPL/Stellar tool. Added to sidebar under OwnBank and App.tsx routing. Trust points footer (non-custodial, 4s settlement, near-zero fees, 190+ countries).
- [pre-2026-03-23] Buy Crypto page with 17 tokens, 11 wallets, 9 on-ramp providers, P2P section (NoOnes, ByBarter, Narfex), emerging market ramps (Onramp.money, Digitap), Telegram Wallet, FAQ
