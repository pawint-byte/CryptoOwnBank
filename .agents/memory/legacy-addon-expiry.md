---
name: Legacy Plan add-on expiry rules
description: Why card vs crypto purchases of the same Legacy Plan SKU get different expiry dates
---

Legacy Plan add-on expiry depends on BOTH the SKU and the payment rail. Single
source of truth: `computeLegacyAddonExpiry(addonKey, paymentMethod)` in
`server/stripe.ts`; access gate: `isLegacyAddonActive(addon)`.

- Lifetime → no expiry (null), both rails.
- 5-Year → +5 years, both rails.
- Monthly / Annual (recurring SKUs):
  - **Card (stripe)** → expiresAt = null. The Stripe subscription auto-renews;
    access is revoked via the `customer.subscription.deleted/updated` webhook,
    NOT a stored expiry.
  - **Crypto** → one-time prepayment, so a concrete expiry is stored
    (Annual +1yr, Monthly +30d).

**Why:** a null expiry means "active until canceled" for live card subs, but
"prepaid term" doesn't auto-renew, so crypto must carry a real date. Mixing
these up would either cut off paying card members or give crypto buyers
unlimited access for one payment.

**How to apply:** any new Legacy SKU or new payment rail must go through
`computeLegacyAddonExpiry` — don't reinline date math in the webhook
(`server/routes.ts`) or crypto verifier
(`server/services/crypto-payment-verifier.ts`).

## Pre-expiry warning sweep
Only the SKUs with a stored (non-null) expiry that does NOT auto-renew get an
advance warning email ~30 days out: `legacy-plan-5yr` (both rails) and
crypto-paid `legacy-plan-yearly`. Lifetime (null) and card-paid recurring
(null, auto-renews) are excluded — filtering by `expiresAt != null` naturally
drops card-paid Annual. Crypto monthly is intentionally out of scope (a 30-day
warning would fire at purchase). Sweep lives in
`checkAndWarnLegacyExpiry()` (`server/services/subscription-renewal.ts`),
de-dupes via `renewal_notifications` type `legacy_expiry` with a >30-day window
so the 4h timer emails once per cycle, and links to `/pricing` to renew.
