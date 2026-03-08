# CryptoBroker Tracker + OwnBank XRPL

## Overview

CryptoBroker Tracker is a comprehensive cryptocurrency and investment portfolio management application with an integrated OwnBank XRPL yield dashboard. It offers account connection for portfolio tracking, transaction monitoring, and tax report generation. The OwnBank section provides non-custodial XRPL wallet connections (Xumm/Ledger) to interact with Soil Protocol yield vaults, track interest, and manage withdrawals while maintaining principal lock. The project's vision is to deliver a transparent, non-custodial solution for crypto portfolio management and DeFi yield participation on the XRPL for informed investors.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript.
- **State Management**: TanStack React Query for server state, Zustand for XRPL wallet/vault state.
- **UI Components**: shadcn/ui built on Radix UI, styled with Tailwind CSS (light/dark themes).
- **Charts**: Recharts.
- **Forms**: React Hook Form with Zod validation.
- **XRPL Integration**: xrpl.js, Xumm SDK, Ledger HW libraries.
- **Mobile Responsiveness**: Optimized for mobile with responsive breakpoints, compact layouts, hidden columns, and abbreviated data.
- **Key Pages**: CryptoBroker (Dashboard, Transactions, Portfolio, Tax Reports, Integrations, Settings) and OwnBank XRPL (Dashboard with Soil vault tracking, Vaults, Withdraw Interest, History, Referrals).

### Backend
- **Runtime**: Node.js with Express and TypeScript.
- **API Pattern**: RESTful.
- **Core Functionality**:
    - **Authentication**: Email/password, legacy Replit Auth, PostgreSQL-backed sessions, admin roles.
    - **Data Sync**: Encrypted exchange API key management, automatic/manual balance and transaction sync from major exchanges and 24 public blockchains (BTC, ETH, SOL, XRP, etc.), with auto-chain-detection for wallet addresses.
    - **Token Scanning**: Comprehensive token scanning across various chains (ERC-20, SPL, XRP trust lines, ASA, etc.) with price lookup via CoinGecko.
    - **Blockchain Transaction Import**: Full transaction history import from Etherscan (ETH), blockchain.info (BTC), and XRPL `account_tx` (XRP), classifying transactions and creating tax lots based on historical USD prices. Detects transfers between user's own wallets. Auto-populates cost basis on wallet balances.
    - **XRPL Scanner**: Monitors XRPL for transactions between user wallets and Soil vault addresses (Credit+, Liquid, custom vaults), creating position records and auto-discovering unrecognized RLUSD transfers.
    - **Email Notifications**: Transactional emails via Resend.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM.
- **Key Models**: Users, API Credentials, Accounts, Transactions, Positions, Tax Lots & Gain Events, Assets, User Settings, Price Alerts, Wallets, Wallet Balances.
- **Manual Entry**: Supports manual position creation for assets without automated feeds.
- **Cost Basis Management**: Wallet balances have `averageCost` and `totalCostBasis` fields, auto-populated from on-chain transaction imports and manually editable. Purchase lots can be added/edited/deleted per wallet balance. API endpoints: `PATCH /api/wallet-balances/:id/cost`, `GET/POST /api/wallet-balances/:id/lots`, `PATCH/DELETE /api/wallet-balances/:balanceId/lots/:lotId`.
- **Asset Categories**: Categorizes 150+ crypto symbols into sectors (Layer 1, DeFi, AI, Stablecoin, etc.).
- **Client-side Storage (Zustand)**: Stores wallet state, XRPL balances, vault deposits, and referral data.

### Monetization (Freemium)
- **Tiers**: Free, Premium (monthly/annual), and future Pro. Features gated by tier (e.g., number of exchanges/wallets, history depth, tax reports).
- **Gating**: Server-side enforced limits with 403 responses and frontend `UpgradePrompt`. Admin bypass for testing.
- **CSV Import**: Supports Ledger Live, Yahoo Finance, CoinTracker, and generic CSV formats.
- **Statement Insights**: PDF statement upload for comparing financial products against alternatives (Soil Treasury, HY Savings, T-Bills).
- **Migration Guide**: Guided walkthrough for new users transitioning from other platforms.
- **Data Reconciliation**: Dedicated page for reviewing and truing up portfolio data, including duplicate detection, side-by-side comparison, and purchase lot management for wallet entries.
- **Affiliate/Referral**: Links for RLUSD, embedded Soil referral code, and user referral program.
- **Recommendations Engine**: Decision-tree-based asset optimization engine in `client/src/lib/custody-knowledge.ts`. Evaluates each asset through: Where is it held? (cold wallet / exchange / DeFi) → Is it earning yield? → Could it earn more elsewhere? → What's the best action? Shows "money left on the table" calculations. Includes exchange earning data (Coinbase, Kraken, Binance, Crypto.com), staking options, and DeFi alternatives. Skips dust balances (<$5). UI in `client/src/components/recommendations-hub.tsx` with tabs: Optimize (main decision tree), By Asset (consolidated view), Staking, DeFi vs TradFi, Prices, Alerts.

## External Dependencies

### Database
- PostgreSQL

### Authentication
- Replit Auth

### Payments
- Stripe

### XRPL Libraries
- xrpl.js
- xumm (SDK)
- @ledgerhq/hw-app-xrp
- @ledgerhq/hw-transport-webusb

### Email Service
- Resend
- Nodemailer

### Market Data
- CoinGecko API (prices, 24h change)
- DefiLlama Yields API (DeFi yield data)

### Analytics
- Google Analytics 4 (GA4)