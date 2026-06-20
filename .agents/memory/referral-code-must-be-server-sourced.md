---
name: Referral code must be server-sourced
description: Why every member-facing referral share link must read the code from /api/referrals/stats, never derive it client-side.
---

# Referral share links must use the server-issued code

The real referral system issues each member a **random** code stored in the
`referralCodes` table (server-side). Signup attribution (`recordReferralSignup`)
matches the inbound `?ref=CODE` against that exact row.

**Rule:** any member-facing "share/refer" surface must source its code from
`GET /api/referrals/stats` (`stats.code`). Never derive a code client-side
(e.g. from the wallet address like `address.slice(0,6)+address.slice(-4)`).

**Why:** a client-derived code will not match any `referralCodes` row, so
`recordReferralSignup` finds nothing and **silently no-ops** — the referral looks
shared but is never attributed. This actually shipped once: the dashboard
"Refer a Friend" widget used a wallet-derived pseudo-code while the referrals
page used the real server code, so dashboard-originated signups earned the
referrer nothing.

**How to apply:** when adding/auditing any referral link, copy button, native
share, or social-share, confirm the link is built from `stats.code`. Rewards are
**conversion-gated** — attributed only on a real Premium/Pro upgrade
(`stripe-webhook.ts` + `crypto-payment-verifier.ts`), never on a deposit and
never by gating identity. Keep all referral copy honest about that ("earn when
your friend upgrades", not "when you deposit").
