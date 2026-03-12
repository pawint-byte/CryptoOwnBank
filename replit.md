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
-   **A La Carte Add-Ons**: Monthly add-on subscriptions available on any tier (including free). Users can purchase individual features without upgrading. Add-ons include:
    -   **Multi-Chain** ($4.99/mo per chain): Unlock additional blockchain tracking (Ethereum, Bitcoin, Solana, Stellar, Cardano, Polygon). Free users get XRPL only by default.
    -   **Technical Analysis** ($9.99/mo): Unlock chart indicators (RSI, MACD, Bollinger Bands, etc.).
    -   **Payments** ($7.99/mo): Unlock XRP/XLM send/receive and recurring payment features.
    -   Add-on catalog defined in `server/stripe.ts` (ADDONS constant). User subscriptions tracked in `user_addons` table. Subscription limits endpoint merges add-ons with base tier.
    -   Both Stripe and crypto payment flows support add-on purchases. Crypto add-on payments use the `addon:` prefix in the plan field.
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

- **Technical Analysis** (`/technical-analysis`): Interactive price charts with technical indicators for 21 supported assets. Backend fetches OHLC data from CoinGecko with 2-hour in-memory cache. Client-side indicator library (`client/src/lib/indicators.ts`) computes SMA (20/50/200), EMA (12/26), RSI (14), MACD (12/26/9), and Bollinger Bands (20, 2σ). Free tier: SMA only + max 30-day timeframe. Premium/Pro: all indicators + up to 1-year timeframe. Charts use Recharts (ComposedChart for price + overlays, separate panels for RSI and MACD). Tier gating enforced both UI-side (disabled buttons) and server-side (OHLC endpoint limits free users to 30 days). Files: `client/src/lib/indicators.ts`, `client/src/pages/technical-analysis.tsx`, API routes in `server/routes.ts`.

- **XRPL Whale Alerts** (`/whale-alerts`): Real-time monitoring of large XRP (≥1M) and RLUSD (≥500K) transactions on the XRP Ledger. Backend service (`server/services/whale-monitor.ts`) subscribes to XRPL WebSocket transaction stream, filters whale-sized payments, enriches with USD value from price cache, and stores in `whale_alerts` table. RLUSD identification verifies both currency hex code and issuer address. API routes: `GET /api/whale-alerts` (free=24h, premium/pro=full history), `GET/PUT /api/whale-alerts/settings` (custom thresholds for paid tiers with input validation). Frontend page shows stats cards (total volume, XRP/RLUSD whale counts), live feed with auto-refresh, upgrade banner for free users, and settings panel for paid users. DB tables: `whale_alerts`, `whale_alert_settings`.

- **Payment Queue** (`/ownbank/payment-queue`): Offline payment caching for intermittent connectivity. Queue payments while offline (saved to localStorage), auto-detects connectivity via `navigator.onLine` + events, sync all queued payments when back online. XRPL payments sync via Xaman (QR/deep link). Stellar payments sync via `web+stellar:pay` deep link to Lobstr/Solar/Freighter/StellarTerm — user confirms completion. Proof of Delivery: captures on-chain TX hash, links to XRPScan/Stellar Expert, shareable receipt. Cached balance reference with effective balance (deducts already-queued amounts). Files: `client/src/lib/offline-queue.ts`, `client/src/hooks/use-online-status.ts`, `client/src/components/offline-banner.tsx`, `client/src/pages/payment-queue.tsx`.

- **SEO Foundations**: Comprehensive SEO infrastructure for all public pages. Reusable `SeoHead` component (`client/src/components/seo-head.tsx`) dynamically sets page title, meta description, canonical URL, Open Graph tags, Twitter tags, and optional JSON-LD structured data. Applied to 18 public pages (landing, yield-calculator, chain-guide, rwa-yields, stablecoins, insurance, migration-guide, faq, legal, privacy, setup-guide, signing-options, contact, pay, login, signup, stellar-send, stellar-remittances). `robots.txt` at `client/public/robots.txt` allows all crawlers and references sitemap. Server-side `/sitemap.xml` endpoint in `server/routes.ts` returns valid XML sitemap with all public routes. JSON-LD structured data: Organization + WebSite + SoftwareApplication on landing page; FAQPage schema on /faq page.
- **PWA Support**: Progressive Web App via `vite-plugin-pwa`. Service worker precaches app shell so it loads from cache without internet. API calls use NetworkFirst with 10s timeout fallback. Installable to home screen on iOS/Android. Files: `vite.config.ts` (VitePWA plugin), `client/public/pwa-*.svg` (icons).

- **Auto-Compound (Opt-in Re-deposit)**: Per-vault toggle on OwnBank dashboard that enables email notifications when yield arrives. When enabled, user receives email with one-tap re-deposit link. Settings stored in `auto_compound_settings` table. API routes: `GET /api/auto-compound`, `POST /api/auto-compound`. Email template: `sendYieldNotificationEmail()` in `server/email.ts`. Frontend: Switch toggle on each vault card in dashboard with status indicator.

- **Multi-Chain Yield Position Tracker**: Users can track yield positions across any protocol/chain from the Earn & Yield Explorer page. Supports Level 3 (full integration, XRPL/Stellar) and Level 2 (address tracking + deep links, EVM protocols). Protocol presets: Soil, Ondo, Centrifuge, Maple, Aave, Compound, UltraStellar, Lumenswap, or custom. Shows total deposited, blended APR, daily/monthly/yearly projections per position. Deep links to external protocol apps for Level 2 positions. Data stored in `yield_positions` table. API routes: CRUD at `/api/yield-positions`. Files: `client/src/pages/rwa-yields.tsx` (MyYieldPositions component), `shared/schema.ts`, `server/routes.ts`, `server/storage.ts`.

- **Email Fallback System**: Email sending tries `cryptoownbank.com` first, then `pawint-app.com` if domain not verified. Automatic failover with domain verification error detection. Files: `server/email.ts`.

- **Error Monitoring & Alerting** (`/admin/errors`): Internal error monitoring system for tracking production issues. Server-side: Express error middleware auto-captures API failures with full context (route, user, method, stack trace) in `error_logs` DB table. Process-level `unhandledRejection` and `uncaughtException` handlers capture critical errors. Client-side: React Error Boundary wraps app showing recovery UI on crashes. `window.onerror` and `unhandledrejection` handlers report client errors to backend. Failed API calls (5xx) auto-report from `queryClient.ts`. All errors get a fingerprint for deduplication. Critical/500+ errors trigger email alerts to admin via Resend (rate-limited: max 1 per 15 minutes). Admin page shows: daily stats (total, unique, most frequent), filterable/searchable error list with expandable details (user email, user ID, route, stack trace, metadata), and actions to mark errors as resolved/ignored/reopened. DB table: `error_logs`. Files: `server/errorMonitor.ts`, `client/src/components/error-boundary.tsx`, `client/src/pages/admin-error-monitor.tsx`.