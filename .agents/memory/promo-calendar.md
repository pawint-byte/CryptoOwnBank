---
name: Crypto-date promotional calendar
description: How the promo-calendar feature is structured and the doctrine/discount constraints it must keep.
---

The promotional calendar anchors campaigns to crypto dates to drive FREE signups into the Founding seat, with an optional per-date crypto-payment discount.

**Single source of truth:** `shared/promo-calendar.ts` holds campaign defs + pure date-window helpers and is imported by BOTH client (landing page, admin view) and server (discount math, /api/promo/active). Keep it dependency-free so both sides can import it.

**Discount doctrine (non-negotiable):**
- The free signup / Founding-seat claim is NEVER gated by any promo or discount. The crypto-payment bonus is a carrot on a PAID upgrade only.
- The per-date bonus is additive on top of the base crypto discount (10%, or 15% house chains) and the TOTAL is capped (currently 30%) in `getEffectiveCryptoDiscountRate` so stacking can never run away.
- `applyCryptoDiscount(usd, chain, ctx?)` is backward compatible: existing 2-arg callers still work and auto-pick-up active GLOBAL windows; the personal join-anniversary window only applies when billing passes `{ joinDate }` (fetched from `users.createdAt`).

**Date math:** windows are UTC, check current + previous year so year-boundary windows work; member-anniversary skips roughly the first year so a brand-new signup isn't "celebrating".

**Founding Day = Jan 13** (`CRYPTOOWNBANK_BIRTHDAY` = {month:1, day:13}, `CRYPTOOWNBANK_FOUNDED_YEAR` = 2026) — the date the site first went live (found via the earliest "Published your App" checkpoint in git history). The birthday campaign ("Founding Day") shows an "Est. 2026 · Year N" badge. This is a chosen brand anchor, not a hard constraint — founder can rename/move it.

**Why:** founder's framing is "promote/market for signups via crypto dates + referrals"; the whole program was approved at once. Splitting into sub-tasks is for our bookkeeping only and must never turn into re-asking the user to approve something already greenlit.
