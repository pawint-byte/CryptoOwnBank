# CryptoOwnBank

**Your non-custodial crypto command center — portfolio tracking, yield generation, and decentralized payments across multiple blockchains.**

Live at [cryptoownbank.com](https://cryptoownbank.com)

---

## What is CryptoOwnBank?

CryptoOwnBank is a multi-chain crypto platform that combines portfolio tracking, non-custodial yield vaults, DEX trading, and payment tools into a single interface. Users connect their existing wallets — the platform never holds private keys or custodies funds.

The platform supports 24+ blockchain networks and integrates deeply with the **XRP Ledger** and **Stellar** networks for on-chain commerce, yield generation, and cross-border payments.

---

## Key Features

### Portfolio & Wallet Management
- **Multi-chain wallet tracking** — Connect public addresses from Bitcoin, Ethereum, XRP Ledger, Stellar, Solana, Cardano, Polkadot, Algorand, Cosmos, and 15+ other networks
- **Exchange integration** — Sync balances from Coinbase, Kraken, Binance, Uphold, and more via API keys
- **Cost basis tracking** — FIFO/LIFO tax lot management with capital gains calculations
- **Tax reports** — IRS-ready CSV, PDF, and TurboTax export formats
- **Statement insights** — Upload bank/brokerage statements to compare traditional vs. crypto yields
- **Manual imports** — CSV support for Ledger Live, Yahoo Finance, and CoinTracker
- **Real estate tracker** — Track property holdings alongside crypto for total net worth view

### Trading & Swaps
- **EVM Swap** — Token swaps on Ethereum, Polygon, Avalanche, and other EVM chains via 1inch aggregator
- **Cross-Chain Swap** — Swap tokens across different blockchains using LI.FI bridge aggregator
- **XRPL Bridge** — Bridge assets between XRP Ledger and EVM chains
- **DCA Orders** — Automated dollar-cost averaging with customizable intervals
- **Buy Crypto** — Guided on-ramp wizard with MoonPay, Transak, and Topper integration pre-filled with wallet addresses

### XRPL (XRP Ledger) Features
- **RLUSD Yield Vaults** — Non-custodial deposits into Soil Protocol vaults earning 5.2%–8% APR on Real World Asset-backed yields
- **DEX Trading** — Advanced order book and Quick Swap across 44+ XRPL trading pairs, signed via Xaman (XUMM) wallet
- **Token Manager** — Set and manage XRPL trustlines for any issued token
- **Escrow Tracking** — Monitor and manage XRPL escrow conditions
- **XLS-66 Lending** — Support for the upcoming on-ledger lending amendment
- **Whale Alerts** — Real-time monitoring of large XRP and RLUSD movements with configurable thresholds, powered by live WebSocket feeds
- **Send & Receive** — Direct XRP/token payments with destination tag support
- **Invoices & Recurring Payments** — Create payment requests and schedule automated recurring payments
- **OwnCoin POS** — Portable crypto point-of-sale terminal for receiving payments via QR code
- **Wallet ID** — Human-readable wallet identification via PayString and XRPL x-address lookup

### Stellar Features
- **Stellar Wallet** — Native XLM and Stellar asset management
- **DEX Trading** — Trading across 13+ Stellar pairs
- **Remittances** — Streamlined cross-border payment tools optimized for Stellar's speed and low fees
- **Anchor Integration** — Support for Stellar's anchor system for fiat on/off ramps
- **Token Manager** — Manage Stellar trustlines and anchored assets

### Research & Intelligence
- **Stablecoin Dashboard** — Track major stablecoins across networks with yield comparisons
- **RWA Yield Discovery** — Browse and compare Real World Asset yield opportunities
- **Native Staking Guide** — Staking information and yield data for proof-of-stake networks
- **DeFi Borrowing Hub** — Compare decentralized borrowing rates across protocols
- **Insurance Directory** — Crypto insurance and coverage options
- **Technical Analysis** — Candlestick charts with automated pattern detection and 10-year price history
- **Recommendations Hub** — Personalized staking and yield suggestions based on current holdings

### Self-Custody & Legacy
- **Cold wallet recommendations** — Per-asset suggestions for hardware wallet security (Ledger, Trezor, Tangem, etc.)
- **Hold reason flags** — Flag assets intentionally kept on exchanges (staking, trading, liquidity) to suppress move-to-cold-wallet suggestions
- **Custody knowledge base** — Built-in data on which hardware wallets support which chains
- **Legacy Plan** — Digital inheritance planning for crypto assets with designated beneficiaries and recovery instructions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React, TypeScript, TailwindCSS, shadcn/ui, TanStack Query, Wouter |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL with Drizzle ORM |
| **XRPL** | xrpl.js, Xaman (XUMM) SDK for transaction signing |
| **Stellar** | Stellar SDK for payments and DEX operations |
| **EVM Swaps** | 1inch Aggregation API |
| **Cross-Chain** | LI.FI Bridge Aggregator |
| **Payments** | Stripe for subscription billing, crypto payments (XRP, XLM, RLUSD) |
| **Price Data** | CoinGecko API, Chainlink price feeds, DeFiLlama |
| **Security** | Helmet, express-rate-limit, httpOnly/secure/sameSite cookies |
| **Monitoring** | Custom error monitor with email alerts and fingerprinted error tracking |
| **Deployment** | Replit |

---

## Architecture

```
client/                  # React frontend
  src/
    pages/               # All application pages
    components/          # Reusable UI components
    hooks/               # Custom React hooks
    lib/                 # Utilities and API client

server/                  # Express backend
  routes.ts              # All API endpoints
  storage.ts             # Database interface (CRUD)
  errorMonitor.ts        # Error capture, fingerprinting, and email alerting
  services/              # Background services (whale monitor, price cache, DCA, etc.)
  vite.ts                # Dev server configuration

shared/                  # Shared between frontend and backend
  schema.ts              # Drizzle ORM models and Zod validation
  asset-categories.ts    # Crypto asset classification
```

---

## Subscription Tiers

| Tier | Price | Highlights |
|------|-------|-----------|
| **Free** | $0/mo | 1 exchange, 1 wallet, basic yield access, 1 price alert |
| **Premium** | $29/mo or $199/yr | Unlimited exchanges/wallets, DEX trading, full history, tax reports |
| **Pro** | $99/mo or $799/yr | XLS-66 lending, DeFi borrowing, batch payments, team seats |

10% discount available when paying with crypto (XRP, XLM, RLUSD).

---

## Blockchain Networks Supported

Bitcoin, Ethereum, XRP Ledger, Stellar, Solana, Cardano, Polkadot, Algorand, Cosmos, Tron, Cronos, Avalanche, Polygon, Hedera, Sui, Aptos, Near, Tezos, Flare, XDC, and more.

---

## Security

### Non-Custodial Architecture
- CryptoOwnBank **never holds private keys** or custodies user funds
- All on-chain transactions are signed in the user's own wallet (Xaman/XUMM, Ledger, etc.)
- Public addresses are used for read-only balance tracking only

### Server-Side Protections
- **Helmet** — Security headers (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.)
- **Rate limiting** — API endpoints rate-limited (300 req/15 min general, 30 req/15 min for auth routes) to prevent abuse
- **Session security** — httpOnly, secure, sameSite=lax cookies with PostgreSQL-backed session store
- **Encrypted credentials** — Exchange API keys stored with encryption at rest
- **Parameterized queries** — Drizzle ORM prevents SQL injection throughout

### Monitoring & Alerting
- Custom error monitor with SHA-256 fingerprinting for deduplication
- Critical error email alerts (rate-limited to 1 per 15 minutes)
- Unhandled promise rejection and uncaught exception capture
- Request metadata logging (method, route, status, duration)

### Best Practices
- No API keys or secrets logged to console
- CoinGecko/Chainlink API calls include backoff and retry on rate limits
- XUMM payload signing delegated to user's wallet — server never touches private keys

---

## License

Proprietary. All rights reserved.

---

## Contact

- **Website:** [cryptoownbank.com](https://cryptoownbank.com)
- **Email:** pawint@me.com
