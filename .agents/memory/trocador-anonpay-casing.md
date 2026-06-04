---
name: Trocador AnonPay integration (simple_mode vs JSON, iframe trap)
description: How to integrate Trocador AnonPay correctly — which call returns JSON, why the in-page render fails, and the open-in-new-tab rule.
---

# Trocador AnonPay integration

Trocador's AnonPay lives at `https://trocador.app/anonpay/?...`. Same endpoint,
two very different behaviors depending on `simple_mode`:

- **WITHOUT `simple_mode`** (send `Accept: application/json`): returns a JSON body
  `{ ID, url, url_onion }` — a clean short session link like
  `https://trocador.app/anonpay/<ID>` plus a Tor `.onion` link. This is the good
  path. Note the **capitalized `ID`** key (accept `data.ID ?? data.id`).
- **WITH `simple_mode=True`**: the endpoint **302-redirects** to the hosted widget
  page, which is HTML served with **`X-Frame-Options: DENY`**. Do NOT fetch this
  as JSON (you'll follow the redirect to HTML and `res.json()` throws — that was
  the bogus member-facing **"AnonPay error 200"**).

There is **no API key** for Trocador's authenticated trade API (only an optional
`TROCADOR_REF`).

## Two real bugs that bit us (in order of discovery)

1. **The casing red herring.** First theory was "read `ID` not `id`". True but
   insufficient — it didn't explain why members still failed after deploy.
2. **The iframe trap (the actual member-facing bug).** The session URL was put in
   an in-page `<iframe>`. Both the widget page AND the clean session page refuse
   to be framed (`X-Frame-Options: DENY`), so the swap "just sits there" / blank.
   **Fix: always open the session URL in a NEW TAB, never an iframe.**
3. **XMR was unreachable in-app.** Monero has `privacyRoute: true` in the buy
   flow, which short-circuited its method list to ONLY a "buy privately" links
   directory — the in-app pre-filled Trocador swap was never exposed for the one
   coin people most want it for. Fix: also expose the `aggregator` (Trocador swap)
   method for privacy-route coins.

## Correct integration (current)

- **Server** (`createAnonpaySession`): try the JSON call (no `simple_mode`,
  `Accept: application/json`); if it returns JSON with a `url`, use that clean
  link. On ANY failure (non-JSON, 302/HTML, network — happens on some IPs) fall
  back to a **built `simple_mode=True` widget URL**. Never throw; `id` may be "".
- **Client**: open `url` in a new tab (`<a target="_blank">`), never iframe.
  Status polling needs a real trade id (only minted after the user picks a
  provider on Trocador), so don't rely on `/anonpay/status/{id}` for the in-app
  flow.

**Why the fallback:** the JSON call is environment-sensitive — a dev-container IP
got bare 302s while the deployed server got clean JSON. The fallback keeps the
swap working everywhere without ever surfacing a parse error.
