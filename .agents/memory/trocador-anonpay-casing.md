---
name: Trocador AnonPay JSON key casing
description: Trocador's AnonPay API returns capitalized JSON keys (ID/Status), not lowercase — reading lowercase silently breaks the swap.
---

Trocador's AnonPay endpoints return **capitalized** JSON keys:
- Create (`/anonpay/?...`): `{"ID": "...", "url": "...", "status_url": "..."}` — note `ID` is capital, but `url` is lowercase.
- Status (`/anonpay/status/{id}`): `{"ID": "...", "Status": "anonpaynew", "CoinTo": "...", ...}` — `Status` is capital; the value is lowercase.

**Why this bit us:** the server read lowercase `data.id` / `data.status`. The create
call returned HTTP 200 with a valid `ID`, but `!data.id` was true, so it threw
`Trocador AnonPay error 200` — a success mistaken for failure. Members saw
"502: Trocador AnonPay error 200" on the in-site XMR swap.

**How to apply:** when reading any Trocador AnonPay response, accept both casings
(`data.ID ?? data.id`, `data.Status ?? data.status`) and normalize the status VALUE
to `.trim().toLowerCase()` before returning — the client status-label / done-state
maps are keyed lowercase, so a capitalized value would make polling never stop.
Don't assume lowercase keys just because most JSON APIs use them; verify the live
response shape (probe the endpoint) before trusting a field name.
