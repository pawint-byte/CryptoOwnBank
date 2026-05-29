---
name: Tax report route shape (path vs query)
description: Why the Tax Summary showed all-zeros — frontend/backend URL-shape mismatch, and the codebase convention that prevents it.
---

# Tax Summary rendered all zeros (no data) — URL shape mismatch

The Tax Reports "Tax Summary - {year}" card showed $0.00 in every box even when
realized gain/loss events existed for that year.

**Root cause:** the React Query default fetcher builds the request URL by
`queryKey.join("/")`. A key like `["/api/tax-report", year, method]` therefore
requests `/api/tax-report/2026/FIFO` (path segments). The backend route was
defined as `/api/tax-report` reading `req.query.year`, so the path-based request
never matched it — it fell through to the SPA catch-all and returned index.html
with status 200. The frontend parsed HTML as JSON, got undefined, and every
figure defaulted to 0. Looks identical to "no data."

**Why:** this codebase's convention (per fullstack-js) is array query keys +
path-based routes (`/api/thing/:id`). Any GET whose frontend key has extra
segments MUST have a matching `:param` route, not a query-string route.

**How to apply:** when a page shows empty/zero data but the DB clearly has rows,
check the actual request URL in deployment logs (e.g. `GET /api/x/2026/FIFO 200`)
against the Express route definition. A 200 returning HTML for an `/api/...` path
is the tell: the route didn't match and the SPA fallback served the page. Fix by
making the backend route path-based (`:year/:method`) to match the join("/")
fetcher. Same mismatch may exist on other endpoints.

**Environment note:** the dev/workspace DB is essentially empty for real
accounts; the user's real data (holdings, transactions, 280+ gain events) lives
in PRODUCTION. Debug data questions against the production read replica
(`executeSql environment:"production"`), and remember code fixes only reach the
live site after re-publishing.
