# CryptoBroker Tracker + OwnBank XRPL

## Overview
CryptoBroker Tracker is a comprehensive cryptocurrency and investment portfolio management application with an integrated OwnBank XRPL yield dashboard. It offers account connection for portfolio tracking, transaction monitoring, and tax report generation. The OwnBank section provides non-custodial XRPL wallet connections to interact with Soil Protocol yield vaults, track interest, and manage withdrawals while maintaining principal lock. The project aims to deliver a transparent, non-custodial solution for crypto portfolio management and DeFi yield participation on the XRPL, and to serve as a non-custodial payment tooling layer for consumers and small businesses leveraging the XRP Ledger for cross-currency payments. A critical design principle is strict regulatory compliance, ensuring the platform remains non-custodial and does not engage in activities requiring financial licenses.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Frameworks**: React 18 with TypeScript, shadcn/ui on Radix UI, Tailwind CSS.
-   **State Management**: TanStack React Query for server state, Zustand for local/XRPL state.
-   **UI/UX**: Responsive design, light/dark themes, Recharts for data visualization, React Hook Form with Zod validation.
-   **Key Features**:
    -   **Portfolio Management**: Dashboard, Transactions, Portfolio, Tax Reports, Integrations.
    -   **XRPL & Stellar Integration**: Soil vault tracking, DEX Trading (Quick Swap + Advanced order book), Send & Receive payments, Token Managers, Invoices, Remittance Calculator, XRPL AMM Pools.
    -   **DeFi & RWA**: RWA Yield Explorer (recommender quiz, protocol cards, token tracking, live APY), Flare FTSO Rewards tracking, Stablecoin Dashboard.
    -   **Trading & Strategy**: DCA (Dollar-Cost Averaging) for non-custodial recurring DEX buys, Technical Analysis charts, XRPL Whale Alerts.
    -   **EVM & Cross-Chain**: Multi-chain token swap via 1inch, Cross-chain token swaps via LI.FI aggregator, XRPL Bridge from EVM chains via Axelar/Squid Router.
    -   **Financial Tools**: Legacy Plan (dead-man switch for crypto inheritance), Earn & Accumulate strategies (XRP accumulation from Soil vault), Real Estate Tracker (property value updates), Statement Insights (PDF statement data extraction).
    -   **User Onboarding**: Buy Crypto Wizard for guided token purchases.
    -   **Payment Features**: Recurring payments, invoice generation, personal payment QR page, offline payment queuing, shareable portfolio snapshot QRs, customizable business profiles.
    -   **Progressive Web App (PWA)**: Installable, full-screen standalone app with offline caching.
    -   **Future & Advanced**: XLS-65/66 Native Vaults & Lending infrastructure.

### Backend
-   **Runtime**: Node.js with Express and TypeScript.
-   **API Pattern**: RESTful.
-   **Core Functionality**:
    -   **Authentication**: Email/password, Replit Auth, PostgreSQL-backed sessions.
    -   **Data Sync**: Encrypted API key management, automatic/manual balance and transaction sync from 24+ blockchains and exchanges, comprehensive token scanning with CoinGecko price lookup.
    -   **Transaction Processing**: Blockchain transaction import (full history, tax lot creation, cost basis, inter-wallet transfer detection), XRPL Scanner for Soil vault transactions.
    -   **Notifications**: Email notifications for transactions, DEX trades, alerts, and feature announcements (with anti-phishing security phrase system).
    -   **Monetization**: Freemium model (Free, Premium, Pro tiers) and A La Carte Add-Ons with crypto and Stripe payments.
    -   **System Health**: Server-side error capturing, client-side error reporting, and admin alerting.
    -   **Security**: Helmet (security headers), express-rate-limit, session cookies (httpOnly, secure, sameSite=lax).

### Data Storage
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Key Models**: Users, API Credentials, Accounts, Transactions, Positions, Tax Lots, Assets, Settings, Price Alerts, Wallets, User Wallets.
-   **Financial Data**: `averageCost` and `totalCostBasis` on wallet balances, `acquisitionType` for tax lots.
-   **Wallet Management**: Support for `manual` wallets for off-chain assets, lot distribution from import positions to live wallets, unified wallet creation with chain-prefixed naming conventions.
-   **Client-side Storage**: Zustand for wallet state, XRPL data, vault deposits, referral data; LocalStorage for UI preferences.

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

### EVM / DeFi
-   ethers.js v6
-   1inch Aggregation API v6 (for DEX swaps)
-   MetaMask / WalletConnect (for non-custodial signing)
-   Axelar cross-chain protocol via Squid Router (for XRPL Bridge)
-   LI.FI aggregator (for Cross-Chain Swap)

### Market Data
-   CoinGecko API
-   DefiLlama Yields API

### On-Ramp / Off-Ramp
-   MoonPay
-   Transak
-   Onramper (aggregator)
-   Topper

### Analytics
-   Google Analytics 4 (GA4)