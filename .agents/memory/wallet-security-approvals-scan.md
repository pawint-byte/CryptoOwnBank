---
name: Wallet Security Center approvals scan
description: How the EVM token-approvals scanner stays reliable + honest on public RPCs
---

# Token approvals scan reliability

The Wallet Security Center discovers open ERC-20 approvals by reading the owner's
`Approval` event logs over public RPCs (no paid indexer). The fragile part is
`eth_getLogs`.

**Rule:** never rely on a single full-history `getLogs(fromBlock:0,toBlock:latest)`.
Public/free RPCs frequently refuse it for active wallets (range/result caps), and a
single failure makes a whole chain silently show "nothing" — which is a dangerous
false "you're safe". Always have a windowed-paging fallback (page backwards from
latest in shrinking windows, adaptive backoff) and carry a `partial` flag up to the
UI when you couldn't reach genesis.

**Why:** a security tool that under-reports approvals is worse than no tool — the
member trusts an incomplete "all clear". Honesty ("partial scan, older approvals may
be missing") is mandatory, not decorative.

**How to apply:** any feature that enumerates historical on-chain events over public
RPC (approvals, transfers, past positions) needs the same try-full-range → chunked
fallback → surface-partial pattern. ERC-20 vs ERC-721 split is by topic count:
ERC-20 `Approval` has 3 topics, ERC-721 has 4 (indexed tokenId) — filter
`topics.length === 3`.
