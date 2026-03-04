# CryptoBroker Tracker + OwnBank XRPL

## Overview

CryptoBroker Tracker is a cryptocurrency and investment portfolio management application with an integrated OwnBank XRPL yield dashboard. Users can connect crypto exchanges and brokerage accounts to monitor portfolio performance, track transactions, and generate tax reports. The OwnBank section enables non-custodial XRPL wallet connections (Xumm/Ledger) to deposit RLUSD into Soil Protocol yield vaults, track accrued interest, and withdraw only earned interest while keeping principal locked.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, Zustand for XRPL wallet/vault state (localStorage persistence)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for light/dark themes
- **Charts**: Recharts for portfolio and allocation visualizations
- **Forms**: React Hook Form with Zod validation
- **XRPL Integration**: xrpl.js for blockchain queries, Xumm SDK for wallet signing, Ledger HW libs for hardware wallets

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful API endpoints under `/api/*`
- **Build System**: Vite for frontend, esbuild for server bundling
- **Payments**: Stripe for premium subscriptions ($9/month, $79/year)

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Managed via `drizzle-kit push`
- **Client-side Storage**: Zustand with localStorage persistence for XRPL wallet state, vault deposits, referral data

### Authentication
- **Provider**: Email/password auth (primary), legacy Replit Auth (OIDC) still supported
- **Email Auth**: Signup with email verification, login, forgot/reset password flows
- **Password Security**: scrypt hashing with random salt, 8+ chars with uppercase/lowercase/number requirements
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple (7-day TTL)
- **Admin System**: isAdmin flag on users table, admin dashboard at /admin/users for user management and auth migration
- **XRPL Wallets**: Non-custodial — Xumm and Ledger hardware wallet connections (no keys stored server-side)

### Key Data Models (PostgreSQL)
- **Users**: id (UUID), email, firstName, lastName, passwordHash, emailVerified, emailVerifyToken, passwordResetToken, passwordResetExpires, authProvider, isAdmin, createdAt, updatedAt
- **API Credentials**: Encrypted storage for exchange API keys (Binance, Coinbase, etc.)
- **Accounts**: Linked exchange/brokerage accounts
- **Transactions**: Buy/sell records with quantity, price, and date
- **Positions**: Aggregated holdings with cost basis tracking
- **Tax Lots & Gain Events**: For FIFO/LIFO tax calculations
- **Assets**: Cryptocurrency/stock metadata with price tracking
- **User Settings**: Tax method, currency preferences

### Key Data Models (Client-side Zustand)
- **Wallet State**: walletAddress, walletType (xumm/ledger), connection status
- **Balances**: XRP and RLUSD balances from XRPL mainnet
- **Vault Deposits**: Array of {vaultId, vaultName, principal, depositDate, apr}
- **Referral System**: referralCode, referrals array, referredBy, premiumCreditMonths
- **Spending Wallet**: User-defined XRPL address for interest withdrawals
- **Subscription Tier**: free or premium

### Application Pages

#### CryptoBroker Section
- Dashboard: Portfolio overview with metrics, charts, and recent transactions
- Transactions: Full transaction history with manual entry support
- Portfolio: Detailed position breakdown with allocation visualization
- Tax Reports: Capital gains calculations with FIFO/LIFO support and CSV export
- Integrations: Exchange API key management
- Settings: User preferences, spending wallet, subscription management

#### OwnBank XRPL Section
- OwnBank Dashboard (`/ownbank`): XRPL wallet connection (Xumm/Ledger), XRP/RLUSD balances, interest metrics, referral link, affiliate buy buttons
- Vaults (`/ownbank/vaults`): Soil Protocol RLUSD yield vaults (Treasury 5.2% APR, Private Credit 7.8% APR), deposit flow with Soil referral code
- Withdraw Interest (`/ownbank/withdraw`): Interest-only withdrawal with principal protection, freemium gating for auto-withdraw
- History (`/ownbank/history`): XRPL transaction history from blockchain
- My Referrals (`/ownbank/referrals`): Referral link, stats, referred user list
- XLS-66 Lending: Placeholder (Coming Q2 2026)

## File Structure

### XRPL Client Libraries
- `client/src/lib/xrpl-store.ts` — Zustand store for wallet, vault, referral state
- `client/src/lib/xrpl-client.ts` — XRPL mainnet client (balances, transactions, prices)
- `client/src/lib/xumm-connector.ts` — Xumm wallet connection and signing
- `client/src/lib/ledger-connector.ts` — Ledger hardware wallet via WebUSB

### Auth System
- `server/replit_integrations/auth/routes.ts` — Auth API routes (signup, login, verify-email, forgot-password, reset-password, logout, admin endpoints)
- `server/replit_integrations/auth/replitAuth.ts` — Session setup, isAuthenticated/isAdmin middleware
- `server/replit_integrations/auth/storage.ts` — User CRUD operations
- `server/services/email-auth.ts` — Password hashing (scrypt), token generation, validation
- `client/src/pages/login.tsx` — Email/password login
- `client/src/pages/signup.tsx` — Registration with email verification
- `client/src/pages/forgot-password.tsx` — Password reset request
- `client/src/pages/reset-password.tsx` — Set new password via token
- `client/src/pages/verify-email.tsx` — Email verification handler
- `client/src/pages/admin-users.tsx` — Admin user management dashboard

### Stripe Integration
- `server/stripe.ts` — Stripe checkout session creation, plan config

### Components
- `client/src/components/xrpl-disclaimer.tsx` — Non-custodial disclaimer banner

## External Dependencies

### Database
- PostgreSQL (required, configured via `DATABASE_URL` environment variable)

### Authentication
- Replit Auth (OpenID Connect provider)
- Requires `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET` environment variables

### Payments
- Stripe (`STRIPE_SECRET_KEY` environment variable)
- Premium plans: Monthly $9, Yearly $79

### XRPL Libraries
- xrpl.js — XRPL mainnet WebSocket client
- xumm — Xumm SDK for wallet connection and transaction signing
- @ledgerhq/hw-app-xrp — Ledger hardware wallet support
- @ledgerhq/hw-transport-webusb — WebUSB transport for Ledger

### Frontend Libraries
- @tanstack/react-query for data fetching
- zustand for client-side state management
- Radix UI primitives for accessible components
- Recharts for data visualization
- date-fns for date formatting
- lucide-react for icons

### Backend Libraries
- Drizzle ORM for database operations
- Passport.js with OpenID Connect strategy
- crypto module for API key encryption/decryption
- stripe for payment processing

## Monetization Model
- **Freemium**: Free tier (basic tracking, manual withdraw) + Premium ($9/mo or $79/yr for auto-withdraw, tax export, priority vaults)
- **Affiliate Links**: Binance/Kraken/Coinbase referral links for buying RLUSD
- **Soil Referral**: Embedded referral code in deposit flow for SEED points
- **User Referrals**: Invite friends, earn premium credits

## Landing Page
- Full marketing site at `/` for unauthenticated users
- Sections: Hero, How It Works (4 steps), Features (6 cards), Member Stories (4 benefit stories), What is RLUSD, Pricing (Free vs Premium), Security, FAQ (12 questions), CTA
- Header nav links: How It Works, FAQ, Pricing (smooth scroll anchors)
- CryptoOwnBank branding with XRPL blue (#00A4E4)
- Exchange links: Coinbase, Kraken, Binance for buying RLUSD
- Legal disclaimer in footer

## Email Notifications (Resend)
- `server/email.ts` — Resend integration via Replit connector (not manual API key)
- Templates: Welcome, Deposit Confirmation, Withdrawal Confirmation, Premium Welcome, Email Verification, Password Reset
- Sender: notification@pawint-app.com (verified domain)

## Core Rules (OwnBank)
- 100% non-custodial: never store private keys
- All transactions signed client-side via Xumm or Ledger
- Principal protection: users can only withdraw accrued interest
- Disclaimer on every OwnBank page
