# CryptoBroker Tracker + OwnBank XRPL

## Overview

CryptoBroker Tracker is a cryptocurrency and investment portfolio management application with an integrated OwnBank XRPL yield dashboard. Users can connect crypto exchanges and brokerage accounts to monitor portfolio performance, track transactions, and generate tax reports. The OwnBank section enables non-custodial XRPL wallet connections (Xumm/Ledger) to deposit RLUSD into Soil Protocol yield vaults, track accrued interest, and withdraw only earned interest while keeping principal locked.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, Zustand for XRPL wallet/vault state (localStorage persistence)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for light/dark themes
- **Charts**: Recharts for portfolio and allocation visualizations
- **Forms**: React Hook Form with Zod validation
- **XRPL Integration**: xrpl.js for blockchain queries, Xumm SDK for wallet signing, Ledger HW libs for hardware wallets

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful API endpoints under `/api/*`
- **Build System**: Vite for frontend, esbuild for server bundling
- **Payments**: Stripe for premium subscriptions ($9/month, $79/year)

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Managed via `drizzle-kit push`
- **Client-side Storage**: Zustand with localStorage persistence for XRPL wallet state, vault deposits, referral data

### Authentication
- **Provider**: Email/password auth (primary), legacy Replit Auth (OIDC) still supported
- **Email Auth**: Signup with email verification, login, forgot/reset password flows
- **Password Security**: scrypt hashing with random salt, 8+ chars with uppercase/lowercase/number requirements
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple (7-day TTL)
- **Admin System**: isAdmin flag on users table, auto-admin for ADMIN_EMAILS list (pawint@me.com, andrew.wint@gmail.com)
- **Admin Dashboard**: /admin/metrics (site metrics, revenue, signup trends, user directory), /admin/users (user management, auth migration)
- **XRPL Wallets**: Non-custodial — Xumm and Ledger hardware wallet connections (no keys stored server-side)

### Key Data Models (PostgreSQL)
- **Users**: id (UUID), email, firstName, lastName, passwordHash, emailVerified, emailVerifyToken, passwordResetToken, passwordResetExpires, authProvider, isAdmin, xrplWalletAddress, xrplWalletType, createdAt, updatedAt
- **API Credentials**: Encrypted storage for exchange API keys (Binance, Coinbase, etc.) — keys decrypted only during sync
- **Accounts**: Linked exchange/brokerage accounts
- **Transactions**: Buy/sell records with quantity, price, and date — auto-imported from exchanges
- **Positions**: Aggregated holdings with cost basis tracking — auto-updated from exchange sync
- **Tax Lots & Gain Events**: For FIFO/LIFO tax calculations
- **Assets**: Cryptocurrency/stock metadata with price tracking
- **User Settings**: Tax method, currency preferences, subscription tier, Stripe IDs
- **Price Alerts**: userId, asset, targetPrice, direction (above/below), isActive, triggered, triggeredAt — background checker every 60s sends email via Resend
- **Wallets**: userId, chain (bitcoin/ethereum/solana/xrp/dogecoin/litecoin/cardano), address, label, lastSyncAt — read-only cold wallet tracking
- **Wallet Balances**: walletId, userId, assetSymbol, balance, usdValue — synced from public blockchain APIs

### Key Data Models (Client-side Zustand)
- **Wallet State**: walletAddress, walletType (xumm/ledger), connection status
- **Balances**: XRP and RLUSD balances from XRPL mainnet
- **Vault Deposits**: Array of {vaultId, vaultName, principal, depositDate, apr}
- **Referral System**: referralCode, referrals array, referredBy, premiumCreditMonths
- **Spending Wallet**: User-defined XRPL address for interest withdrawals
- **Subscription Tier**: free or premium

### Application Pages

#### CryptoBroker Section
- Dashboard: Portfolio overview with metrics, charts, and recent transactions (auto-populated from exchange sync + cold wallets)
- Transactions: Unified transaction history (exchange trades, XRPL on-chain, manual entries) with column picker and source filter
- Portfolio: Detailed position breakdown with source badges (Exchange vs wallet labels), allocation visualization
- Cold Wallets (`/wallets`): Read-only wallet tracker for BTC, ETH, SOL, XRP, DOGE, LTC, ADA — three views: By Source (grouped by wallet with pie chart), By Asset (aggregated exposure per coin), All Holdings (detailed table). Balances synced from public blockchain APIs.
- Tax Reports: Capital gains calculations with FIFO/LIFO support, CSV export, TurboTax CSV, and PDF export (Premium)
- Price Alerts: Email notifications when crypto hits target price (Free: 3 alerts, Premium: unlimited)
- Integrations: Exchange API key management with real data sync (Binance, Binance.US, Coinbase, Crypto.com, Kraken, Uphold)
- Settings: User preferences, spending wallet, subscription management

#### OwnBank XRPL Section
- OwnBank Dashboard (`/ownbank`): XRPL wallet connection (Xumm/Ledger), XRP/RLUSD balances, Soil vault activity (auto-synced from XRPL ledger), referral link, affiliate buy buttons
- Vaults (`/ownbank/vaults`): Soil Protocol RLUSD yield vaults (Treasury 5.2% APR, Private Credit 7.8% APR), deposit flow with Soil referral code
- Withdraw Interest (`/ownbank/withdraw`): Interest-only withdrawal with principal protection, freemium gating for auto-withdraw
- History (`/ownbank/history`): XRPL transaction history from blockchain
- My Referrals (`/ownbank/referrals`): Referral link, stats, referred user list
- XLS-66 Lending: Placeholder (Coming Q2 2026)

### Soil XRPL Transaction Scanner
- **Endpoint**: `POST /api/soil/sync` — scans XRPL ledger for all transactions between user's wallet and Soil vault address (`rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX`)
- **Auto-sync**: Triggers automatically when user connects wallet on OwnBank dashboard
- **Manual sync**: Refresh button on Soil Vault Activity card
- **Transaction types**: Deposits (Payment TO Soil address) and Interest payments (Payment FROM Soil address)
- **Tax integration**: Imported transactions stored as `transfer_out` (deposits) and `income` (interest) in transactions table, linked to "Soil Protocol (XRPL)" account
- **Deduplication**: Uses transaction hash as `externalId` to prevent duplicates on re-sync
- **Data source**: 100% on-chain XRPL data — no estimates, no manual entry

## File Structure

### XRPL Client Libraries
- `client/src/lib/xrpl-store.ts` — Zustand store for wallet, vault, referral state
- `client/src/lib/xrpl-client.ts` — XRPL mainnet client (balances, transactions, prices)
- `client/src/lib/xumm-connector.ts` — Xumm wallet connection and signing
- `client/src/lib/ledger-connector.ts` — Ledger hardware wallet via WebUSB

### Auth System
- `server/replit_integrations/auth/routes.ts` — Auth API routes (signup, login, verify-email, forgot-password, reset-password, logout, admin endpoints)
- `server/replit_integrations/auth/replitAuth.ts` — Session setup, isAuthenticated/isAdmin middleware
- `server/replit_integrations/auth/storage.ts` — User CRUD operations
- `server/services/email-auth.ts` — Password hashing (scrypt), token generation, validation
- `client/src/pages/login.tsx` — Email/password login
- `client/src/pages/signup.tsx` — Registration with email verification
- `client/src/pages/forgot-password.tsx` — Password reset request
- `client/src/pages/reset-password.tsx` — Set new password via token
- `client/src/pages/verify-email.tsx` — Email verification handler
- `client/src/pages/admin-users.tsx` — Admin user management dashboard
- `client/src/pages/admin-metrics.tsx` — Admin metrics dashboard (users, revenue, signup trends, contact directory)

### Cold Wallet Balance Sync
- `server/services/blockchain-balance.ts` — Public blockchain API clients for balance lookups (Bitcoin via blockchain.info, Ethereum via etherscan, Solana via RPC, XRP via xrplcluster, Dogecoin via dogechain.info, Litecoin via litecoinspace.org, Cardano via blockfrost)
- No API keys required — uses free public endpoints
- Wallet balances integrated into Portfolio and Dashboard totals

### Exchange Data Sync
- `server/services/exchange-sync.ts` — Exchange API clients that fetch real balances and trade history
- **Supported exchanges**: Binance, Binance.US, Coinbase, Crypto.com, Kraken, Uphold
- **Auto-sync**: Triggers automatically when user connects an exchange (after saving API keys)
- **Manual sync**: Sync button on Integrations page triggers `POST /api/credentials/:id/sync`
- **Data flow**: Decrypt API keys → fetch balances/trades from exchange → import transactions (deduplicated by externalId) → update positions → fetch live prices from CoinGecko → populate dashboard/portfolio/tax reports
- **Price mapping**: Uses CoinGecko IDs for 23+ major cryptocurrencies (BTC, ETH, XRP, SOL, ADA, DOGE, etc.)

### Stripe Integration
- `server/stripe.ts` — Stripe checkout session creation, plan config

### Components
- `client/src/components/xrpl-disclaimer.tsx` — Non-custodial disclaimer banner

## External Dependencies

### Database
- PostgreSQL (required, configured via `DATABASE_URL` environment variable)

### Authentication
- Replit Auth (OpenID Connect provider)
- Requires `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET` environment variables

### Payments
- Stripe (`STRIPE_SECRET_KEY` environment variable)
- Premium plans: Monthly $9, Yearly $79

### XRPL Libraries
- xrpl.js — XRPL mainnet WebSocket client
- xumm — Xumm SDK for wallet connection and transaction signing
- @ledgerhq/hw-app-xrp — Ledger hardware wallet support
- @ledgerhq/hw-transport-webusb — WebUSB transport for Ledger

### Frontend Libraries
- @tanstack/react-query for data fetching
- zustand for client-side state management
- Radix UI primitives for accessible components
- Recharts for data visualization
- date-fns for date formatting
- lucide-react for icons

### Backend Libraries
- Drizzle ORM for database operations
- Passport.js with OpenID Connect strategy
- crypto module for API key encryption/decryption
- stripe for payment processing

## Monetization Model
- **Freemium**: Free tier (basic tracking, manual withdraw) + Premium ($9/mo or $79/yr for auto-withdraw, tax export, priority vaults)
- **Affiliate Links**: Binance/Kraken/Coinbase referral links for buying RLUSD
- **Soil Referral**: Embedded referral code in deposit flow for SEED points
- **User Referrals**: Invite friends, earn premium credits

### Public Pages
- Landing Page (`/`): Hero, How It Works, Features, Member Stories, RLUSD explainer, Pricing, Security, FAQ, CTA
- Yield Calculator (`/yield-calculator`): Public page for calculating projected Soil vault earnings (no login required, SEO-friendly)
- Setup Guide (`/setup-guide`): 9-step onboarding for XRPL + Soil flow
- FAQ, Legal, Privacy, Contact pages

### Analytics
- Google Analytics 4 (GA4) with measurement ID `G-QS2GXGNT8Y`
- Only loads on production domains (cryptoownbank.com, www.cryptoownbank.com)

### Tax System
- **Capital gains**: Buy/sell trades create tax lots, FIFO/LIFO calculation, gain events
- **Income tracking**: Soil interest and staking rewards create tax lots at FMV (for future cost basis)
- **Fees**: All transaction fees tracked and displayed on tax report as deductible
- **Exports**: CSV, TurboTax CSV (free), PDF report (Premium)
- **IRS guide**: Form 8949 (gains), Schedule D (totals), Schedule 1 Line 8z (income)

## Email Notifications (Resend)
- `server/email.ts` — Resend integration via Replit connector (not manual API key)
- Templates: Welcome, Deposit Confirmation, Withdrawal Confirmation, Premium Welcome, Email Verification, Password Reset
- Sender: notification@pawint-app.com (verified domain)

## Core Rules (OwnBank)
- 100% non-custodial: never store private keys
- All transactions signed client-side via Xumm or Ledger
- Principal protection: users can only withdraw accrued interest
- Disclaimer on every OwnBank page
