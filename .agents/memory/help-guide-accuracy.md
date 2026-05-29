---
name: Help guide step accuracy
description: How to keep user-facing /help guide steps factually correct
---

When writing user-facing help guides (the chained micro-guides under `/help`), the
steps quote exact UI labels ("Sign & Deposit", "Test Decrypt") and describe real
click-paths. Two recurring failure modes:

**Explore subagents paraphrase and sometimes invent controls.** One reported a
dashboard "flask Test button" for the Legacy Plan that does not exist; the real
self-test path is Edit beneficiary → "Test Decrypt". Always verify exact button
text and the existence of a control by grepping the actual page source before
quoting it in a guide.

**Stay inside the two-filter rule (see TODO.md).** Don't describe stubbed/simulated
behavior as if it works (e.g. Soil vault Ledger signing is simulated — guides only
describe Xaman signing), and don't make unverifiable guarantees ("works even if the
site is down" → say "decryption runs locally in your browser" instead).

**Why:** architect review caught 3 such mismatches in one batch. A guide that tells a
member to click a button that isn't there destroys trust faster than no guide.

**How to apply:** before finalizing any guide, `rg` the target page for each quoted
label/CTA, and run an architect `evaluate_task` review on the guide content against
the real feature files.
