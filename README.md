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

### XRPL (XRP Ledger) Features
- **RLUSD Yield Vaults** — Non-custodial deposits into Soil Protocol vaults earning 5.2%–8% APR on Real World Asset-backed yields
- **DEX Trading** — Advanced order book and Quick Swap across 44+ XRPL trading pairs, signed via Xaman (XUMM) wallet
- **Token Manager** — Set and manage XRPL trustlines for any issued token
- **Escrow Tracking** — Monitor and manage XRPL escrow conditions
- **XLS-66 Lending** — Support for the upcoming on-ledger lending amendment
- **Whale Alerts** — Real-time monitoring of large XRP and RLUSD movements with configurable thresholds
- **Send & Receive** — Direct XRP/token payments with destination tag support
- **Invoices & Recurring Payments** — Create payment requests and schedule automated recurring payments
- **OwnCoin POS** — Portable crypto point-of-sale terminal for receiving payments via QR code

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

### Self-Custody Guidance
- **Cold wallet recommendations** — Per-asset suggestions for hardware wallet security
- **Hold reason flags** — Flag assets intentionally kept on exchanges (staking, trading, liquidity) to suppress move-to-cold-wallet suggestions
- **Custody knowledge base** — Built-in data on which hardware wallets support which chains

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React, TypeScript, TailwindCSS, shadcn/ui, TanStack Query, Wouter |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL with Drizzle ORM |
| **XRPL** | xrpl.js, Xaman (XUMM) SDK for transaction signing |
| **Stellar** | Stellar SDK for payments and DEX operations |
| **Payments** | Stripe for subscription billing |
| **Price Data** | CoinGecko API, Chainlink price feeds, DeFiLlama |
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

---

## Blockchain Networks Supported

Bitcoin, Ethereum, XRP Ledger, Stellar, Solana, Cardano, Polkadot, Algorand, Cosmos, Tron, Cronos, Avalanche, Polygon, Hedera, Sui, Aptos, Near, Tezos, and more.

---

## Security

- **Non-custodial** — CryptoOwnBank never holds private keys or custodies user funds
- **Wallet signing** — All on-chain transactions are signed in the user's own wallet (Xaman/XUMM, Ledger, etc.)
- **Read-only tracking** — Public addresses are used for balance tracking only
- **Encrypted credentials** — Exchange API keys are stored with encryption at rest

---

## License

Proprietary. All rights reserved.

---

## Contact

- **Website:** [cryptoownbank.com](https://cryptoownbank.com)
- **Email:** pawint@me.com
