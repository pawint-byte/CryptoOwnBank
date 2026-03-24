# CryptoOwnBank (cryptoownbank.com)

## Overview
CryptoOwnBank is a multi-chain crypto platform combining portfolio tracker, non-custodial XRPL yield vault (Soil Protocol), Stellar payment tools, RWA yield discovery, Legacy Plan, DEX trading, DCA orders, EVM swaps via 1inch, cross-chain swaps via LI.FI, XRPL Bridge, and WalletConnect. Three-tier freemium: Free, Premium ($29/mo or $199/yr), Pro ($99/mo or $799/yr). Non-custodial only, no financial advice.

## User Preferences
Preferred communication style: Simple, everyday language. No technical jargon.

## CRITICAL CONTEXT FOR EVERY SESSION
**Read TODO.md AND session-logs/ before starting any work.** The user has expressed frustration about repeating himself across sessions. TODO.md is the official to-do list and decision log — it tracks pending items, referral links, external approvals, future improvements, and decisions made. Update it whenever items are completed or new ones are added. Session-logs/ contain detailed session history.

### Admin User
- **User ID**: `3e7353fc-9f2f-4f72-aba9-93c49b629b89` (pawint@me.com)
- **Yahoo Finance Import account ID**: `a586c00d-0e13-454b-ae50-765a6e2b20e6`

### Production Database Rules
- `executeSql` with `environment: "production"` is **READ-ONLY** — writes need API endpoints
- Scripts (tsx) hit the LOCAL DB, not production
- The `price_cache` table column is `price_usd` (Drizzle field: `priceUsd`), NOT `price`
- GitHub push times out from editor; user must push from Shell tab manually

### Known Data Issues (as of March 2026)
- **40 inflated manual wallet balances** (Coinbase, Uphold, Crypto.com) — user will fix manually when ready
- **Position symbols with suffixes**: Yahoo CSV import creates symbols like `$ADS`, `ALI16876`, `APT21794`. A normalizer in `shared/financial-math.ts` strips `$` prefix and trailing 4+ digit suffixes for price matching.
- **102 positions still have no matching price** in price_cache (161 entries). Adding exchange imports will help fill gaps.
- **WLFI 141M lot was deleted** — it was a data entry error ($25M cost basis). A startup cleanup prevents recurrence.

### Soil Protocol Vault Data
- Vault deposits are stored in **two places**: Zustand localStorage (stale, per-device) and backend positions table (accurate, synced from on-chain).
- The vault page (`ownbank-vaults.tsx`) now prefers backend position data over localStorage.
- Interest is calculated **per-deposit** — each transaction gets its own interest from its deposit date at the vault's APR.
- CREDIT+ vault address: `rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX` (8% APR)
- Treasury vault address: `rnvp6FiucXE7kjR8LKRocosWmg8pGhFZa8` (5.2% APR)

### Tax Harvest AI
- Scanner matches positions to prices using `price_cache` table (field: `priceUsd`, NOT `price`)
- Symbol normalizer strips `$` prefix and trailing 4+ digit suffixes
- Currently finds ~107 harvest opportunities across ~117 matched positions
- Gated to Premium/Pro subscribers

### Features Confirmed Working (user tested)
- DCA Orders
- Flare FTSO Rewards
- Tax Harvest AI (107 opportunities, $161K unrealized losses)
- Soil vault deposits and interest tracking

### Waiting On (External)
- MoonPay partner approval (on-ramp integration)
- Transak partner approval (on-ramp integration)
- Onramper API key (email sent requesting free/startup tier — ~$2K/year is too expensive)
- Stellar Development Foundation grant
- Ripple grant (Spring 2026 application window)
- XLS-65/66 XRPL validator activation (for native lending)

### Environment Secrets Available
- `FRED_API_KEY` — for real estate housing data (S&P/Case-Shiller)
- `ONEINCH_API_KEY` — for EVM DEX swaps
- `SESSION_SECRET` — for Express sessions
- `STRIPE_SECRET_KEY` — for payment processing
- `XUMM_API_SECRET` — for XRPL wallet signing

## System Architecture

### Frontend
- **Frameworks**: React 18 with TypeScript, shadcn/ui on Radix UI, Tailwind CSS.
- **State Management**: TanStack React Query for server state, Zustand for local/XRPL state.
- **Routing**: wouter
- **Key Files**:
  - `client/src/pages/ownbank-vaults.tsx` — Soil vault page with backend-sourced deposits
  - `client/src/pages/tax-reports.tsx` — Tax reports with Harvest AI
  - `client/src/components/mobile-tab-bar.tsx` — Mobile bottom navigation
  - `client/src/components/error-boundary.tsx` — Error boundary with 2-attempt auto-retry
  - `client/src/lib/xrpl-store.ts` — Zustand store for XRPL wallet state
  - `shared/financial-math.ts` — Tax calculations, harvest scanner, symbol normalizer

### Backend
- **Runtime**: Node.js with Express and TypeScript
- **Key Files**:
  - `server/routes.ts` — All API endpoints (~10,400 lines)
  - `server/storage.ts` — Database CRUD operations
  - `server/services/housing-index.ts` — FRED API real estate data
  - `shared/schema.ts` — Drizzle ORM schema

### Data Storage
- PostgreSQL with Drizzle ORM
- Key tables: users, accounts, transactions, positions, tax_lots, price_cache, wallets, wallet_balances

### External Dependencies
- xrpl.js, Xumm SDK, ethers.js v6, 1inch API, LI.FI, Squid Router, CoinGecko, DefiLlama, FRED API, Stripe, Resend email
