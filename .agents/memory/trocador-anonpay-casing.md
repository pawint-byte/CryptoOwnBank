---
name: Trocador AnonPay is a hosted widget, not a JSON API
description: Why server-side fetching of Trocador AnonPay throws "AnonPay error 200" and how to integrate it correctly (build URL, open in new tab).
---

# Trocador AnonPay integration

Trocador's AnonPay (`https://trocador.app/anonpay/?...`) is a **hosted widget /
redirect page**, NOT a JSON API.

- A GET to the AnonPay URL returns **HTTP 302** to the localized page
  (`/en/anonpay/?...same params...`); the final page is **HTML** and is served
  with **`X-Frame-Options: DENY`**.
- There is **no Trocador API key** in this project (only an optional
  `TROCADOR_REF`), so the authenticated trade API is not available.

**Failure that reached members ("502: AnonPay error 200"):** the server did
`fetch(anonpayUrl)`, which **follows the 302** to the HTML page (status 200),
then `res.json()` fails → empty object → no `id` → the code threw
``Trocador AnonPay error ${res.status}`` = "error 200". The earlier
"capitalized keys (ID/Status)" theory was a **red herring** — there is no JSON
body at all for these params.

**Correct integration:**
- Server: do NOT fetch. Just **build the pre-filled AnonPay URL** (with
  `ticker_to`, `network_to`, `address`, `name`, `simple_mode=True`, optional
  `ref`, `direct=False`) and return it. No network call → no bogus error.
- Client: do NOT iframe it (X-Frame-Options DENY → blank). **Open it in a new
  tab.** The swap completes on Trocador's own page, still non-custodial, with the
  receiving address pre-filled.
- Status polling needs a real trade id, which AnonPay only mints after the user
  picks a provider on Trocador's site — so don't rely on a server-side
  `/anonpay/status/{id}` poll for the in-app flow.

**Why:** keeps the swap working without an API key and without embedding a page
that refuses to be framed.
