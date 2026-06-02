---
name: PWA stale bundle / cache version
description: Why UI fixes don't reach installed PWAs until the service-worker cache version is bumped.
---

# PWA stale bundle gotcha

There is a custom service worker at `client/public/sw.js`. It is network-first for
HTML and never caches `/api/*`, but it is **cache-first for static assets** (JS/CSS/
images). Installed PWAs (e.g. the founder runs CryptoOwnBank as an installed PWA on
his PC against production) can therefore keep serving an **old JS bundle** even after
a new deploy — making a shipped UI fix look broken in production (symptom seen: the
Buy Crypto "Your wallet" step showed a blank paste box even though the account had
saved wallets, because the cached bundle predated saved-wallet detection).

**Rule:** whenever a frontend fix needs to reach already-installed PWA clients, bump
`CACHE_VERSION` in `client/public/sw.js` (e.g. cob-vN → cob-vN+1) as part of the
change. The file's activate handler deletes old caches and posts `SW_UPDATED` so open
clients refresh.

**Why:** without the bump, installed clients can serve stale hashed assets and the
deploy appears to have "not worked" even though the server is correct.

**How to apply:** any time you ship a client-visible bug fix that a returning/installed
user must see (not just new visitors), bump the cache version. Don't bother for
backend-only or data-only changes.
