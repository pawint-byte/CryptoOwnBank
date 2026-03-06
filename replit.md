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