---
name: EVM public RPC death → silent $0
description: Why Aave Hub / EVM read pages can show all-zero balances+APYs and how to keep failures visible
---

# EVM public RPC endpoints die, and a dead read used to render as "$0 / empty wallet"

The EVM read path (Aave Hub markets/positions, and anything using `EVM_CHAINS[].rpcUrl`)
fetches on-chain CLIENT-SIDE via ethers `JsonRpcProvider` against hardcoded public RPCs.
Public no-key RPCs rot: observed `eth.llamarpc.com` → HTTP 521 (down) and
`polygon-rpc.com` → HTTP 401 (now requires an API key). When the reserve-data read
throws, the whole `Promise.all` rejects, the query has no data, and the UI fell back to
an all-zeros placeholder — so EVERY supply/borrow APY AND every wallet balance read 0 at
once. That is indistinguishable from "you hold nothing," which is what confused the founder.

**Why this matters:** all-zero APYs are the tell. Real Aave reserves are never exactly
0.00%, so all-zero APYs == the fetch failed, NOT an empty wallet.

**How to apply:**
- Use reliable, CORS-enabled, no-auth public RPCs. `*.publicnode.com` works for ETH
  (`ethereum-rpc`), Polygon (`polygon-bor-rpc`), Base (`base-rpc`), Arbitrum
  (`arbitrum-one-rpc`); `*.drpc.org` is a good ETH/Polygon backup. `cloudflare-eth.com`
  and `polygon.llamarpc.com` did NOT work.
- NEVER let a failed reserve/market read render as $0. Surface `query.isError` with a
  "couldn't load this chain — your balances aren't zero" message + Retry. Keep `balanceOf`
  `.catch(()=>0n)` (a wallet legitimately may hold 0 of one token) but do NOT swallow the
  reserve-data read — let it reject so the error state shows.
- To diagnose fast: from the code_execution sandbox, `await import('ethers')` and call
  `pool.getReserveData(USDC)` per chain; Node bypasses browser CORS, so Node-OK + browser-fail
  = CORS, Node-fail = dead/blocked endpoint.

**Scope reminder (separate from the bug):** Aave Hub only lists Aave assets
(USDC/USDT/DAI/WETH/WBTC, +WMATIC Polygon, +cbBTC Base) on the ONE selected chain. It will
never show native ETH (only wrapped WETH), MetaMask USD, or staked ETH, and it is not a full
portfolio view — so "my MetaMask shows X but Aave Hub doesn't" is often correct behavior,
not a bug.
