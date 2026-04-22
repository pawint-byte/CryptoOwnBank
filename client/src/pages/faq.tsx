import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SeoHead } from "@/components/seo-head";

const faqGroups = [
  {
    groupKey: "about",
    heading: "About CryptoOwnBank",
    items: [
      {
        q: "Why was CryptoOwnBank created? (And why should I use it?)",
        a: "CryptoOwnBank was created because exchanges can fail, freeze, or go bankrupt — and when they do, your funds are trapped. FTX. Celsius. Voyager. Mt. Gox. People trusted platforms with billions, and those platforms failed. CryptoOwnBank exists so your crypto is never in anyone else's hands. We built it to solve five problems: (1) Full ownership — your wallet stays in your control. We never see or store your private keys. Even if you leave CryptoOwnBank, your crypto stays in your wallet. You're never locked in. (2) Real yields you keep — earn 5–8% fixed APR on RLUSD through Soil Protocol, keep every cent. No platform fees, no middleman. (3) Security on your terms — cold wallet, hot wallet, hardware or phone signing. You choose. No uninterested third party in your decision-making process. (4) All the work is done for you — the Recommendations Hub surfaces yields you'd miss, Statement Insights compares your bank rates vs. on-chain, and the information comes to you instead of you going looking. (5) Think in value, not USD price — the dollar loses purchasing power every year, but an XRP is an XRP no matter whose hands it's in. We help you see what your crypto can do, not just what it's 'worth' in a shrinking currency. This is where everything starts. And it doesn't end — the Legacy Plan (dead man's switch) ensures your crypto passes to your family if something happens to you. Not to an exchange. Not to a bankruptcy court. To the people you chose.",
      },
      {
        q: "What is CryptoOwnBank?",
        a: "CryptoOwnBank is where everything starts — and it doesn't end. Own your crypto, manage it from one interface, keep all your earnings. All the work is done for you: the Recommendations Hub surfaces yields you'd miss, Statement Insights compares your bank rates vs. on-chain, tax reports are generated automatically, and the information comes to you. Track your portfolio across 32+ blockchains, earn 5–8% fixed yield on RLUSD, trade on native DEXs, send payments globally — your keys stay in your hands. Choose your security: cold wallet, hot wallet, hardware or phone signing. If you ever leave, your crypto is still in your wallet. And the Legacy Plan ensures your crypto passes to your family if something happens to you — so it truly doesn't end. Whether you're unbanked, debanked, or simply tired of trusting platforms that can fail — CryptoOwnBank gives you the tools to be your own bank.",
      },
      {
        q: "Why does CryptoOwnBank focus on XRPL and Stellar instead of Ethereum, Solana, or BNB Chain?",
        a: "Because we don't believe in patchwork. Look at what it takes to do a simple token swap on most blockchains today: on Ethereum, you need a MetaMask wallet, connect to Uniswap (a third-party app), approve a smart contract to spend your tokens, pay $5–50 in ETH gas fees, and hope the contract hasn't been exploited — all for one trade. On BNB Chain, it's a different wallet, a different DEX (PancakeSwap), a different gas token. Solana? Another wallet, another aggregator (Jupiter), another set of permissions. Every chain bolts on more third-party apps, more intermediaries, more points of failure. Now look at the XRP Ledger: the decentralized exchange is built into the protocol. There's no Uniswap equivalent because there doesn't need to be — the exchange is the chain itself. You open your Xaman wallet, pick a pair, sign the trade, and it settles in 4 seconds for a fraction of a penny. No smart contract risk. No third-party app to trust. No governance token to hold. Stellar works the same way — a native DEX at the protocol level, with XLM as the bridge currency. That said, we know many users already hold ERC-20 tokens. That's why we built EVM Swap with multi-DEX routing — 1inch for best-price aggregation, plus automatic fallback to native DEXes (Uniswap, PancakeSwap, QuickSwap, SushiSwap, TraderJoe) for tokens that 1inch doesn't cover. Cross-Chain Swap (powered by LI.FI) handles bridging between chains. Connect via MetaMask, WalletConnect (scan a QR code with any of 50+ mobile wallets), or Ledger. Your tokens never leave your control. Native DEX simplicity on XRPL/Stellar, best-price aggregation and cross-chain bridging on EVM chains.",
      },
      {
        q: "What blockchains does CryptoOwnBank support for portfolio tracking?",
        a: "We support 32+ blockchains for portfolio tracking: XRP Ledger, Bitcoin, Ethereum, Solana, Cardano, Polkadot, Cosmos, Avalanche, Polygon, Tron, Algorand, Hedera (HBAR), VeChain, Stellar, TON, Sui, Flare, BNB Chain, Sonic, XDC, Zilliqa, Nervos, Fetch.ai, Cronos, Arbitrum, Optimism, Base, Dogecoin, Litecoin, DigiByte, Casper, Verge, and more. Add your public wallet address for any of these chains and we automatically pull your balances — including staked positions and pending rewards. This includes AI agent wallets — if you're running agents via Coinbase AgentKit, x402, or any other framework, just paste the agent's public address and track what it holds and earns alongside your personal wallets. Your private keys are never shared — we only read public on-chain data.",
      },
      {
        q: "What does 'Bring Your Own Wallet' mean?",
        a: "It means you keep using whatever wallets you already have — Phantom for Solana, Keplr for Cosmos, Yoroi for Cardano, MetaMask for Ethereum, Xaman for XRP, or any other wallet on any chain. We don't replace those wallets. You just add your public wallet addresses to CryptoOwnBank, and we automatically detect your balances, staked positions, pending rewards, and idle assets across all of them. Already staking ATOM in Keplr? We see it. Already delegated ADA in Yoroi? We track those rewards. SOL staked in Phantom? It shows up automatically. Instead of opening five different apps to check what you own and what you're earning, you see everything in one dashboard — with the Legacy Plan covering all of it, the Recommendations Hub surfacing opportunities you might be missing, and Tax Reports handling the gains. Your wallets do the work on each blockchain. We bring it all together.",
      },
      {
        q: "How does CryptoOwnBank compare to traditional banks and crypto exchanges?",
        a: "Banks offer 0.01–4.5% yield but you're an unsecured creditor — if the bank fails, you're in line hoping to recover your money. Centralized exchanges (Uphold ~3.75%, others up to 6%) hold your keys custodially — and when exchanges fail (FTX, Celsius, Voyager), customers lose everything. CryptoOwnBank + Soil gives you 5–8% fixed APR, and you own 100% — keys stay in your wallet, your yield goes directly to you with no platform fee. The critical difference: your crypto is never in anyone else's hands. No exchange can freeze your account, no bank can deny you access, and you choose your own security level. Our Recommendations Hub analyzes your entire portfolio and surfaces the best on-chain opportunities — always prioritizing options where you keep your keys.",
      },
      {
        q: "What is the Best in Class tab?",
        a: "The Best in Class tab in your Recommendations Hub ranks the highest-yielding opportunities across all crypto assets, organized into four categories: On-Chain Staking (you keep your keys — e.g., ATOM at ~17.5%, DOT at ~13.5%, AVAX at ~8.75%), DeFi Yield (you keep your keys — e.g., Soil Credit+ at 8%, Jito SOL at 7.5%, Morpho USDC at 5.5%), Passive Earning (automatic yield like VET generating VTHO), and Exchange Earning (custodial, for comparison). Each entry links directly to the platform. If you already hold an asset, it's tagged with a 'You Hold This' badge so you can see what you're already set up to earn from.",
      },
      {
        q: "What does 'on-chain' vs 'custodial' mean in recommendations?",
        a: "Every yield recommendation on CryptoOwnBank is clearly tagged. On-chain (green globe icon) means you keep full ownership of your assets — your keys stay on your cold wallet, and the yield comes from a blockchain protocol you interact with directly. Custodial (amber building icon) means you hand your assets to a company (like an exchange) that holds them on your behalf — they control the keys. We prioritize on-chain options because 'not your keys, not your crypto.' Custodial options are shown for comparison but always labeled as tradeoffs.",
      },
      {
        q: "What is EVM Swap, Cross-Chain Swap, and XRPL Bridge?",
        a: "EVM Swap lets you trade thousands of ERC-20 tokens on a single chain — Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, or BNB Chain. It uses multi-DEX routing: first it checks 1inch for the best aggregated rate across dozens of DEXes, and if a token doesn't have enough liquidity on 1inch (common with new or micro-cap tokens), it automatically falls back to the chain's native DEX — Uniswap, PancakeSwap, QuickSwap, SushiSwap, or TraderJoe — so you can swap any token that has a liquidity pool, all without leaving the site. It shows your live token balances (native + ERC-20), includes a MAX button for quick fills, and lets you switch between MetaMask and WalletConnect without leaving the page. Cross-Chain Swap goes further — powered by LI.FI, it bridges and swaps tokens across different EVM chains in one flow. XRPL Bridge is bidirectional — powered by Axelar: EVM→XRPL uses Squid Router (connect MetaMask or WalletConnect, enter your XRPL address, bridge from any of 7 EVM chains to native XRP), and XRPL→EVM uses Xaman signing (send XRP to the Axelar gateway with a memo specifying your destination EVM chain and address — your tokens arrive on Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche, or BNB Chain). Both directions are non-custodial, Axelar-secured, and settle in minutes. All three tools support MetaMask, WalletConnect (50+ mobile wallets), and Ledger. Premium or Pro subscription required.",
      },
      {
        q: "How does CryptoOwnBank make money?",
        a: "Three subscription tiers: Free (1 blockchain address, Soil vault access), Premium ($29/mo or $199/yr — unlimited wallets, DEX trading, full Recommendations Hub), and Pro ($99/mo or $799/yr — treasury tools, team seats, Legacy Plan, DeFi borrowing). Nine optional add-ons for multi-chain tracking, technical analysis, payment tools, and legacy planning. Affiliate referrals from exchange links and Soil referrals (disclosed transparently). A 1% platform fee on EVM Swap trades (powered by 1inch) and Cross-Chain Swap trades (powered by LI.FI). We never take fees from your yields or principal. You keep 100% of what you earn. And because we're non-custodial, we never hold your assets — if you cancel your subscription, your crypto is still in your wallet exactly where you left it.",
      },
      {
        q: "Why should I join now?",
        a: "Because this migration is already happening — and the people who move first benefit the most. Finance is moving on-chain: stablecoins settle in seconds (not days), yield vaults pay 5–8% (not 0.01%), and payments cost fractions of a penny (not 2.9% + $0.30). Every person you pay on-chain is one less reason to go back to fiat. Every business that accepts crypto pulls their whole network forward. The snowball is already rolling. CryptoOwnBank gives you the tools to earn yield, trade on native DEXs, send payments globally, and track your portfolio — all non-custodial, all from one interface. The longer you wait, the more yield you leave on the table. The infrastructure is live today.",
      },
      {
        q: "Where is CryptoOwnBank headed?",
        a: 'Check the <a href="/roadmap" class="text-[#00A4E4] underline hover:no-underline">Roadmap</a> to see everything that\'s live today, what the ecosystem is building (XLS-66 on-ledger lending, fiat-to-wallet on-ramps, XRPL AMM expansion), and our longer-term vision. The bigger picture: get your money on the blockchain, get everyone you do business with on the blockchain, and keep the value there. The less you need fiat, the less you need the institutions that charge you to use it.',
      },
    ],
  },
  {
    groupKey: "wallet-security",
    heading: "Wallet & Security Basics",
    items: [
      {
        q: "Do I need a cold wallet, or can I use a hot wallet?",
        a: "CryptoOwnBank gives you the control and ownership you need while enforcing security the way you want. You choose: Cold wallet (Ledger, ELLIPAL, CypheRock) for maximum protection — every transaction requires physical hardware approval. Hot wallet (Xaman on your phone) for convenience — still non-custodial, still your keys, just stored encrypted on your device. For portfolio tracking, you don't even need a wallet — just add public blockchain addresses or import CSV history. The point is: security is your decision. No uninterested third party tells you what level of protection you need.",
      },
      {
        q: "Can I connect my Ledger to Keplr or Xaman to earn staking rewards without transferring my tokens?",
        a: "Yes — and this is one of the most important things to understand about cold wallets. When you connect your Ledger to a wallet app like Keplr (Cosmos) or Xaman (XRPL), you don't transfer anything. The wallet app reads the same blockchain address that your Ledger controls. Your tokens stay exactly where they are — on the blockchain, secured by your hardware device. Keplr simply gives you a better interface for staking on Cosmos chains (ATOM, OSMO, SEI, CELESTIA, TIA, DYDX, INJ, and 50+ others) than Ledger Live offers natively. When you stake or sign a transaction through Keplr, it sends the request to your Ledger for physical confirmation — you press the buttons on the device to approve. Your private keys never leave the hardware. The same applies to Xaman on XRPL: connect your Ledger, and you can interact with Soil vaults, the native DEX, and trustlines — all with cold wallet signing. Bottom line: connect, don't transfer. You keep full cold wallet security while unlocking staking rewards and DeFi features that Ledger Live alone can't access.",
      },
      {
        q: "Is this a wallet? Do you hold my funds?",
        a: "No — we are 100% non-custodial. We never hold, control, or have access to your funds or private keys. All vault actions (deposits, withdrawals) are signed directly from your own wallet — cold or hot, your choice. For portfolio tracking, we only read public on-chain data. Here's the key: even if CryptoOwnBank disappeared tomorrow, your crypto would be exactly where it is right now — in your wallet. You can leave at any time and still have full control and access to everything. We're a tool that works for you, not a platform that holds your assets.",
      },
      {
        q: "What happens if I cancel my subscription or leave CryptoOwnBank?",
        a: "Nothing happens to your crypto. That's the entire point. Because CryptoOwnBank is non-custodial, we never hold your assets. If you cancel Premium, downgrade to Free, or leave entirely — your crypto is still in your wallet, your Soil vault position is still earning yield, your trustlines are still active, and you can access everything through Xaman, your Ledger, or any other XRPL-compatible tool. You're paying for the dashboard, the analytics, the Recommendations Hub, and the trading tools — not for custody of your assets. You can leave us and still be in full control. (But we hope you won't want to.)",
      },
      {
        q: "What happens if CryptoOwnBank shuts down?",
        a: "Your crypto doesn't move. It can't — it's in your wallet, not on our servers. If CryptoOwnBank disappeared tomorrow, your XRP is still on the XRP Ledger, your RLUSD is still in your Soil vault, your trustlines are still active, and you can manage everything through Xaman, Ledger Live, or any XRPL wallet app. This is the fundamental difference between CryptoOwnBank and an exchange: when FTX shut down, customers lost billions because FTX held their assets. When a non-custodial tool shuts down, nothing changes for you — because the tool never held your assets in the first place. That's why we built it this way.",
      },
      {
        q: "Why does CryptoOwnBank focus on value instead of USD price?",
        a: "Because the dollar is just another currency — and it loses purchasing power every year. In 2010, someone paid 10,000 Bitcoin for two large pizzas. At today's prices, that's hundreds of millions of dollars — the most expensive meal in history. But the real lesson isn't about regret. It's about how you measure your assets. If you only see crypto through a USD lens, you're still thinking in fiat. An XRP is an XRP no matter whose hands it's in. A Bitcoin is a Bitcoin whether it buys two pizzas or a house. When the dollar devalues, your crypto didn't lose value — the measuring stick changed, not the asset. CryptoOwnBank helps you think in terms of what your crypto can do: what does it earn, what can it buy, what opportunities does it unlock? That's value. USD price is just one snapshot — and it's taken with a ruler that keeps shrinking.",
      },
      {
        q: "What wallets are supported?",
        a: "For XRPL yield vaults and DEX trading, we support Xumm/Xaman (mobile app with QR code / deep link connection) and Ledger hardware wallets (Nano S/X via Bluetooth through Xaman). For EVM Swap and Cross-Chain Swap (Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BNB Chain, and 30+ chains via bridges), we support three connection methods: MetaMask browser extension, WalletConnect (scan a QR code with MetaMask Mobile, Trust Wallet, Rainbow, Coinbase Wallet, or 50+ other mobile wallets), and Ledger hardware wallets connected through MetaMask. For portfolio tracking across 32+ blockchains, we support any cold wallet that has a public address — Ledger, ELLIPAL, SafePal, CypheRock, Arculus, and more. Just add your public address and we pull your balances. We also provide wallet-specific staking guides for each supported hardware wallet.",
      },
      {
        q: "When I connect MetaMask, is my seed phrase or private key shared with CryptoOwnBank?",
        a: "Absolutely not. When you click 'Connect Wallet' on CryptoOwnBank, the MetaMask browser extension opens its own popup — this is MetaMask's interface, not ours. If you're connecting MetaMask for the first time, MetaMask may ask you to create a new wallet or import an existing one using your recovery phrase. That entire process happens inside the MetaMask extension on your device. Your seed phrase is entered into MetaMask's own secure interface, encrypted, and stored locally on your computer — it is never sent to CryptoOwnBank, never transmitted to our servers, and we have no way to see it. After MetaMask is set up, you simply approve a connection request — MetaMask shares only your public wallet address with our site, which is the same address anyone can look up on a blockchain explorer. We use that address to display your balances, prepare unsigned transactions, and show swap quotes. When you execute a swap or approve a token, MetaMask pops up again asking you to confirm — and only then does MetaMask sign the transaction with your private key locally on your device. The signed transaction goes directly to the blockchain. At no point does CryptoOwnBank ever have access to your private keys, seed phrase, or signing authority. This is the same security model used by every legitimate DeFi app — Uniswap, Aave, OpenSea — they all work through the MetaMask extension the same way.",
      },
      {
        q: "How do I import my cold wallet into Xaman?",
        a: "It depends on what type of cold wallet you have. <strong>For ELLIPAL, CypheRock, Arculus, or SafePal (air-gapped / app-based):</strong> These all follow the same read-only import flow. Open Xaman → tap 'Import an existing account' → choose 'Read-only address' → open your wallet's companion app on your phone → find XRP → tap Receive → copy the address → return to Xaman and paste it → tap Next → give it a name like 'ellipal-xrp', 'cypherock-xrp', or 'arculus-xrp' (pick a name that reminds you what it's for — like future XLS-65 lending) → done! You'll see your XRP balance right away. Important: Xaman and your cold wallet are looking at the <em>same address</em> on the XRP Ledger — your XRP doesn't move between them. Xaman is just a window to view your balance and build transactions. When you need to sign (like a future XLS-65 lending transaction), your cold wallet device must approve it: for ELLIPAL, Xaman shows a QR code on your phone → scan it with your physical ELLIPAL device's camera → it signs offline → displays a signed QR on its screen → scan that back into Xaman to submit (note: you need the physical ELLIPAL device — the ELLIPAL app on the same phone as Xaman can't scan QR codes between apps). For CypheRock, the X1 vault and your cards handle the signing — your keys are split across the cards and never fully exist in one place. <strong>For a hardware wallet (Ledger Nano X):</strong> Open Xaman → 'Import an existing account' → 'Pair with Ledger.' Make sure Bluetooth is enabled, your Ledger is unlocked with the XRP app open, and Xaman will detect it automatically. Your private keys stay on the Ledger — Xaman just acts as the interface. <strong>For Tangem or NFC-based cards:</strong> Same flow — Import an existing account → choose 'Tangem Card' → tap the card to your phone when prompted. <strong>If you have a paper wallet or know your secret key</strong> (family seed or mnemonic): Import an existing account → choose 'Secret Numbers,' 'Family Seed,' or 'Mnemonic' and enter it. Xaman encrypts it on-device and never sends it anywhere. Once imported, you can switch between accounts in Xaman by tapping the account name at the top. Each wallet signs its own transactions independently.",
      },
      {
        q: "What's the difference between Xaman and my cold wallet?",
        a: "Xaman is not a separate wallet — it's a signing app that works with your cold wallet. Think of it this way: your cold wallet (Ledger, ELLIPAL, Tangem, etc.) is the vault where your private keys are stored safely offline. Xaman is the teller window — the interface on your phone that lets you see your balances, build transactions, and interact with the XRPL. When you import your cold wallet into Xaman, you're not moving your keys — you're pairing the devices so Xaman can send signing requests to your cold wallet. Every transaction still requires physical confirmation on your hardware device. If you use Xaman without a hardware wallet, it stores your encrypted keys on your phone — still non-custodial (only you have access), but your phone is connected to the internet, so a hardware wallet adds an extra layer of security for larger amounts.",
      },
      {
        q: "Why does Xaman say 'No account configured' when I try to connect to CryptoOwnBank?",
        a: "This means your Xaman wallet is imported as <strong>read-only</strong> — it can view balances and receive funds, but it cannot sign transactions. CryptoOwnBank features like DEX trading, vaults, DCA orders, and payments all require a <strong>full-access wallet</strong> that can sign. <strong>How to tell:</strong> If your Xaman home screen shows Send, Swap, and Receive buttons, you have full access. If those buttons are missing, it's read-only. <strong>Common cause:</strong> If you imported a cold wallet (Arculus, ELLIPAL, SafePal, etc.) by pasting just the address, Xaman adds it as read-only. That's fine for viewing, but not for signing. <strong>How to fix it:</strong> Create a new full-access wallet directly in Xaman: 1) Tap the account name dropdown at the top of Xaman. 2) Tap 'Add account.' 3) Choose 'Create a new account' (not import). 4) Xaman will generate secret numbers (8 rows of 6 digits) — write them all down on paper and keep them safe. This is your only backup. 5) Confirm the numbers when prompted. 6) Send at least 1 XRP to the new wallet address to activate it (you can send from your cold wallet app or from an exchange). 7) Once activated, connect to CryptoOwnBank with this new wallet — you'll have full signing access. <strong>Important security rule:</strong> Never enter your cold wallet's recovery phrase (12/24 words) or secret key into Xaman or any other app. Your cold wallet's secrets should only ever be entered into the device or app that originally generated them. If you want to use CryptoOwnBank's trading features, create a separate hot wallet in Xaman and move only the funds you want to actively trade. Keep the bulk of your holdings on your cold wallet for maximum security.",
      },
      {
        q: "How do I add my ELLIPAL wallet to CryptoOwnBank for portfolio tracking?",
        a: "ELLIPAL is an air-gapped cold wallet — it doesn't connect via API or Bluetooth, so CryptoOwnBank tracks it using your public blockchain addresses (read-only, no keys shared). To get your address: 1) Open the ELLIPAL app on your phone. 2) Select the coin you want to track (e.g., XRP, BTC, ETH, SOL, HBAR, etc.). 3) Tap 'Receive' — this shows your public blockchain address and QR code. 4) Copy the address. 5) Go to CryptoOwnBank → Blockchain Addresses → '+ Add Address'. 6) Paste the address, select the correct blockchain, and give it a label like 'ELLIPAL XRP' or 'ELLIPAL BTC'. 7) Click Add — we'll automatically pull your balances and transaction history. Repeat for each coin you hold on ELLIPAL. Your private keys never leave the ELLIPAL device — we only read public on-chain data.",
      },
      {
        q: "Do Ledger Nano X and Xaman show the same address for RLUSD?",
        a: "Yes — when you pair Ledger Nano X with Xaman, Xaman displays the exact XRPL address controlled by your Ledger device. There is only one address. Xaman is the bridge that sends signing requests to Ledger — the keys stay on Ledger.",
      },
      {
        q: "Does every transaction require Ledger signing even if I use Xaman?",
        a: "Yes. Xaman builds the transaction and forwards it to your paired Ledger for offline approval. You physically confirm on the Ledger device every time. This is the security model — no keys ever leave hardware.",
      },
      {
        q: "How do I connect my Ledger Nano X with Xaman?",
        a: "1) Install Xaman (App Store/Google Play) and Ledger Live. 2) Open Xaman \u2192 Settings \u2192 Hardware Wallets \u2192 Ledger \u2192 enable Bluetooth \u2192 unlock Ledger \u2192 open XRP app \u2192 pairs automatically. 3) Add RLUSD trust line: tap \u201C+\u201D Add Token \u2192 RLUSD \u2192 Setup Trust Line \u2192 sign on Ledger. 4) On CryptoOwnBank, click \u201CConnect Wallet\u201D \u2192 Xumm/Xaman \u2192 approve in Xaman (Ledger confirms if needed). Done — deposit RLUSD to Soil vaults and sign with your Ledger/Xaman combo. Full step-by-step toolkits for beginners, businesses, and more: /setup-guide",
      },
      {
        q: "Do I need a destination tag/memo when transferring RLUSD?",
        a: "No — RLUSD on XRPL does not require tags or memos (unlike XLM on Stellar). Just send to your correct XRPL address (starts with \u201Cr\u2026\u201D). Always double-check the address before sending.",
      },
      {
        q: "Is my data secure?",
        a: "Your XRPL wallet connection is read-only — we only see your public address. All transaction signing happens on your device. We use secure authentication and accept crypto payments (verified on-chain) or Stripe for card payments. Imported CSV data is processed securely and only transaction records are stored. We never store private keys or seed phrases.",
      },
    ],
  },
  {
    groupKey: "exchange-risks",
    heading: "Exchange Risks & Exit Strategies",
    items: [
      {
        q: "What happens when an exchange delists a token I hold?",
        a: "Exchanges regularly delist tokens due to declining liquidity, regulatory changes, or business decisions — and they typically give 10–30 days notice. If you don't act, your remaining tokens are usually auto-converted to fiat (often at unfavorable rates) or frozen. This is a core risk of custodial platforms: you don't control the rules. When you receive a delisting notice, you have three options: (1) Withdraw to a self-custody wallet — if the token has a native wallet app or is an ERC-20 token (MetaMask, Ledger), move it off the exchange while you still can. (2) Sell on the exchange — convert to a stablecoin or another asset before the deadline, on your terms. (3) Do nothing — the exchange converts it automatically, usually to your default fiat currency. Option 1 is always preferred if the token has real value and a viable self-custody option.",
      },
      {
        q: "How do I know where to move a delisted token?",
        a: "It depends on what blockchain the token lives on. ERC-20 tokens (like BONE, LRC, BADGER, REN) can go to any Ethereum wallet — MetaMask, Ledger, or any hardware wallet with Ethereum support. Native chain tokens (like SGB/Songbird) need a wallet that supports that specific chain — for SGB, that's Bifrost Wallet (same ecosystem as Flare). Before withdrawing, always check: (1) Does the exchange allow withdrawals for this token? Some freeze withdrawals before delisting. (2) What network/chain is the token on? Choose the right network when withdrawing. (3) Is the gas fee worth it? If you hold $5 worth of an ERC-20 token and gas is $10, it's cheaper to sell. CryptoOwnBank's Recommendations Hub identifies which of your assets are on exchanges and suggests self-custody alternatives, so you're already prepared before a delisting happens.",
      },
      {
        q: "What happened with Ledger dropping Siacoin — can wallets delist too?",
        a: "Yes — and this is an important distinction. Hardware wallet companies like Ledger manage which blockchain apps are available in their app catalog. When Ledger removed the Sia app, users could no longer manage SC through Ledger Live, even though the coins were still on the blockchain at their address. The coins aren't lost — they're still on-chain — but accessing them requires using a different wallet tool (like Sia-UI) with your recovery phrase. This is why CryptoOwnBank recommends documenting access methods in your wallet notes and Legacy Plan. If an app or wallet drops support, your notes tell you (or your beneficiary) exactly how to recover access using alternative tools. The lesson: your keys control your crypto, but the app you use to access those keys can change. Always have a backup plan documented.",
      },
      {
        q: "How can I protect myself from exchange and platform risks?",
        a: "Five rules that cover most situations: (1) Don't leave large balances on exchanges longer than needed — buy, then withdraw to your own wallet. (2) Use CryptoOwnBank's wallet notes to document how to access each wallet, what app or extension is needed, and any cold wallet details. This is critical for your Legacy Plan. (3) Diversify where your assets sit — don't keep everything on one exchange or in one wallet. (4) Pay attention to exchange emails about delistings, maintenance, or policy changes — they're easy to miss but have real deadlines. (5) Prefer on-chain staking and DeFi over exchange earn programs — when you stake natively (like HBAR on HashPack or ADA on ADALite), no company can change the terms or freeze your position. CryptoOwnBank's Recommendations Hub flags every asset sitting on an exchange and shows you on-chain alternatives where you keep full control.",
      },
      {
        q: "Should I keep anything on an exchange?",
        a: "Only what you're actively trading or need for liquidity. Think of an exchange like a cash register — you keep enough in it to operate, but you don't store your savings there. For long-term holds, move to a cold wallet (Ledger, ELLIPAL, CypheRock). For yield, use on-chain staking or protocols like Soil where you keep your keys. For active trading, keep a working balance on the exchange but withdraw profits regularly. The FTX collapse proved that even the biggest exchanges can fail overnight. Uphold regularly delists tokens. Coinbase changes earn rates. When your assets are in your own wallet, none of those decisions affect you.",
      },
      {
        q: "I'm moving crypto from an exchange to my cold wallet — what's the full checklist?",
        a: "Five steps so nothing slips through the cracks: (1) Withdraw from the exchange to your cold wallet's receive address for that specific chain. Double-check the network — sending USDC on Base to an Ethereum-only address can mean lost funds. Wait for confirmations (a few minutes for L2s like Base/Arbitrum/Optimism, ~10 min for Bitcoin). (2) Add the cold wallet address in CryptoOwnBank → Wallets → Add Wallet. Pick the matching network from the dropdown (Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, etc. — the same 0x address works across all EVM chains, so add it once per chain you actually hold tokens on). Label it clearly, e.g., \"Ledger — Base\". (3) Mark the move as a Transfer in your transaction history (not a Sale) so your tax cost basis carries over and no phantom gain/loss is triggered. (4) Update your Legacy Plan — open Legacy Plan, assign a beneficiary to the new wallet, and pick the recovery template (seed phrase, passphrase, hardware device PIN). If Legacy Plan is enabled, you'll get an automatic reminder toast every time you add a wallet. (5) Add wallet notes describing how a survivor would actually access the funds (which device, where it's stored, what app/extension is needed). These notes are encrypted and only released through Legacy Plan. Once these five steps are done, the asset is fully self-custodied, fully tracked, fully tax-correct, and fully covered for inheritance.",
      },
    ],
  },
  {
    groupKey: "yield-vaults",
    heading: "Yield Vaults (Soil, Doppler & Blend)",
    items: [
      {
        q: "What is RLUSD and how do the yield vaults work?",
        a: "RLUSD is Ripple's regulated stablecoin, pegged 1:1 to the US Dollar and backed by cash and cash equivalents. The yield comes from Soil Protocol, which lends your RLUSD to institutional borrowers — similar to how traditional banks make money, except the interest goes to you. The Treasury Vault (5.2% APR) is backed by US government securities. The CREDIT+ Vault (8.0% APR) is backed by diversified private credit pools.",
      },
      {
        q: "Which vault should I choose — Treasury (5.2%) or CREDIT+ (8.0%)?",
        a: "It depends on your risk tolerance and how soon you might need your funds. The Treasury Vault (5.2% APR) is backed by US government securities — essentially the safest asset class in the world. It has a short 3-day rolling withdrawal period, so you can access your funds quickly. Best for: stability and liquidity. The CREDIT+ Vault (8.0% APR) is backed by diversified private credit pools (institutional lending). It pays more but requires a 90-day notice + 10-day cooldown to withdraw, and carries higher default risk than Treasuries. Best for: users willing to lock funds longer for bigger returns. You can also split your RLUSD across both vaults.",
      },
      {
        q: "Does interest in Soil vaults compound automatically?",
        a: "Yes — and this is one of the biggest advantages of keeping your RLUSD in Soil. Your earned interest is automatically added to your position and starts earning additional yield immediately. There's no 'reinvest' button — compounding happens by default, every day. Here's what that looks like with real numbers at 8% APR (Credit+ vault): $1,000 → $1,083 after 1 year → $1,170 after 2 years → $1,260 after 3 years. $5,000 → $5,416 after 1 year → $5,867 after 2 years → $6,356 after 3 years. $10,000 → $10,833 after 1 year → $11,735 after 2 years → $12,712 after 3 years → $14,918 after 5 years. Compare that to a bank savings account at 0.5%: $10,000 earns just $50 in a year. Soil earns $833 on the same amount — and that $833 starts earning interest too. The longer you leave it, the more compounding works in your favor. That's why we recommend letting your vault position grow unless you actively need the funds. Every dollar of interest that stays in the vault earns more interest tomorrow.",
      },
      {
        q: "How does Soil compare to Uphold's 3.75% yield?",
        a: "Soil offers 5–8% fixed APR (real RWA-backed yield from Treasuries and private credit) with automatic compounding — usually higher than Uphold's ~3.75%. Plus you get full self-custody (your keys stay on your cold wallet) instead of Uphold holding everything custodially. The trade-off: Uphold is simpler to start with, but you give up ownership and earn less.",
      },
      {
        q: "Why is compound interest such a big deal?",
        a: "Because it turns time into your biggest asset. With simple interest, $10,000 at 8% earns $800 every year — the same amount forever. With compound interest (which Soil does automatically), your interest earns interest. Year 1: $10,000 → $10,833. Year 2: $10,833 → $11,735. Year 3: $11,735 → $12,712. Year 5: $14,918. Year 10: $22,255. That's $12,255 in earnings on a $10,000 deposit — more than doubling your money — without you doing anything. Now compare: a bank savings account at 0.5% turns $10,000 into $10,512 after 10 years. Soil at 8% turns it into $22,255. The difference is $11,743 — and it all comes from compounding. Einstein reportedly called compound interest 'the eighth wonder of the world.' In Soil, it happens automatically every day. No button to press. No reinvest step. Just leave your RLUSD in the vault and let time do the work.",
      },
      {
        q: "How do I withdraw from a Soil vault?",
        a: 'Soil currently only supports full withdrawal — you withdraw your entire position (principal + interest) together. Go to the <a href="/ownbank/withdraw" class="text-[#00A4E4] underline hover:no-underline">Vault Positions page</a>, select a vault, and click "Withdraw via Soil." This opens Soil Protocol\'s app (xrpl.soil.co) where you connect your wallet and complete the withdrawal. Your RLUSD (principal + earned interest) is returned to the same XRPL wallet you originally deposited from. Once RLUSD is back in your wallet, you can: (1) let your DCA order convert it to XRP automatically, (2) redeposit to a vault to keep earning, or (3) hold it as RLUSD. Tip: set up a DCA order before withdrawing so your RLUSD doesn\'t sit idle.',
      },
      {
        q: "What is Earn & Accumulate XRP?",
        a: 'Earn & Accumulate is the strategy for accumulating XRP from your Soil vault position. The flow: (1) Your RLUSD earns yield in a Soil vault. (2) When you\'re ready, withdraw your full position (principal + interest) via Soil — Soil only supports full withdrawal, no partial, no interest-only. (3) RLUSD returns to your wallet. (4) Your DCA order (if active) converts a configured portion into XRP on the next scheduled run via the XRPL DEX — you control how much with a slider (10–100%) and a minimum threshold. (5) After the conversion, redeposit your remaining principal back into Soil to keep earning. Every step requires your approval in Xaman — nothing happens without your signature. Set up DCA before withdrawing so your RLUSD starts working immediately. Available to Premium ($29/mo) and Pro ($99/mo) members.',
      },
      {
        q: "Can I withdraw just the interest from a Soil vault?",
        a: "Not currently — Soil Protocol only supports full withdrawal (principal + interest together). When you withdraw, your entire position is returned to your wallet. You can then redeposit the principal amount back into the vault if you want to keep earning. We display your accrued interest on the Vault Positions page so you can track exactly how much you've earned before deciding to withdraw.",
      },
      {
        q: "What happens to my RLUSD after I withdraw from Soil?",
        a: "Your RLUSD returns to the same XRPL wallet you originally deposited from. From there, you choose: (1) DCA to XRP — if you have an active DCA order, it will automatically convert your RLUSD to XRP on the next scheduled run. One combined DEX order for the full amount gives you a better fill on the order book. (2) Redeposit to Soil — go back to the Vaults page and deposit again to keep earning 5–8% APR. (3) Hold as RLUSD — keep it as a stablecoin in your wallet. The key is setting up your DCA order before withdrawing, so RLUSD doesn't sit idle in your wallet.",
      },
      {
        q: "Why can't I withdraw my full principal anytime?",
        a: "Soil vaults are lending pools backed by real-world assets (U.S. Treasuries, private credit, etc.). Withdrawal rules depend on the vault: Liquid/Treasury vaults have a 3-day rolling period. Credit vaults require a 90-day notice + 10-day cooldown (interest continues during notice). Your funds earn during notice periods, but the lock-up aligns with underlying assets for stability.",
      },
      {
        q: "How safe is my principal?",
        a: "Your principal is protected in two ways: 1) Non-custodial design — keys never leave your cold wallet. 2) Soil vaults are backed by real-world assets (Treasuries, credit funds) with institutional-grade underwriting. Yields are fixed and predictable, but crypto/blockchain always carries risks (smart contract bugs, protocol changes, market events). Always DYOR.",
      },
      {
        q: "What happens if Soil or XRPL has issues?",
        a: "Soil is a compliant RWA protocol on XRPL — funds are loaned to Soil Ltd. (backed by real assets), not algorithmic or high-risk DeFi. If issues arise (rare), withdrawals follow vault rules (notice periods). XRPL itself is battle-tested and decentralized. Your assets stay on-chain in your wallet — we can't access or lose them.",
      },
      {
        q: "What is Doppler Finance and the XRP Vault?",
        a: "Doppler Finance is an XRPL-centric yield platform that lets you earn yield on your XRP through market-neutral strategies. Their XRP Vault currently offers approximately 3.2% APR. You deposit XRP through the Doppler app (app.doppler.finance) or directly via the Xaman xApp — your wallet signs the transaction, keeping you in control. Withdrawals have a 7-day processing period. Doppler uses Fireblocks for institutional-grade custody and Ceffu (MirrorX) for off-exchange settlements, with on-chain proof-of-reserve so you can verify your XRP is always accounted for. Bybit also offers a custodial version called XRPfi (up to 5% APR during promotional periods) that uses Doppler's strategies. On CryptoOwnBank, you can access the Doppler vault directly from the Yield Vaults page — click 'Deposit via Doppler' to open their app, connect your Xaman wallet, and start earning.",
      },
      {
        q: "How does Doppler Finance compare to Soil Protocol?",
        a: "They serve different purposes and different assets. Soil Protocol: earn 5.2-8.0% APR on RLUSD (Ripple's stablecoin), backed by US Treasuries and private credit. Your RLUSD generates predictable, fixed yield from real-world lending. Doppler Finance: earn ~3.2% APR on XRP itself, using market-neutral trading strategies across exchanges. Your yield is in XRP, not stablecoins. The key difference: Soil earns stablecoin yield (predictable, low volatility), while Doppler earns XRP yield (your stack grows in XRP terms). Many users use both — deposit RLUSD in Soil for stable yield, and deposit XRP in Doppler to accumulate more XRP. Both are accessible from the Yield Vaults page on CryptoOwnBank.",
      },
      {
        q: "What is Blend Capital and how does it work on CryptoOwnBank?",
        a: "Blend Capital is a non-custodial lending protocol built on Stellar Soroban (Stellar's smart contract platform). You can lend XLM and USDC into isolated pools and earn a live, market-driven supply APY paid by borrowers — the same model that powers Aave or Compound on EVM chains, but settled on Stellar with sub-cent fees and 5-second finality. CryptoOwnBank tracks your Blend lending positions read-only: connect your Stellar address (the same G... address you use with Freighter or LOBSTR), click 'Sync Position' on the Yield Vaults page, and we display your supplied balance, the live supply APY for each pool, and a direct link to mainnet.blend.capital where you can deposit or withdraw. Funds always sit in the Soroban smart contract and your Stellar wallet — CryptoOwnBank never holds them.",
      },
      {
        q: "How is Blend Capital different from Soil and Doppler?",
        a: "Three different yield models on three different chains. Soil Protocol (XRPL): fixed 5-8% APR on RLUSD, backed by US Treasuries and private credit — predictable, stablecoin-denominated. Doppler Finance (XRPL): ~3.2% APR on XRP itself via market-neutral trading strategies — your XRP stack grows. Blend Capital (Stellar Soroban): live, variable lending APY on XLM and USDC — rates float with utilization, like Aave. Many members use all three: Soil for stable RLUSD yield, Doppler to accumulate more XRP, and Blend to put idle XLM or USDC to work on Stellar. All three are non-custodial — your keys, your funds — and all three live on the same Yield Vaults page on CryptoOwnBank.",
      },
      {
        q: "Where does CryptoOwnBank get its price data?",
        a: "CryptoOwnBank fetches real-time prices from CoinGecko, a widely trusted crypto market data aggregator that sources from hundreds of exchanges. We track which assets also have Chainlink decentralized oracle feeds available (BTC, ETH, XRP, SOL, and others) — these are the same feeds trusted by Aave, Compound, and other major DeFi protocols. In a future update, we plan to integrate Chainlink on-chain feeds directly for even stronger data integrity. For now, CoinGecko provides reliable, broadly-sourced pricing across all 32+ chains we support.",
      },
    ],
  },
  {
    groupKey: "stablecoins",
    heading: "Stablecoins & Real-World Assets",
    items: [
      {
        q: "What are Real-World Asset (RWA) tokens?",
        a: "Real-World Asset (RWA) tokens are blockchain-based representations of tangible, off-chain assets — things like US Treasury bills, real estate, trade receivables, and private credit. By tokenizing these assets, investors can access institutional-grade yields directly on-chain with lower minimums, faster settlement, and transparent pricing. For example, <a href='/rwa-yields#protocol-ondo-usdy' style='color:#00A4E4;text-decoration:underline'>Ondo Finance</a> tokenizes short-term US Treasuries (OUSG) to offer ~5% yield on-chain. Centrifuge tokenizes trade receivables and invoices from real businesses. Soil Protocol lends to institutional borrowers backed by Treasuries and private credit pools, offering 5–8% fixed APR on RLUSD. The key advantage: you get traditional finance yields with blockchain transparency and self-custody — no bank needed.",
      },
      {
        q: "Which stablecoins does CryptoOwnBank support?",
        a: "CryptoOwnBank tracks and supports the following major stablecoins across multiple chains: RLUSD (Ripple USD) — Ripple's regulated stablecoin on XRPL, backed 1:1 by cash and cash equivalents, used for Soil vault deposits. USDC (USD Coin by Circle) — the most widely used regulated stablecoin, available on Ethereum, Solana, Polygon, Arbitrum, Base, and more. USDT (Tether) — the largest stablecoin by market cap, available on nearly every chain. EURCV (Euro Coin by Soci\u00e9t\u00e9 G\u00e9n\u00e9rale) — a euro-denominated stablecoin for European users. PYUSD (PayPal USD) — PayPal's regulated stablecoin on Ethereum and Solana. DAI (by MakerDAO) — a decentralized, crypto-collateralized stablecoin on Ethereum. Our portfolio tracker shows your stablecoin holdings across all connected wallets and exchanges, and the Stablecoin Dashboard compares peg stability, backing reserves, and available yields for each.",
      },
      {
        q: "How do RWA yields compare to traditional savings?",
        a: "The difference is significant. Traditional bank savings accounts typically offer 0.01–0.5% APY — barely keeping up with inflation. High-yield savings accounts (HYSAs) from online banks like Ally, Marcus, or SoFi currently offer around 4–4.5% APY, but rates fluctuate with Fed policy. RWA tokens on-chain offer 5–8% fixed APR: Soil Treasury vault pays 5.2% (backed by US government securities), Soil CREDIT+ vault pays 8.0% (backed by diversified private credit), and other RWA protocols like <a href='/rwa-yields#protocol-ondo-usdy' style='color:#00A4E4;text-decoration:underline'>Ondo</a> and Centrifuge offer similar ranges. The trade-off: RWA tokens carry smart contract risk and are newer than FDIC-insured bank deposits. However, the underlying assets (Treasuries, institutional credit) are the same ones banks use to generate their own yields — RWA tokens simply pass more of that yield directly to you by cutting out the bank as middleman.",
      },
      {
        q: "What are the risks of RWA tokens?",
        a: "RWA tokens offer compelling yields but come with risks you should understand: (1) Credit risk — the underlying borrowers or assets could default. Treasury-backed vaults have minimal credit risk (US government debt), but private credit vaults carry higher default exposure. (2) Smart contract risk — the token and vault contracts could contain bugs or be exploited. Reputable protocols undergo multiple audits, but no code is 100% risk-free. (3) Liquidity risk — some RWA vaults have lock-up periods (e.g., Soil CREDIT+ requires 90-day notice). You may not be able to exit quickly during market stress. (4) Regulatory risk — RWA tokenization is a fast-evolving regulatory space. Rules around securities classification, stablecoin backing, and cross-border transfers could change and impact token availability or yields. Always diversify across vault types, understand the withdrawal terms, and never invest more than you can afford to lock up. DYOR.",
      },
      {
        q: "Can I earn yield on stablecoins across different chains?",
        a: "Yes — the multi-chain yield landscape for stablecoins is growing rapidly. On XRPL, you can earn 5–8% on RLUSD through Soil Protocol vaults. On Ethereum, protocols like Aave, Compound, and Morpho offer variable yields on USDC, USDT, and DAI (typically 3–7% depending on market conditions). On Solana, platforms like Marinade and Kamino offer stablecoin lending yields. On Polygon, Arbitrum, and Base, DeFi protocols provide additional stablecoin yield opportunities. CryptoOwnBank's Recommendations Hub surfaces the best stablecoin yields across all supported chains, clearly labeling each as on-chain (you keep your keys) or custodial (a platform holds your assets). This lets you compare opportunities and choose the best risk-adjusted yield for your stablecoins, regardless of which chain they're on.",
      },
    ],
  },
  {
    groupKey: "exchange-imports",
    heading: "Importing Exchange Data",
    items: [
      {
        q: "How do I import my exchange transaction history?",
        a: "Most exchanges let you export your transaction history as a CSV file. Go to your exchange's account settings, look for 'Transaction History', 'Reports', or 'Statements', and download a CSV export. Then go to the Import Data page on CryptoOwnBank and upload the file. We support Ledger Live, Yahoo Finance, CoinTracker, and generic CSV formats. Your transactions and tax lots are created automatically.",
      },
      {
        q: "Which CSV formats does CryptoOwnBank support?",
        a: "We support four formats: 1) Ledger Live — operation history CSV (go to Settings > Accounts > Operation history). 2) Yahoo Finance — portfolio export CSV. 3) CoinTracker — transaction history CSV. 4) Generic CSV — any file with Symbol, Quantity, Price, and Date columns. Most exchange exports (Coinbase, Binance, Kraken, etc.) can be imported using one of these formats.",
      },
      {
        q: "Can I import data from Webull, eToro, Robinhood, or Fidelity?",
        a: "Yes — export your transaction history as a CSV file from their apps or websites. For Webull: Account > Statements & History > Download. For eToro: Settings > Account Statement > Download. For Robinhood: Account > Statements & History. For Fidelity: Accounts > Activity & Orders. Then upload the CSV on our Import Data page.",
      },
    ],
  },
  {
    groupKey: "statements",
    heading: "Statement Uploads",
    items: [
      {
        q: "What is Statement Insights?",
        a: "Statement Insights lets you upload PDF statements from your banks, brokerages, and credit unions. We automatically detect the institution, account type (brokerage, savings, money market, CD, etc.), and your balance — then show you how your current rates compare to Soil vault yields. You can add detected accounts to your portfolio with one click.",
      },
      {
        q: "Tip: Rename your statement files before uploading",
        a: "Most banks name downloaded statements something generic like 'statement_2026-02.pdf' or a random string of numbers. Before uploading, rename each file to something you'll recognize — for example: 'ETrade-Brokerage-Feb2026.pdf', 'Stash-Invest-Feb2026.pdf', or 'NavyFed-Savings-Feb2026.pdf'. This makes it much easier to keep track of which files you've already uploaded and which ones are left to do.",
      },
      {
        q: "Which institutions are supported?",
        a: "We automatically detect statements from Chase, Bank of America, Wells Fargo, Citibank, Capital One, Ally, Discover, Schwab, Fidelity, Vanguard, E*TRADE, SoFi, Robinhood, Wealthfront, Betterment, Stash, Acorns, Greenlight, M1 Finance, Webull, Tastytrade, Interactive Brokers, Morgan Stanley, Merrill Lynch, USAA, Navy Federal, Kinecta, PenFed, and most other credit unions. If your institution isn't listed, the parser will still try to detect account types and balances from the PDF content.",
      },
      {
        q: "What happens when I delete a statement?",
        a: "Deleting a statement removes the upload, all detected products, and any portfolio entries you added from it. It's a clean removal — you won't have orphaned entries left behind in your portfolio.",
      },
    ],
  },
  {
    groupKey: "getting-started",
    heading: "Getting Started & Transfers",
    items: [
      {
        q: "How do I start earning yield on RLUSD?",
        a: '1) Buy RLUSD on a trusted exchange (Binance, Kraken, Coinbase, etc.) and withdraw it to your XRPL wallet. 2) Connect your cold wallet to the dashboard. 3) Deposit RLUSD into a <a href="/ownbank/vaults" class="text-[#00A4E4] underline hover:no-underline">Soil vault</a> (Treasury-backed at 5.2% or CREDIT+ at 8.0%). 4) Earn fixed yield immediately — interest accrues daily on your deposited principal. 5) When you\'re ready, withdraw your full position (principal + interest together) via <a href="/ownbank/withdraw" class="text-[#00A4E4] underline hover:no-underline">Vault Positions</a>. Tip: Credit+ has a 90-day lock + 10-day cooldown — withdraw and re-deposit every 90 days to earn on a larger balance. No KYC on our end, no bank linking required.',
      },
      {
        q: "Can I transfer RLUSD from Uphold to my cold wallet?",
        a: "Yes — Uphold supports XRPL withdrawals. Go to Withdraw \u2192 RLUSD \u2192 XRPL network \u2192 paste your wallet address. Test with a small amount first. Make sure your trust line to RLUSD is set in Xaman/Ledger before sending. Funds typically arrive in seconds with fees around ~0.0001 XRP.",
      },
      {
        q: "Which exchange should I recommend for buying RLUSD?",
        a: "Binance usually offers the best liquidity and lowest fees for RLUSD. Kraken is great for low-cost XRPL withdrawals. Crypto.com and Uphold are beginner-friendly. Use the referral links on the My Referrals page to help others — you may earn rewards when they sign up and buy.",
      },
      {
        q: "Should I route through an exchange to earn referral rewards on my own transfer?",
        a: "Not worth it for your own funds. Referral commissions only trigger for new users signing up via your link — self-referral usually doesn't pay and adds extra fees/steps. Transfer directly from Uphold (or wherever your RLUSD is) to your cold wallet, then use your referral links to help others buy RLUSD.",
      },
      {
        q: "Why don't you connect directly to my bank account?",
        a: "We deliberately stay on-chain only to keep things simple, secure, and non-custodial. Bank integrations would require us to handle fiat, trigger money transmitter rules (federal MSB registration + state licenses), and force KYC/AML on users — adding delays, fees, and risks. By skipping banks, we avoid all that: no middleman, no data collection, no compliance overhead. You buy RLUSD on exchanges, deposit on-chain, and manage everything from your wallet — faster, cheaper, and truly in your control.",
      },
      {
        q: "Can I buy crypto directly on CryptoOwnBank without leaving the site?",
        a: 'Yes. Our <a href="/buy-crypto" class="text-[#00A4E4] underline hover:no-underline">Buy Crypto</a> page lets you purchase crypto instantly using your credit card, debit card, Apple Pay, Google Pay, or bank transfer — powered by Changelly. You never leave CryptoOwnBank. Just select the currency you want to buy, enter the amount, and complete the purchase. Crypto is sent directly to your wallet. We also have a built-in crypto-to-crypto exchange on the same page if you want to swap between assets (BTC to ETH, XRP to SOL, etc.). KYC is handled by Changelly, not by us — we never see or store your identity documents. Fiat off-ramp (selling crypto back to fiat) is coming soon.',
      },
      {
        q: "Can I use this for other cryptos besides XRP/RLUSD?",
        a: "Absolutely — CryptoOwnBank now tracks 32+ blockchains. Add your Bitcoin, Ethereum, Solana, Cardano, Polkadot, Cosmos, Avalanche, HBAR, VeChain, and many more wallet addresses to see all your holdings in one dashboard. Connect exchange accounts (Coinbase, Kraken, Binance, etc.) to track exchange-held crypto too. Our Recommendations Hub analyzes every asset and shows you the best staking, DeFi, and yield opportunities — with clear on-chain vs custodial labels. XRPL yield vaults (Soil) are the active earning feature; portfolio tracking and recommendations work across all supported chains.",
      },
    ],
  },
  {
    groupKey: "pricing",
    heading: "Pricing & Plans",
    items: [
      {
        q: "What's included in the free plan?",
        a: "Free users get Soil vault access (deposit RLUSD, earn yield, manual withdrawals), live Yield Earnings Tracker with compound projections, 1 exchange connection, 1 blockchain address, basic Recommendations Hub overview (see what yield opportunities exist for your assets), yield calculator, 1 price alert, and 7 days of transaction history. Upgrade to Premium to unlock DEX trading on both XRPL (44 pairs) and Stellar (13 pairs), full Recommendations Hub with Best in Class rankings, personalized staking guides, DeFi comparisons, portfolio search/filter/sort, unlimited alerts, Statement Insights, and full transaction history. Enough to get started and see the value on the free tier.",
      },
      {
        q: "What do I get with Premium?",
        a: "Premium unlocks the full cockpit — own your crypto, manage it from one interface, keep all your earnings. XRPL DEX trading (44 pairs with Quick Swap and Advanced order book), Stellar DEX trading (13 pairs), unlimited exchange connections, unlimited blockchain addresses across all 32+ chains, complete transaction history, CSV import, unlimited price alerts, full Recommendations Hub with personalized yield optimization that surfaces opportunities you'd otherwise miss, Statement Insights that compare your bank rates vs. on-chain yields, extended Whale Alerts with custom thresholds, Technical Analysis with all indicators and up to 10 years of chart data, and personalized Crypto News that surfaces articles matching the assets you hold. Choose monthly ($29/mo) or annual ($199/yr) to also unlock complete tax reports. Your security level is your choice — cold wallet, hot wallet, hardware or phone signing.",
      },
      {
        q: "Can I use Soil vaults without Premium?",
        a: 'Yes. Connecting your XRPL wallet, depositing into <a href="/ownbank/vaults" class="text-[#00A4E4] underline hover:no-underline">Soil vaults</a>, and <a href="/ownbank/withdraw" class="text-[#00A4E4] underline hover:no-underline">withdrawing via Soil</a> are all free. Premium adds DCA for automatic RLUSD-to-XRP conversion.',
      },
      {
        q: "Why should I upgrade to Premium?",
        a: "If your crypto is spread across multiple exchanges, wallets, and DeFi protocols, Premium gives you one cockpit to see everything. Instead of logging into Binance, Coinbase, Ledger Live, and Yahoo Finance separately, you see your entire portfolio across 32+ blockchains, personalized yield recommendations with on-chain vs custodial clarity, tax liability, and yield earnings in a single dashboard. The Recommendations Hub shows you exactly how much yield you're missing and which on-chain opportunities match the assets you already hold.",
      },
      {
        q: "Can I cancel Premium anytime?",
        a: "Yes. You can cancel your subscription at any time. You'll keep Premium access until the end of your current billing period. No penalties, no questions asked.",
      },
      {
        q: "Can I pay for Premium with crypto?",
        a: "Yes — and you save 10% when you do. We accept crypto on 25 blockchains: XRP, RLUSD, BTC, ETH, SOL, XLM, DOGE, LTC, ADA, AVAX, ALGO, ATOM, TRX, HBAR, DOT, VET, TON, MATIC, CRO, XDC, DGB, CSPR, CKB, ZIL, and XVG. Premium drops to $26.10/mo or $179.10/yr, and Pro drops to $89.10/mo or $719.10/yr — all 10% off card prices. Go to Settings → Subscription → Pay with Crypto, select your chain, and we show you the exact amount (priced live via CoinGecko) and the wallet address to send to. For XRP and RLUSD, you also get a unique destination tag to match your payment. Our system verifies your payment on-chain and activates your subscription immediately. No KYC, no bank account, no credit card needed — just send crypto and you're upgraded. Card payments via Stripe are available as a fallback.",
      },
      {
        q: "Why should I pay with crypto instead of a credit card?",
        a: "Because we practice what we preach — and you save 10%. CryptoOwnBank exists to help you become your own bank, so we built our own payment rails to work the same way. When you pay with crypto: (1) You save 10% — no payment processor fee means we pass the savings to you. (2) No middleman takes a cut — credit card networks charge 2.9% + $0.30 per transaction; crypto costs fractions of a penny. (3) No bank required — you don't need a bank account, credit check, or card issuer's permission to be a member. (4) Privacy — your payment is verified on-chain, not routed through Visa, Mastercard, or a payment processor that logs your purchase history. (5) Unstoppable — no chargebacks, no frozen accounts, no processor deciding you can't buy a crypto service. (6) Global — members anywhere in the world can pay in seconds, regardless of their local banking system. (7) Settlement in seconds — your subscription activates as soon as the blockchain confirms, not after a 2-3 day card settlement window. Every crypto payment goes directly to our cold wallet addresses — the same non-custodial architecture we recommend for you. Stripe card payments exist as a fallback for members who aren't on-chain yet, but our goal is to help you get there.",
      },
      {
        q: "How does CryptoOwnBank verify my crypto payment?",
        a: "Every payment is verified directly on the blockchain — no payment processor involved. Here's the flow: (1) You select your plan and blockchain. (2) We show you a wallet address (our cold wallet for that chain), the exact crypto amount (priced live from CoinGecko with a unique decimal suffix to identify your payment), and for XRP/RLUSD, a destination tag. (3) You send from any wallet or exchange. (4) Our on-chain verifier checks for your payment and matches it by amount (or destination tag for XRP/RLUSD). (5) Your subscription activates automatically. The payment goes directly from your wallet to ours — no escrow, no custodian, no intermediary holds your funds at any point. This is how commerce should work: peer-to-peer, verified by math, settled in seconds.",
      },
      {
        q: "How does crypto subscription renewal work?",
        a: "When you pay for Premium with crypto, your subscription is activated for 30 days (monthly) or 365 days (annual). Unlike card payments which renew automatically through Stripe, crypto is a one-time payment — so we proactively reach out before it expires. We reach you where you paid: if you have a connected XRPL wallet, we send a Xaman payment request directly to your phone — you just tap approve and you're renewed. If we can't reach your wallet, we send an email with a pay link instead. You'll get reminders at 7 days, 3 days, and 1 day before expiry. A renewal banner also appears on your dashboard. If no payment is received by the expiry date, your account reverts to the free tier — no data is lost, you just lose access to premium features until you renew.",
      },
      {
        q: "How can I pay for my subscription from an exchange?",
        a: "If you keep funds on an exchange like Coinbase, Binance, or Uphold, you can pay by withdrawing crypto to our payment address. Go to Settings → Subscription → Pay with Crypto, select your chain, and use the 'Send Manually' option. Copy the wallet address, destination tag (for XRP/RLUSD — this is critical), and exact amount. Go to your exchange's withdrawal screen, paste the details, and send. Our on-chain verifier checks every 60 seconds and will match your payment automatically. Make sure to include the destination tag — without it, we can't link the payment to your account.",
      },
      {
        q: "What are all the ways I can pay with crypto?",
        a: "There are three options for crypto payment, all leading to the same result — your payment goes directly on-chain to our cold wallet: (1) Pay with Xaman — the easiest. It opens your Xaman wallet with everything pre-filled: address, amount, destination tag. Just tap approve. (2) Scan QR Code — open any XRPL wallet on your phone and scan the code. Payment details are embedded. (3) Send Manually — copy the address, destination tag, and amount, then send from any wallet or exchange. Since we're non-custodial, there's no site balance or internal account to pay from — every payment is a direct on-chain transfer.",
      },
      {
        q: "How do Price Alerts work?",
        a: "Set a target price for any supported crypto (XRP, BTC, ETH, SOL, ADA, and more). Choose whether you want to be notified when the price goes above or below your target. Our system checks prices every 60 seconds and sends you an email notification when your alert triggers. Free users can have 1 active alert; Premium users get unlimited alerts.",
      },
      {
        q: "What is the Yield Earnings Tracker?",
        a: "When you have active Soil vault deposits, a live Yield Earnings Tracker appears on your dashboard showing exactly how much you've earned — Today, This Month, and All Time — with the numbers ticking upward in real-time. It also shows compound projections at 1 Year, 5 Years, and 10 Years based on your actual deposited amounts and APR rates, assuming you reinvest your earnings monthly. The tracker reinforces the core promise: you keep 100% of your yield with no platform fees. It's on both the main Dashboard and the OwnBank dashboard so it's the first thing you see when you log in.",
      },
      {
        q: "What is the Yield Calculator?",
        a: 'The <a href="/yield-calculator" class="text-[#00A4E4] underline hover:no-underline">Yield Calculator</a> is a free public tool (no login required) that lets you estimate how much you\'d earn by depositing RLUSD into Soil vaults. Enter any amount, choose Treasury (5.2% APR) or CREDIT+ (8.0% APR), and toggle between simple and compound interest to see projected daily, weekly, monthly, and yearly earnings.',
      },
      {
        q: "Can I export my tax report as a PDF?",
        a: "Yes — Annual Premium subscribers ($199/yr) can download professionally formatted PDF tax reports, CSV exports, and TurboTax-ready files. Tax reports are exclusive to the annual plan. Go to Tax Reports, select your year and method, then click the export button.",
      },
      {
        q: "Why are tax reports only on the annual plan?",
        a: "Tax season comes once a year, so the annual plan makes the most sense for tax reporting. At $199/yr (vs $348 if you paid monthly), you save $149 and get full access to capital gains calculations, IRS Form 8949 data, PDF and TurboTax exports, and income tracking for staking and yield — all year round.",
      },
      {
        q: "What is Tax Harvest AI?",
        a: "Tax Harvest AI scans your portfolio for positions sitting at an unrealized loss and calculates the estimated tax savings if you were to sell them. It shows savings at three tax brackets (24%, 32%, 37%) and offers two approaches: sell and rebuy the same asset immediately (currently allowed under IRS rules — crypto is classified as property, not securities, so the wash-sale rule does not apply as of 2026), or swap to a similar-but-not-identical asset for a more conservative approach. You always execute the trade yourself — we never trade on your behalf. Tax Harvest AI is available to Premium and Pro members. This is an informational tool, not tax advice — always consult a CPA.",
      },
      {
        q: "How does the referral program work?",
        a: "Share your unique referral link with friends. When they sign up and deposit RLUSD, you earn bonus SEED points through Soil Protocol, which can boost your yields over time. If a referred friend upgrades to Premium, you get one free month of Premium.",
      },
      {
        q: "What is XLS-65/66 Lending?",
        a: "XLS-65 (Single Asset Vaults) and XLS-66 (Lending Protocol) are proposed XRPL amendments for native on-ledger lending. They're currently in validator voting and require 80% consensus for 2 weeks to activate. When live, you'll be able to lend XRP directly from your cold wallet into on-ledger vaults — no bridges, no smart contracts, no custody risk. CryptoOwnBank is fully built and ready to activate the moment the amendments pass. Pro members get access.",
      },
      {
        q: "How does the XRPL amendment voting process work?",
        a: "XRPL amendments don't work like a ballot where validators vote yes or no. Instead, validators signal support passively by upgrading their server software (rippled) to a version that includes the amendment code. When a validator upgrades to the required version, their server automatically signals 'I support this amendment' in every ledger validation it publishes. Validators on older versions simply don't signal — they haven't said no, they just haven't upgraded yet. There is no 'reject' mechanism. For an amendment to activate, 80% of the validators on the Unique Node List (UNL) must be running the new version, and that 80% threshold must be sustained continuously for 2 full weeks. Once those conditions are met, the amendment activates automatically on the next flag ledger — no human action needed. So when you see '17% support,' that means 17% of validators have upgraded so far. The remaining 83% haven't voted against it — they simply haven't upgraded their software yet. The timeline depends entirely on how quickly validator operators (Ripple, exchanges, universities, independent operators) choose to upgrade. Some move fast, some are cautious. That's why there's no guaranteed activation date.",
      },
      {
        q: "How do I prepare my XRP cold wallets for XLS-65 lending?",
        a: "If you want to lend XRP from your cold wallets, the good news is: you're already set up. XRP is the native asset on the XRPL, so no trustline is needed — every XRPL wallet can send and receive XRP by default. When you deposit into an XLS-65 vault, you receive vault shares as Multi-Purpose Tokens (MPTs), which are a new XRPL object type that don't use the old trustline system either. Your wallet receives them automatically as part of the VaultDeposit transaction. So your Day 1 checklist is: (1) Make sure each cold wallet is imported into Xaman — see 'How do I import my cold wallet into Xaman?' above. (2) That's it. When XLS-65 activates, come to CryptoOwnBank, browse the on-ledger vaults, pick one, click Deposit, enter your amount, and sign in Xaman from whichever cold wallet you want to use. The only time you'd need to set up a trustline is if you want to deposit into a vault that accepts an issued token (like RLUSD or USD) instead of XRP. For straight XRP lending, there's nothing to configure — you're just waiting on the validators to upgrade.",
      },
      {
        q: "Do I need a trustline to lend XRP?",
        a: "No. XRP is the native asset on the XRPL — it doesn't need a trustline. Trustlines are only required for issued tokens (like RLUSD, USD, EUR) because those tokens are created by a specific issuer, and your wallet needs to explicitly authorize holding tokens from that issuer. XRP has no issuer — it's built into the ledger itself, so every wallet can hold and transact with it automatically. If you want to deposit XRP into an XLS-65 vault, you just sign the VaultDeposit transaction in Xaman and you're done. No trustline setup, no extra steps. You would only need to add a trustline if you wanted to deposit a different token (like RLUSD) into a vault that accepts that token.",
      },
      {
        q: "How will CryptoOwnBank interact with my cold wallet for XLS-65 lending?",
        a: "CryptoOwnBank talks to Xaman, and Xaman talks to your cold wallet — the site never touches your private keys. Here's the full flow: <strong>Step 1 — Link your wallet:</strong> On the Wallets page, each XRP address from your cold wallet (ELLIPAL, CypheRock, Arculus, etc.) has a 'Link Xaman' button. Tap it, approve with your main Xaman account (the one with full access), and the site saves that cold wallet address as linked. You'll see a green 'Xaman Linked' badge. You don't need to switch accounts — your main Xaman account authorizes the link. <strong>Step 2 — When XLS-65 goes live:</strong> You choose how much XRP to lend on CryptoOwnBank. The site builds the lending transaction and sends it to Xaman via QR code or deep link. <strong>Step 3 — Your cold wallet signs:</strong> Since the account in Xaman is read-only, Xaman can't sign by itself. For ELLIPAL, it shows a QR code — you scan it with your physical ELLIPAL device, which signs offline, then you scan the signed QR back into Xaman. For CypheRock, the X1 vault and your cards sign. For Arculus, you tap the card. <strong>Step 4 — Transaction submitted:</strong> The signed transaction goes back to Xaman, which submits it to the XRP Ledger. CryptoOwnBank sees it on-chain, and your lending position appears on your dashboard. Your keys never leave your cold wallet at any point.",
      },
      {
        q: "How does the transaction signing chain work? (Site → Xaman → Cold Wallet → Blockchain)",
        a: "There are two distinct types of interactions with Xaman, and it's important to understand the difference: <br/><br/><strong>1. Linking (identity verification only)</strong><br/>When you tap 'Link Xaman' next to a cold wallet address, the site sends a simple sign-in request to Xaman. You approve it with your main Xaman account (the one with full access). This doesn't move any XRP or authorize any transactions — it just tells the site 'I own this Xaman app and I want to connect this cold wallet address.' The cold wallet addresses are imported into Xaman as read-only accounts, meaning Xaman can see their balances but can't sign on their behalf. That's fine for linking — your main account's approval is enough. <br/><br/><strong>2. Transaction signing (full authority, on-chain)</strong><br/>When you actually want to move funds — deposit into an XLS-66 AMM pool, lend via XLS-65, or trade on the DEX — the process is completely different: <br/><br/><strong>Step 1: CryptoOwnBank builds the transaction.</strong> You choose the action (e.g., deposit 1,000 XRP into an AMM pool). The site constructs the exact XRPL transaction with all parameters — amounts, destination, pool ID, fees — but does NOT sign or submit it. <br/><br/><strong>Step 2: The transaction goes to Xaman.</strong> The site sends it to Xaman via a deep link (on mobile) or QR code (on desktop). Xaman displays every detail of the transaction so you can review exactly what you're approving before anything happens. <br/><br/><strong>Step 3: Your cold wallet hardware signs it.</strong> Since the target address is a read-only account in Xaman, Xaman knows it can't sign by itself — the private key lives on your physical hardware device. Each device handles this differently: <ul><li><strong>Arculus:</strong> Tap the NFC card to your phone. The card signs the transaction internally and returns the signature.</li><li><strong>ELLIPAL:</strong> Xaman shows a QR code. You scan it with your air-gapped ELLIPAL Titan, which displays the transaction for your approval. After you confirm on the device, it shows a signed QR code — you scan that back into Xaman.</li><li><strong>CypheRock:</strong> The X1 vault and your key cards work together to produce the signature.</li><li><strong>SafePal:</strong> Similar QR-based air-gapped signing flow.</li><li><strong>Ledger:</strong> Connect via USB or Bluetooth, confirm on the device screen.</li></ul><strong>Step 4: Signed transaction submitted to the XRP Ledger.</strong> Xaman takes the signed transaction and broadcasts it to the XRPL network. Validators reach consensus and the transaction executes on-chain. CryptoOwnBank detects it and updates your dashboard. <br/><br/><strong>The key guarantee:</strong> Your private key never leaves your hardware device. It never passes through Xaman, never touches CryptoOwnBank's servers, and is never transmitted over the internet. The hardware device only signs the specific transaction you approve — nothing more. This is what makes the entire flow non-custodial.",
      },
      {
        q: "How do I get ready for XLS-66 lending? (Preparation checklist)",
        a: "If you want to participate in non-custodial XRP lending when XLS-66 activates, here's how to get set up now so you're ready from day one: <br/><br/><strong>Step 1: Get your XRP onto a cold wallet you control.</strong><br/>XRP sitting on an exchange (Coinbase, Uphold, Kraken, Binance, etc.) is custodial — the exchange holds the keys, so you can't sign on-chain transactions. To participate in XLS-66, your XRP needs to be in a wallet where <em>you</em> hold the private keys. Supported cold wallets include Ledger (Nano S/X/S Plus), ELLIPAL Titan, Arculus (NFC card), CypheRock X1, and SafePal. If your XRP is on an exchange, withdraw it to your cold wallet address. <br/><br/><strong>Step 2: Install the Xaman (formerly Xumm) app on your phone.</strong><br/>Xaman is the bridge between CryptoOwnBank and your cold wallet. Download it from the App Store or Google Play. Set up your main account (this is the one with full access for signing). <br/><br/><strong>Step 3: Import your cold wallet addresses as read-only accounts in Xaman.</strong><br/>In Xaman, go to Settings → Accounts → Add Account → Read-only. Enter each cold wallet's XRP address. This lets Xaman display your balances and relay signing requests to your hardware device — without ever accessing your private keys. <br/><br/><strong>Step 4: Sign up on CryptoOwnBank and add your wallets.</strong><br/>Create a free account at cryptoownbank.com. Go to Wallets & Addresses and add each cold wallet's XRP address. Label them clearly (e.g., 'Arculus', 'ELLIPAL', 'Ledger'). <br/><br/><strong>Step 5: Link each XRP address to Xaman.</strong><br/>On the Wallets page, you'll see a 'Link Xaman' button next to each XRP address. Tap it, approve with your main Xaman account, and you'll see a green 'Xaman Linked' badge. This tells CryptoOwnBank that your wallet is ready for on-chain transactions. <br/><br/><strong>Step 6: Watch the amendment progress.</strong><br/>The landing page at cryptoownbank.com shows live validator voting progress for XLS-65 and XLS-66. When both amendments reach 80% validator support for 2 consecutive weeks, lending vaults activate automatically — and you'll be ready to deposit immediately. <br/><br/><strong>What you DON'T need to do:</strong> You don't need to move XRP to a special address, set up any smart contracts, or give anyone your private keys. When XLS-66 goes live, you simply choose how much to lend, the site builds the transaction, your cold wallet signs it, and you're earning yield. <br/><br/><em>Note: This is not financial advice. Moving assets off an exchange involves transfer fees and means you're responsible for securing your own keys. Always DYOR and never move more than you're comfortable managing yourself.</em>",
      },
      {
        q: "I have XRP on an exchange. Can I participate in XLS-66 lending without moving it?",
        a: "No — and that's by design. XLS-66 lending is non-custodial, meaning your XRP stays in your own wallet and every transaction requires your personal signature from your hardware device. When your XRP sits on an exchange, the exchange holds the private keys — you can't sign on-chain transactions because you don't actually control the wallet. <br/><br/>To participate, you'd need to withdraw your XRP from the exchange to a cold wallet you own (Ledger, Arculus, ELLIPAL, CypheRock, or SafePal), then link that wallet through Xaman on CryptoOwnBank. This is a one-time setup. <br/><br/>The tradeoff is real: on an exchange, the exchange handles security for you but also controls your assets. With a cold wallet, you get full control and can earn yield directly on-chain, but you're responsible for securing your device and recovery phrase. <br/><br/>Some people choose to keep a portion on an exchange for quick trading and move the rest to cold storage for long-term holding and yield opportunities like XLS-66. That's a personal decision based on your comfort level and goals.",
      },
    ],
  },
  {
    groupKey: "recommendations",
    heading: "Recommendations & Yield Optimization",
    items: [
      {
        q: "What is the Recommendations Hub?",
        a: "The Recommendations Hub is your personalized yield optimization center. It analyzes every asset in your portfolio — across all connected exchanges and blockchain wallets — and tells you exactly what you could be earning. It includes six tabs: Optimize (action items sorted by potential yield), By Asset (consolidated view of each asset across all wallets/exchanges), Best in Class (top yields ranked across all crypto), Staking (on-chain staking opportunities with wallet-specific guides), DeFi vs TradFi (side-by-side comparison of DeFi yields vs bank/traditional rates), and Prices (live market data). Every recommendation is tagged as on-chain or custodial so you always know who controls your keys.",
      },
      {
        q: "How do the on-chain vs custodial badges work?",
        a: "Every yield recommendation displays a custody badge. A green globe icon means the opportunity is on-chain — you interact directly with a blockchain protocol and keep full ownership of your assets. An amber building icon means the opportunity is custodial — a company (typically an exchange) holds your assets on your behalf. Each badge also shows which blockchain the opportunity runs on (e.g., Ethereum, Cosmos, XRPL). We always prioritize showing on-chain options first, because your keys = your crypto.",
      },
      {
        q: "What are the wallet-specific staking guides?",
        a: "For assets that support on-chain staking (like TRX, ALGO, ATOM, HBAR, DOT, ADA, ETH, CRO), we provide step-by-step instructions tailored to your exact cold wallet hardware. Whether you use a Ledger, ELLIPAL, SafePal, CypheRock, or Arculus, the guide walks you through exactly how to stake from that specific device — which app to open, which buttons to press, and how to confirm. No more searching YouTube or Reddit for instructions.",
      },
      {
        q: "Why does CryptoOwnBank recommend spreading assets across multiple wallets?",
        a: "Spreading your crypto across multiple cold wallets is a risk mitigation strategy — similar to not keeping all your cash in one bank. If one device is lost, damaged, or compromised, only a portion of your assets is affected. CryptoOwnBank never recommends consolidating into a single wallet. Each wallet gets its own set of staking instructions and yield recommendations.",
      },
      {
        q: "What do the special token statuses mean (Already Earning, Staked Position, Generated Token)?",
        a: "Some tokens have special statuses that mean you're already earning or in an optimal position: 'Already Earning' (e.g., stETH via Lido) means the token itself is a yield-bearing wrapper — you're earning just by holding it. 'Staked Position' (e.g., HBARX) means this token represents an active staking position. 'Generated Token' (e.g., VTHO from VeChain) means this token is passively generated by holding another asset. 'Staking via [Platform]' (e.g., HBAR on Stader) means the wallet is already staking through a recognized provider. No further action needed for any of these.",
      },
      {
        q: "How does 'By Asset' consolidation work?",
        a: "The By Asset tab groups the same asset across all your wallets and exchanges into one view. For example, if you hold XRP on a Ledger, ELLIPAL, CypheRock, SafePal, Arculus, and Coinbase, it shows your total XRP balance, total USD value, and breaks down exactly how much is in each location. This helps you see your true exposure to each asset without logging into multiple apps.",
      },
    ],
  },
  {
    groupKey: "tax",
    heading: "Tax Reporting & Filing",
    items: [
      {
        q: "Can I use the CryptoOwnBank tax report directly for IRS filing?",
        a: "Our tax report is a detailed worksheet — not the actual IRS form itself. It gives you all the data you need (dates, proceeds, cost basis, gains/losses) organized to map directly to IRS Form 8949 and Schedule D. You can hand it to your accountant, import the TurboTax CSV into tax software, or use the numbers to fill in the forms manually.",
      },
      {
        q: "Which IRS forms do I need for crypto taxes?",
        a: "Capital gains and losses from selling or trading crypto go on IRS Form 8949 (Sales and Dispositions of Capital Assets), with totals transferring to Schedule D of your Form 1040. Soil vault interest income is taxable as ordinary income — report it on Schedule 1 (Additional Income), Line 8z as 'Other income.' Our reports break everything down by short-term vs long-term to match these forms.",
      },
      {
        q: "How do I import my tax report into TurboTax?",
        a: "On the Tax Reports page, click the 'TurboTax' export button to download a CSV formatted specifically for TurboTax import. In TurboTax, navigate to Investment Income, select 'Upload CSV,' and choose the downloaded file. The column format (Currency Name, Purchase Date, Date Sold, Proceeds, Cost Basis, Gain/Loss) matches what TurboTax expects.",
      },
      {
        q: "Does the report combine exchange data and Soil vault activity?",
        a: "Yes — the tax report pulls from all sources into one unified output. This includes trades from connected exchanges (Binance, Coinbase, Kraken, etc.), Soil vault deposits and interest payments synced from the XRPL blockchain, and any manually entered transactions. You get one complete picture across all your crypto activity in a single downloadable file.",
      },
      {
        q: "How is Soil vault interest taxed?",
        a: "Soil vault interest payments are classified as ordinary income, taxable in the year you receive them. Each interest payment from the Soil vault address to your wallet is recorded with the exact amount, date, and transaction hash from the XRPL blockchain. Depositing RLUSD into a Soil vault is a capital movement (not a taxable event). Only the interest you actually receive is reported as income — accrued but unpaid interest is not included.",
      },
      {
        q: "Do I still need the tax forms from my exchanges?",
        a: "Our report is designed to be your single source for all crypto tax data. However, exchanges like Coinbase and Kraken also issue their own tax forms (1099-MISC, 1099-B). It's good practice to cross-reference, but you don't need to report the same transactions twice. Our system deduplicates — exchange API data and on-chain Soil data are separate transaction sets with no overlap.",
      },
      {
        q: "Can the IRS track my crypto if it's on the blockchain?",
        a: "Yes — more than most people realize. Here's how it works:<br/><br/><strong>Exchange KYC is the starting point.</strong> When you withdraw from Uphold, Coinbase, Kraken, or any regulated exchange, they log exactly which blockchain address received your funds. They report this to the IRS. At that moment, the IRS knows that address belongs to you.<br/><br/><strong>Chain analysis companies do the rest.</strong> The IRS contracts with firms like Chainalysis and CipherTrace that map transaction graphs across entire blockchains. Once one address is linked to your identity (via an exchange withdrawal), they can follow every transaction forward — deposits to Soil vaults, DEX swaps, transfers to other wallets you control. The blockchain is a public ledger — every transaction is visible forever.<br/><br/><strong>On-ramps and off-ramps create a trail.</strong> Every time crypto touches a bank account, exchange, or payment processor, there's a KYC touchpoint. Even using a 'fresh' wallet, the moment you cash out or buy in through a regulated entity, the trail connects back to you.<br/><br/><strong>1099 reporting is expanding.</strong> Under current IRS rules, exchanges and brokers are required to report transactions directly. Uphold, Coinbase, and Kraken already issue 1099 forms.<br/><br/><strong>Subpoenas.</strong> The IRS has successfully subpoenaed Coinbase, Kraken, and others for full customer records — not just suspected tax evaders, but wide sweeps of all users above certain thresholds.<br/><br/><strong>The bottom line:</strong> If you bought crypto through a KYC'd exchange (and most people did), the trail from that exchange to your wallet address already exists. The blockchain's transparency works both ways. That's exactly why CryptoOwnBank includes full tax reporting and cost basis tracking — so you stay ahead of it instead of scrambling later. Note: proposed US legislation may exempt certain domestic crypto transactions from taxation in the future, but until that's signed into law, the current rules apply.",
      },
      {
        q: "If I move RLUSD from Uphold to my own wallet, is that taxable?",
        a: "Generally no. Transferring your own assets from an exchange to a wallet you control is a self-transfer — no sale, no exchange, no gain realized. It's like moving money from your checking account to your savings account. <strong>However:</strong> (1) Uphold logs the withdrawal and the destination address, so keep records showing both accounts are yours. (2) Some tax software incorrectly flags exchange withdrawals as dispositions — you may need to mark it as a transfer manually. (3) Once the RLUSD is in your Xaman wallet and earning interest in Soil, that interest <strong>is</strong> taxable as ordinary income when received. (4) If you use Earn & Accumulate to convert interest into XRP, that swap is a separate taxable event. The transfer itself isn't the issue — it's what you do with the assets after that matters for taxes. Always consult a crypto-savvy CPA for your specific situation.",
      },
    ],
  },
  {
    groupKey: "xrpl-tools",
    heading: "XRPL Tools",
    items: [
      {
        q: "What is the Token Manager?",
        a: "The Token Manager lets you view and manage your XRPL trustlines — think of it like opening currency accounts at a bank, except free, instant, and fully in your control. A trustline tells the XRPL: 'I'm willing to hold this token from this issuer.' You can add trustlines for popular tokens like RLUSD (Ripple's USD stablecoin), Sologenic (SOLO), Coreum (CORE), and more with one tap, or manually enter any currency code and issuer address. Removing a trustline (only possible when balance is zero) is like closing an empty account. Everything is signed with your cold wallet — we never touch your keys. Learn more: https://xrpl.org/trust-lines-and-issuing.html",
      },
      {
        q: "How does DEX Trading work?",
        a: "Both the XRP Ledger and Stellar have built-in decentralized exchanges (DEX) — no company runs them. When you place an order, it goes directly on the blockchain. If someone has a matching order, the trade happens automatically and settles in 4–5 seconds. Your funds never leave your wallet until the trade executes. Compare that to a traditional stock exchange: you call a broker, they place the order, it's matched on the NYSE, and settlement takes T+2 (two business days). On CryptoOwnBank, you can trade on both DEXs: the XRPL DEX (via Xaman/Ledger) and the Stellar DEX (via LOBSTR, StellarTerm, or StellarX). Both support limit orders, market orders, and live order books — all signed from your own wallet.",
      },
      {
        q: "Why do built-in DEXs matter? How are they different from Uniswap or a centralized exchange?",
        a: "This is one of the most important things to understand about XRPL and Stellar — and why CryptoOwnBank chose them. Most blockchains (Ethereum, BNB Chain, Solana) don't have an exchange built into the chain itself. Instead, third-party apps like Uniswap, PancakeSwap, or Jupiter were built on top — each with their own smart contracts, their own fees, their own risks, and their own governance tokens you might need to hold. If Uniswap's smart contract has a bug, your funds are at risk. If PancakeSwap's team disappears, the app goes offline. If the front-end gets hacked, users get phished. The XRPL and Stellar DEXs are fundamentally different — the exchange is part of the blockchain protocol itself, just like sending a payment is. No third-party app runs it. No smart contract can be exploited. No company can shut it down or change the rules. When you place an order on the XRPL DEX, the validators process it the same way they process any transaction — it's as native as sending XRP. This means: (1) No smart contract risk — the exchange logic is in the protocol, audited by the same validators that secure the network. (2) No middleman app — you don't need to trust a website, a team, or a DAO. (3) No extra gas token — on Ethereum, you need ETH to pay gas for a Uniswap trade. On XRPL, the DEX trade and the fee are both in XRP, at a fraction of a penny. (4) No wrapped tokens — you trade native assets, not 'wrapped' versions that add another layer of risk. (5) Always available — the DEX runs as long as the blockchain runs. No downtime, no maintenance windows. Compare: on Coinbase, you trust a company to hold your funds and match your orders. On Uniswap, you trust a smart contract and a front-end website. On the XRPL DEX, you trust the same protocol that secures every XRP transaction. That's the difference between a feature built on top and a capability built into the foundation.",
      },
      {
        q: "What is the Quick Swap feature?",
        a: "Quick Swap is a simplified trading interface on both the XRPL DEX and Stellar DEX pages. Instead of the full order book view, you just pick a pair, enter an amount, see the estimated rate, and swap. It uses a market order under the hood — your wallet signs the trade and it executes instantly at the best available price. Think of it like using a currency exchange kiosk vs. placing a limit order on a forex platform. For more control (setting your own price, viewing the full order book), switch to 'Advanced' mode.",
      },
      {
        q: "What is XRP's role as a bridge currency?",
        a: "XRP was designed from day one to be the bridge currency on the XRPL. It connects every asset pair through the DEX's built-in pathfinding. For example, if you want to swap EUR for BTC on the XRPL, the network can automatically route EUR → XRP → BTC through the order book — all in one atomic transaction that settles in 4 seconds. This is why the XRPL DEX page shows so many pairs: XRP/RLUSD, XRP/USD, XRP/EUR, XRP/BTC, XRP/ETH, XRP/GBP, XRP/CNY, and more. XRP is the universal connector. Similarly, XLM serves the same bridge role on the Stellar network. This bridge capability is built into the protocol — no routing app, no aggregator service, no third-party needed. The network itself finds the best path. That's the power of having the DEX at the protocol level rather than bolted on top.",
      },
      {
        q: "How do I send and receive crypto?",
        a: "Sending crypto on XRPL is like a wire transfer — but instead of filling out forms, paying $25–50, and waiting 1–5 business days, you enter the recipient's XRPL address, choose your amount and currency, sign with your wallet, and it arrives in 4 seconds for a fraction of a penny. You can send XRP or any token you have a trustline for. The Receive tab shows your address as a QR code for easy sharing. Safety tips: always verify the recipient address carefully, send a small test amount first for new recipients, and include a destination tag when sending to exchanges (required by most exchanges to credit your account). Learn more: https://xrpl.org/payment.html",
      },
      {
        q: "Is this safe? Do you hold my funds?",
        a: "No — CryptoOwnBank is 100% non-custodial. We never hold, control, or have access to your funds or private keys. Every transaction (trustline changes, DEX orders, payments) is built in your browser and signed on your cold wallet (Ledger or Xumm/Xaman). We only read your public address to display balances and prepare unsigned transactions for you to approve. There is zero platform risk — even if CryptoOwnBank disappeared tomorrow, your funds remain safe in your wallet on the XRPL blockchain.",
      },
      {
        q: "What tokens can I trade on the XRPL DEX?",
        a: "You can trade any token that has been issued on the XRPL — as long as you have a trustline set for it. We currently list 44 pairs organized into categories: Stablecoins (XRP/RLUSD, XRP/USD via Bitstamp, XRP/USD via GateHub, XRP/EUR), Crypto (XRP/BTC, XRP/ETH, XRP/XLM, XRP/LTC, XRP/DOGE, XRP/SOL, XRP/ADA, XRP/VET, XRP/ZIL, XRP/XDC, XRP/SHIB, XRP/HBAR, XRP/DGB, XRP/CRO, XRP/EOS, XRP/FLR, XRP/ICP, XRP/LINK, XRP/ONDO, XRP/TON, XRP/SUI, XRP/TRX, XRP/ZBCN, XRP/DOT, XRP/AVAX, XRP/ATOM, XRP/ALGO, XRP/NEAR, XRP/APT, XRP/PEPE, XRP/BONK, XRP/UNI, XRP/AAVE, XRP/MATIC, SOLO/XRP, CORE/XRP, ELS/XRP, CSC/XRP), and Fiat (XRP/GBP, XRP/CNY). Notice that XRP connects every single pair — it's the bridge currency that links stablecoins, crypto, and fiat all through one native DEX. No Uniswap, no PancakeSwap, no third-party smart contracts. The Token Manager makes it easy to add trustlines for these tokens before you start trading. The DEX is fully permissionless — anyone can issue tokens and create markets.",
      },
      {
        q: "What tokens can I trade on the Stellar DEX?",
        a: "On the Stellar DEX, we list 13 pairs across two categories: Stablecoins (XLM/USDC, XLM/EURC, XLM/USDT, USDC/EURC) and Crypto (XLM/BTC, XLM/ETH, XLM/XRP, XLM/DOGE, XLM/AQUA, XLM/yXLM, XLM/SHX, XLM/RMT, XLM/MOBI). XLM acts as the bridge currency, just like XRP does on the XRPL — and you can even trade XLM/XRP directly, bridging both ecosystems. You need a trustline for any token you want to hold — most Stellar wallets (LOBSTR, Freighter) make adding trustlines easy. We show live order book data from the Stellar Horizon API and link you to LOBSTR, StellarTerm, or StellarX to execute trades in your own wallet.",
      },
      {
        q: "How does the Stellar Wallet Dashboard work?",
        a: "Connect your Stellar public address (starts with G, 56 characters) to see your full wallet overview — XLM balance, all token holdings with trustlines, base reserve calculation (0.5 XLM per trustline + 1 XLM base), and recent transaction history pulled live from the Stellar Horizon API. Your address is saved to your account so it persists across sessions. We never ask for your secret key — everything is read-only on-chain data. From the wallet dashboard you can jump directly to Send & Receive, Token Manager, or DEX Trading.",
      },
      {
        q: "How do I send and receive payments on Stellar?",
        a: "Go to Send & Receive under the Stellar section. To send: enter the recipient's Stellar address, pick the asset from your actual wallet holdings (XLM, USDC, EURC, or any token you hold), set the amount and optional memo, then hit Generate Transaction. We create a web+stellar:pay URI and give you one-tap deep links to open it directly in LOBSTR, Freighter, StellarTerm, or StellarX — whichever wallet you use. To receive: switch to the Receive tab to generate a QR code and payment link with your address, amount, and currency pre-filled. Share it with anyone and they can pay you instantly. The Contacts tab lets you save frequent recipients for quick access.",
      },
      {
        q: "How does the Stellar Token Manager work?",
        a: "The Token Manager shows all your current trustlines (token holdings) on Stellar and lets you add or remove them. Popular tokens like USDC, EURC, yXLM, AQUA, and SHX have one-click add buttons. For any other Stellar asset, use the custom trustline form — enter the asset code and issuer address. When you add or remove a trustline, we generate links for LOBSTR, StellarTerm, StellarX, or the Stellar Laboratory so you can sign the ChangeTrust transaction in your preferred wallet. You can only remove a trustline if your balance is zero.",
      },
      {
        q: "Can I create invoices on Stellar?",
        a: "Yes — the Stellar Invoices page lets you create payment requests with a recipient address, amount, currency, and optional memo. Each invoice generates a web+stellar:pay URI and a QR code that your client can scan with any Stellar wallet (LOBSTR, Solar, Freighter). Invoice history tracks status, and you can copy the payment link or share it directly. It's the Stellar equivalent of our XRPL invoicing tools — same workflow, different chain.",
      },
      {
        q: "Do recurring payments work on Stellar?",
        a: "Yes — Stellar is fully supported in Recurring Payments. When you create a recurring payment, select 'Stellar' as the chain and choose XLM, USDC, or any token from your wallet holdings. When a payment comes due, CryptoOwnBank creates an execution record and gives you a Sign button that generates a web+stellar:pay URI. Tap it to open your Stellar wallet with the payment pre-filled — approve it and you're done. The Payment Queue also works with Stellar for offline/batch payment workflows.",
      },
      {
        q: "What is DCA (Dollar-Cost Averaging) and how does it work?",
        a: "DCA is an investment strategy where you buy a fixed dollar amount of an asset on a regular schedule — instead of trying to time the market. CryptoOwnBank automates this for both XRPL (31 trading pairs) and Stellar (18 trading pairs) using the native DEX on each chain. You choose what to spend, what to buy, how much per buy, and the frequency (daily, weekly, every 2 weeks, monthly, or quarterly). For weekly and biweekly schedules, you can pick a <strong>preferred day of the week</strong> — most people choose Thursday or Friday to line up with payday. When a buy is due, the system creates a pending DEX offer and sends it to your mobile wallet — Xaman (XUMM) for XRPL, or LOBSTR for Stellar. You approve with a quick tap and you're done. Your funds never leave your wallet until you approve. You can also set a total number of buys (e.g. 52 for 1 year of weekly Friday buys) or leave it running indefinitely.",
      },
      {
        q: "Can I use DCA with my cold wallet?",
        a: "It depends on the type of cold wallet: <br/><br/><strong>Ledger Nano X / Nano S Plus (recommended for DCA)</strong><br/>Yes — pair your Ledger with Xaman (XRPL) or LOBSTR (Stellar) via Bluetooth. Set Xaman or LOBSTR to <strong>full control</strong> over the account. When a DCA buy is due, you approve it in the app on your phone and Ledger signs the transaction over Bluetooth. Your keys stay on the hardware device, but you don't need to scan QR codes or plug in USB cables. This is the ideal DCA setup — hardware-grade security with mobile convenience.<br/><br/><strong>Before your first DCA: set trust lines</strong><br/>You need a trust line for every token you want to buy. Go to <strong>Token Manager</strong> and add trust lines for your DCA tokens (e.g. RLUSD, SOLO, USDC). This is a one-time setup per token.<br/><br/><strong>Air-gapped wallets (ELLIPAL, CypheRock, SafePal)</strong><br/>These <strong>can</strong> sign DCA transactions — there's no technical limitation. However, every approval requires scanning QR codes back and forth between your phone and the device, which gets tedious for daily or weekly recurring buys. It absolutely works, but most users prefer a Ledger + Xaman/LOBSTR setup for smoother recurring buys — same hardware security, just tap approve and go.<br/><br/><strong>Read-only wallets</strong><br/>Read-only wallets cannot sign any transactions — they're view-only. DCA requires full signing authority.",
      },
      {
        q: "What trading pairs are available for DCA?",
        a: "On XRPL, you can DCA across 31 pairs organized by goal: <br/><br/><strong>Accumulate XRP</strong> — buy XRP with RLUSD, USD (Bitstamp), EUR (GateHub), or sell SOLO/CORE/ELS into XRP.<br/><strong>Accumulate RLUSD</strong> — buy RLUSD with XRP, or sell tokens into RLUSD.<br/><strong>Buy Tokens with XRP</strong> — SOLO, CORE, ELS, BTC, ETH, SOL, LINK, ONDO, HBAR, FLR.<br/><strong>Buy Tokens with RLUSD</strong> — SOLO, CORE, BTC, ETH.<br/><strong>Sell Tokens → XRP</strong> — BTC, ETH, SOL, LINK, ONDO, HBAR, FLR.<br/><br/>On Stellar, you can DCA across 18 pairs: Accumulate XLM, Accumulate USDC, Buy Tokens with XLM (BTC, ETH, XRP, AQUA, yXLM), and Buy Tokens with USDC (BTC, ETH, XRP). Every pair lets you choose exactly what you spend and what you receive.",
      },
      {
        q: "Is DCA non-custodial? Who holds my funds?",
        a: "100% non-custodial. CryptoOwnBank never holds, touches, or has access to your funds. The DCA scheduler runs server-side and creates a pending DEX offer when your buy is due — but the offer is NOT submitted to the blockchain until you personally approve it in your Xaman or LOBSTR wallet. Your private keys never leave your device. If you don't approve a pending execution, nothing happens — your funds stay right where they are.",
      },
      {
        q: "What is Earn & Accumulate XRP?",
        a: "Earn & Accumulate is a Premium feature that connects your Soil vault yield to the XRPL DEX through DCA. The flow: earn yield in Soil → withdraw your full position when ready → RLUSD returns to your wallet → your DCA order automatically converts it to XRP on the next scheduled run. <br/><br/>You control the DCA settings: <strong>how much</strong> to convert (10–100% of your RLUSD, via a slider) and a <strong>minimum threshold</strong> (e.g. only buy when you have 5 RLUSD or more). Soil currently only supports full withdrawal (principal + interest together), so after converting to XRP, you can redeposit your principal back to keep earning. <br/><br/>It's fully non-custodial — the DEX offer only submits when you approve in Xaman. Everything happens on the same XRPL account: earn in Soil → withdraw → DCA to XRP, all from one wallet.",
      },
      {
        q: "What is the Legacy Plan (dead-man switch)?",
        a: "The Legacy Plan protects your crypto after you pass away — or if you become incapacitated. It's available as a standalone add-on for <strong>$9.99/mo</strong> on any tier, or <strong>included free with Pro</strong> ($99/mo). It's a dead-man switch: you check in on a schedule you choose (weekly, biweekly, monthly, or quarterly). If you miss a check-in, a grace period begins. During the grace period, your secondary contact (spouse, attorney, etc.) is notified to verify your status. If the grace period expires with no response, your beneficiaries receive the wallet recovery instructions you set up — where your hardware wallet is stored, where the seed phrase backup is located, how to access a CypheRock 2-of-5 Shamir setup, etc.<br/><br/><strong>What we NEVER store:</strong> seed phrases, private keys, passwords, or PINs. We only store YOUR instructions about <em>where</em> those things are — 'steel plate in the fireproof safe' or 'Card 1 with attorney, Card 3 in bank safe deposit box.' Everything is encrypted at rest and delivered only when the switch triggers. Member for Life — your crypto doesn't die with you.",
      },
      {
        q: "How does the Legacy Plan check-in work?",
        a: "You press the 'I'm Still Here' button on your Legacy Plan dashboard. That's it — one click resets your timer. You choose how often: weekly, biweekly, monthly (recommended), or quarterly. If you miss a check-in, the system enters a grace period (default 14 days, configurable up to 90 days). During grace, your secondary contact is notified so they can try to reach you. If you still don't check in by the end of the grace period, the system triggers and your beneficiaries receive their instructions. You can check in anytime — even during the grace period — to reset everything back to normal.",
      },
      {
        q: "What happens if I use a CypheRock X1 wallet with the Legacy Plan?",
        a: "CypheRock uses Shamir Secret Sharing — it creates 5 cards, and any 2 cards plus the X1 device can fully recover your wallet. When you set up a beneficiary with CypheRock as the wallet type, the Legacy Plan shows special guidance: tell your beneficiary where each card is stored (e.g., 'Card 1 in home safe, Card 3 with estate attorney, Card 5 in bank safe deposit box'). They do NOT need all 5 cards — just any 2 and the device. This is one of the most secure setups for inheritance because no single location compromise can drain the wallet. You never enter the card data into CryptoOwnBank — only the location instructions.",
      },
      {
        q: "What is Split Delivery for the Legacy Plan?",
        a: "Split delivery is like multi-sig for email — instead of one beneficiary getting all your wallet recovery instructions, you split the information across multiple people so they must collaborate. For example, Person A gets 'the Ledger is in the home office safe' and Person B gets 'the seed phrase steel plate is in bank safe deposit box #42.' Neither person alone can access the wallet.<br/><br/>You can choose <strong>All Required</strong> (every beneficiary's piece is needed) or <strong>Threshold</strong> (M-of-N, like Shamir — e.g. any 2-of-3 beneficiaries can reconstruct the full instructions). This pairs perfectly with CypheRock's 2-of-5 card system — give different card locations to different beneficiaries. No competitor offers delivery-level splitting like this. Enable it with one toggle on your Legacy Plan dashboard.",
      },
      {
        q: "What is the new Wallets-first view in the Legacy Plan?",
        a: "Most legacy tools force you to think 'people first' — list a beneficiary, then guess who gets what. The Wallets-first view flips it: you start with each wallet you own, and you decide for each one <strong>how it recovers</strong> and <strong>who is involved</strong>. Open <code>/legacy-plan</code> and switch to the <strong>Wallets</strong> tab to see every wallet in your portfolio with a status dot — green (covered), amber (auto-assigned and needs your review), or red (no heirs assigned yet).<br/><br/>For each wallet you pick a <strong>recovery mode</strong>:<br/>• <strong>Solo</strong> — one person can recover the wallet alone (e.g., your spouse holds the seed).<br/>• <strong>Joint (K-of-N)</strong> — multiple people each hold a piece and must cooperate (perfect for SLIP-39 shards, CypheRock cards, or split steel plates).<br/>• <strong>Shared</strong> — multiple people each able to recover independently (e.g., both your spouse and your attorney have copies of the seed).<br/><br/>Then for every assigned heir you can write a <strong>'piece description'</strong> ('Card 2 of 4 in the bank safe deposit box') and a <strong>private note</strong> (only that person sees it). At the wallet level you can also add free-text <strong>wishes</strong> visible to everyone — like 'Split this evenly between the three of you' or 'Hold in trust until the kids turn 25.' This solves the splitting-intent problem socially: you never have to do brittle percentage math, you just say what you mean.",
      },
      {
        q: "What does 'auto-assign new wallets' do?",
        a: "Set a default heir on your Legacy Plan, and any new wallet you connect gets automatically attached to them with an amber 'Review' badge. That way the moment you add a new chain or address, your inheritance plan stays complete by default — you'll never have a forgotten wallet sitting outside the plan. When you have time, click the wallet, confirm or change the recovery mode and people, and the amber dot turns green. You can change the default heir anytime in Legacy Plan settings.",
      },
      {
        q: "What is Family Collaborative Mode? Can my kids or spouse see my portfolio?",
        a: "Yes — and they can see it without ever touching it. Open <code>/family</code> and invite anyone you trust by email (your spouse, your kids, your accountant, your estate executor). They get an invite link, sign in with that email, and from then on they have a <strong>read-only</strong> view of your wallets, balances, and positions. A persistent blue banner at the top of their view says 'Viewing as guest of [your name]' so it's never confused with their own account.<br/><br/>What they CAN do: see your portfolio total, every wallet, every position, every balance. What they CANNOT do: send funds, swap, set up DCA, change settings, see private keys, or see seed phrases. None of that is even rendered for them. You can revoke access from <code>/family</code> at any time and it takes effect immediately — they lose the view on their next page load.<br/><br/>This is great for: teaching kids about money with real numbers (without giving them spending power), letting an aging parent's adult children keep an eye on the account, or giving an estate executor visibility before anything bad happens. Family Collaborative Mode is non-custodial like everything else on CryptoOwnBank — guest seats see what you see, but they have no keys and no authority.",
      },
      {
        q: "How is Family Collaborative Mode different from the Legacy Plan?",
        a: "They solve different problems and work together. <strong>Family mode</strong> is for <em>now</em> — your trusted people can see your portfolio in real time while you're alive and well, so they understand what you have and where it lives. Nothing is delivered, no keys are shared, and you can revoke at any moment. <strong>Legacy Plan</strong> is for <em>later</em> — if you stop checking in, the wallet recovery instructions you carefully wrote and (optionally) encrypted are released to the right beneficiaries on your terms. Most members use both: Family mode so the family is already familiar with the dashboard, and Legacy Plan so the actual recovery information passes only when needed. Family seats are included on Premium and Pro tiers.",
      },
      {
        q: "What is the Annual Review for the Legacy Plan?",
        a: "Every year, CryptoOwnBank reminds you to review your entire Legacy Plan — and it's not just a passive email you can ignore. You must log in to your dashboard and click the attestation button confirming everything is still accurate.<br/><br/><strong>Why this matters:</strong> Life changes in ways you don't always anticipate. A divorce means your ex-spouse may still be listed as a beneficiary or secondary contact. The passing of a beneficiary means their email goes nowhere. A new marriage or child means someone important isn't included yet. Moving to a new house means the device location you wrote down ('home office safe') is wrong. Upgrading from a Ledger to a CypheRock means the recovery instructions are outdated. Changing banks means the safe deposit box number in your instructions no longer exists. Even something as simple as your attorney retiring means the secondary contact needs updating.<br/><br/>The annual review checklist walks you through every critical item: beneficiaries and their emails, device and seed backup locations, secondary contact, split delivery assignments, and your personal message. A prominent banner appears on your Legacy Plan dashboard when it's due (amber at 30 days out, red when overdue). After you review everything and click 'I've Reviewed Everything — Attest My Plan Is Current,' the next review is set for one year later. A review counter tracks how many times you've attested, so you always know your plan is up to date.",
      },
      {
        q: "Is the Legacy Plan really 'Member for Life'?",
        a: "Yes — and you have three ways to pay for it: <strong>$9.99/mo</strong>, <strong>$79/yr</strong> (save $40), or <strong>$499 once for life</strong>. The Pro tier ($99/mo or $799/yr) includes Legacy Plan free. Whichever you choose, the check-in timer keeps running, your beneficiary instructions stay encrypted and ready, and the dead-man switch is always armed. If a monthly or annual subscription lapses, the plan is paused (not deleted) — your data is preserved so you can resume anytime. The lifetime option is what most members eventually pick once they realize the whole point of estate planning is that it should outlast a credit card expiry, a bank closure, or a forgotten renewal.",
      },
      {
        q: "What is the Legacy Plan Lifetime ($499 one-time)?",
        a: "Legacy Plan Lifetime is a single payment of $499 (or ~$449 in crypto with our 10% on-chain discount) that gives you the Legacy Plan forever — no recurring charges, no expired-card failures, no risk that a forgotten subscription causes the plan to lapse at exactly the wrong moment.<br/><br/><strong>What 'lifetime' actually covers:</strong> the plan stays active for as long as you're alive AND for 12 months after your dead-man switch fires and the recovery instructions are released to your beneficiaries. That extra year exists so your survivors have time to actually use the system — read the emails, combine the SLIP-39 shards on /decrypt, ask questions through support — without us yanking access in the middle of their grief.<br/><br/><strong>Inheritability:</strong> the lifetime seat passes to your primary beneficiary on trigger. They get a free year on us as the new account-holder, then convert to whatever tier suits them. We think this is the most honest thing a crypto inheritance product can do — make sure the person who actually inherits has a working account, not a paywall.<br/><br/><strong>Why we built it:</strong> recurring subscriptions are the #1 silent failure mode for estate planning. People set up a will, a Legacy Plan, a beneficiary form — and then a card expires, a bank closes, an email goes to spam, and the whole thing quietly stops working. Pre-paying once removes that failure mode entirely. It's also significantly cheaper than what most estate-planning lawyers charge for a single will revision.<br/><br/><strong>Pay with card or crypto:</strong> $499 via Stripe, or ~$449 in any of 25 supported cryptocurrencies (BTC, ETH, XRP, SOL, RLUSD, XLM, and more) for an automatic 10% on-chain discount.",
      },
      {
        q: "Why do BTC, ETH, SOL, XRP, and RLUSD get a bigger discount?",
        a: "We call those five our <strong>House Tier</strong> — pay your subscription, add-on, or Legacy Lifetime in any of them and you get <strong>15% off</strong> instead of the standard 10% on-chain discount. The reason is honest treasury alignment: BTC, ETH, and SOL are blue-chip assets we're comfortable holding (they tend to appreciate over time, denominated in dollars that don't), and XRP/RLUSD are our home chain — RLUSD literally funds the Soil Protocol vaults that pay our members 5–8% APR. When you pay us in those assets, you're effectively contributing to a treasury we want to grow rather than to a Stripe payout we have to convert. We pass the savings back to you as the bigger discount.<br/><br/>The other 20 supported cryptocurrencies (DOGE, LTC, ADA, AVAX, ATOM, XLM, TON, MATIC, and more) still get the standard 10% on-chain discount versus card payment — they're absolutely welcome, just not part of the house tier.<br/><br/><strong>Founder Badge:</strong> if you buy <strong>Legacy Plan Lifetime</strong> in any House Tier coin, your account gets a permanent visible Founding Member badge showing which coin you paid in and the month. It's our way of saying thank you to the members who put real Bitcoin, Ether, Solana, or XRP into the platform on day one.",
      },
      {
        q: "Can I switch from monthly to lifetime later?",
        a: "Yes. If you're already on the $9.99/mo or $79/yr Legacy Plan add-on, you can upgrade to lifetime at any time — just cancel the existing recurring add-on from Settings → Add-Ons, then purchase the $499 lifetime SKU. Your existing Legacy Plan data (beneficiaries, encrypted vaults, SLIP-39 shards, check-in history, settings) is preserved across the switch — only the billing model changes. We don't pro-rate or refund the previous month/year, but the math works out fast: 50 months of monthly = $499, so anyone planning to keep this for more than 4 years is better off on lifetime.",
      },
      {
        q: "What are the wallet-specific recovery templates?",
        a: "When you add a beneficiary, you select the wallet type — and the form transforms into a template tailored to that exact wallet's recovery method. We support 16 wallet types across three categories:<br/><br/><strong>Hardware wallets (cold):</strong> Ledger (24-word BIP39 + optional 25th word passphrase), CypheRock X1 (2-of-5 Shamir cards + device), Trezor (12/24-word seed), ELLIPAL (air-gapped, QR-only, 12/24-word mnemonic), Tangem (NFC card set — no seed phrase, the cards ARE the backup), Coldcard (Bitcoin-only, 24 words + optional passphrase), Keystone (air-gapped QR, 24 words), and BitBox02 (24 words + microSD backup).<br/><br/><strong>Software wallets (hot):</strong> Xaman/Xumm (XRPL family seed or secret numbers), MetaMask (12-word Secret Recovery Phrase), Trust Wallet, Phantom (Solana), Exodus (with optional email backup), and Coinbase Wallet (with optional cloud backup).<br/><br/><strong>Exchange accounts (custodial):</strong> Coinbase, Kraken, Binance, or any exchange — with fields for login credentials location, 2FA method, and estate process notes.<br/><br/>Each template tells you exactly what information is critical for that specific wallet — PIN location, passphrase location, card locations (for CypheRock), which apps are installed (for Ledger), the 2FA device (for exchanges), companion software (Ledger Live, Trezor Suite, etc.), and more. Your survivor doesn't need to know crypto — the template tells them exactly what they need and where to find it.",
      },
      {
        q: "Can the Legacy Plan pre-fill from my connected wallets?",
        a: "Yes. When you add a beneficiary and select a wallet type, the system checks your connected wallets and shows you which ones might be on that device. Select the wallets that are on that hardware, click 'Load Selected,' and the asset summary auto-fills with actual wallet addresses and current balances — so your survivor sees exactly what assets are on each device. You can edit the summary before saving. This means you don't have to remember what's on each device — the data comes straight from your portfolio.",
      },
      {
        q: "What is the Encrypted Vault in the Legacy Plan?",
        a: "The Encrypted Vault is an optional feature that lets you include sensitive recovery data — like seed words, PINs, passwords, or passphrases — with your beneficiary's instructions. This is for members who want a digital backup alongside their physical seed storage, to protect against the risk of the physical backup being lost, destroyed, or unfindable by a survivor.<br/><br/><strong>How the encryption works:</strong> You create a 'Legacy Passphrase' and enter the sensitive recovery data directly in your browser. The data is encrypted using AES-256-GCM (the same encryption standard used by banks, governments, and military applications) with PBKDF2 key derivation (600,000 iterations of SHA-256). The encryption happens entirely in your browser — the plaintext never leaves your device, is never transmitted over the internet, and is never seen by CryptoOwnBank's servers. We store only the encrypted ciphertext, which is meaningless without your passphrase.<br/><br/><strong>What AES-256-GCM means in plain terms:</strong> AES-256 is a 256-bit encryption key — there are more possible keys than atoms in the observable universe. GCM (Galois/Counter Mode) ensures both confidentiality and integrity, meaning the data cannot be read OR tampered with without the correct passphrase. PBKDF2 with 600,000 iterations means even if someone tried to guess your passphrase by brute force, each attempt takes significant computation time, making dictionary attacks impractical.<br/><br/><strong>The two-factor protection:</strong> Your survivor needs two things to access the data: (1) the encrypted blob (delivered via email when the dead-man switch triggers), and (2) the Legacy Passphrase (which you share separately — verbally, in a will, through an attorney, or in a sealed envelope in a safe). Neither piece is useful without the other. Even if CryptoOwnBank were breached, the attacker would get encrypted blobs they cannot open. Even if the email is intercepted, same result — useless without the passphrase.<br/><br/><strong>Decryption:</strong> When triggered, the survivor visits <a href='/decrypt' class='text-[#00A4E4] underline hover:no-underline'>cryptoownbank.com/decrypt</a>, pastes the encrypted text from the email, enters the passphrase, and the decryption happens entirely in their browser. Nothing is sent to any server. The page works offline after loading. CryptoOwnBank never has the ability to decrypt your data — even if compelled by a court order, because we simply do not have the key.",
      },
      {
        q: "Can I test the vault decryption before relying on it?",
        a: "Yes — and you should. During setup, after encrypting your recovery data, a 'Test Decrypt' button appears. Click it to verify the decryption produces the correct plaintext before saving the beneficiary. We strongly recommend writing down your Legacy Passphrase and storing it in at least two separate physical locations (e.g., attorney's sealed envelope + home safe). If the passphrase is lost, the encrypted data is permanently unrecoverable — that's the trade-off for true zero-knowledge encryption.",
      },
      {
        q: "What is SLIP-39 and why should I use it for my Legacy Plan?",
        a: "SLIP-39 is the open standard for splitting a seed phrase into multiple shards so that no single person — and no single location — ever holds the whole secret. Instead of one 12 or 24-word phrase that anyone who finds it can drain, you can split it into (say) 5 shards where any 3 reconstruct the original. <br/><br/><strong>Why we built it in:</strong> the #1 way crypto inheritance fails is a single point of failure — a fire destroys the steel plate, a thief finds the safe, a relative photographs the page. Splitting the seed across people and places eliminates that single point. We support presets like 2-of-3, 3-of-5, and custom group structures (e.g. 'family OR attorney+accountant'), so you can tailor it to who you actually trust. <br/><br/><strong>How we make it safe to learn:</strong> there's a Learn & Sandbox page where you can experiment with a throwaway seed before you ever touch your real one. The splitter runs entirely in your browser — your seed never leaves your device, never touches our servers, never appears in any log. We never see it, never store it, can't recover it for you. You always remain in full control.",
      },
      {
        q: "Why does the splitter run in my browser instead of on the server?",
        a: "Because the moment your seed phrase touches anyone else's computer — ours, an exchange's, a 'helpful' web tool's — you have to trust that machine forever. We refuse to be in that position with your money. The SLIP-39 splitter, the AES-256-GCM vault encryption, and the shard combiner on /decrypt all run as JavaScript in your browser. Your seed and shards exist only in your tab's memory, get wiped when you close it, and never leave your device. <br/><br/>This is a deliberate architectural choice with a real cost: we can't help you recover a lost passphrase, can't undelete a shard, can't 'reset' anything. But it also means a CryptoOwnBank breach, a rogue employee, a subpoena, or a server compromise gives the attacker exactly nothing useful about your wallet. That's the standard you should demand from anyone holding inheritance data — and it's the standard we hold ourselves to.",
      },
      {
        q: "How does the /decrypt page help my survivors?",
        a: "/decrypt is a standalone page that requires <strong>no login, no account, and no CryptoOwnBank subscription</strong>. Your survivors paste in the encrypted vault they received by email, type the Legacy Passphrase you shared with them, and the page decrypts it locally in their browser. The same page also includes a SLIP-39 shard combiner: they paste in the shards they collected from the people you trusted, and it reconstructs your seed phrase. <br/><br/><strong>Why this matters:</strong> when your family needs this, the last thing they should be dealing with is creating an account, paying a subscription, or hoping our company still exists. By making /decrypt a self-contained, login-free, browser-only page, your beneficiaries can use it years from now even if CryptoOwnBank no longer exists — anyone with a copy of the page (or any open-source SLIP-39 tool) can recover the wallet. That's what 'true ownership' means: even our shutdown can't lock your family out.",
      },
      {
        q: "What is the auto-suggestion scanner for wallets over $10k?",
        a: "When you connect a wallet that holds more than $10,000 in value, your dashboard surfaces a friendly nudge suggesting you set up (or extend) a Legacy Plan for it. We don't auto-enroll you, charge you, or share the data — it's just a reminder shown to you, the wallet owner. <br/><br/><strong>Why we built it:</strong> people who lose access to a $500 wallet shrug it off; people whose families lose access to a $50,000 wallet never recover. The painful reality is that most large-balance wallets have no inheritance plan because the owner kept thinking 'I'll set it up next month.' The scanner makes 'next month' impossible to forget. You can dismiss the suggestion permanently if you've already handled it elsewhere — we won't nag.",
      },
      {
        q: "What is the Last-Resort Fallback and why does it exist?",
        a: "The Last-Resort Fallback is the safety net for the safety net. Imagine the dead-man switch fires correctly, your beneficiaries receive their shards by email, but then — for any reason — they never actually combine them. Maybe they lose their shard. Maybe two of them stop speaking. Maybe one passes away before they reconstruct. Without a fallback, your encrypted vault sits forever and your family inherits nothing. <br/><br/><strong>How it works (default settings, all configurable):</strong> if no one successfully reconstructs the seed within 1 year of the trigger firing, the system enters a 30-day notification phase where every stakeholder (all beneficiaries + your secondary contact + you, if you're somehow still reachable) gets an email saying 'release is being considered.' If no one objects in those 30 days, a second 60-day confirmation phase begins with a final warning email. Only if no objection arrives in that combined 90-day window does the encrypted vault get released to your beneficiaries directly — bypassing the unrecoverable shard situation. <br/><br/><strong>Why the long window:</strong> we err extremely heavily on the side of NOT releasing prematurely. A full year plus 90 days of stakeholder notifications gives anyone the chance to say 'wait, the owner is still alive' or 'we just need more time to coordinate the shards.' One click in the email pauses release for another 90 days. <br/><br/><strong>You're in control:</strong> the entire fallback is opt-in, configurable, and can be disabled from your Legacy Plan dashboard at any time. If you'd rather your encrypted vault stay locked forever than risk release, just turn it off.",
      },
      {
        q: "Who can object to a last-resort release, and how do I know it can't be abused?",
        a: "Only the people <strong>you</strong> chose can object: your beneficiaries, your secondary contact, and you yourself (using the email on your account). When the notification email goes out, it includes a one-click objection link. Clicking it opens a page where the stakeholder enters the email address they received the notification at, optionally a reason, and submits. Our server checks that the email matches one of the stakeholders on YOUR plan before recording the objection — random strangers cannot delay your family's inheritance, even if they somehow obtain the link. <br/><br/>Every action — notification sent, confirmation sent, objection received, release executed — is recorded in a tamper-evident audit log on your plan, so there's a complete history if anyone ever asks 'what happened?' This is your money and your family's future; we treat the audit trail accordingly.",
      },
      {
        q: "How do I keep my SLIP-39 shards safe between now and when they're needed?",
        a: "A few practices we strongly recommend, in order of importance: <br/><br/><strong>(1) Diversify locations.</strong> If shards live in two places (home + safe deposit box), one fire or one burglary can wipe them out. Aim for 3+ physically separated locations across people you trust. <br/><br/><strong>(2) Use durable media.</strong> Paper burns and rots; ink fades. For long-term storage, stamp shards onto stainless steel plates (Cryptosteel, Billfodl, or a $20 punch set on plain steel works fine). For maximum security, hardware wallets like the Cypherock X1 do SLIP-39-style splitting natively and ship shards on tamper-evident cards. <br/><br/><strong>(3) Keep an offline copy of the recovery tool.</strong> The official iancoleman SLIP-39 page is open-source and can be saved as a single HTML file you keep on a USB stick — it works fully offline forever. We link to it from the Learn page so your survivors aren't dependent on us being online. <br/><br/><strong>(4) Test the recovery once.</strong> Before you walk away, do one full dry-run: hand shards to your trusted people, then have a subset combine them on /decrypt to confirm the seed reconstructs. A plan you've never tested is a plan that probably doesn't work.",
      },
      {
        q: "Why does CryptoOwnBank warn me when I paste a seed phrase anywhere on the site?",
        a: "Because no legitimate CryptoOwnBank workflow ever needs your seed phrase typed into our site. Period. The only places a real seed should appear are: in your hardware wallet's recovery screen, on your steel plate, and (briefly, in your browser only) in the SLIP-39 splitter and /decrypt combiner — both of which run entirely client-side and never transmit. <br/><br/>If you paste 12 or 24 words into a search bar, an address field, a chat box, or any other input on our site, an in-page warning fires immediately telling you to stop. This catches the most common ways people get drained — phishing pages that look like ours, copy-paste accidents, or following bad advice from scam 'support agents.' We'd rather annoy you with a warning than watch you lose everything to a moment of confusion.",
      },
      {
        q: "Are there fees for using XRPL and Stellar Tools?",
        a: "CryptoOwnBank charges no platform fees for using the Token Manager, DEX Trading, DCA Orders, or Send & Receive on either chain. The only cost is the network fee — approximately 0.00001 XRP per transaction on XRPL, or 0.00001 XLM (100 stroops) on Stellar. Both are a fraction of a fraction of a penny. Compare that to $25–50 wire transfer fees, $5–15 stock trading commissions, or 1–3% exchange fees. These are two of the cheapest networks to transact on.",
      },
      {
        q: "What is Crypto News?",
        a: 'The <a href="/crypto-news" class="text-[#00A4E4] underline hover:no-underline">Crypto News</a> page aggregates the latest headlines from CoinDesk, CoinTelegraph, Decrypt, and The Block — the most trusted names in crypto journalism. Articles refresh every 15 minutes and open in a new tab to the original source. You can filter by source or search by keyword.',
      },
      {
        q: "What is the 'For You' news section?",
        a: "When you're logged in, the Crypto News page shows a personalized \"For You\" section at the top. It scans every article and matches it against the assets you actually hold in your wallets. If you own XRP, BTC, ETH, or any of 20+ supported assets, articles mentioning those assets are surfaced automatically with blue asset badges so you know exactly why it's relevant. It stays in one dedicated section — no pop-ups, no banners, no distractions elsewhere on the site. The information comes to you when you're ready for it.",
      },
      {
        q: "What are Whale Alerts?",
        a: "Whale Alerts is real-time monitoring of large XRP and RLUSD transfers on the XRP Ledger. The system watches for transactions of 1 million XRP or more, and 500,000 RLUSD or more. You see the amount, direction, and identified wallets (e.g. Binance, Ripple, Kraken, Bitstamp) in real time — so you know when big players are moving funds. Free users see the last 24 hours of whale activity; Premium and Pro users see extended history.",
      },
      {
        q: "Can I customize whale alert thresholds?",
        a: "Yes — Premium and Pro users can set custom minimum thresholds for both XRP and RLUSD whale alerts. The defaults are 1 million XRP and 500,000 RLUSD. You can lower them to a minimum of 100,000 XRP and 10,000 RLUSD to catch smaller whale movements, or raise them to focus only on the biggest transfers.",
      },
      {
        q: "How does whale wallet identification work?",
        a: "We maintain a curated database of known XRPL wallet addresses covering major exchanges (Binance, Kraken, Coinbase, Bitstamp, Uphold, and more), Ripple-associated wallets, escrow accounts, token issuers, and DeFi protocols. When a whale transaction occurs, we look up both the sender and receiver to show you human-readable labels like 'Binance Hot Wallet' or 'Ripple Escrow' instead of just raw addresses. Unknown wallets still show the raw address.",
      },
      {
        q: "What technical analysis indicators are available?",
        a: "Free users get Simple Moving Average (SMA) at 20, 50, and 200 periods with up to 30 days of data. Premium and Pro users unlock all indicators: Exponential Moving Average (EMA 12/26), Relative Strength Index (RSI, 14-period), MACD (12/26/9 with signal line and histogram), and Bollinger Bands (20-period, 2 standard deviations) — with up to 10 years of candlestick data (1D, 1W, 1M, 3M, 1Y, 3Y, 5Y, and 10Y timeframes). Charts support interactive zoom and pan across 21 supported crypto assets including BTC, ETH, XRP, SOL, XLM, ADA, and more.",
      },
      {
        q: "Does the chart tell me what the candlestick patterns mean?",
        a: "Yes — the chart has live pattern detection built in. When you hover over any candle, the tooltip automatically identifies if it matches a known pattern (Doji, Hammer, Shooting Star, Bullish/Bearish Engulfing, Morning Star, Evening Star, Marubozu, Piercing Line, Dark Cloud Cover, Three White Soldiers, Three Black Crows, and more). Each pattern shows a colored badge (green for bullish, red for bearish, yellow for neutral) and a plain-English explanation of what it means — like 'Buyers pushed price back up' or '3-candle reversal — uptrend may be ending.' Small diamond markers also appear on the chart where patterns are detected, so you can spot signals at a glance. There's also a collapsible 'How to Read This Chart' section right above the chart that teaches you the anatomy of candlesticks — what the body, wicks, and shapes mean — plus a full Chart Patterns & Indicators Guide below with deeper education on single, double, and triple candle patterns, reversal/continuation chart formations, and indicator explanations.",
      },
      {
        q: "What's the difference between a limit order and a market order?",
        a: "A limit order lets you set your price and wait for a match — like saying 'I'll buy XRP at $2.00 or less.' Your order sits in the order book until someone is willing to sell at your price. A market order executes immediately at the best available price — you get filled right away but might pay slightly more (or receive slightly less) than the current displayed price. On the XRPL DEX, limit orders use OfferCreate and market orders use OfferCreate with the Immediate or Cancel flag.",
      },
      {
        q: "What is a destination tag and when do I need one?",
        a: "A destination tag is like a memo or reference number attached to an XRPL payment. Exchanges like Binance, Coinbase, Uphold, and Kraken use a single XRPL address for all their users — the destination tag tells the exchange which user account to credit. If you're sending to an exchange, always include the destination tag they provide or your funds may be lost. If you're sending to a personal wallet (your own XRPL address), you typically don't need a destination tag.",
      },
    ],
  },
  {
    groupKey: "token-research",
    heading: "Token Research",
    items: [
      {
        q: "What is Token Research?",
        a: '<a href="/token-research" class="text-[#00A4E4] underline hover:no-underline">Token Research</a> is a free tool that lets you look up any EVM token by its contract address and get an instant safety report before you buy. It checks for honeypot traps (tokens you can buy but never sell), hidden mint functions (the creator can print unlimited tokens and dump on you), ownership risks (the creator can pause trading or blacklist your wallet), buy/sell tax (some tokens take 50%+ of every transaction as a hidden fee), and holder concentration (if one wallet holds 90% of supply, they can crash the price in one transaction). It returns a 0-100 risk score and plain-English warnings so you can make an informed decision. It supports Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche, and Optimism.',
      },
      {
        q: "How do I find a token's contract address?",
        a: 'You have two options. The easiest way is to use the "Search by Name" tab on the Token Research page — type any token name or symbol (like "PEPE" or "Chainlink") and we\'ll search CoinGecko for matches, showing you the token\'s price, market cap, and which chains it\'s deployed on. Click "Analyze" on any result to run the full safety check instantly. If you already have a contract address from <a href="https://dexscreener.com" target="_blank" rel="noopener noreferrer" class="text-[#00A4E4] underline hover:no-underline">DEXScreener</a>, <a href="https://www.dextools.io" target="_blank" rel="noopener noreferrer" class="text-[#00A4E4] underline hover:no-underline">DEXTools</a>, or <a href="https://www.geckoterminal.com" target="_blank" rel="noopener noreferrer" class="text-[#00A4E4] underline hover:no-underline">GeckoTerminal</a>, switch to the "By Contract Address" tab and paste it directly. Always verify the contract address matches what the project officially published — scammers create copycat tokens with the same name to trick people.',
      },
      {
        q: "What does the risk score mean?",
        a: "The risk score ranges from 0 (lowest risk) to 100 (highest risk). It's calculated from multiple security signals: honeypot detection, hidden mint functions, ownership privileges, buy/sell taxes, proxy contract risks, and holder concentration. A score of 0-19 is considered lower risk (green), 20-49 is medium risk (yellow), and 50-100 is high risk (red). A low score doesn't mean a token is a good investment — it means the contract doesn't have obvious technical red flags. Price can still go to zero for reasons that have nothing to do with the contract code.",
      },
      {
        q: "What is a honeypot token?",
        a: "A honeypot is a token where you can buy but cannot sell. The contract code contains hidden logic that blocks sell transactions for everyone except the creator. You watch the price go up, try to sell, and your transaction fails — meanwhile the creator sells their share and disappears with the liquidity. This is one of the most common crypto scams. Token Research checks for this automatically and flags it as the highest-severity warning.",
      },
      {
        q: "What does 'hidden mint function' mean?",
        a: "A hidden mint function means the contract owner can create new tokens out of thin air at any time. They deploy the token with a fixed supply, let people buy in, then mint millions of new tokens and dump them on the market — crashing the price. If Token Research flags 'Mintable,' it means the contract has this capability. It doesn't mean they will use it, but it means they can.",
      },
      {
        q: "What are buy/sell taxes?",
        a: "Some tokens have a built-in tax on every buy or sell transaction. A 5% buy tax means if you buy $100 worth, you only receive $95 worth of tokens. A 10% sell tax means if you sell $100 worth, you only get $90. Some scam tokens start with low taxes and then the owner changes them to 99% — making the token effectively unsellable. Token Research shows you the current buy and sell tax percentages so you know what you're getting into before you trade.",
      },
      {
        q: "Can I swap a token directly from the research page?",
        a: 'Yes. After researching a token, click the "Trade on EVM Swap" button and it takes you to the EVM Swap page with the token\'s contract address and chain pre-filled. Even if the token is too small for 1inch, EVM Swap automatically falls back to the chain\'s native DEX (Uniswap, PancakeSwap, etc.) so you can buy it right here without leaving the site. You still need to review the swap details, connect your wallet, and approve the transaction — but the entire research-to-purchase flow happens on CryptoOwnBank.',
      },
      {
        q: "Is Token Research financial advice?",
        a: "No. Token Research is a technical analysis tool that reads smart contract code and on-chain data. It tells you what the contract can do — not whether the token is a good investment. A token can pass every security check and still lose 100% of its value due to market conditions, team abandonment, regulatory action, or simply lack of demand. Always do your own research beyond the contract analysis, never invest more than you can afford to lose, and understand that most new tokens fail.",
      },
      {
        q: "How do I choose which chain to buy a token on?",
        a: "When a token is available on multiple chains (for example, Ethereum and BNB Chain), consider four factors: <strong>Liquidity & Volume</strong> — the chain with more trading volume gives you a better price with less slippage; check DEXScreener to compare. <strong>Gas Fees</strong> — Ethereum gas can be $2-50+ per swap, while BNB Chain, Polygon, Arbitrum, and Base are typically under $1; for smaller purchases, high gas eats a big percentage of your investment. <strong>Contract Security</strong> — the same project can have different contract code on different chains, so run Token Research on both and compare risk scores. <strong>Bridge Risk</strong> — if a token originated on one chain and was bridged to another, the bridged version depends on the bridge contract's security. <strong>Rule of thumb:</strong> for larger amounts, prioritize the chain with the most liquidity; for smaller amounts, prioritize lower gas fees. If you already hold ETH or BNB in your wallet, buying on that chain avoids the extra cost and risk of bridging funds.",
      },
      {
        q: "Does Token Research work for XRPL or Stellar tokens?",
        a: "No — Token Research is for EVM-compatible chains only (Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche, and Optimism). XRPL and Stellar tokens work differently — they don't have smart contracts with hidden functions, so the same types of honeypot and mint risks don't apply. On the XRPL, token safety is more about issuer trustworthiness and trustline settings, which you can evaluate through the Token Manager.",
      },
    ],
  },
  {
    groupKey: "payments",
    heading: "Payments & Business",
    items: [
      {
        q: "Can I use CryptoOwnBank to accept payments for my business?",
        a: "Yes. Connect your XRPL wallet, set up trustlines for the currencies you want to accept (like RLUSD), and use OwnCoin POS — your portable crypto point-of-sale. Open it on your phone, pick your receiving wallet and currency, and a QR code appears instantly. Your customer scans it with Xaman or any XRPL wallet, taps approve, and payment settles directly to your wallet in 4 seconds. CryptoOwnBank is the tooling layer — we give you the tools to process your own payments. We never sit between you and your customer, never hold funds, and never take a percentage. No processing fees, no chargebacks, no merchant account needed.",
      },
      {
        q: "What is OwnCoin POS?",
        a: "OwnCoin POS is your portable crypto point-of-sale terminal — built into CryptoOwnBank. Go to OwnCoin POS in the sidebar under OwnBank XRPL. Select which wallet receives funds (XRP, RLUSD, XLM, USDC, or any supported currency), optionally set an amount, and a branded QR code appears on your screen. Your customer scans it and pays — no app download required on their end, just any compatible wallet. You can also share the payment link via text, email, or social media. If you add your business name and logo in Settings, the card displays your branding so it looks professional. Use it at a market stall, in a meeting, at a food truck, or anywhere you do business. Settlement is 4 seconds on XRPL, near-zero fees, no chargebacks, and the money goes directly to your cold wallet.",
      },
      {
        q: "How does this compare to Stripe or PayPal for accepting payments?",
        a: "The difference isn't just fees — it's control. With Stripe (typically 2.9% + $0.30 per transaction, 2-day settlement), PayPal (around 2.99% + $0.49, with account freezes at their discretion), and wire transfers ($25–50, 1–5 business days), a company sits between you and your money. They can freeze your account, delay payouts, demand documentation, limit your transaction volume, or shut you down entirely — and you have no recourse because it's their platform. On the XRPL, funds go directly from your customer's wallet to yours in about 4 seconds for approximately 0.00001 XRP (a fraction of a penny). Nobody can freeze your wallet, nobody can delay your settlement, nobody can shut you down. On a $5,000 invoice, Stripe takes about $145 and holds it for 2 days. On the XRPL, you keep every penny and have it immediately. The tradeoff: your customers need an XRPL wallet. But for crypto-native businesses, freelancers, and international payments, the combination of lower cost and total control over your own money is what being your own bank actually looks like in practice.",
      },
      {
        q: "Can my customer pay in one currency and I receive another?",
        a: "Yes — the XRPL has built-in cross-currency pathfinding. XRP acts as the bridge currency. If a customer pays in EUR and you want to receive RLUSD (US dollars), the XRPL can automatically route EUR → XRP → RLUSD using the DEX order book liquidity. It all happens in one transaction, typically in 4 seconds, with no correspondent banks and no SWIFT codes. The only costs are the tiny network fee (~0.00001 XRP) and the DEX spread (the difference between buy and sell prices on the order book, which varies by pair and liquidity). This is Ripple's original vision for XRP as a bridge currency — and your business can use it today.",
      },
      {
        q: "Is accepting crypto payments legal for my business?",
        a: "In most jurisdictions, yes. Accepting cryptocurrency as payment for goods and services is legal and treated similarly to accepting any other form of payment. You'll need to track the fair market value at the time of receipt for tax purposes (our portfolio tracker and tax reports help with this). Because CryptoOwnBank is non-custodial and you process payments directly through your own wallet, there's no intermediary involved — similar to a customer handing you cash, except on-chain. We recommend consulting a tax professional for your specific situation.",
      },
      {
        q: "What is a 'payment corridor' and how does XRP fit in?",
        a: "A payment corridor is a path that moves value from one place to another — like a highway for money. Traditional corridors run through banks, SWIFT networks, and payment processors, each adding fees, delays, and rules. XRP was designed to be the universal bridge currency: any value in → XRP → any value out, in seconds, for essentially free. CryptoOwnBank gives you the tools to use this corridor directly. Send & Receive handles the payments. The DEX handles currency conversion. Token Manager handles which currencies you can hold. Together, they form a complete payment corridor that you own and control — no bank, no processor, no middleman required.",
      },
      {
        q: "What about chargebacks? Can a customer reverse a crypto payment?",
        a: "No — and this is one of the biggest advantages of being your own bank. With credit card processors, a customer can dispute a charge up to 120 days after purchase. The card network (Visa, Mastercard) almost always sides with the buyer, and the merchant loses the money plus a $15–25 dispute fee from Stripe or PayPal — even if the product was delivered. U.S. merchants lose over $100 billion per year to chargebacks. For small businesses, a few fraudulent disputes can wipe out an entire month's profit. On the XRPL, payments are final the moment they confirm — about 4 seconds. There is no bank sitting between you and your customer that can reach into your account and pull money back out. No 120-day dispute window, no chargeback fees, no lost revenue to fraud. You keep what you earned, period. If a legitimate refund is needed, YOU decide — you send a payment back through the Send & Receive page on your terms, for your reasons, on your timeline. That's the difference between using a payment processor and being your own bank: with Stripe, someone else controls whether you keep your money. With the XRPL, you do.",
      },
      {
        q: "Can freelancers and contractors use this for invoicing?",
        a: "Absolutely. Share your XRPL address or QR code with your client, specify the amount and currency (RLUSD for dollar-equivalent payments), and they send it directly. The payment settles in 4 seconds. Save your regular clients as contacts in the address book for quick access. For international freelancers, cross-currency payments mean your client in Germany can pay in EUR and you receive RLUSD — no bank conversion fees, no waiting days for a wire, no PayPal holding your funds for 21 days.",
      },
      {
        q: "Do I need Premium to accept business payments?",
        a: "The Send & Receive page and Token Manager (for setting up trustlines) are available on the free tier. DEX trading (XRPL and Stellar) requires Premium or above. Premium also adds unlimited blockchain address tracking, full transaction history, and tax reports — which become valuable as your payment volume grows and you need to track everything for accounting and tax filing.",
      },
      {
        q: "What if I don't have a bank account? Can I still use CryptoOwnBank?",
        a: "Yes — and this is exactly the point. An estimated 1.4 billion adults worldwide are unbanked — no access to a traditional bank account at all. Whether that's because there's no bank branch nearby, you don't have the required documentation, or you can't meet minimum balance requirements, traditional finance was never built to include you. The XRPL requires nothing but an internet connection. Download a wallet app like Xaman, create an account in minutes, and you have full access to: receive payments from anyone in the world, send money in 4 seconds for a fraction of a penny, trade on a decentralized exchange, hold dollar-pegged stablecoins (RLUSD) to protect against local currency inflation, and earn 5–8% yield on your savings. No bank account, no credit check, no minimum balance, no government ID required by the network. A street vendor in Lagos and a Wall Street trader use the same blockchain, pay the same fees, and settle in the same 4 seconds.",
      },
      {
        q: "What does 'debanked' mean and how does CryptoOwnBank help?",
        a: "Debanked means you had a bank account or payment processor — and lost it. Banks close accounts without explanation. PayPal freezes funds for 180 days. Stripe shuts down businesses overnight. Entire industries (crypto, cannabis, firearms, adult content, even legal political organizations) have been systematically cut off from traditional financial services — not because they broke laws, but because a compliance algorithm flagged them as 'high risk.' When you're debanked, you can't process payments, can't receive payroll, can't run your business. On the XRPL, nobody can close your wallet. Nobody can freeze your funds. Nobody can decide your business is too risky to serve. Your wallet runs on a decentralized blockchain that no single company controls. CryptoOwnBank gives you the tools to operate your financial life entirely on-chain — accept payments, manage tokens, trade, earn yield — without needing permission from any institution. That's what being your own bank means when the banks don't want you.",
      },
      {
        q: "Can someone in another country use CryptoOwnBank to participate in global commerce?",
        a: "Absolutely. The XRPL is a global, borderless network. Someone in the Philippines can receive a payment from a client in Germany, hold it in RLUSD (pegged to the US dollar for stability), trade it on the DEX, or earn yield — all in the same 4 seconds, for the same fraction-of-a-penny fee, using the same tools as everyone else. No international wire fees, no SWIFT codes, no correspondent banks, no 3–5 day waits, no currency conversion markups from banks. CryptoOwnBank is the interface that makes this accessible — clean, educational, non-custodial. If you have internet, you're in.",
      },
      {
        q: "Do I need to buy crypto through an exchange, or can I just earn it?",
        a: "You can earn it directly — no exchange or bank account needed. If you sell goods, provide services, or do any kind of work, you can get paid in XRP or RLUSD instead of cash. A farmer sells produce at a market: the buyer scans the farmer's QR code in Xaman, sends 25 RLUSD, and the farmer has $25 in digital dollars in 4 seconds. No bank involved at any point. No conversion step. No fees. The only requirement to get started is someone sending you ~10 XRP to activate your wallet (the XRPL network reserve). After that, you can receive unlimited payments from anyone in the world. This is the on-ramp that doesn't go through a bank: you earn crypto by providing value, the same way you'd earn cash — except the money lands in your wallet instantly and nobody takes a cut.",
      },
      {
        q: "Can I earn, save, and spend entirely in crypto without ever touching a bank?",
        a: "Yes — this is what we call the circular crypto economy, and it's already possible today. Earn: sell your goods or services and get paid in RLUSD or XRP directly to your wallet. Save: deposit RLUSD into a Soil vault and earn 5–8% APR — more than most bank savings accounts anywhere in the world. Your position compounds automatically until you withdraw. Spend: pay suppliers, vendors, or anyone else with an XRPL wallet. Send money to family. Buy from others who accept crypto. The XRPL handles it all in 4 seconds for fractions of a penny. No bank touches your money at any point in this loop. The more people in your community using XRPL wallets, the less anyone needs traditional banking. A village where 20 people have wallets is a village with its own financial system. Our Getting Started Toolkit for unbanked users at /setup-guide walks through every step of this.",
      },
      {
        q: "Is crypto worth the same everywhere, or does my country's currency affect it?",
        a: "This is one of the most important things to understand: 1 XRP held by someone in the United States has the exact same value as 1 XRP held by someone in Nigeria, Argentina, Turkey, the Philippines, or anywhere else. There's no exchange rate working against you. No currency depreciation penalizing you for where you live. In the traditional system, a farmer in Nigeria who earns in naira watches their savings lose value as the currency depreciates against the dollar — sometimes 20-50% in a single year. A farmer who earns in RLUSD (pegged 1:1 to the US dollar) or holds XRP has the same purchasing power as someone holding those same assets in New York. For the first time in history, the financial playing field is actually level. Same token, same value, same tools, same fees, same speed — regardless of geography. That's not a feature of CryptoOwnBank. That's a feature of crypto itself. We just make it easy to use.",
      },
      {
        q: "How does a farmer or small vendor without a bank use CryptoOwnBank?",
        a: "Here's the complete path: (1) Download Xaman on your smartphone — free, takes 2 minutes. (2) Get your wallet activated — someone sends you ~10 XRP (a friend, customer, or community member who already uses crypto). (3) Set up an RLUSD trust line — one tap in Xaman, lets you hold dollar-stable value. (4) Start accepting payment — show your QR code when you sell produce, crafts, services, or anything else. Buyer scans, sends RLUSD, you receive $-value in 4 seconds. (5) Spend — pay your seed supplier, your landlord, or anyone else with a wallet the same way. (6) Save — deposit what you don't spend into a Soil vault and earn 5–8% APR. Compare that to cash under a mattress losing value to inflation. No bank account at any step. No government ID required by the network. No minimum balance. No monthly fees. The only thing you need is internet. See the full step-by-step guide: /setup-guide (choose the 'Unbanked / Debanked' toolkit).",
      },
    ],
  },
  {
    groupKey: "amm-flare",
    heading: "XRPL AMM Pools & Flare FTSO",
    items: [
      {
        q: "What are XRPL AMM Pools?",
        a: "XRPL AMM (Automated Market Maker) pools are native liquidity pools built directly into the XRP Ledger. Unlike traditional order book trading where buyers and sellers match at specific prices, AMM pools allow anyone to provide liquidity by depositing two assets into a pool. In return, you earn a share of the trading fees generated when others swap between those assets. CryptoOwnBank tracks the live state of popular AMM pools — XRP/RLUSD, XRP/USD (Bitstamp), and XRP/USDT (GateHub) — showing real-time pool depth, your LP token share percentage, and current trading fee rates.",
      },
      {
        q: "How do XRPL AMM pools differ from Uniswap or PancakeSwap?",
        a: "The key difference is that XRPL AMM pools are native to the protocol — no separate smart contract, no third-party DEX app, no governance token required. On Ethereum, you need to connect to Uniswap (a third-party app), approve a smart contract, and pay $5–50 in gas fees. On the XRPL, the AMM is built into the ledger itself. You interact with it directly from your wallet. Fees are fractions of a penny. No smart contract risk. No bridge required. The AMM coexists with the traditional XRPL order book DEX, giving you both options on the same chain.",
      },
      {
        q: "What is impermanent loss in AMM pools?",
        a: "Impermanent loss occurs when the price ratio of the two assets in a pool changes after you deposit. If you provide liquidity for XRP/RLUSD and XRP's price doubles, you would have been better off simply holding your XRP rather than providing liquidity — because the pool rebalances and you end up with more RLUSD and less XRP. The loss is called 'impermanent' because it reverses if prices return to where they were when you deposited. Trading fees you earn from the pool may offset impermanent loss, especially in high-volume pools. The CryptoOwnBank AMM Pools page includes an educational section explaining this in detail.",
      },
      {
        q: "What is Flare FTSO and how do delegation rewards work?",
        a: "Flare is a Layer 1 blockchain designed to provide decentralized data to smart contracts. FTSO (Flare Time Series Oracle) is Flare's native price oracle system. You earn rewards by delegating your WFLR (wrapped FLR) to FTSO data providers — these are operators who submit price data to the network. When their data is accurate, both the provider and their delegators earn FLR rewards. Estimated APY is 5–15% depending on which providers you delegate to and current network participation rates.",
      },
      {
        q: "What is FlareDrop and how do I claim it?",
        a: "FlareDrop is a 36-month token distribution program that rewards Flare holders who wrap their FLR to WFLR. Each month, a portion of FLR tokens is distributed proportionally to WFLR holders. To be eligible: (1) Hold FLR in a supported wallet like Bifrost Wallet. (2) Wrap your FLR to WFLR. (3) Claim each monthly distribution through the Flare Portal or Bifrost Wallet. CryptoOwnBank's Flare page shows your current FlareDrop eligibility, which month the distribution is on, and a readiness checklist to make sure you're set up to receive drops.",
      },
      {
        q: "How do I get started with Flare FTSO delegation?",
        a: 'Here\'s the step-by-step: (1) Get FLR tokens — buy on an exchange like Uphold, Kraken, or Bitrue, or receive them from the original FLR airdrop. (2) Move FLR to Bifrost Wallet — download it from the App Store or Google Play, create a wallet, and withdraw your FLR from the exchange to your Bifrost address (starts with 0x). Use the Flare network, not Ethereum or XRPL. Test with a small amount first. (3) Wrap your FLR to WFLR — tap Wrap inside Bifrost. Leave 5–10 FLR unwrapped for gas fees. (4) Delegate WFLR to FTSO data providers — choose up to 2 providers in the FTSO Delegation section. Your tokens stay in your wallet — delegation is a signal, not a transfer. (5) Claim rewards — accumulate every ~3.5 days, claim in Bifrost and re-wrap to compound. See the full setup guide on the <a href="/flare" class="text-[#00A4E4] underline hover:no-underline">Flare FTSO Rewards page</a>.',
      },
      {
        q: "What is the Native Staking Guide and which chains are supported?",
        a: 'The <a href="/native-staking" class="text-[#00A4E4] underline hover:no-underline">Native Staking Guide</a> covers chains where you can earn yield directly from the blockchain protocol — no smart contracts, no bridges, no middlemen. Currently live: Cardano (ADA, 3-4% APR via AdaLite, Yoroi, Daedalus, or Eternl), Cosmos (ATOM, 15-20% APR via Keplr), Polkadot (DOT, 12-15% APR via Nova Wallet), and Solana (SOL, 6-8% APR via Phantom). Coming soon: XRP Ledger native lending vaults (XLS-65/66, currently in validator voting). The page shows your staked vs unstaked balances for each chain, projected yearly yield, and step-by-step staking guides for Premium members. If you hold tokens that aren\'t staked yet, you\'ll see a nudge showing how much you could be earning.',
      },
      {
        q: "What is the earnXRP vault and can I earn yield on my XRP?",
        a: 'Yes — the earnXRP vault (by Upshift, curated by Clearstar) lets you earn yield on your XRP while maintaining full self-custody. It went live in December 2025 with one-click Xaman integration added in February 2026. Here\'s how it works: (1) Open Xaman and select the Upshift earnXRP option. (2) Your cold wallet signs the transaction — XRP gets bridged to Flare and minted 1:1 as FXRP. (3) FXRP is deployed into curated strategies (lending, liquidity provision) earning ~3-4% variable yield. (4) Yield accrues and compounds as additional FXRP on-chain. (5) Redeem anytime — unwrap FXRP back to native XRP with one transaction, straight to your cold wallet. No lock-ups. You get back your original XRP plus the yield earned. As of March 2026, FXRP liquidity is approaching $200 million. Using a Ledger hardware wallet? You can pair your Ledger with Xaman for maximum security — Xaman handles the interface while your Ledger signs every transaction. See the full guide including the Ledger + Xaman setup walkthrough on the <a href="/flare" class="text-[#00A4E4] underline hover:no-underline">Flare FTSO Rewards page</a>.',
      },
      {
        q: "What RWA protocols are covered in the Earn & Yield Explorer?",
        a: 'The <a href="/rwa-yields" class="text-[#00A4E4] underline hover:no-underline">Earn & Yield Explorer</a> now covers 10+ protocols with live APY data pulled from DefiLlama: Soil Protocol (5–8% on RLUSD), Ondo Finance (USDY and OUSG backed by US Treasuries), Maple Finance (institutional credit), OpenEden (tokenized T-Bills), Backed Finance (bIB01 tokenized bonds), Goldfinch (emerging market credit, 7–10%), Centrifuge (real-world trade receivables), Aave and Compound (variable DeFi lending rates), Morpho (optimized lending), and Spark/MakerDAO. Yields update in real-time so you always see current rates, not stale estimates.',
      },
    ],
  },
  {
    groupKey: "mobile",
    heading: "Mobile App & PWA",
    items: [
      {
        q: "Is there a CryptoOwnBank mobile app?",
        a: "CryptoOwnBank works as a Progressive Web App (PWA) — you can install it directly from your browser to your phone's home screen. It opens full screen like a native app, with its own icon and fast loading. No App Store or Google Play needed. <strong>On iPhone (important):</strong> you must use <strong>Safari</strong> — Apple blocks Chrome, Edge, and Firefox on iOS from installing PWAs. Open cryptoownbank.com in Safari, tap the Share button (square with arrow up at the bottom-center), scroll down past the app row, then tap 'Add to Home Screen' → 'Add'. <strong>On Android:</strong> open in Chrome, tap the three-dot menu, then 'Install app' or 'Add to Home Screen.' On both platforms, an install prompt also appears at the bottom of the screen after a few seconds of browsing — on Chrome iOS it includes a one-tap 'Copy URL' button to make the Safari handoff easier. Once installed, you have your entire crypto dashboard one tap away — portfolio, DCA approvals, whale alerts, Legacy Plan, everything.",
      },
      {
        q: "I installed the PWA but a recent site update isn't showing up. How do I refresh?",
        a: "PWAs cache the app shell for fast loading, so occasionally an update needs a moment to roll out. <strong>Most of the time:</strong> close the PWA fully (swipe up from the app switcher to dismiss it), then reopen it — our service worker auto-detects new versions, installs them, and reloads the page on next launch. <strong>If that doesn't work:</strong> on iPhone, long-press the CryptoOwnBank icon on your home screen → 'Remove App' → 'Delete App,' then reinstall via Safari (Share → Add to Home Screen). On Android, long-press the icon → 'App info' → 'Storage' → 'Clear cache,' or simply uninstall and reinstall via Chrome. <strong>Quick alternative:</strong> open cryptoownbank.com in your phone's regular browser (Safari or Chrome) — the browser always serves the latest code with no PWA caching, so you can confirm the update is live there before refreshing the installed PWA.",
      },
      {
        q: "Why a PWA instead of a native App Store app?",
        a: "Three reasons: (1) No gatekeeper — Apple and Google can reject, delay, or remove apps from their stores. A PWA goes directly from our server to your phone. No middleman deciding whether you can have access. (2) Instant updates — when we push an update, you get it immediately on your next visit. No waiting for App Store review. No version fragmentation. (3) Same codebase — the PWA is the same app you use on desktop, so every feature is available on mobile from day one. PWAs support offline caching, push notifications, and full-screen mode. For a non-custodial crypto tool, this is the ideal delivery method — your app, your phone, no intermediary.",
      },
      {
        q: "Does the PWA work offline?",
        a: "The app shell and recently viewed pages are cached for fast loading. However, most features (portfolio data, live prices, DEX trading, whale alerts) require an internet connection because they pull real-time data from blockchains and APIs. The PWA ensures the app loads quickly even on slow connections and keeps working if you briefly lose signal.",
      },
    ],
  },
  {
    groupKey: "learn-more",
    heading: "Learn More",
    items: [
      {
        q: "Where can I learn more about the XRP Ledger?",
        a: "The official XRPL documentation at https://xrpl.org is the best resource. Key pages include: Trust Lines & Issuing (https://xrpl.org/trust-lines-and-issuing.html), Decentralized Exchange (https://xrpl.org/decentralized-exchange.html), Payment transactions (https://xrpl.org/payment.html), and the XRPL Learning Portal (https://learn.xrpl.org). The XRPL is open-source, decentralized, and has been running since 2012.",
      },
      {
        q: "Where can I learn about Soil Protocol and RLUSD yield?",
        a: "Visit the Soil Protocol documentation at https://docs.soil.id for details on how vaults work, the real-world assets backing yields, vault terms and withdrawal periods, and institutional lending mechanics. Soil Protocol lends RLUSD to institutional borrowers and passes the yield back to depositors — similar to how banks work, but you keep your keys.",
      },
      {
        q: "How do I set up and use the Xaman (Xumm) wallet?",
        a: "Download Xaman from the App Store or Google Play. The official guides are at https://support.xumm.app. Key topics: creating a new XRPL account, importing an existing account, pairing with Ledger Nano X via Bluetooth, adding trust lines for tokens like RLUSD, and signing transactions securely. Xaman is the most popular XRPL wallet and supports QR code and deep link connections.",
      },
      {
        q: "How do I set up a cold wallet for maximum security?",
        a: "For hardware wallet setup guides, visit: Ledger (https://support.ledger.com) — supports XRPL natively and pairs with Xaman via Bluetooth. ELLIPAL (https://www.ellipal.com/pages/support) — air-gapped cold wallet, add public addresses to CryptoOwnBank for tracking. CypheRock (https://cypherock.com/support) — key-splitting hardware wallet for ultimate backup security. We recommend starting with a Ledger Nano X paired with Xaman for the best combination of security and convenience. Our Getting Started Toolkits at /setup-guide have step-by-step guides for beginners, businesses, and more.",
      },
    ],
  },
  {
    groupKey: "secure-storage",
    heading: "Secure Crypto Storage Options",
    items: [
      {
        q: "What is Web3 and how does it relate to storing my crypto?",
        a: "Web3 is the decentralized internet built on blockchain technology. The core idea is simple: you own your data and your assets directly, without relying on a company to hold them for you. In crypto, this comes down to one principle \u2014 if you don't control your private keys, you don't truly own your crypto. Some services will tell you that self-custody isn't enough, that you need to hand your keys to an institutional custodian for safety. But that's just a traditional bank wearing a crypto t-shirt. CryptoOwnBank is built around true ownership. We never hold your keys or your funds. You keep your assets in your own cold wallet (Ledger, ELLIPAL, Arculus, CypheRock, SafePal, etc.) while we provide non-custodial tools for tracking your portfolio across 32+ blockchains, trading on the XRPL DEX, earning 5\u20138% yield on RLUSD through Soil Protocol vaults, and sending payments \u2014 all signed directly on your device.",
      },
      {
        q: "Why should I avoid keeping my crypto on an exchange or with a custodian?",
        a: "When your crypto sits on an exchange or with any custodial service \u2014 whether it's Coinbase, Binance, or a boutique custody firm \u2014 someone else holds your private keys. That means they control your assets. FTX looked institutional-grade too, until $8 billion disappeared. Custodial services add layers of counterparty risk: the custodian can be hacked, go bankrupt, freeze your account, get hit with regulatory action, or simply decide you no longer meet their requirements. Some firms charge thousands for the privilege of holding your keys and call it a 'family office service.' CryptoOwnBank takes the opposite approach. Our dashboard connects to exchanges using read-only API keys just to display your balances. Your assets stay where they are \u2014 we can't move, trade, or withdraw anything. For active use, we recommend keeping assets in your own cold wallet and using XRPL tools for direct DEX trading and payments. No counterparty risk. No custody fees. No one between you and your crypto.",
      },
      {
        q: "Are cold wallets really safe? Some companies say they aren't enough for serious investors.",
        a: "Cold wallets are the gold standard for crypto security, and anyone who tells you otherwise is trying to sell you a custody service. Devices like the Ledger Nano X store your private keys completely offline \u2014 they can't be stolen through phishing, malware, or exchange hacks. The argument that cold wallets 'aren't enough once you have real money' is a sales pitch, not a security fact. What serious investors actually need alongside a cold wallet is better tooling \u2014 portfolio visibility across chains, yield optimization, tax reporting, and payment infrastructure. That's exactly what CryptoOwnBank provides, without ever asking for your keys. Connect your cold wallet through Xaman for XRPL, or add your public address for any of 32+ chains. We auto-detect your tokens, show balances, surface yield opportunities, and let you trade on the XRPL DEX and deposit into Soil vaults \u2014 all signed on your physical device. Your keys never leave the hardware. You get institutional-grade tools with personal-grade ownership.",
      },
      {
        q: "What about 'institutional custody' services \u2014 aren't they safer than doing it myself?",
        a: "Institutional custody means handing your private keys to a company and trusting them to keep your assets safe. They'll talk about insurance, compliance, and audit trails \u2014 but at the end of the day, someone else controls your crypto. That's the exact model that failed with FTX, Celsius, BlockFi, and Voyager. Insurance policies have caps, exclusions, and fine print. Compliance doesn't prevent bankruptcy. Audit trails don't help when a company locks your account. CryptoOwnBank gives you the tools that custodial firms charge thousands for \u2014 portfolio tracking across 32+ blockchains, tax reports, yield optimization, payment infrastructure \u2014 while your keys stay on your own hardware wallet. No KYC consultations. No custody fees. No LLC formation to access your own money. We start free (1 exchange, 1 blockchain address, full Soil vault access) and Premium is $29/month for unlimited everything. Compare that to firms that charge per-consultation fees just to tell you what you already own.",
      },
      {
        q: "Do I need a 'family office' or an LLC to manage my crypto?",
        a: "Not to manage it, no. Some companies will sell you LLC formation, trust structures, and concierge services before you even start investing \u2014 adding layers of complexity and cost between you and your assets. Those services have their place for certain legal and estate planning needs, but they're not a prerequisite for securely holding, tracking, and earning yield on your crypto. CryptoOwnBank gives you the operational tools directly: portfolio tracking across 32+ chains, real-time yield recommendations (on-chain vs custodial, clearly labeled), XRPL vaults paying 5\u20138% fixed APR, DEX trading, payment processing, and tax reports \u2014 all non-custodial, all from one dashboard. If you decide you need legal entity structures for estate or tax reasons, you can still do that independently while keeping your assets in your own custody and managing them through CryptoOwnBank. The point is: you should have your tools first and your legal wrappers second \u2014 not the other way around.",
      },
      {
        q: "Do you ever have access to my crypto? What if CryptoOwnBank shuts down?",
        a: "No \u2014 at no point do we have access to your crypto. We are 100% non-custodial. We never see your private keys, never hold your funds, and never have the ability to move your assets. Every vault deposit, withdrawal, trade, and payment is signed by you on your own device. This is the fundamental difference between CryptoOwnBank and custodial services: if a custody firm shuts down, you're in a line of creditors hoping to get your assets back (ask any FTX customer). If CryptoOwnBank shut down tomorrow, your crypto would be completely unaffected. Your funds live on the blockchain in your wallet, not on our servers. You could continue using your cold wallet with any other XRPL-compatible app, access your Soil vault positions directly through Soil Protocol, and view your balances on any blockchain explorer. We're a tool layer on top of your self-custody \u2014 not a custodian.",
      },
      {
        q: "What does \u201COwn nothing, control everything\u201D mean at CryptoOwnBank?",
        a: "There's a famous line attributed to John D. Rockefeller: \u201COwn nothing, control everything.\u201D Rockefeller used trusts and holding companies to separate legal ownership from practical control \u2014 minimizing liability while maximizing power over assets. Some crypto services have adopted a similar playbook: they offer LLCs, institutional custody, and trust structures where entities hold your assets while you maintain control through those intermediaries. That approach has its uses, but it does introduce third parties into the picture. A custodian's terms govern your access. A trust requires legal counsel. An LLC means filings, fees, and another set of rules. CryptoOwnBank takes a different approach. We don't hold your crypto, and we don't set up entities to hold it either. You keep your keys on your own cold wallet. Through that direct self-custody, you maintain control over your decentralized assets: move them, deposit into yield vaults, trade on the DEX, send across borders \u2014 on your own terms. Consider how XRP works: Ripple manages the release of 1 billion XRP per month from escrow, but once that XRP reaches someone's wallet, the XRPL protocol doesn't give Ripple a mechanism to restrict how it's used. That's by design. The same principle guides how we think about self-custody for decentralized assets on supported chains. We provide the tools \u2014 portfolio tracking, vaults, DEX, payments \u2014 but we don't stand between you and your wallet. It's also worth understanding how CBDCs (Central Bank Digital Currencies) differ by design. Because they're centrally issued, the issuer can build rules into the currency itself \u2014 potentially governing where it can be spent, setting usage conditions, or applying account restrictions. With decentralized crypto, the protocol works for the holder. With centrally issued digital currencies, the design priorities may be different. Own nothing, control everything \u2014 we think you can do even better: own it and control it, with a direct relationship between you and your assets.",
      },
    ],
  },
  {
    groupKey: "safety",
    heading: "Safety & Disclaimers",
    items: [
      {
        q: "Is this financial advice?",
        a: "No — this is not financial, investment, or tax advice. Crypto and yield protocols involve risk of loss. Past performance isn't indicative of future results. Always do your own research (DYOR) and consider your own situation. We provide tools and information only.",
      },
      {
        q: "What if I have more questions or issues?",
        a: "Use the in-site contact form or join XRPL community channels. Note: we can't help with wallet recovery or fund issues since we're non-custodial — only you control your keys.",
      },
    ],
  },
];

function FAQItem({ q, a, forceOpen, highlight }: { q: string; a: string; forceOpen?: boolean; highlight?: string }) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const hasHtml = a.includes("<a ");

  const highlightText = (text: string, term: string) => {
    if (!term || term.length < 2) return text;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
  };

  const displayQ = highlight ? highlightText(q, highlight) : q;
  const displayA = highlight ? highlightText(a, highlight) : a;
  const shouldRenderHtml = hasHtml || !!highlight;

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left gap-4"
        data-testid={`faq-toggle-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
      >
        {shouldRenderHtml ? (
          <span className="font-medium text-foreground" dangerouslySetInnerHTML={{ __html: displayQ }} />
        ) : (
          <span className="font-medium text-foreground">{q}</span>
        )}
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <p className="pb-5 text-muted-foreground leading-relaxed pr-8" dangerouslySetInnerHTML={{ __html: shouldRenderHtml ? displayA : a }} />
      )}
    </div>
  );
}

export default function FAQ() {
  const [search, setSearch] = useState("");

  const faqJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqGroups.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a.replace(/<[^>]*>/g, ""),
        },
      }))
    ),
  }), []);

  const searchTerm = search.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return faqGroups;
    return faqGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.q.toLowerCase().includes(searchTerm) ||
            item.a.toLowerCase().includes(searchTerm)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchTerm]);

  const totalResults = filteredGroups.reduce((s, g) => s + g.items.length, 0);
  const isSearching = searchTerm.length >= 2;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <SeoHead
        title="FAQ — CryptoOwnBank | Frequently Asked Questions"
        description="Get answers about CryptoOwnBank — portfolio tracking across 32+ blockchains, RLUSD yield vaults, cold wallet security, crypto news, whale alerts, technical analysis, exchange API keys, stablecoins, and more."
        path="/faq"
        jsonLd={faqJsonLd}
      />
      <div>
        <h1 className="text-3xl font-bold" data-testid="faq-title">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mt-2">Everything you need to know about CryptoOwnBank — portfolio tracking, XRPL tools, payments for consumers and businesses, RLUSD vaults, yield optimization, and keeping control of your crypto.</p>
      </div>

      <div className="relative" data-testid="faq-search-container">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search FAQ — try 'trustline', 'Xaman', 'cold wallet', 'staking'..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-10"
          data-testid="input-faq-search"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => setSearch("")}
            data-testid="button-clear-faq-search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isSearching && (
        <p className="text-sm text-muted-foreground" data-testid="text-faq-search-results">
          {totalResults === 0
            ? `No results for "${search}" — try different keywords`
            : `${totalResults} result${totalResults !== 1 ? "s" : ""} for "${search}"`}
        </p>
      )}

      {filteredGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground mb-2" data-testid={`faq-group-${groupIndex}`}>{group.heading}</h2>
          <div className="rounded-lg border bg-card">
            {group.items.map((faq, index) => (
              <FAQItem
                key={index}
                q={faq.q}
                a={faq.a}
                forceOpen={isSearching}
                highlight={isSearching ? search.trim() : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
