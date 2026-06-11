---
name: Admin Feature Announcements drafts source
description: Where the in-app Admin "Feature Announcements" Ready-to-Send drafts actually come from, vs the reference-only markdown files.
---

The in-app Admin → **Feature Announcements** tool ("Ready-to-Send Drafts") does NOT read from the `.local/announcements/*.md` files. Those markdown files are reference/launch-collateral only (for HeyGen scripts, email copy, social posts) and never feed any UI.

**Where drafts really live:** a hardcoded `SAVED_DRAFTS` array in `client/src/pages/admin-announcements.tsx`. To make a new announcement appear as a Ready-to-Send draft, add an entry there. (Convention also recorded in `replit.md`.)

**Sent vs unsent:** computed by EXACT title match against the persisted announcements table. A draft whose title is not yet in that table renders as "Not sent" and sorts to the top. So keep a draft's title stable after sending or the sent/unsent dedupe breaks.

**Why:** founder expected an email drafted as a markdown file to show up in this admin tool; it didn't, because the two are unrelated systems. Always add to the array, not just a markdown file.

**Note on tool-output artifact:** ripgrep/search output in this repo sometimes renders the literal token `ln` in place of real words (e.g. shows `lns` table, `featurelns`, `/admin/lns`, draft titles starting "ln on CryptoOwnBank"). This is a display artifact — the real route is `/admin/announcements`, real file is `admin-announcements.tsx`. Verify actual source text with the read tool before editing.
