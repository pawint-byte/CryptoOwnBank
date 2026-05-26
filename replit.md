# CryptoOwnBank

CryptoOwnBank is a multi-chain crypto platform offering portfolio tracking, non-custodial XRPL yield vaults, Stellar payment tools, RWA yield discovery, Legacy Plan, DEX trading, DCA orders, and cross-chain swaps.

## Run & Operate

**Environment Variables:**
- `FRED_API_KEY`: For real estate housing data.
- `ONEINCH_API_KEY`: For EVM DEX swaps.
- `OPENAI_API_KEY`: For AI Portfolio Assistant.
- `SESSION_SECRET`: For Express sessions.
- `STRIPE_SECRET_KEY`: For payment processing.
- `XUMM_API_SECRET`: For XRPL wallet signing.

**Commands:**
- Scripts should be run against the LOCAL DB.
- GitHub pushes from the editor may time out; use the Shell tab for manual pushes.

## Stack

**Frontend:**
- **Frameworks**: React 18 (TypeScript), shadcn/ui (on Radix UI), Tailwind CSS.
- **State Management**: TanStack React Query (server state), Zustand (local/XRPL state).
- **Routing**: wouter.

**Backend:**
- **Runtime**: Node.js with Express and TypeScript.

**Database:**
- PostgreSQL with Drizzle ORM.

**External Libraries:**
- xrpl.js, Xumm SDK, ethers.js v6, 1inch API, LI.FI, Squid Router, CoinGecko, DefiLlama, Resend email, OpenAI.

## Where things live

- **API Endpoints**: `server/routes.ts`
- **Database CRUD**: `server/storage.ts`
- **Drizzle ORM Schema**: `shared/schema.ts`
- **XRPL State Management**: `client/src/lib/xrpl-store.ts`
- **Financial Calculations & Normalization**: `shared/financial-math.ts`
- **Soil Vault Page**: `client/src/pages/ownbank-vaults.tsx`
- **Tax Reports**: `client/src/pages/tax-reports.tsx`
- **Roadmap Page**: `/roadmap` (public)
- **Principles Page**: `/principles` (public)
- **Pricing Page**: `/pricing` (public) — dedicated page rendering Free/Premium/Pro plan cards + Legacy Plan SKU tiles + "charge for tools, not assets" rationale. Shared feature arrays live in `client/src/lib/pricing-data.ts` (single source of truth for both the landing in-page section and this page). Linked from the sidebar footer area for logged-in members.
- **Sovereignty Page**: `/sovereignty` (public) — the "Be Your Own Bank — Now and Forever" educational page explaining seed-phrase universality, the self-custody vs. exchange distinction, seed storage options, the annual sovereignty drill, and AGPL-3.0 self-hostability
- **Wealth Architecture Page**: `/sovereignty/wealth-architecture` (public) — six-stage architecture map (Secured → Documented → Continuous → Productive → Liquid Without Selling → Tested) applying the buy-borrow-don't-sell-pass-the-seat playbook to self-custodied crypto. Includes an opt-in self-assessment checklist with a "handled outside CryptoOwnBank" status per stage. State stored client-side only in localStorage under key `wealth-architecture-status-v1` — no server tracking, no emails, no nudges. Entity-neutral vocabulary (holdings/successors/seat, not family/heirs/estate). Linked from the sidebar "BACK UP & RECOVER" group next to Sovereignty.
- **Stripe Crypto Onramp**: `server/stripe-onramp.ts` (REST API wrapper) + `client/src/lib/stripe-onramp.ts` (chain→currency/network mapping). Endpoint `POST /api/stripe/onramp-session` mints a session with `wallet_address` pre-filled and `lock_wallet_address: true`, returns `redirect_url` (https://crypto.link.com/...). Wired into `/wallet/create` done step as per-chain "Buy with card" buttons. Stripe-supported chains only: EVM (ETH/USDC/POL/AVAX on ethereum/base/polygon/avalanche), BTC, SOL+USDC on solana, XLM+USDC on stellar. XRP/ATOM/TRX/LTC/DOGE/BCH not yet supported by Stripe. Only `STRIPE_SECRET_KEY` is needed — no publishable key (Path 2 is server-side session minting, not embedded JS).
- **Sovereignty Recovery Kit Page**: `/sovereignty-kit` (authenticated, all tiers) — generates a printable HTML kit with the member's public addresses grouped by chain, per-chain restore guidance, storage advice, annual drill checklist. Backed by `GET /api/sovereignty-kit/export` and the shared helper `server/sovereignty-kit-html.ts` (`buildSovereigntyKitContent({ wallets, audience })`). The same helper is invoked by `GET /api/legacy-plan/export` with `audience: "survivor"` to bundle the kit content as an appendix in the Legacy Plan export — survivors get one complete document instead of two.
- **Whisper Viewer Page**: `/v/:token` (public)
- **Whisper Management Page**: `/whispers` (authenticated)
- **License File**: `LICENSE` (repo root)
- **Official To-Do List & Decision Log**: `TODO.md`
- **Session History**: `session-logs/`

## Architecture decisions

- **Non-custodial by design**: The platform never holds user funds, ensuring no government can subpoena balances.
- **Transaction Freedom**: No gatekeeping on who users can transact with.
- **Fungibility**: No "taint scoring" or integration with coin-history analysis tools (e.g., Chainalysis).
- **AGPL-3.0 License**: Ensures modified copies of the software must publish their changes, protecting the project's mission.
- **Member-Voted Roadmap**: Community-driven feature prioritization with clear status updates and a 30-day team response promise.
- **Whisper Sharing (Tier 1)**: Token-based, revocable, and granular sharing of a single asset's public view, designed for viral growth without PII leakage.
- **Legacy Plan v2 Verification Capsule**: Implemented a secure, non-custodial passphrase verification mechanism for beneficiaries, enhancing security and trust.
- **Legacy Plan v2 Last-Resort Fallback**: A multi-stage, secure fallback mechanism for beneficiaries to access funds if the owner becomes unresponsive, with safeguards against premature release and an audit trail.

## Product

- **Portfolio Tracker**: Comprehensive tracking of crypto, stocks, real estate, off-chain, and bank/brokerage holdings.
- **Non-custodial XRPL Yield Vaults**: Integration with Soil Protocol for yield generation.
- **Stellar Payment Tools**: Features for managing Stellar transactions.
- **RWA Yield Discovery**: Tools for finding yield opportunities in Real World Assets.
- **Legacy Plan**: A robust system for designating beneficiaries and ensuring asset transfer in unforeseen circumstances, including passphrase verification and last-resort fallback mechanisms.
- **DEX Trading & Swaps**: EVM swaps via 1inch, cross-chain swaps via LI.FI/Squid Router.
- **DCA Orders**: Dollar-Cost Averaging order functionality.
- **Tax Harvest AI**: Scans positions for tax-loss harvesting opportunities (Premium/Pro feature).
- **Whisper Sharing**: Public, no-login links for sharing specific asset positions to drive sign-ups.
- **Freemium Tiers**: Free, Premium, and Pro tiers with varying feature sets.
- **Member-Voted Roadmap**: Public roadmap where members can vote on future features.
- **Network Health & Growth Tracker**: Asset-agnostic dashboard measuring blockchain health metrics, explicitly avoiding price predictions.

## User preferences

Preferred communication style: Simple, everyday language. No technical jargon.

## Gotchas

- **Production DB**: `executeSql` with `environment: "production"` is read-only. Writes require API endpoints.
- **Price Cache**: The column for price in `price_cache` table is `price_usd` (Drizzle field: `priceUsd`), not `price`.
- **Yahoo Finance Import**: Symbol normalizer in `shared/financial-math.ts` strips `$` prefix and trailing 4+ digit suffixes for price matching, addressing issues like `$ADS`, `ALI16876`, `APT21794`.
- **Soil Vault Data**: Vault deposits are accurately sourced from the backend positions table, not local storage. Interest is calculated per-deposit.
- **Legacy Plan Billing**: Three mutually exclusive SKUs; purchasing one blocks others until canceled. Crypto payments receive a 10% discount.
- **TODO.md**: Read and update `TODO.md` at the start and end of every session. All entries must be dated, and completed items must include the completion date.

## Pointers

- **AGPL-3.0 License**: `LICENSE`
- **Roadmap**: `/roadmap`
- **Principles**: `/principles`
- **Admin User**: `3e7353fc-9f2f-4f72-aba9-93c49b629b89` (pawint@me.com)
- **Yahoo Finance Import account ID**: `a586c00d-0e13-454b-ae50-765a6e2b20e6`
- **Soil Protocol CREDIT+ vault address**: `rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX` (8% APR)
- **Soil Protocol Treasury vault address**: `rnvp6FiucXE7kjR8LKRocosWmg8pGhFZa8` (5.2% APR)
- **Yahoo Finance API**: _Populate as you build_
- **1inch API Docs**: _Populate as you build_
- **LI.FI Docs**: _Populate as you build_
- **Squid Router Docs**: _Populate as you build_
- **CoinGecko API**: _Populate as you build_
- **DefiLlama API**: _Populate as you build_
- **FRED API**: _Populate as you build_
- **Stripe Docs**: _Populate as you build_
- **Resend Email Docs**: _Populate as you build_
- **OpenAI API Docs**: _Populate as you build_