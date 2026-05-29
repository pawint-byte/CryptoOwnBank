---
name: Screenshot capture constraints (dev sandbox)
description: What can and cannot be auto-captured as real screenshots for /help guides in this environment
---

# Capturing real screenshots in this sandbox

**Rule:** Only **public, top-of-page** screens can be auto-captured. Authenticated, scrolled, gated, wallet-connected, or external-app screens must come from the user's real logged-in session (or stay as placeholders).

**Why:** Three independent limits, all confirmed empirically:
1. **DIY Playwright is blocked** — Playwright 1.60 is installed but Chromium will not download (`npx playwright install chromium` exits with no output; `~/.cache/ms-playwright` stays empty). So I cannot script my own headless capture.
2. **The testing subagent (`runTest`) renders/verifies pages but returns no image files** — `screenshotPaths` came back `[]` and `/tmp/testing-screenshots/` was empty even on a `status: success` run. It "infers page state" rather than exporting files. Do not rely on it to produce wire-able screenshot assets.
3. **The `app_preview` screenshot tool runs LOGGED OUT and only the top viewport** — authenticated routes redirect to the marketing landing; it cannot scroll or click. First load often times out at 10s; retry once and it succeeds.

**How to apply:**
- For a real screenshot of a public page (e.g. `/decrypt`, top of `/pricing`), use the `app_preview` screenshot tool with `save_to: attached_assets/help-screenshots/<name>.jpg`, retry once on timeout. Wire via `import x from "@assets/help-screenshots/<name>.jpg"` → set `imageSrc` on the matching guide step in `client/src/pages/help-*.tsx` (the `GuideStep` type in `guide-layout.tsx` already supports optional `imageSrc`).
- For authenticated pages (vaults, sovereignty-kit, send Receive tab), gated pages (`/legacy-plan`, `/aave` — Pro/plan only), wallet-signing dialogs, and external apps (Xaman/MetaMask/exchange sites): these cannot be captured here. Ask the user to send screenshots from their real session, or leave the clean dashed placeholder (`GuideLayout` shows "Screenshot coming: {imageAlt}" when no `imageSrc`).
- To log a verified test user in dev: `POST /api/auth/signup` then `UPDATE users SET email_verified = true` via `executeSql` (dev DB). Do NOT use the founder/admin account (see replit.md "Admin User") for test logins — risks corrupting the real account and leaking their addresses into committed screenshots.
