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
    - **OwnBank XRPL**: Dashboard, Vaults (Soil Protocol RLUSD yield vaults), Withdraw Interest (interest-only), History, My Referrals.

### Backend
- **Runtime**: Node.js with Express.
- **Language**: TypeScript (ESM modules).
- **API Pattern**: RESTful.
- **Build System**: Vite for frontend, esbuild for server.
- **Payments**: Stripe for subscriptions.
- **Core Functionality**:
    - **Authentication**: Email/password auth (scrypt hashing, email verification, password reset), legacy Replit Auth. PostgreSQL-backed sessions. Admin roles with dashboard.
    - **Data Sync**: Exchange API key management (encrypted), automatic/manual sync of balances and transactions from exchanges (Binance, Coinbase, etc.). Public blockchain API integrations for wallet balance tracking (BTC, ETH, SOL, XRP, DOGE, LTC, ADA).
    - **Token Scanning**: Ethereum addresses pull native ETH + all ERC-20 tokens via Etherscan `tokenlist`/`tokenbalance` APIs (with `tokentx` fallback). Solana addresses pull native SOL + all SPL tokens via `getTokenAccountsByOwner` RPC. XRP addresses pull native XRP + trust line tokens (RLUSD, etc.) via `account_lines`. 70+ tokens mapped to CoinGecko IDs for automatic price lookup.
    - **Blockchain Transaction Import**: When syncing ETH or BTC wallets, pulls full transaction history from Etherscan (ETH) and blockchain.info (BTC). Classifies receive→buy, send→sell. Looks up historical USD price per transaction date via CoinGecko and creates tax lots for acquisitions. Deduplicates by tx hash. Services: `server/services/blockchain-transactions.ts` (tx fetching), `server/services/historical-prices.ts` (price lookup with in-memory cache).
    - **XRPL Scanner**: Scans XRPL ledger for transactions between user wallets and Soil vault address for deposits and interest payments, storing them for tax integration.
    - **Email Notifications**: Resend integration for various transactional emails.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM and drizzle-zod for schema validation. Migrations via `drizzle-kit push`.
- **Key Models**: Users, API Credentials (encrypted), Accounts, Transactions, Positions, Tax Lots & Gain Events, Assets, User Settings, Price Alerts, Wallets, Wallet Balances.
- **Client-side Storage (Zustand)**: Wallet state, XRPL balances, Vault Deposits, Referral System data, Spending Wallet, Subscription Tier.

### Monetization (Freemium)
- **Tiers**: Free, Premium ($9/month or $79/year), and future Pro tier.
- **Free**: 1 exchange, 1 wallet, 3 alerts, 30-day history, Soil vault access, yield calculator.
- **Premium Monthly** ($9/mo): Unlimited exchanges/wallets/alerts, full history, CSV import, auto-withdraw. No tax reports.
- **Premium Annual** ($79/yr): Everything in monthly + complete tax reports (CSV, PDF, TurboTax). Tax reports are annual-plan exclusive to prevent one-month gaming at tax time.
- **Pro** (future): Everything in Premium Annual + XLS-66 XRPL lending.
- **Billing cycle stored**: `subscriptionBillingCycle` column in user_settings tracks "monthly" or "yearly" from Stripe checkout metadata.
- **Gating**: Server-side enforced limits with 403 responses. Frontend shows `UpgradePrompt` component (supports `variant="premium"` or `variant="annual"` for different messaging). Gated endpoints: POST /api/credentials, POST /api/wallets, GET /api/transactions, POST /api/import/yahoo, GET /api/tax-report, POST /api/tax-report/calculate, GET /api/tax-report/export, POST /api/alerts.
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