---
name: Redacting member-supplied screenshots before publishing
description: How/why to scrub PII from member screenshots before embedding them on any public page or committing them
---

When a member sends screenshots to be used as a help/guide on a PUBLIC page, assume
they may contain live secrets: receiving addresses, deposit addresses, memos/tags,
transaction IDs, and session IDs in the URL bar. For a privacy product this is
severe — e.g. a Monero receiving address ties the member to Monero, and an XRP
deposit address + memo lets the transfer be traced on a public ledger.

**Rule:** never embed a member screenshot on a public page without scrubbing it,
and never leave the unredacted original in the working tree.

**Why:** `attached_assets/` gets committed with the repo, and `@assets/...` imports
bundle+serve the image publicly. So both the published page AND the committed
original can leak. (Git checkpoint history may still hold an old copy — tell the
member that history can't be easily purged.)

**How to apply:**
- `sharp`/`jimp`/`canvas` are NOT installed, but ImageMagick IS
  (`magick`/`convert`). Black out fields with `-fill black -draw "rectangle x0,y0 x1,y1"`.
- Get real dims with `identify` first; the read-tool preview is scaled (~1024 wide),
  so scale your pixel estimates by actual_width/1024. Use generous boxes.
- ALWAYS re-read the output image with the read tool to visually confirm nothing
  sensitive remains before using it.
- Overwrite the sensitive originals in place (not just the guide copies) so the
  address is gone from the committed tree.
