# CryptoBroker Tracker + OwnBank XRPL

## Overview
CryptoBroker Tracker is a comprehensive cryptocurrency and investment portfolio management application with an integrated OwnBank XRPL yield dashboard. It offers account connection for portfolio tracking, transaction monitoring, and tax report generation. The OwnBank section provides non-custodial XRPL wallet connections (Xumm/Ledger) to interact with Soil Protocol yield vaults, track interest, and manage withdrawals while maintaining principal lock. The project's vision is to deliver a transparent, non-custodial solution for crypto portfolio management and DeFi yield participation on the XRPL for informed investors. The platform also aims to be a non-custodial payment tooling layer for consumers and small businesses, offering an alternative to traditional payment processors by leveraging the XRP Ledger for cross-currency payments.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Frameworks**: React 18 with TypeScript, shadcn/ui on Radix UI, Tailwind CSS.
-   **State Management**: TanStack React Query for server state, Zustand for local/XRPL state.
-   **UI/UX**: Responsive design for mobile, light/dark themes, Recharts for data visualization, React Hook Form with Zod validation.
-   **Key Features**:
    -   **CryptoBroker**: Dashboard, Transactions, Portfolio, Tax Reports, Integrations, Settings.
    -   **OwnBank XRPL**: Soil vault tracking, Token Manager (trustlines, popular tokens), DEX Trading (order book, limit/market orders), Send & Receive (payments, contacts, QR, destination tag), Withdraw Interest, History, Referrals. Includes educational "Old Way vs New Way" headers.
    -   **Stellar Integration**: Send with Path Payments, Remittance Calculator & Corridor Guide, anchor directory.
    -   **Chain Guide**: Educational comparison of XRP vs XLM.
    -   **RWA Yield Explorer**: Interactive recommender quiz, enhanced protocol cards (Soil integrated, Ondo, Centrifuge, XDC, Maple, etc.), guided flows, and RWA token tracking across chains.
    -   **Stablecoin Dashboard**: Directory and user holdings for major stablecoins.
    -   **Recommendations Hub**: Decision-tree-based asset optimization, scam token detection, on-chain vs. custodial distinction with visual badges, wallet-specific staking guides, and detailed earn options.
    -   **Payment Features**: Recurring payments, invoice generation with branding, personal payment QR page, offline payment queuing, and shareable portfolio snapshot QRs.
    -   **Branding**: Customizable business profiles for invoices and payment links.

### Backend
-   **Runtime**: Node.js with Express and TypeScript.
-   **API Pattern**: RESTful.
-   **Core Functionality**:
    -   Authentication: Email/password, Replit Auth, PostgreSQL-backed sessions.
    -   Data Sync: Encrypted API key management, automatic/manual balance and transaction sync from 24+ blockchains and exchanges.
    -   Token Scanning: Comprehensive token scanning (ERC-20, SPL, XRP trust lines, etc.) with CoinGecko price lookup.
    -   Blockchain Transaction Import: Full history import (Etherscan, blockchain.info, XRPL `account_tx`), tax lot creation, cost basis calculation, and inter-wallet transfer detection.
    -   XRPL Scanner: Monitors user transactions with Soil vaults, auto-discovering RLUSD transfers.
    -   Email Notifications: Transactional emails.

### Data Storage
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Key Models**: Users, API Credentials, Accounts, Transactions, Positions, Tax Lots, Assets, Settings, Price Alerts, Wallets, Wallet Balances, User Wallets (chain-agnostic, labeled).
-   **Cost Basis**: `averageCost` and `totalCostBasis` fields on wallet balances, manually editable and managed via API.
-   **User Wallets**: Multi-purpose, labeled wallet addresses replacing older single-wallet approaches.
-   **Client-side Storage**: Zustand for wallet state, XRPL data, vault deposits, referral data. LocalStorage for UI preferences and temporary data (e.g., invoice creation).

### Monetization
-   **Tiers**: Freemium model with Free, Premium, and Pro tiers, gated by features.
-   **Payment Processing**: Crypto payments (XRP, BTC, ETH, SOL, etc.) with on-chain verification; Stripe for card payments fallback.
-   **Statement Insights**: PDF statement upload for comparing financial products against crypto alternatives, with privacy-first auto-deletion of extracted data after 15 minutes.
-   **Onboarding**: Guided onboarding checklist for new users.

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

## Recent Features

- **XRPL Whale Alerts** (`/whale-alerts`): Real-time monitoring of large XRP (≥1M) and RLUSD (≥500K) transactions on the XRP Ledger. Backend service (`server/services/whale-monitor.ts`) subscribes to XRPL WebSocket transaction stream, filters whale-sized payments, enriches with USD value from price cache, and stores in `whale_alerts` table. RLUSD identification verifies both currency hex code and issuer address. API routes: `GET /api/whale-alerts` (free=24h, premium/pro=full history), `GET/PUT /api/whale-alerts/settings` (custom thresholds for paid tiers with input validation). Frontend page shows stats cards (total volume, XRP/RLUSD whale counts), live feed with auto-refresh, upgrade banner for free users, and settings panel for paid users. DB tables: `whale_alerts`, `whale_alert_settings`.

- **Payment Queue** (`/ownbank/payment-queue`): Offline payment caching for intermittent connectivity. Queue payments while offline (saved to localStorage), auto-detects connectivity via `navigator.onLine` + events, sync all queued payments when back online. XRPL payments sync via Xaman (QR/deep link). Stellar payments sync via `web+stellar:pay` deep link to Lobstr/Solar/Freighter/StellarTerm — user confirms completion. Proof of Delivery: captures on-chain TX hash, links to XRPScan/Stellar Expert, shareable receipt. Cached balance reference with effective balance (deducts already-queued amounts). Files: `client/src/lib/offline-queue.ts`, `client/src/hooks/use-online-status.ts`, `client/src/components/offline-banner.tsx`, `client/src/pages/payment-queue.tsx`.
- **PWA Support**: Progressive Web App via `vite-plugin-pwa`. Service worker precaches app shell so it loads from cache without internet. API calls use NetworkFirst with 10s timeout fallback. Installable to home screen on iOS/Android. Files: `vite.config.ts` (VitePWA plugin), `client/public/pwa-*.svg` (icons).