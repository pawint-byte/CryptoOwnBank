# CryptoBroker Tracker + OwnBank XRPL

## Overview

CryptoBroker Tracker is a cryptocurrency and investment portfolio management application with an integrated OwnBank XRPL yield dashboard. It allows users to connect exchange and brokerage accounts for portfolio tracking, transaction monitoring, and tax report generation. The OwnBank section facilitates non-custodial XRPL wallet connections (Xumm/Ledger) to interact with Soil Protocol yield vaults, track interest, and withdraw earned interest while maintaining principal lock. The project aims to provide a comprehensive, non-custodial solution for crypto portfolio management and DeFi yield participation on the XRPL, targeting informed investors seeking transparency and control over their assets.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter.
- **State Management**: TanStack React Query for server state, Zustand for XRPL wallet/vault state (localStorage).
- **UI Components**: shadcn/ui built on Radix UI.
- **Styling**: Tailwind CSS with custom design tokens for light/dark themes.
- **Charts**: Recharts for visualizations.
- **Forms**: React Hook Form with Zod validation.
- **XRPL Integration**: xrpl.js, Xumm SDK, Ledger HW libs.
- **Mobile Responsiveness**: All pages optimized for mobile with responsive breakpoints (`sm:` for 640px+). Key patterns: 2x2 metric card grids, collapsible allocation chart legends (top 8 + "Show All"), hidden table columns on mobile (Price/Total in transactions, Direction/Fee/Source in full transactions, Balance/Source/Chain in wallets, Quantity/Proceeds/CostBasis in tax reports, Direction/USDValue/Status in OwnBank history), compact position items with hidden badges on mobile (source shown inline as "· source" suffix), responsive chart heights, smaller padding/fonts/avatars on mobile, compact date formats (short dates on mobile, full dates with time on desktop), abbreviated quantity decimals (2 on mobile, 4-6 on desktop), stacked layouts for buttons/controls on mobile, truncated addresses/emails.
- **Key Pages**:
    - **CryptoBroker**: Dashboard, Transactions, Portfolio, Cold Wallets, Tax Reports, Price Alerts, Integrations, Settings.
    - **OwnBank XRPL**: Dashboard (with full Soil vault tracking — principal, paid interest, estimated accruing yield, total yield, dates), Vaults (Soil Protocol RLUSD yield vaults), Withdraw Interest (interest-only), History, My Referrals.

### Backend
- **Runtime**: Node.js with Express.
- **Language**: TypeScript (ESM modules).
- **API Pattern**: RESTful.
- **Build System**: Vite for frontend, esbuild for server.
- **Payments**: Stripe for subscriptions.
- **Core Functionality**:
    - **Authentication**: Email/password auth (scrypt hashing, email verification, password reset), legacy Replit Auth. PostgreSQL-backed sessions. Admin roles with dashboard.
    - **Data Sync**: Exchange API key management (encrypted), automatic/manual sync of balances and transactions from exchanges (Binance, Coinbase, etc.). Public blockchain API integrations for wallet balance tracking across 19 chains: BTC, ETH, SOL, XRP, DOGE, LTC, ADA, AVAX, ALGO, ATOM, TRX, HBAR, DOT, VET, DGB, CSPR, CRO, CKB, ZIL.
    - **Token Scanning**: Ethereum addresses pull native ETH (via llamarpc) + all ERC-20 tokens via Blockscout API with pagination. Solana: native SOL + SPL tokens via `getTokenAccountsByOwner` RPC. XRP: native XRP + trust line tokens (RLUSD) via `account_lines`. Avalanche: Glacier API for native AVAX + tokens. Algorand: Algonode API for ALGO + ASA tokens. Cosmos: REST API for ATOM + staking delegations. Tron: TronGrid API for TRX + TRC-20 tokens. Hedera: Mirror Node API for HBAR + HTS tokens. Polkadot: Subscan API. VeChain: Blockscout for VET + VIP-180 tokens. Cronos: Explorer API for CRO + CRC-20 tokens. DigiByte: Trezor Blockbook API. Casper: CasperStats API. 100+ tokens mapped to CoinGecko IDs for automatic price lookup.
    - **Blockchain Transaction Import**: When syncing ETH or BTC wallets, pulls full transaction history from Etherscan (ETH) and blockchain.info (BTC). Classifies receive→buy, send→sell. Looks up historical USD price per transaction date via CoinGecko and creates tax lots for acquisitions. Deduplicates by tx hash. Services: `server/services/blockchain-transactions.ts` (tx fetching), `server/services/historical-prices.ts` (price lookup with in-memory cache).
    - **XRPL Scanner**: Scans XRPL ledger for transactions between user wallets and Soil vault address for deposits and interest payments, storing them for tax integration.
    - **Email Notifications**: Resend integration for various transactional emails.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM and drizzle-zod for schema validation. Migrations via `drizzle-kit push`.
- **Key Models**: Users, API Credentials (encrypted), Accounts (including "manual" provider for manual entries), Transactions, Positions (with isAddressed flag), Tax Lots & Gain Events, Assets, User Settings, Price Alerts, Wallets, Wallet Balances, Price Cache (DB-backed CoinGecko price fallback).
- **Manual Entry**: `POST /api/positions/manual` creates positions for assets with no automated price feed (stocks, unsupported tokens, physical assets). Creates a "manual" account per location. Does NOT write to global asset prices. Form on Portfolio page via "Add Entry" button.
- **Asset Categories**: `shared/asset-categories.ts` maps 150+ crypto symbols to sectors: Layer 1, Layer 2, DeFi, Smart Contracts, Finance, Memecoin, Gaming, AI, Oracle, Web3, Stablecoin, Staking, NFT, RWA, IoT, Privacy, Storage, Supply Chain, Metaverse, Internet.
- **Client-side Storage (Zustand)**: Wallet state, XRPL balances, Vault Deposits, Referral System data, Spending Wallet, Subscription Tier.

### Monetization (Freemium)
- **Tiers**: Free, Premium ($9/month or $79/year), and future Pro tier.
- **Free**: 1 exchange, 1 wallet, 3 alerts, 30-day history, Soil vault access, yield calculator.
- **Premium Monthly** ($9/mo): Unlimited exchanges/wallets/alerts, full history, CSV import, auto-withdraw. No tax reports.
- **Premium Annual** ($79/yr): Everything in monthly + complete tax reports (CSV, PDF, TurboTax). Tax reports are annual-plan exclusive to prevent one-month gaming at tax time.
- **Pro** (future): Everything in Premium Annual + XLS-66 XRPL lending.
- **Billing cycle stored**: `subscriptionBillingCycle` column in user_settings tracks "monthly" or "yearly" from Stripe checkout metadata.
- **Gating**: Server-side enforced limits with 403 responses. Frontend shows `UpgradePrompt` component (supports `variant="premium"` or `variant="annual"` for different messaging). Gated endpoints: POST /api/credentials, POST /api/wallets, GET /api/transactions, POST /api/import/yahoo, GET /api/tax-report, POST /api/tax-report/calculate, GET /api/tax-report/export, POST /api/alerts.
- **Admin Bypass**: `getEffectiveTier(userId)` in `server/routes.ts` returns `{tier:"premium", billingCycle:"yearly"}` for ADMIN_EMAILS (`pawint@me.com`, `andrew.wint@gmail.com`). All tier-gated endpoints use this helper so admins can test all features without paying. The `/api/subscription/limits` endpoint also uses it so the frontend shows everything unlocked for admins.
- **CSV Import**: Supports Ledger Live (auto-detected by headers: operation date, currency ticker, operation type), Yahoo Finance, CoinTracker, and generic CSV formats. Ledger Live maps IN→buy, OUT→sell, REWARD→income, deduplicates by operation hash.
- **Statement Insights**: Upload bank/brokerage PDF statements for educational rate comparisons. Parser extracts financial products (CDs, savings, money market, checking, bonds, brokerage) with balances, rates, maturity dates. Comparison engine shows side-by-side with alternatives (Soil Treasury 5.2% APR, Soil Credit+ 8.0% APR, HY Savings benchmark, T-Bills benchmark). Heavy disclaimer framework: persistent banner, inline disclaimers on each comparison, first-use acknowledgment modal. Free tier: 1 upload with basic product detection only. Premium: unlimited uploads + full comparison insights. "Add to Portfolio" imports detected products as manual positions with symbol format `INSTITUTION-TYPE` (e.g., `CHASE-CD`, `ALLY-SAVE`), using `quantity=balance` and `costPerUnit=1`. Duplicate detection checks existing portfolio positions by symbol match to prevent re-importing. Files: `server/services/statement-parser.ts`, `server/services/comparison-engine.ts`, `client/src/pages/statement-insights.tsx`, `client/src/components/disclaimer-banner.tsx`. Tables: `statement_uploads`, `statement_products`.
- **Data Reconciliation**: Dedicated page at `/reconciliation` for reviewing and truing up portfolio data across all sources. Features: (1) All positions grouped by asset symbol with source details (exchange, blockchain, manual, import), (2) Duplicate detection flags when same asset appears from overlapping sources (e.g., wallet + exchange), (3) Inline editing of quantity and cost basis on any non-wallet position, (4) Merge tool to combine two positions of the same asset into one, (5) Delete individual positions with confirmation, (6) "Mark as Addressed" to hide reviewed entries without deleting. Filter cards: All/Duplicates/Manual/Zero-balance. Search by asset or source. Backend: `PATCH /api/positions/:id` (edit fields), `POST /api/positions/merge` (merge two positions, validates same symbol). File: `client/src/pages/reconciliation.tsx`.
- **Affiliate/Referral**: Links for buying RLUSD, embedded Soil referral code, user referral program for premium credits.

## External Dependencies

### Database
- PostgreSQL

### Authentication
- Replit Auth (OpenID Connect provider)

### Payments
- Stripe

### XRPL Libraries
- xrpl.js
- xumm (SDK)
- @ledgerhq/hw-app-xrp
- @ledgerhq/hw-transport-webusb

### Frontend Libraries
- @tanstack/react-query
- zustand
- Radix UI
- Recharts
- date-fns
- lucide-react

### Backend Libraries
- Drizzle ORM
- Passport.js
- crypto (Node.js module)
- stripe (SDK)

### Email Service
- Resend (via Replit connector)

### Analytics
- Google Analytics 4 (GA4)

## Roadmap / To Do

### Grant Opportunities
1. **XRPL Grant Application** — Prepare and submit to Ripple's XRPL Grants program. Highlight Soil vault integration, XRP wallet tracking, RLUSD support, non-custodial architecture, and multi-chain portfolio aggregation. Typical grant range: $10K–$50K.
2. **Deeper XRPL Features (strengthens grant case)**:
   - XRPL DEX trading pair viewer
   - AMM pool tracking and yield display
   - Trustline management UI
   - XRPL transaction history with token-level detail
3. **Additional Grant Programs**:
   - Stellar Community Fund (we already support Stellar wallet scanning)
   - Ethereum Foundation ecosystem grants (Blockscout-powered ERC-20 scanning)
   - Solana Foundation grants (we have Solana wallet + SPL token support)
4. **Usage Metrics & Analytics** — Track and surface active users, wallets connected, transactions processed, and other KPIs to strengthen grant proposals and demonstrate traction.