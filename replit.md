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
    -   **Stellar Integration**: Stellar Wallet Dashboard (connect address, XLM + token balances, reserve display), Send & Receive (tabbed with contacts, QR codes, payment URIs), Token Manager (trustline viewer, popular token quick-add, removal), Invoices (create payment requests with shareable links/QR), DEX (Quick Swap + Order Book view with 8 trading pairs), Send with Path Payments, Remittance Calculator & Corridor Guide, anchor directory.
    -   **Chain Guide**: Educational comparison of XRP vs XLM.
    -   **RWA Yield Explorer**: Recommender quiz, enhanced protocol cards (Soil, Ondo, Centrifuge, XDC, Maple, OpenEden, Backed Finance, Goldfinch, etc.), guided flows, RWA token tracking across chains, and live rate fetching from DefiLlama for real-time APY display.
    -   **XRPL AMM Pools**: Live XRPL AMM pool data (XRP/RLUSD, XRP/USD, XRP/USDT), pool liquidity tracking, user LP position detection, share percentage, and fee-earning visibility.
    -   **Flare FTSO Rewards**: Flare C-chain wallet tracking — FLR/WFLR balances, FTSO delegation status, estimated APY and reward projections, FlareDrop progress tracking, readiness checklist, reward calculator.
    -   **Stablecoin Dashboard**: Directory and user holdings for major stablecoins.
    -   **Recommendations Hub**: Asset optimization with 3-tier knowledge system: (1) 100+ curated tokens with specific wallet apps, staking platforms, APY ranges, and clickable links; (2) ecosystem fallback mapping unknown tokens to the right wallet family (Cosmos→Keplr, Solana→Phantom, etc.); (3) generic self-custody advice for truly unknown tokens. Includes scam token detection, on-chain vs. custodial distinction, wallet-specific staking guides, dismiss/restore functionality, and detailed earn options. Knowledge base in `client/src/lib/custody-knowledge.ts` — tokens are never removed, only added.
    -   **DCA (Dollar-Cost Averaging)**: Non-custodial recurring DEX buys on XRPL (14 pairs via Xaman approval) and Stellar (9 pairs). Scheduler creates pending executions; user approves each via mobile wallet. Supports daily/weekly/biweekly/monthly/quarterly frequencies with optional total-run limits. Read-only/cold wallets cannot sign — info card explains the hot wallet approach.
    -   **Legacy Plan**: Dead-man switch for crypto inheritance (Pro tier or $9.99/mo add-on). Configurable check-in frequency (weekly/biweekly/monthly/quarterly), grace period (7–90 days), secondary contact notification, encrypted beneficiary instructions per wallet type (CypheRock, Ledger, Xaman, etc.). Split delivery: multi-sig email splitting info across beneficiaries so they must collaborate. Annual review: yearly attestation button requiring login + explicit confirmation that beneficiaries, contacts, and instructions are still current.
    -   **Earn & Accumulate**: Strategy for accumulating XRP from Soil vault. Withdraw full position (principal + interest) from Soil → RLUSD returns to wallet → DCA order converts a configured portion of RLUSD to XRP on the XRPL DEX → redeposit remaining principal. User approves each step via Xaman (not fully automatic). Soil only supports full withdrawal — no partial, no interest-only. Premium/Pro tier required.
    -   **Real Estate Tracker**: Add properties with address, purchase price, and date. Values auto-update using regional housing indices — US properties use S&P/Case-Shiller metro or national composite (via FRED API), international properties use country-level historical appreciation rates. Supports 23 countries. Properties are included in Portfolio total value and allocation chart. Service: `server/services/housing-index.ts`, schema: `properties` + `housingIndices` tables.
    -   **Statement Insights (Source-Controlled)**: Upload bank/brokerage PDF statements to extract balances, rates, and account types. Each institution is tracked as a "Statement Source" — uploading a new statement for the same institution **replaces** the old holdings (never duplicates). Source matching is case-insensitive and normalized. Holdings persist and are included in the Portfolio's "Total Portfolio Value" and allocation chart under "Bank & Brokerage." Free tier limits the number of new sources; re-uploads to existing sources are always allowed. Rate comparisons and crypto yield alternatives (Soil vaults, Ondo, Centrifuge) are shown for Premium/Pro. Schema: `statementSources` + `statementHoldings` tables. API: `GET/PATCH/DELETE /api/statement-sources/:id`, `POST /api/statements/upload`.
    -   **Buy Crypto Wizard**: 3-step guided flow (token → wallet → instructions) covering 16 tokens. Personalizes based on user's existing wallets — detected wallets are highlighted with "You have this" badges, owned tokens show "You hold" badges, and wallets the user already owns are sorted to the top. Supports cold wallets (Ledger, CypheRock, Ellipal, SafePal, Arculus) and hot wallets (Xaman, Trust, MetaMask, Phantom, Keplr, Lobstr). Includes FAQ, disclaimer, and "put it to work" links per token. Page: `client/src/pages/buy-crypto.tsx`.
    -   **Payment Features**: Recurring payments, invoice generation, personal payment QR page, offline payment queuing, and shareable portfolio snapshot QRs.
    -   **Branding**: Customizable business profiles for invoices and payment links.
    -   **Technical Analysis**: Interactive price charts with indicators (SMA, EMA, RSI, MACD, Bollinger Bands) for 21 assets.
    -   **XRPL Whale Alerts**: Real-time monitoring of large XRP (≥1M) and RLUSD (≥500K) transactions on XRPL.
    -   **EVM Swap**: Multi-chain token swap powered by 1inch aggregation across Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, and BNB Chain. MetaMask + WalletConnect (50+ mobile wallets via QR scan) + Ledger signing, token approval flow, slippage control, 1% affiliate fee. Premium/Pro tier required.
    -   **Cross-Chain Swap**: Cross-chain token swaps powered by LI.FI aggregator — bridge + swap tokens across different EVM chains in one flow. Supports 30+ chains via 15+ bridges (Across, Stargate, Hop, etc.). Route visualization with step-by-step breakdown, estimated time, gas costs, and fee transparency. Sequential transaction approval via MetaMask. Status tracking for bridge settlement. Premium/Pro tier required. Backend: `server/routes.ts` (LI.FI proxy routes). Frontend: `client/src/pages/cross-chain-swap.tsx`.
    -   **XRPL Bridge**: Bridge tokens from EVM chains (Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BNB Chain) to native XRP on the XRP Ledger. Powered by Axelar cross-chain protocol via Squid Router. Features: chain/token selection, precise decimal-safe amount conversion, quote with fees/time/rate, route visualization, chain auto-switching, Axelarscan tracking. MetaMask + WalletConnect. Premium/Pro tier required. Backend: `server/routes.ts` (Squid API proxy routes at `/api/xrpl-bridge/*`). Frontend: `client/src/pages/xrpl-bridge.tsx`. Env: `SQUID_INTEGRATOR_ID`.
    -   **Progressive Web App (PWA)**: Installable on iPhone/Android home screen — full-screen standalone app with offline caching, fast loading, and auto-updates. Powered by VitePWA with Workbox. No App Store needed. Icons: `client/public/pwa-192x192.svg`, `client/public/pwa-512x512.svg`. Config: `vite.config.ts` VitePWA plugin.
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
    -   Email Notifications: Transactional emails for deposits, withdrawals, DEX trades, renewals, alerts, etc. Anti-phishing security phrase system injected into all outgoing emails via centralized `sendEmail` in `server/email.ts`. Feature announcement email system with admin composer, live preview, tier-based audience filtering, send history, and unsubscribe support.
    -   Monetization: Freemium model (Free, Premium, Pro tiers) and A La Carte Add-Ons with crypto and Stripe payments.
    -   Error Monitoring & Alerting: Server-side error capturing, client-side error reporting, and admin alerting via email.

### Data Storage
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Key Models**: Users, API Credentials, Accounts, Transactions, Positions, Tax Lots, Assets, Settings, Price Alerts, Wallets, Wallet Balances, User Wallets.
-   **Cost Basis**: `averageCost` and `totalCostBasis` fields on wallet balances, manually editable and API managed.
-   **Tax Lots**: Support `acquisitionType` field: `purchase` (default), `earned`, `airdrop`, `transfer`. Lots can be moved between wallet balances and distributed from import positions to live wallets.
-   **Manual Wallets**: `chain: "manual"` wallets for tracking exchange-held or off-chain assets without a public address. Balance is manually maintained. Skips blockchain sync.
-   **Lot Distribution**: Import position lots are distributed chronologically across live wallets until each wallet's capacity (live balance minus existing lots) is filled. Remaining lots stay on import with guidance to create manual entries.
-   **User Wallets**: Multi-purpose, labeled wallet addresses.
-   **Wallet Naming Convention**: All wallets use chain-prefixed labels enforced server-side. XRP wallets → `XRP_<name>`, Stellar wallets → `XLM_<name>`. The `POST /api/wallets` endpoint auto-prefixes labels and auto-generates smart names (`XRP_Wallet`, `XRP_Wallet_2`, etc.) when no label is provided. Rename endpoints (`PATCH /api/wallets/:id/label` and `PATCH /api/xaman-connections/:id/label`) sync labels bidirectionally between wallets and xaman_connections tables.
-   **Unified Wallet Creation**: Wallet creation is identical regardless of where it happens — the Wallets & Addresses page, the Dashboard, feature pages (DEX, Send, Tokens, etc.), or Stellar pages. All paths go through the same server endpoint which enforces consistent naming. Feature pages use `InlineXrplConnect` (Xaman QR flow) or `InlineStellarConnect` (address input) for inline wallet creation in empty states.
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

### EVM / DeFi
-   ethers.js v6 (EVM wallet connection, transaction signing)
-   1inch Aggregation API v6 (DEX swap routing, token approval, quote/swap across 7 EVM chains)
-   MetaMask / Ledger signing via browser wallet (non-custodial)
-   Supported chains: Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BNB Chain
-   Affiliate fee: 1% to 0xEc4e0f92BE6A1054FCfF951a5d28E55eB250E8a7
-   Frontend: `client/src/pages/evm-swap.tsx`, `client/src/lib/evm-wallet.ts`
-   Backend proxy: `/api/evm/*` routes in `server/routes.ts`

### Market Data
-   CoinGecko API (prices, 24h change)
-   DefiLlama Yields API (DeFi yield data)

### Analytics
-   Google Analytics 4 (GA4)