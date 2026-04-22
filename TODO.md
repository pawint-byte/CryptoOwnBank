# CryptoOwnBank — To-Do List & Decision Log

**Last updated: 2026-04-22 by main agent (Stellar DCA v2 rebuilt on SEP-0007 `web+stellar:tx?xdr=...&callback=...` deep links — server builds pathPaymentStrictSend XDR with 1.5% slippage via Horizon strictSendPaths, checks trustline + funding pre-flight, returns deep link + token. LOBSTR opens, user signs, LOBSTR POSTs signed XDR to `/api/stellar/dca-callback`, server submits to Horizon and records execution. Frontend polls `/check-execution` every 3s for 5min. Re-enabled sidebar entry, restored `/stellar/dca` routes to DcaOrders, removed startup auto-pause task, bumped sw.js cache to cob-v4. ⚠️ HARD GATE: Must verify end-to-end on a funded test Stellar wallet (iPhone Safari → LOBSTR → callback → execution row in DB) before user trusts it. Do NOT promote to "working" without that test.)**

**This file is the official memory for pending items, decisions made, and things to revisit. Every session MUST read this file and update it when items are completed or new ones are added. Update the "Last updated" line above with the current date every time you make changes. Every entry MUST include the date it was added. Completed items MUST include the date completed.**

---

## 🚨 THE TWO-FILTER RULE — APPLY BEFORE SUGGESTING OR BUILDING ANYTHING (Added 2026-04-22)

**The user's stated principle, confirmed multiple times. Every feature, every suggestion, every "we could add X" must pass both filters in this order BEFORE you propose it, BEFORE you start building, and BEFORE you ask the user to test it.**

### Filter 1 — Does it make sense for the site?
- **Regulatory:** Does this expose us as an unlicensed money transmitter, broker-dealer, investment adviser, MSB, or custodian? If unsure, don't propose it.
- **Compliance:** KYC/AML, sanctions (OFAC), tax-reporting obligations, securities classification of any token, jurisdiction restrictions. If it triggers any of these without us being prepared, cut it.
- **Custody model:** CryptoOwnBank is **strictly non-custodial**. Anything that requires us to hold, encrypt, store, or be able to access user private keys breaks the core promise and the regulatory shield. Reject by default.
- **Liability:** If a feature can be reasonably interpreted as financial advice, a recommendation to buy/sell, or a guarantee of yield, cut it or restructure it as informational with disclaimers.

### Filter 2 — Does it actually work end-to-end?
- **End-to-end means:** user starts the action → the action completes successfully → the result is visible/usable → on the device(s) we claim to support (desktop browser, iOS PWA, Android PWA).
- **A reminder is not the feature.** A scheduled prompt that requires the user to manually do the trade in another app is NOT "DCA," it's a reminder. Don't ship it as DCA.
- **A deep-link is not the feature.** If we link to an external app/URL, it must actually load and complete the intended task. Test the URL before shipping.
- **Cached PWA caveat:** "It works after publish + force-refresh" is not the same as "it works." Account for cache lag in QA.
- **If a feature works on desktop but not mobile (or vice versa) and we promote it as cross-platform, it fails this filter** until we either fix it or explicitly label the gap.

### What this means for the agent's behavior:
1. **Do not pitch features to the user.** The user is not looking for ideas to test — they want a product that works. Only suggest building something when both filters are clearly green.
2. **When in doubt, ask "does this pass both filters?" — if no, propose cutting/hiding it instead of building more.**
3. **Audit existing features through these filters before suggesting enhancements to them.** If a feature fails Filter 2, the right move is usually to hide/disable it until it works, not to add a workaround that papers over the gap.
4. **Capability honesty in the UI:** when a feature has limitations (semi-automated, desktop-only, requires external app), surface that **at the moment the user is creating/configuring the feature**, not at the moment of execution.
5. **Stop asking the user to test things to find out if they work.** That's the agent's job during build. The user tests for fit-to-purpose, not for "did the basics work."

### Live decisions from 2026-04-22 applying these filters:
- **Stellar DCA — FAILS Filter 2.** XRPL DCA works hands-off via Xaman push payloads. No major Stellar wallet (LOBSTR, Freighter, Solar) supports equivalent background signing today. The "DCA" we shipped is a manual-trade-with-checklist, not real DCA. **Action: hide Stellar DCA from sidebar, disable create flow, auto-pause existing Stellar DCA orders with explanatory note. Re-enable only when SEP-0007 prepared-XDR signing OR WalletConnect-with-LOBSTR background signing is built and proven.** (Stellar balance tracking and Stellar DEX page remain — they pass both filters.)
- **HYPE / non-EVM tradeable badge — PASSES both filters as informational.** We don't claim to swap it; we route the user to a CEX with clear instructions and bring them back to track the wallet. Honest scope.

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
- [ ] **Doppler XRP Vault** — Verify vault card displays correctly, "Deposit via Doppler" button opens external app, docs/Xaman links work
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
- [x] **Buy Crypto** — DONE (2026-04-01). Changelly fiat on-ramp tested end-to-end: selected XRP, entered $500, Changelly routed through MoonPay, paid with USAA Visa, 100.319 XRP received in Xaman wallet. Notes: Uphold prepaid Visa was rejected (use a bank-issued card); MoonPay blocks some regions on the web but works through partner integrations (Xaman, Ledger Live, Changelly widget). Wallet address pre-fill feature added. FAQ updated with Changelly entry.
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
- [2026-03-24] MoonPay — Partner application submitted. Declined without reason provided. Follow-up email sent requesting reconsideration (platform is non-custodial, no licensing requirements). No response received. **STRATEGY (2026-04-01): If MoonPay reconsiders, ADD their widget alongside Changelly — do NOT replace Changelly.** Reason: (1) Changelly is already live and earning referral commissions. (2) MoonPay merchant API would add a second revenue layer — we'd earn Changelly's referral cut AND MoonPay's partner commission on their respective widgets. (3) Two providers = wider regional coverage and card issuer compatibility. (4) Redundancy if one provider has downtime or changes terms. Note: Changelly currently routes some transactions through MoonPay anyway, but users need a MoonPay account to complete. A direct MoonPay widget would let us earn on that layer too.
- [2026-03-24] Transak — Partner application submitted. Status unknown (may have been the one that declined). Follow-up sent, no response.
- [2026-03-25] Ramp Network — DECLINED for now. They responded (Faris Riaz, partner@ramp.network): require ~$1M/month volume to waive annual recurring fee. Not viable at current stage.
- [2026-03-25] Alchemy Pay — EVALUATE. Full on-ramp/off-ramp. 173 countries, 300+ payment methods. Widget embed supported. Volume-friendly pricing (0.5-2% per transaction). No $1M volume requirement. Ramp page: https://ramp.alchemypay.org/
- [2026-03-29] Guardarian — Application submitted (Widget integration, On-ramp + Off-ramp, Crypto industry). Awaiting response. No monthly fee expected — transaction-based pricing. guardarian.com
- [2026-03-29] Changelly — LIVE (2026-03-30). Affiliate account registered. Referral ID: m3ht8dcdorn4xrdg. Fiat on-ramp widget embedded on Buy Crypto page (merchant_id: U-FDw3yOEYkT06Im). Crypto-to-crypto exchange widget also embedded (merchant_id: 17hPNKintbYkms_z). Referral link: https://changelly.com/?from=btc&to=eth&amount=0.1&ref_id=10R13NwGw_eGfrd_ . Fiat off-ramp API — need to ask Ana (mschweizburg@changelly.com) for F2C API keys. changelly.com
- [2026-03-25] NOWPayments — IPN webhook LIVE (`/api/nowpayments/ipn`). IPN secret configured. Callback URL set to `https://cryptoownbank.com/api/nowpayments/ipn`. Crypto payment processing for subscriptions is working. **On-ramp/off-ramp status (2026-04-06):** NOWPayments dashboard offers two fiat on-ramp providers: (1) Guardarian — 140+ countries, excludes US/Canada, KYC+KYB required, can activate directly; (2) Banxa — 200+ countries incl. some US states, KYC+KYB required, requires "Activate Custody first" which may conflict with our non-custodial model. **DECISION: HOLD** — not activating either through NOWPayments at this time. Changelly is already live for fiat on-ramp. We also applied directly to Guardarian (see separate entry) which would give better terms than going through NOWPayments as middleman. Revisit if Guardarian direct application is declined.
- [2026-03-24] ~~Stellar Development Foundation grant~~ — DECLINED (2026-04-06). Stellar Community Fund responded: "your project proposal does not meet the requirements for the Stellar Community Fund Build Award." No project-specific feedback provided. Suggested reviewing SCF Handbook and Ambassador Program. Not pursuing further at this time.
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

## PENDING — Future Improvements (Ordered by Priority / Dependencies)

### Platform Philosophy — How to Evaluate New Information (Decided 2026-04-01)
- **CryptoOwnBank is an information and access layer, not a product vendor.** The site detects what's on-chain, displays it clearly, and surfaces relevant opportunities to members based on what they hold.
- **When reviewing articles or industry news, the filter is:** "Does this create on-chain data our site can detect, display, or use to inform members?" If yes, find the nugget — even if the whole article isn't relevant, one small actionable insight is worth it.
- **What we DO:** Show members what's happening in their ecosystem. Surface yields, new tokenized assets, market movements, and opportunities that match their holdings. Provide context and access so they can make informed decisions.
- **What we DON'T DO:** Become a vendor, broker, or service provider for things outside our lane (mortgages, real estate sales, insurance products, etc.). We point to these opportunities and let members act on them through the right channels.
- **The power is in context:** "Based on what you hold, here's what's happening that might matter to you." The AI Assistant, Recommendations Hub, RWA Yields, personalized Crypto News, and Statement Insights already do this. Every new feature should strengthen this loop.
- **When something gets tokenized on XRPL/Stellar/EVM:** The portfolio tracker picks it up automatically via trustlines and token balances. No custom integration needed per asset — the infrastructure is already built for this.

### Wallet & Provider Integration Strategy (Decided 2026-04-01)
- **EVM wallets**: DONE. WalletConnect v2 covers hundreds of wallets automatically. Set once, works forever.
- **XRPL wallets**: DONE. Xaman deep link signing is primary. Adding a new XRPL wallet = just add its deep link pattern (minimal effort).
- **Stellar wallets**: DONE. Freighter in-browser signing is primary. LOBSTR/StellarTerm as fallback deep links.
- **On-ramp / Off-ramp providers**: Target 2-3 providers max for broadest coverage:
  1. **Changelly** — On-ramp LIVE (merchant_id `U-FDw3yOEYkT06Im`). Off-ramp pending F2C API keys from Ana (mschweizburg@changelly.com).
  2. **Oobit** — Email sent 2026-04-01 to wallets@oobit.com. Plug & Pay widget (spending) + wallet-to-bank off-ramp. Supports XRP + XLM natively. MiCA licensed. ~1% fees. 180+ countries.
  3. **Third slot open** — Evaluate Transak, Guardarian, or Bitget Wallet Payments based on which responds with best API access + coverage.
- **Bitget Wallet (Watch)**: 90M+ users, XRPL native integration announced 2026-03-31. Wallet connection works via WalletConnect (already supported). Wallet Pay + swap APIs available but overlap with existing 1inch/LI.FI. Better as a user acquisition partner ("yield home for Bitget XRPL users") than a technical integration. Reach out to partnerships when ready.
- **Core principle**: Capture chain + wallet address before launching any signing app. Poll the blockchain for confirmation. The wallet app is just a signing tool — our site doesn't care which one was used.

### Tier 1 — Can Build Now (no external blockers)
- [2026-03-24] **Off-ramp / cash-out guide**: Build when at least one off-ramp provider (Oobit or Changelly F2C) is integrated. Until then, no point building a guide page with no working flow.
- [2026-03-24] **Squid Router fee setup**: Integrator ID configured, fees set on Squid's side (no public API param). Low-priority — bridge volume is small vs 1inch/LI.FI revenue. Park unless Squid contacts us.
- ~~[2026-03-23] **GitHub push**~~ — DONE. User pushes regularly from Shell tab via Git credentials.

### Tier 2 — Build Soon (no blockers, medium effort)
- ~~[2026-04-14] **Doppler Finance XRP Vault Integration**~~ — DONE 2026-04-15. Full integration: vault cards (purple theme, ~3.2% APR, 7-day withdrawal, custody note), 2 FAQ entries, landing page updated, sidebar/page title "Yield Vaults". Position sync via Doppler Partner API (`POST /api/doppler/sync`, `GET /api/positions/doppler`). Sync persists deposit date + earnings in userDataStore. Requires `DOPPLER_API_KEY` secret. Known vault addresses: Deposit `rEPQxsSVER2r4HeVR4APrVCB45K68rqgp2`, Treasury `rprFy94qJB5riJpMmnPDp3ttmVKfcrFiuq`, Withdrawal `rGuVpUBfprkb1cmKFGbL8c48fQWT3xEwyZ`.
- [2026-04-09] **Uphold API Integration (read-only)**: Connect Uphold accounts via OAuth2 to pull balances into portfolio tracker. Users could view Uphold holdings alongside cold wallet and exchange balances in one dashboard. Uphold API: `GET /v0/me/cards` returns all asset balances. **Prerequisite:** Register at Uphold developer portal, get client ID + secret, wait for approval. Once credentials are available, coding is ~2-3 hours. Future phase: write access for initiating transfers from Uphold to cold wallets (bidirectional flow).
- [2026-04-01] **Manual Private Asset Tracker (Phase 1 of Tokenized Equity Vault)**: Add manual private asset entries to the portfolio — name, quantity, cost basis, estimated value, liquidity event date, notes. Shows in portfolio total and Legacy Plan. Immediately useful for Forge/Ripple position and any other pre-IPO holdings. **This is the foundation that Phase 2 and 3 below build on.**
- [2026-03-24] **Embedded on-ramp widget**: Once MoonPay, Transak, or Guardarian approves, embed their widget so members can buy crypto without leaving CryptoOwnBank. Changelly widget already live.
- [2026-03-24] **Ledger 4.0 platform update**: Review new features and update Buy Crypto / Crypto Debit Cards pages if new on-ramp providers or capabilities were added.
- [2026-03-24] **Backup domains**: cryptoownbank.com + crypto-ledger--pawint.replit.app both serve production. Buying a backup domain (.xyz, .io) is cheap insurance but not urgent.

### Tier 3 — Blocked by External Events (monitor, build when unblocked)
- [2026-04-01] **Auto-Detect Tokenized RWA Securities (Phase 2 of Tokenized Equity Vault)**: Scan XRPL trustlines for known RWA security tokens (Archax, Zoniqx, OpenEden). We already scan trustlines for the token manager — extend to flag recognized security tokens with issuer metadata. **Depends on**: Phase 1 (manual tracker) built first. **Blocked by**: Archax issuer addresses becoming publicly available for trustline setup + DEX trading.
- [2026-04-01] **Full Tokenized Private Equity Vault (Phase 3 — Pro Tier)**: Full cockpit with live NAV, dividend tracking, secondary-sale simulator, XLS-66 collateral pairing, Legacy Plan integration. **Depends on**: Phase 1 + Phase 2 built. **Blocked by**: Issuers actually tokenizing private equity on-chain (Forge/Ripple, or others). No standardized metadata API exists yet.
  - **"Eat your own dog food" thesis**: The first crypto company to tokenize their own pre-IPO equity on their own ledger wins massive credibility. CryptoOwnBank should be the dashboard ready when that happens.
  - **Tier gating**: Free = basic visibility. Premium = valuation + alerts. Pro = full cockpit (tax basis, simulator, liquidity events, dividend tracking).
- [2026-03-24] **Archax tokenized securities on RWA Yields page**: Live assets listed (abrdn Lux MMF, State Street, etc.). Next step: integrate when Archax issuer addresses are available (trustline setup + DEX trading). **Feeds into Phase 2 above.**
- [2026-03-23] **Borrow Against Vaults**: Interface-only dashboard to external lending protocols. NOT the lender. **Blocked by**: XLS-65/66 activation on XRPL.
- [2026-03-25] **Token Buckets — Requires Architecture Decision Before Building**:
  - **Status**: Code and DB tables preserved but hidden from UI. Not ready for users.
  - **Why hidden**: XRPL-only token selection doesn't deliver true diversified baskets.
  - **Best path**: Professionally audited batch-swap contract on a cheap EVM L2 (Polygon/Arbitrum), with manual "Execute Now" per run (one signature, all swaps). Cross-chain buckets not practical without unified wallet standard.
  - **Blocked by**: Smart contract development + security audit. Architecture + contract project, not a frontend task.
  - **Files preserved**: `shared/xrpl-token-registry.ts`, `client/src/pages/token-buckets.tsx`, `server/routes.ts` (token-buckets section), `server/storage.ts` (CRUD methods), `shared/schema.ts` (tables).

### Tier 4 — Watch List (not viable yet, monitor quarterly)
- [2026-03-25] **AI Agent + Smart Contract Execution**: Autonomous AI executing token bucket purchases. Not viable now — non-custodial means user holds keys, XRPL has no account abstraction. Possible on EVM with session keys (ERC-4337) in 6-12 months. Watch: Coinbase AgentKit, Circle agent framework, MoonPay Agents, XRPL Hooks amendment.
- [2026-03-23] **Open Wallet Standard (OWS)**: Potential fit for AI assistant (agent proposes, user approves on Ledger), Legacy Plan automated disbursement, adding new chains. Not a replacement for Xaman/WalletConnect. Experiment when ready.
- [2026-03-24] **Telegram Mini-App**: Simplified dashboard inside Telegram for emerging markets. Good growth channel but significant build effort. Worth exploring when membership grows.
- [2026-03-23] **MoonPay Agents / x402 protocol**: Watch for B2B and AI agent features. Explore when MoonPay approves our application.
- [2026-03-26] **Stellar Sponsored Fees**: Sponsor tiny base fees for new Stellar members so they can send RLUSD/USDC without owning XLM. Low cost at scale. Revisit when Stellar payment volume grows.
- [2026-04-18] ~~**Stellar Soroban DeFi**: Soroban smart contracts live but ecosystem is small. Monitor quarterly.~~ COMPLETED 2026-04-18. Blend Capital integration shipped. Phase 1 read-only positions live: POST /api/blend/sync + GET /api/positions/blend using @blend-capital/blend-sdk against Soroban RPC. BLEND_VAULTS config in xrpl-client.ts. Blend section card in ownbank-vaults.tsx (uses stellarAddress from useStellarStore). Default pool: Fixed XLM Pool V2 (CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD). Note: corrected 2026-04-20 — earlier address was wrong contract. Pools configurable via BLEND_POOLS_JSON env var. STELLAR_ASSET_REGISTRY maps SAC contract → symbol (XLM, USDC). Position symbol format: {ASSET}-BLEND-{POOLKEY}. Phase 2 (APY comparison view across Soil/Doppler/Blend) and Phase 3 (Freighter signing for deposit/withdraw) pending.
- [2026-04-01] **XRPL Token Escrow for Legacy Plan**: XRPL now supports time-based escrow for all issued tokens (not just XRP). Potential Legacy Plan enhancement — tokenized assets could be escrowed for beneficiaries with time-release conditions. Watch for mature tooling/libraries before building.

### Completed
- ~~[2026-04-03] **DEX Direct Swap Fallback for EVM Swap**~~ — COMPLETED 2026-04-03. When 1inch has no liquidity (micro-cap tokens), EVM Swap now automatically falls back to Uniswap V2 (Ethereum/Base), PancakeSwap V2 (BSC), QuickSwap (Polygon), SushiSwap (Arbitrum/Optimism), or TraderJoe (Avalanche). Seamless experience — member never leaves the site. Backend: `/api/evm/dex-quote`, `/api/evm/dex-swap`. Frontend auto-fallback with approval + swap via DEX router contracts.
- ~~[2026-03-27] **Freighter Integration — In-Site Stellar Signing**~~ — COMPLETED 2026-03-27. EVM (MetaMask/WalletConnect), XRPL (Xaman QR/deep link), Stellar (Freighter in-browser) — all three chains now sign in-site on desktop.
- ~~[2026-03-24] **Noah Cash-to-Stablecoin on-ramp (inside Ledger)**~~ — COMPLETED 2026-03-24.
- ~~[2026-03-24] **CL Card (Ledger Visa debit by Baanx)**~~ — COMPLETED 2026-03-24.
- ~~[2026-03-23] **AI Portfolio Assistant**~~ — COMPLETED 2026-04-01. GPT-4o-mini, Free=0/Premium=50/Pro=unlimited chats per month. Page: `/ai-assistant`.

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

- [2026-04-21] Legacy Plan v2 — three new safety features end-to-end:
  1. **Survivability Export** — `/api/legacy-plan/export` produces a self-contained, printable HTML file with every beneficiary, fallback, encrypted vault, and plan settings. Annual reminder email auto-sent by scheduler when `lastExportedAt` > 365 days. New "Survivability Export" card on dashboard with overdue warning.
  2. **Fallback recipients per beneficiary** — `fallbackRecipients` jsonb (max 5 {name,email}). When a beneficiary lapses ack window or is marked deceased, scheduler routes the packet to fallbacks FIRST, before any group per-capita redistribution. Editor in beneficiary form Step 1.
  3. **Secondary-contact early-trigger w/ 30-day veto** — verify-contact now mints `earlyTriggerRequestToken` and emails secondary their personal request URL. They can submit a request with notes; owner gets a veto email; if no veto in `earlyTriggerVetoDays` (default 30), scheduler auto-fires grace→trigger. Veto link doubles as a check-in (resets dead-man switch). Big red banner on owner dashboard with countdown + check-in button.
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
