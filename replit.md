# CryptoOwnBank (cryptoownbank.com)

## Overview
CryptoOwnBank is a multi-chain crypto platform combining portfolio tracker, non-custodial XRPL yield vault (Soil Protocol), Stellar payment tools, RWA yield discovery, Legacy Plan, DEX trading, DCA orders, EVM swaps via 1inch, cross-chain swaps via LI.FI, XRPL Bridge, and WalletConnect. Three-tier freemium: Free, Premium ($29/mo or $199/yr), Pro ($99/mo or $799/yr). Non-custodial only, no financial advice.

## User Preferences
Preferred communication style: Simple, everyday language. No technical jargon.

## MANDATORY — READ BEFORE DOING ANYTHING

### STOP. Read these files NOW before responding to the user:
1. **TODO.md** — The official to-do list and decision log. Contains pending items, referral links, external approvals, legislation items, future improvements, and all decisions with dates and reasons.
2. **session-logs/** — Detailed session history with what was built, discussed, and decided.

### Rules for TODO.md:
- **Read it at the start of every session. No exceptions.**
- **Update it whenever you complete something, add something, or make a decision.**
- **Every new entry must include today's date.**
- **Completed items must include the date completed.**
- **Update the "Last updated" timestamp at the top when you make changes.**
- **Never claim something is in TODO.md without verifying it is actually there.**
- **Never tell the user you created something without actually creating it.**

### Why this matters:
The user has been repeatedly told that things were done when they were not. He has had to repeat himself across sessions because information was lost. This is unacceptable. TODO.md exists specifically to prevent this. If you skip reading it, you are wasting the user's time and money.

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
- `OPENAI_API_KEY` — for AI Portfolio Assistant (GPT-4o-mini)
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
- Key tables: users, accounts, transactions, positions, tax_lots, price_cache, wallets, wallet_balances, legacy_plans, legacy_beneficiaries, legacy_check_ins, ai_chat_messages
- Legacy Plan: `wallets.hardwareDevice` tags which hardware/software holds each address. `legacy_beneficiaries` has `encryptedVault` (AES-256-GCM client-side encrypted), `encryptedVaultHint`, `walletAssetSummary`. Standalone `/decrypt` page (no login required) for survivors.
- Legacy Plan v2 Vault Verification Capsule: each beneficiary's `encryptedVault` is paired with `vaultVerificationCapsule` — a tiny `OK:<nonce>` payload encrypted with the same passphrase at vault-creation time. Owner clicks "Verify" on the People tab → beneficiary receives an email link to `/verify-passphrase/:token` → browser-only PBKDF2+AES-GCM decryption → only `{success: true|false}` returns to server. Sets `vaultVerifiedAt`. Editing the vault clears verification status (token + verifiedAt + sentAt all nulled in PATCH guard). Readiness check warns when verification is missing or older than 6 months.
- Legacy Plan v2 Last-Resort Fallback: if SLIP-39 shards are never reconstructed within `lastResortWindowDays` (default 365) after trigger, scheduler enters notify (30d) → confirm (60d) → release. All beneficiaries + secondaryContact + owner share one 64-char `lastResortObjectionToken` mailed to them; objections allowed only from those stakeholder emails (enforced server-side). Phase transitions use atomic compare-and-set in `legacy_plans` to prevent duplicate sends and pre-release race vs. objection arrival. Audit trail in `lastResortAuditLog`.
- Legacy Plan billing options (3 SKUs, mutually exclusive — purchasing one blocks the others until cancelled): `legacy-plan` $9.99/mo, `legacy-plan-yearly` $79/yr, `legacy-plan-lifetime` $499 one-time. Lifetime uses Stripe `mode: 'payment'` (not subscription) — `expiresAt` set to `null` in `user_addons`. Crypto payment verifier sets `expiresAt` correctly per cycle: null for lifetime, +1yr for yearly, +30d for monthly. `hasLegacyAccess` checks all three keys + Pro tier. Crypto payments get automatic 10% discount across all variants ($8.99/mo, $71.10/yr, $449.10 lifetime).

### External Dependencies
- xrpl.js, Xumm SDK, ethers.js v6, 1inch API, LI.FI, Squid Router, CoinGecko, DefiLlama, FRED API, Stripe, Resend email, OpenAI (GPT-4o-mini)

## Backlog (post-Legacy-Plan v2)

### Family Collaborative Mode (high priority — next major build after Legacy Plan v2 ships)
**Concept:** Family members get their own seats on cryptoownbank.com with read-only or "proposer" permissions. Kid sees the dashboard, can propose a buy/swap/DCA — primary member gets notified, signs the transaction in their own wallet (Xaman/MetaMask/Ledger). Site never holds keys for anyone. Pure intent/proposal layer + parent-signs-with-own-wallet execution.

**Why:** Education layer for families, sticky retention (kids learn here, upgrade to own paid accounts at 18), justifies the Family/Lifetime tier with real value beyond a discount, and the "people" already in someone's Legacy Plan are the natural family seats.

**Key design constraints (security):**
- Non-custodial — keys never leave member device. We construct tx data, parent signs.
- Per-seat 2FA required. Kid account changes notify the primary, not just the kid.
- Hard rate limits on proposals per kid (max 3 pending). Cooling-off delays on amounts above thresholds the parent sets.
- Two-channel confirmation (wallet sig + email click) for proposals above auto-approve cap.
- Auto-approve presets are off by default; if shipped, capped at $25/mo absolute, allow-listed tokens only, instant revoke + cooldown if kid tries to raise.
- "Kid grows up" offramp: clean conversion of apprentice seat → own full account with own wallet, with mutual opt-in to keep collaboration.
- No CEX integration in collaborative mode at first — DEX/proposal flows only, since CEX implies custody.

**Pricing tie-in:** Family/Lifetime tier ($199–249/yr or $1,499 lifetime) includes 5 family seats. Lifetime seat passes to primary beneficiary on trigger.

**Scope estimate:** 2–3 month build with security review. Bones already exist (multi-wallet, non-custodial signing, DCA/DEX tx construction, Legacy Plan people-as-first-class).

**Pre-work that validates demand (do these first as cheap signal tests):**
1. Post-confirmation landing page — when a beneficiary clicks "I accept," show "Mary trusted you with her crypto. Start your own free account." Measure click-through.
2. Heartbeat-email and PDF-export footers — soft CTAs to free accounts.
