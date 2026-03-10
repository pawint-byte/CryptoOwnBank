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
- **Key Pages**: CryptoBroker (Dashboard, Transactions, Portfolio, Tax Reports, Integrations, Settings), OwnBank XRPL (Dashboard with Soil vault tracking, Vaults, Token Manager, DEX Trading, Send & Receive, Transfer Between Wallets, Withdraw Interest, History, Referrals), Stellar (Send with Path Payments, Remittance Calculator & Corridor Guide), and Chain Guide (XRP vs XLM comparison).
- **XRPL dApp Interface (Phase 1)**: Token Manager (trustline management with popular token quick-add), DEX Trading (order book, limit/market orders via OfferCreate/OfferCancel), Send & Receive (payments with contact book, QR receive, destination tag support). All pages include collapsible "Old Way vs New Way" educational headers and contextual tooltips.
- **Stellar Integration**: Send page with path payment education (send one currency, recipient gets another), transaction parameter generation for Stellar wallet apps (Lobstr, StellarTerm, Freighter, Solar). Remittance calculator with 8 corridors (USD→PHP, USD→MXN, EUR→NGN, etc.), anchor directory (MoneyGram, Circle, Tempo, Cowrie, etc.), and step-by-step remittance guides.
- **Chain Guide**: Educational "XRP vs XLM: When to Use Which" page with comparison table, decision tree (yield→XRP, remittances→XLM, trading→XRP, retail POS→XLM), and chain profiles.
- **RWA Yield Explorer** (`/rwa-yields`): Actionable command center for Real-World Asset yield opportunities. Features: (1) Interactive "Find Your Best Fit" recommender quiz (chain, investment size, withdrawal flexibility, risk preference), (2) Enhanced protocol cards with minimum investment, lockup, KYC requirements, token received info, (3) Step-by-step guided flows for each protocol (Soil integrated, Ondo/Centrifuge/XDC/Maple external with wallet tracking loop), (4) "Track Your RWA Investments" section showing wallet coverage and quick-add for missing chains. Protocols: Soil (XRPL, integrated), Ondo USDY/OUSG (Ethereum), Centrifuge (Ethereum/Base), XDC/TradeFi, Maple Finance (Ethereum/Solana). Wallet tracking auto-detects RWA tokens via ERC-20 scanning.
- **Stablecoin Dashboard** (`/stablecoins`): Directory of RLUSD, USDC, USDT, EURCV, PYUSD, DAI with chain availability, yield mapping, and decision guide. Shows user's stablecoin holdings from tracked wallets.
- **RWA Dashboard Card**: Dashboard shows contextual RWA card — summary with total value if user holds RWA tokens (USDY, OUSG, DROP, TIN, MPL, SOIL), or discovery prompt linking to `/rwa-yields` if no RWA positions detected.
- **Wallet Deep-Link**: `/wallets?chain=ethereum` (or xdc/solana/xrpl) auto-opens the add-wallet dialog with chain pre-selected, enabling RWA guided flows to link directly to wallet tracking.
- **Price Data**: All prices sourced from CoinGecko market aggregator. Tracks which assets have Chainlink decentralized oracle feeds available (BTC, ETH, XRP, SOL, LINK, etc.) with shield badge indicators in UI. Chainlink on-chain feed integration planned for future.
- **Sidebar Favorites System**: "My Tools" pinned section at top of sidebar with curated defaults (Overview, Portfolio, Vaults, Stablecoins, Chain Guide). Users can star/unstar items on hover. Collapsible groups (Tracker, OwnBank XRPL, Stellar, Research & Tools) with state persisted in localStorage.
- **Multi-Chain Positioning**: Landing page section "Two Chains, One Platform" with side-by-side XRP Ledger (savings/trading, blue accent) vs Stellar (payments/remittances, purple accent) cards linking to chain guide. Sidebar groups: OwnBank (blue #00A4E4) and Stellar (purple #7B61FF).
- **Payment Corridor Messaging**: Landing page and FAQ position CryptoOwnBank as a non-custodial payment tooling layer for consumers and small businesses — alternative to Stripe/PayPal with XRPL's bridge currency (XRP) enabling cross-currency payments in 4 seconds for $0.000001. Key distinction: "We're the workbench, not the payment processor." Dedicated landing section with fee comparison table, FAQ group ("Payments & Business") with 8 items covering merchant usage, Stripe comparison, cross-currency, chargebacks, freelancer invoicing, legal considerations.

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
- **Key Models**: Users, API Credentials, Accounts, Transactions, Positions, Tax Lots & Gain Events, Assets, User Settings, Price Alerts, Wallets, Wallet Balances, User Wallets (multi-purpose labeled wallets).
- **Manual Entry**: Supports manual position creation for assets without automated feeds.
- **Cost Basis Management**: Wallet balances have `averageCost` and `totalCostBasis` fields, auto-populated from on-chain transaction imports and manually editable. Purchase lots can be added/edited/deleted per wallet balance. API endpoints: `PATCH /api/wallet-balances/:id/cost`, `GET/POST /api/wallet-balances/:id/lots`, `PATCH/DELETE /api/wallet-balances/:balanceId/lots/:lotId`.
- **Asset Categories**: Categorizes 150+ crypto symbols into sectors (Layer 1, DeFi, AI, Stablecoin, etc.).
- **User Wallets**: `user_wallets` table — chain-agnostic labeled wallet addresses with purpose tags (yield, spending, receiving, savings, trading, general). CRUD via `/api/user-wallets`. Used in Settings (wallet manager), Invoices (wallet picker for receiving), and Withdraw Interest (wallet picker for destination). Replaces the old single "Spending Wallet" localStorage field. The Zustand `spendingWallet` field remains as a backward-compatible fallback.
- **Client-side Storage (Zustand)**: Stores wallet state, XRPL balances, vault deposits, and referral data.

### Monetization (Freemium)
- **Tiers**: Free, Premium (monthly/annual), and future Pro. Features gated by tier (e.g., number of exchanges/wallets, history depth, tax reports).
- **Gating**: Server-side enforced limits with 403 responses and frontend `UpgradePrompt`. Admin bypass for testing.
- **CSV Import**: Supports Ledger Live, Yahoo Finance, CoinTracker, and generic CSV formats.
- **Statement Insights**: PDF statement upload for comparing financial products against alternatives (Soil Treasury, HY Savings, T-Bills). Now includes "Crypto Yield Alternatives" section showing accept/decline recommendations (Soil vaults, Ondo, Centrifuge) based on detected traditional products. All statement data self-destructs after 15 minutes — PDF is never stored, extracted data auto-deleted from database via server-side timer. Frontend shows live countdown banner. Privacy-first "Mission Impossible" approach.
- **Onboarding Checklist**: 4-step guided funnel on dashboard for new users: (1) Earn Yield (connect XRPL wallet + deposit to Soil), (2) Add Wallet Addresses (paste cold wallet addresses across 24 chains), (3) Get Evaluated (Recommendations Hub analysis), (4) Go Premium. Auto-detects completion from existing state (XRPL store, wallet count, explicit user clicks). Client-side only (localStorage), dismissible, collapses when minimized. Component: `client/src/components/onboarding-checklist.tsx`.
- **Migration Guide**: Guided walkthrough for new users transitioning from other platforms.
- **Data Reconciliation**: Dedicated page for reviewing and truing up portfolio data, including duplicate detection, side-by-side comparison, and purchase lot management for wallet entries.
- **Affiliate/Referral**: Links for RLUSD, embedded Soil referral code, and user referral program.
- **Recommendations Engine**: Decision-tree-based asset optimization engine in `client/src/lib/custody-knowledge.ts`. Evaluates each asset through: Where is it held? (cold wallet / exchange / DeFi) → Is it earning yield? → Could it earn more elsewhere? → What's the best action? Shows "money left on the table" calculations. Includes exchange earning data (Coinbase, Kraken, Binance, Crypto.com), staking options, and DeFi alternatives. Skips dust balances (<$5). Features: scam token detection (URL patterns, long names) with dedicated red warning section; cross-wallet staked context (detects both liquid + staked entries on same wallet to show "Partially Staked" vs "Yield Available"); exchange earn enrollment uncertainty acknowledgment; consolidated view filters out scam tokens. TRX frozen balances shown as separate "TRX (staked)" entries. XRP has no defi alternatives (Soil vault is for RLUSD, not XRP). **On-Chain vs Custodial distinction**: Every yield option is tagged with `custodyType` ("on_chain" or "custodial") and `blockchain` (e.g., "Ethereum", "XRPL", "Cosmos"). Recommendations clearly explain whether the user keeps ownership (on-chain/DeFi/native staking) or hands assets to a company (exchange earn programs). Visual badges: green globe icon = on-chain (you keep your keys), amber building icon = custodial (company holds your assets). `custodyInfo` field on `AssetRecommendation` provides per-recommendation context. `custodyBadge` on `ActionItem` tags individual action steps. Philosophy: always guide users toward self-custody and on-chain solutions; flag custodial options as tradeoffs. Wallet-specific staking guides (`WALLET_STAKING_GUIDES`) provide step-by-step instructions per hardware wallet brand. Special handling for: VET (passive VTHO generation), stETH/HBARX (already-staked derivative tokens), HBAR on Stader (recognized as staked). UI in `client/src/components/recommendations-hub.tsx` with tabs: Optimize (main decision tree), By Asset (consolidated view), Staking, DeFi vs TradFi, Prices, Alerts.

## External Dependencies

### Database
- PostgreSQL

### Authentication
- Replit Auth

### Payments
- Crypto Payments (preferred) — on-chain verification for XRP, BTC, ETH, SOL, and more
- Stripe (card payments fallback)
- Admin manages crypto payment addresses via Admin Metrics page
- Payment verifier runs every 60s, auto-activates Premium on confirmed payment, expires pending payments after 30 minutes
- **Crypto Subscription Lifecycle**: `subscriptionExpiresAt`, `subscriptionPaymentMethod` ("stripe"/"crypto"), `subscriptionRenewalWallet` fields on user_settings. Crypto payments set 30-day (monthly) or 365-day (yearly) expiry. Renewal service (`server/services/subscription-renewal.ts`) runs hourly: sends Xaman payment request push to wallet (7d/3d/1d before expiry), falls back to email pay link via Resend, auto-downgrades to free on expiration. Renewal notifications tracked in `renewal_notifications` table. Dashboard shows color-coded renewal banner (blue 7d, amber 3d, red expired). API: `GET /api/subscription/status`.
- **Public Pay Page**: `/pay?to=rXXX&amount=50&currency=RLUSD&memo=...&tag=12345` — unauthenticated page for payment request links. Used by invoices, renewal emails, and shareable links. Shows Xaman button, QR code, manual send options.
- **Invoice Generation**: `/ownbank/invoices` — localStorage-based invoice creation for freelancers/businesses. Generates shareable pay links to the public `/pay` page.

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

### Recent Features
- **Cold Wallets Tab** (`recommendations-hub.tsx`): Portfolio-aware cold wallet guide inside the Recommendations Hub. Data model in `client/src/lib/cold-wallet-data.ts` covers 9 wallets (Ledger Nano X/S+/Stax, ELLIPAL, Arculus, SafePal, Trezor T/Safe 3, CypheRock). Personalized ranking by portfolio coverage %, quick picks, chain filter, earning opportunities per wallet, buy buttons. Premium-gated for personalized recommendations. Cross-linked from Earn & Yield EarningStatusSection and Setup Guide.
- **Statement Self-Destruct**: All statement analysis data auto-deletes from database 15 minutes after upload via server-side `setTimeout`. Frontend shows live countdown banner (amber → red at 2min). PDF buffer is never stored. Privacy-first approach.