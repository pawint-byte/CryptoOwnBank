---
name: Admin Feature Announcements drafts source
description: Where the in-app Admin "Feature Announcements" Ready-to-Send drafts actually come from, vs the reference-only markdown files.
---

The in-app Admin → **Feature Announcements** tool ("Ready-to-Send Drafts") does NOT read from the `.local/announcements/*.md` files. Those markdown files are reference/launch-collateral only (for HeyGen scripts, email copy, social posts) and never feed any UI.

**Where drafts really live:** a hardcoded `SAVED_DRAFTS: AnnouncementDraft[]` array near the top of `client/src/pages/admin-announcements.tsx`. To make a new announcement appear as a Ready-to-Send draft, add an entry there with shape `{ title, description, ctaLabel, ctaUrl, audienceTier }`.

**Sent vs unsent:** computed by EXACT title match — `sentTitles = new Set(announcements.map(a => a.title))` where `announcements` come from the persisted table (CRUD in `server/routes/billing.ts`, ~lines 232/279/316). A draft with a title not in that set renders as "Not sent" and sorts to the top. So keep a draft's title stable after sending or dedupe breaks.

**Why:** founder expected an email drafted as a markdown file to show up in this admin tool; it didn't, because the two are unrelated systems. Always add to the array, not just a markdown file.

**Note on tool-output artifact:** ripgrep/search output in this repo sometimes renders the literal token `ln` in place of real words (e.g. shows `lns` table, `featurelns`, `/admin/lns`, draft titles starting "ln on CryptoOwnBank"). This is a display artifact — the real route is `/admin/announcements`, real file is `admin-announcements.tsx`. Verify actual source text with the read tool before editing.
