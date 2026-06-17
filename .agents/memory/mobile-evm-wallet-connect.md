---
name: Mobile EVM wallet connect (no injected provider)
description: Why "Connect MetaMask" fails on mobile/PWA and how the EVM connect UX must behave
---

A mobile browser or installed PWA never gets `window.ethereum` injected, even when
the MetaMask app is installed AND funded on the same phone. The injected provider
only exists in the desktop browser extension or inside MetaMask's own in-app browser.

**Consequence:** the desktop "Connect MetaMask" path (which reads `window.ethereum`)
ALWAYS fails on phones. The only working mobile EVM path is WalletConnect
(`@walletconnect/ethereum-provider`, needs `VITE_WALLETCONNECT_PROJECT_ID` — it is
configured). WalletConnect's modal deep-links to MetaMask Mobile / 50+ wallets.

**Rule:** never tell a mobile user to "install MetaMask" when the injected provider
is absent — it's false and scary (they often have it installed). The no-provider
error must steer them to the WalletConnect (mobile) button instead. This message
lives in the shared `useEvmWallet` hook, so all EVM pages (aave, wallet-security,
evm-swap, cross-chain-swap, xrpl-bridge) inherit it.

**Why:** founder reported desktop PWA showed MetaMask connected while the phone PWA
said "MetaMask not installed" despite the app being open with balances — the message
was the bug, not the wiring.
