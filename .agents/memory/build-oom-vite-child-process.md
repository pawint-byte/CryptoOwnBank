---
name: Production build OOM (Vite in-process)
description: Why the deploy build runs out of heap and the out-of-process fix to keep using
---

The production build entrypoint is `tsx script/build.ts` (set in package.json `build`, which must NOT be edited). It historically called Vite's `build()` API **in-process**, so Vite shared the single tsx/node heap. On this large bundle (~7,600 modules — heavy walletconnect / reown-appkit / ethers / xrpl deps) it blows past Node's default ~2GB old-space limit and dies with `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory` *after* "✓ N modules transformed" (during render/chunk). The server esbuild step never runs, so the deploy publish fails with no useful deployment logs.

**Fix (in place):** run Vite as a child process with a raised heap instead of in-process — `spawn(process.execPath, ["--max-old-space-size=" + (process.env.VITE_MAX_OLD_SPACE_SIZE||"4096"), "node_modules/vite/bin/vite.js", "build"])`. A `run()` helper inherits stdio and rejects on non-zero exit (includes the kill signal for OOM diagnosis). Heap size is env-tunable for different build tiers.

**Why:** package.json is forbidden to edit, so the heap flag can't go on the npm script; isolating Vite into its own process is the only clean place to raise the ceiling without touching package.json or vite.config.ts.

**How to apply:** if the deploy build OOMs again as the bundle keeps growing, bump `VITE_MAX_OLD_SPACE_SIZE` (or the 4096 default) rather than reverting to in-process. Watch for unrelated harmless build warnings (duplicate object keys in server/routes.ts, ox PURE-comment / vm-externalized notices) — they are not the failure.
