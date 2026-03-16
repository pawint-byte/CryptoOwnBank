# CryptoBroker Tracker + OwnBank XRPL

## Overview
CryptoBroker Tracker is a comprehensive cryptocurrency and investment portfolio management application with an integrated OwnBank XRPL yield dashboard. It offers account connection for portfolio tracking, transaction monitoring, and tax report generation. The OwnBank section provides non-custodial XRPL wallet connections to interact with Soil Protocol yield vaults, track interest, and manage withdrawals while maintaining principal lock. The project aims to deliver a transparent, non-custodial solution for crypto portfolio management and DeFi yield participation on the XRPL, and to serve as a non-custodial payment tooling layer for consumers and small businesses leveraging the XRP Ledger for cross-currency payments.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Frameworks**: React 18 with TypeScript, shadcn/ui on Radix UI, Tailwind CSS.
-   **State Management**: TanStack React Query for server state, Zustand for local/XRPL state.
-   **UI/UX**: Responsive design, light/dark themes, Recharts for data visualization, React Hook Form with Zod validation.
-   **Key Features**:
    -   **CryptoBroker**: Dashboard, Transactions, Portfolio, Tax Reports, Integrations, Settings.
    -   **OwnBank XRPL**: Soil vault tracking, Token Manager, DEX Trading (Quick Swap + Advanced order book with 10+ trading pairs), Send & Receive (payments, contacts, QR, destination tag), Withdraw Interest, History, Referrals.
    -   **Stellar Integration**: Stellar DEX (Quick Swap + Order Book view with 8 trading pairs), Send with Path Payments, Remittance Calculator & Corridor Guide, anchor directory.
    -   **Chain Guide**: Educational comparison of XRP vs XLM.
    -   **RWA Yield Explorer**: Recommender quiz, enhanced protocol cards (Soil, Ondo, Centrifuge, XDC, Maple, etc.), guided flows, and RWA token tracking across chains.
    -   **Stablecoin Dashboard**: Directory and user holdings for major stablecoins.
    -   **Recommendations Hub**: Asset optimization, scam token detection, on-chain vs. custodial distinction, wallet-specific staking guides, and detailed earn options.
    -   **Payment Features**: Recurring payments, invoice generation, personal payment QR page, offline payment queuing, and shareable portfolio snapshot QRs.
    -   **Branding**: Customizable business profiles for invoices and payment links.
    -   **Technical Analysis**: Interactive price charts with indicators (SMA, EMA, RSI, MACD, Bollinger Bands) for 21 assets.
    -   **XRPL Whale Alerts**: Real-time monitoring of large XRP (≥1M) and RLUSD (≥500K) transactions on XRPL.
    -   **Payment Queue**: Offline payment caching with auto-sync when online for XRPL and Stellar payments.
    -   **Native Staking Guide**: Educational content for staking across XRP, ADA, ATOM, DOT, SOL.
    -   **XLS-65/66 Native Vaults & Lending**: Infrastructure for XRPL Single Asset Vaults and Lending Protocol, with amendment auto-detection and live vault discovery.

### Backend
-   **Runtime**: Node.js with Express and TypeScript.
-   **API Pattern**: RESTful.
-   **Core Functionality**:
    -   Authentication: Email/password, Replit Auth, PostgreSQL-backed sessions.
    -   Data Sync: Encrypted API key management, automatic/manual balance and transaction sync from 24+ blockchains and exchanges.
    -   Token Scanning: Comprehensive token scanning (ERC-20, SPL, XRP trust lines, etc.) with CoinGecko price lookup.
    -   Blockchain Transaction Import: Full history import (Etherscan, blockchain.info, XRPL `account_tx`), tax lot creation, cost basis calculation, and inter-wallet transfer detection.
    -   XRPL Scanner: Monitors user transactions with Soil vaults, auto-discovering RLUSD transfers.
    -   Email Notifications: Transactional emails for deposits, withdrawals, DEX trades, renewals, alerts, etc. Anti-phishing security phrase system injected into all outgoing emails via centralized `sendEmail` in `server/email.ts`.
    -   Monetization: Freemium model (Free, Premium, Pro tiers) and A La Carte Add-Ons with crypto and Stripe payments.
    -   Error Monitoring & Alerting: Server-side error capturing, client-side error reporting, and admin alerting via email.

### Data Storage
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Key Models**: Users, API Credentials, Accounts, Transactions, Positions, Tax Lots, Assets, Settings, Price Alerts, Wallets, Wallet Balances, User Wallets.
-   **Cost Basis**: `averageCost` and `totalCostBasis` fields on wallet balances, manually editable and API managed.
-   **User Wallets**: Multi-purpose, labeled wallet addresses.
-   **Client-side Storage**: Zustand for wallet state, XRPL data, vault deposits, referral data. LocalStorage for UI preferences and temporary data.

## External Dependencies

### Database
-   PostgreSQL

### Authentication
-   Replit Auth

### Payments
-   Stripe
-   On-chain verification for XRP, BTC, ETH, SOL, etc.

### XRPL Libraries
-   xrpl.js
-   Xumm SDK
-   @ledgerhq/hw-app-xrp
-   @ledgerhq/hw-transport-webusb

### Email Service
-   Resend
-   Nodemailer

### Market Data
-   CoinGecko API (prices, 24h change)
-   DefiLlama Yields API (DeFi yield data)

### Analytics
-   Google Analytics 4 (GA4)