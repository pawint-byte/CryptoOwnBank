---
name: Promo campaign self-distribution
description: How crypto-date promo campaigns surface to members (banner) and auto-email, plus the dedupe + doctrine rules that keep it safe.
---

# Promo campaign self-distribution

Crypto-date campaigns (defined in `shared/promo-calendar.ts`) reach members three ways, all fed from that one file so copy never diverges: an in-app banner, founder-sendable drafts, and an automatic email when a window opens.

## Rules that must hold

- **Single source of truth for copy.** Announcement wording is composed once by `buildCampaignAnnouncement(c)`; the admin drafts list and the auto-sender both consume it. Add a campaign and it automatically gets a banner, a draft, and an auto-send — never hand-duplicate per-campaign copy.
- **Client only ever reads `/api/promo/active`.** The banner mirrors whatever that endpoint says is active; never re-derive active windows on the client. The endpoint already excludes per-user anniversaries.
- **Anniversary (per-user) campaigns are excluded from global distribution** (banner, drafts, auto-send). Only fixed + birthday campaigns blast globally; a per-user date must never become an all-members email.
- **Auto-send dedupe = one row per occurrence.** Dedupe key is `title` + `sentAt >= activeWindowStart`. The check-and-insert runs inside a transaction guarded by `pg_advisory_xact_lock` so overlapping scheduler runs (multi-instance) or a manual send racing the scheduler can't both create a row. The row is committed *before* any email goes out, so a concurrent run sees it and skips. A manual send during the same window also blocks the auto-send (same title match).
  - **Why:** a plain read-then-write dedupe double-sends under multi-instance deploys; the codebase's other schedulers use naive setInterval, so the advisory-lock transaction is the proportionate fix without a schema change.

## Doctrine (carries the brand line)

- Free Founding-seat signup is **never** gated by any promo/discount. The crypto bonus is only ever a thank-you on a **paid upgrade**, never a toll on signing up.
- Every announcement keeps the non-custodial line: we never hold funds, keys, or identity.
- Master kill-switch for auto-send: env `PROMO_AUTO_ANNOUNCE_DISABLED=1`.
