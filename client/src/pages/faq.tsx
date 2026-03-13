import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SeoHead } from "@/components/seo-head";

const faqGroups = [
  {
    heading: "About CryptoOwnBank",
    items: [
      {
        q: "Why was CryptoOwnBank created? (And why should I use it?)",
        a: "CryptoOwnBank was created for one reason: to help people truly become their own bank — without giving up control of their assets. Most tools today force you to choose between: custodial platforms (Uphold, Binance, Coinbase) that hold your keys and pay low yields (3–6%), traditional banks that pay almost nothing (0.01–4.5%) and control your money, or raw blockchain explorers and DeFi apps that feel complicated and overwhelming. We built CryptoOwnBank to fix all three problems at once: (1) Full ownership — your cold wallet (Ledger, ELLIPAL, Arculus, SafePal, CypheRock, etc.) stays in control; we never see or store your private keys. (2) Real, higher yields — earn 5–8% fixed APR on RLUSD through Soil Protocol's real-world-asset vaults (Treasuries, private credit) with automatic compounding, plus we surface on-chain staking and DeFi yield opportunities across 24 blockchains. (3) Simplicity & power — one clean dashboard to track your entire crypto portfolio across exchanges and cold wallets, connect your XRPL wallet, deposit to Soil vaults, withdraw only the interest you want, and see personalized recommendations — all in real time. (4) On-chain first philosophy — every yield recommendation clearly labels whether you keep your keys (on-chain) or hand them to a company (custodial), so you always know exactly who controls your assets.",
      },
      {
        q: "What is CryptoOwnBank?",
        a: "CryptoOwnBank is a combined crypto portfolio tracker, non-custodial XRPL yield vault, and payment toolkit — designed so anyone with an internet connection can participate in global commerce. Track your entire crypto portfolio across 24 blockchains and multiple exchanges from one dashboard, earn fixed yield on RLUSD through Soil Protocol vaults, trade on the XRPL's built-in DEX, send and receive payments in seconds, and accept crypto payments for your business — all while keeping full control via your cold wallet. We clearly distinguish on-chain options (you keep your keys) from custodial options (a company holds your assets), so you can make informed decisions about every opportunity. Whether you're unbanked (no access to traditional finance), debanked (shut out by banks or payment processors), or simply tired of paying 2.9% to a middleman — CryptoOwnBank gives you the tools to be your own bank.",
      },
      {
        q: "What blockchains does CryptoOwnBank support for portfolio tracking?",
        a: "We support 24 blockchains for portfolio tracking: XRP Ledger, Bitcoin, Ethereum, Solana, Cardano, Polkadot, Cosmos, Avalanche, Polygon, Tron, Algorand, Hedera (HBAR), VeChain, Stellar, Sui, Aptos, Near, Fantom, Cronos, Arbitrum, Optimism, Base, Tezos, and Litecoin. Add your public wallet address for any of these chains and we automatically pull your balances. Your private keys are never shared — we only read public on-chain data.",
      },
      {
        q: "How does CryptoOwnBank compare to traditional banks and crypto exchanges?",
        a: "Banks offer 0.01–4.5% yield but you're an unsecured creditor — they own the money. Centralized exchanges (Uphold ~3.75%, others up to 6%) hold your keys custodially. CryptoOwnBank + Soil gives you 5–8% fixed APR with automatic compounding, and you own 100% — keys stay on your cold wallet, every action requires your signature. Our Recommendations Hub goes further: it analyzes your entire portfolio and surfaces the best on-chain staking, DeFi, and yield opportunities for each asset you hold — always prioritizing options where you keep your keys.",
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
        q: "How does CryptoOwnBank make money?",
        a: "Free tier forever (1 exchange connection, 1 blockchain address, Soil vault access, and manual withdrawals). Premium Monthly ($29/mo) for unlimited exchanges, unlimited blockchain addresses, and full portfolio management. Premium Annual ($199/yr) adds complete tax reports with PDF and TurboTax export. Affiliate referrals (e.g., when you buy RLUSD via our exchange links or join Soil via our referral — we may earn rewards; disclosed transparently). We never take fees from your yields or principal.",
      },
      {
        q: "Why should I join now?",
        a: "Regulatory clarity is advancing, RLUSD is growing as the compliant stablecoin of choice, and institutional DeFi is expanding. Banks are still offering minimal yields. CryptoOwnBank lets you start earning real, fixed yield today while keeping full control of your assets. Plus, our portfolio tracker now covers 24 blockchains and multiple exchanges — so you can see your entire crypto net worth in one place and act on the best yield opportunities immediately.",
      },
    ],
  },
  {
    heading: "Wallet & Security Basics",
    items: [
      {
        q: "Why do I need a cold wallet to use CryptoOwnBank?",
        a: "For XRPL yield vaults (Soil deposits/withdrawals), you need a cold wallet to sign transactions — we are 100% non-custodial. Your private keys never leave your device. For portfolio tracking, you don't need a cold wallet at all — just add your public blockchain addresses or connect exchange API keys and we pull balances automatically.",
      },
      {
        q: "Is this a wallet? Do you hold my funds?",
        a: "No — we are 100% non-custodial. We never hold, control, or have access to your funds or private keys. All vault actions (deposits, withdrawals) are signed directly from your own cold wallet. For portfolio tracking, we only read public on-chain data from your blockchain addresses. The dashboard is a secure interface to view balances, interact with XRPL + Soil, and see personalized yield recommendations across your entire portfolio.",
      },
      {
        q: "What wallets are supported?",
        a: "For XRPL yield vaults, we support Xumm/Xaman (mobile app with QR code / deep link connection) and Ledger hardware wallets (Nano S/X via Bluetooth through Xaman). For portfolio tracking across 24 blockchains, we support any cold wallet that has a public address — Ledger, ELLIPAL, SafePal, CypheRock, Arculus, and more. Just add your public address and we pull your balances. We also provide wallet-specific staking guides for each supported hardware wallet, so you can start earning on-chain yield with step-by-step instructions tailored to your exact device.",
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
        a: "Your exchange API keys are encrypted at rest using AES-256. Your XRPL wallet connection is read-only — we only see your public address. All transaction signing happens on your device. We use secure authentication and accept crypto payments (verified on-chain) or Stripe for card payments. We never store private keys or seed phrases.",
      },
    ],
  },
  {
    heading: "Yield & Soil Mechanics",
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
        a: "Yes. If you do not withdraw the earned interest, it is automatically added to your position in the vault and starts earning additional yield right away. Example: Deposit $10,000 RLUSD at 6% APR. After one month \u2248 $50 interest is earned. If left in the vault, your new balance becomes ~$10,050. Next month's interest is calculated on the larger amount — this is automatic compounding. There is no \u201Creinvest\u201D button because it happens by default.",
      },
      {
        q: "How does Soil compare to Uphold's 3.75% yield?",
        a: "Soil offers 5–8% fixed APR (real RWA-backed yield from Treasuries and private credit) with automatic compounding — usually higher than Uphold's ~3.75%. Plus you get full self-custody (your keys stay on your cold wallet) instead of Uphold holding everything custodially. The trade-off: Uphold is simpler to start with, but you give up ownership and earn less.",
      },
      {
        q: "How do I withdraw my earned interest?",
        a: 'Go to the <a href="/ownbank/withdraw" class="text-[#00A4E4] underline hover:no-underline">Withdraw Interest page</a>, select a vault, and click "Withdraw Interest." The app builds a transaction sending ONLY your accrued interest to your designated spending wallet. You sign the transaction on your Xumm or Ledger. Free users withdraw manually; Premium users can set up automatic weekly withdrawals.',
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
        q: "Where does CryptoOwnBank get its price data?",
        a: "CryptoOwnBank fetches real-time prices from CoinGecko, a widely trusted crypto market data aggregator that sources from hundreds of exchanges. We track which assets also have Chainlink decentralized oracle feeds available (BTC, ETH, XRP, SOL, and others) — these are the same feeds trusted by Aave, Compound, and other major DeFi protocols. In a future update, we plan to integrate Chainlink on-chain feeds directly for even stronger data integrity. For now, CoinGecko provides reliable, broadly-sourced pricing across all 24+ chains we support.",
      },
    ],
  },
  {
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
    heading: "Exchange API Keys",
    items: [
      {
        q: "How do I get an API key from my exchange?",
        a: "Each exchange has its own process, but the general steps are: 1) Log in to your exchange account. 2) Go to Account Settings or Security. 3) Find the 'API' or 'API Management' section. 4) Create a new API key and label it 'CryptoOwnBank'. 5) IMPORTANT: Only enable READ-ONLY permissions (never enable trading or withdrawal). 6) Copy the API Key and Secret. 7) Paste them into the Integrations page on CryptoOwnBank. When you select an exchange on our Integrations page, we show you step-by-step instructions specific to that exchange.",
      },
      {
        q: "How do I get a Binance.US API key? (US residents)",
        a: "Log in to Binance.US > click your profile icon > API Management > Create API > choose 'System generated' > label it 'CryptoOwnBank' > complete 2FA verification > IMPORTANT: only enable 'Can Read' (disable trading/withdrawals) > copy your API Key and Secret Key. Direct link: binance.us/settings/api-management. Note: US residents must use Binance.US — the global Binance platform (binance.com) is not available to US users.",
      },
      {
        q: "How do I get a Binance (Global) API key?",
        a: "Log in to Binance > hover over your profile icon > API Management > Create API > choose 'System generated' > label it 'CryptoOwnBank' > complete 2FA verification > IMPORTANT: only enable 'Enable Reading' (disable trading/withdrawals) > copy your API Key and Secret Key. Direct link: binance.com/en/my/settings/api-management. Note: This is the global Binance platform — US residents should use Binance.US instead.",
      },
      {
        q: "How do I get a Coinbase API key?",
        a: "Log in to Coinbase > Settings > API > New API Key > select all 'View' permissions only (wallet:accounts:read, wallet:transactions:read, etc.) > complete 2FA > copy your API Key and API Secret. Direct link: coinbase.com/settings/api",
      },
      {
        q: "How do I get a Kraken API key?",
        a: "Log in to Kraken > Security > API > Add Key > name it 'CryptoOwnBank' > under Permissions check ONLY 'Query Funds' and 'Query Open Orders & Trades' > Generate Key > copy your API Key and Private Key. Direct link: kraken.com/u/security/api",
      },
      {
        q: "How do I get a Crypto.com API key?",
        a: "Important: You need the Crypto.com Exchange — the regular Crypto.com mobile app does not have an API. If you only use the app, go to crypto.com/exchange and sign up (you can link your existing app account), then transfer your assets there. Once on the Exchange: 1) Click your profile icon (top right), scroll down to 'Account Management', and click 'API Management'. 2) Click 'Create a New API Key' and enter a label (e.g. 'CryptoOwnBank'). 3) If prompted, set up 2FA — scan the QR code with Google Authenticator, click 'Send SMS OTP', enter both codes, then click 'Set Up Now'. 4) After creation, the API Secret Key is shown ONCE — copy it immediately. 5) To find the API Key, click 'Edit' on your newly created key. 6) Remove any IP whitelist restrictions, or add your server's IP. 7) Leave Withdrawal and Trading set to 'Off' (read-only). Paste both keys into CryptoOwnBank's Integrations page.",
      },
      {
        q: "How do I get API keys for KuCoin, Bybit, OKX, or other exchanges?",
        a: "The process is similar for all exchanges: go to your account's API settings, create a new key with READ-ONLY permissions, and copy the credentials. For KuCoin, Bybit, and OKX you may also need to set an API passphrase — save this separately as you'll need it. When you select any exchange on our Integrations page, we show you the exact steps and a direct link to that exchange's API settings page.",
      },
      {
        q: "How do I get a Nexo API key?",
        a: "Log in to Nexo at nexo.com, go to Settings (gear icon) > API, and click 'Create API Key'. Label it 'CryptoOwnBank', set permissions to 'Read Only' (do NOT enable withdrawals or trading), complete 2FA, and copy your API Key and Secret Key immediately — the Secret is only shown once. Paste both into CryptoOwnBank's Integrations page.",
      },
      {
        q: "Can I connect Webull, eToro, Robinhood, or Fidelity?",
        a: "These platforms do not currently offer public APIs for third-party portfolio tracking. You can manually add your holdings on CryptoOwnBank, or export your transaction history as a CSV file from their apps/websites. For Webull: Account > Statements & History > Download. For eToro: Settings > Account Statement > Download. For Robinhood: Account > Statements & History. For Fidelity: Accounts > Activity & Orders > Download. We're monitoring all four platforms for future API availability.",
      },
      {
        q: "Is it safe to give CryptoOwnBank my API key?",
        a: "Yes — we take several precautions: 1) All API keys are encrypted using AES-256 before storage. 2) We only request read-only access — we cannot trade, transfer, or withdraw anything from your exchange account. 3) You can disconnect (revoke access) anytime from our Integrations page. 4) For extra safety, most exchanges let you restrict API keys by IP address. Always create keys with the minimum permissions needed (read-only).",
      },
    ],
  },
  {
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
    heading: "Getting Started & Transfers",
    items: [
      {
        q: "How do I start earning yield on RLUSD?",
        a: '1) Buy RLUSD on a trusted exchange (Binance, Kraken, Coinbase, etc.) and withdraw it to your XRPL wallet. 2) Connect your cold wallet to the dashboard. 3) Deposit RLUSD into a <a href="/ownbank/vaults" class="text-[#00A4E4] underline hover:no-underline">Soil vault</a> (Treasury-backed at 5.2% or CREDIT+ at 8.0%). 4) Earn fixed yield immediately — your principal stays locked. 5) Withdraw only the accrued interest via the <a href="/ownbank/withdraw" class="text-[#00A4E4] underline hover:no-underline">Withdraw Interest page</a> whenever you want (manual or auto for Premium users). No KYC on our end, no bank linking required.',
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
        q: "Can I use this for other cryptos besides XRP/RLUSD?",
        a: "Absolutely — CryptoOwnBank now tracks 24 blockchains. Add your Bitcoin, Ethereum, Solana, Cardano, Polkadot, Cosmos, Avalanche, HBAR, VeChain, and many more wallet addresses to see all your holdings in one dashboard. Connect exchange accounts (Coinbase, Kraken, Binance, etc.) to track exchange-held crypto too. Our Recommendations Hub analyzes every asset and shows you the best staking, DeFi, and yield opportunities — with clear on-chain vs custodial labels. XRPL yield vaults (Soil) are the active earning feature; portfolio tracking and recommendations work across all supported chains.",
      },
    ],
  },
  {
    heading: "Pricing & Plans",
    items: [
      {
        q: "What's included in the free plan?",
        a: "Free users get Soil vault access (deposit RLUSD, earn yield, manual withdrawals), 1 exchange connection, 1 blockchain address, basic Recommendations Hub overview (see what yield opportunities exist for your assets), yield calculator, 1 price alert, and 7 days of transaction history. Upgrade to Premium to unlock full Recommendations Hub with Best in Class rankings, personalized staking guides, DeFi comparisons, portfolio search/filter/sort, unlimited alerts, Statement Insights, and full transaction history. Enough to get started and see the value on the free tier.",
      },
      {
        q: "What do I get with Premium?",
        a: "Premium unlocks the full cockpit — unlimited exchange connections (see Binance + Coinbase + Kraken together), unlimited blockchain addresses across all 24 supported chains, complete transaction history, CSV import from Yahoo Finance and CoinTracker, unlimited price alerts, full Recommendations Hub with personalized yield optimization across your entire portfolio, auto-withdrawal from Soil vaults, extended Whale Alerts history with customizable thresholds, and Technical Analysis with all indicators (EMA, RSI, MACD, Bollinger Bands) plus up to 10 years of candlestick data. Choose monthly ($29/mo) for portfolio management, or go annual ($199/yr) to also unlock complete tax reports with PDF and TurboTax export.",
      },
      {
        q: "Can I use Soil vaults without Premium?",
        a: 'Yes. Connecting your XRPL wallet, depositing into <a href="/ownbank/vaults" class="text-[#00A4E4] underline hover:no-underline">Soil vaults</a>, and manually <a href="/ownbank/withdraw" class="text-[#00A4E4] underline hover:no-underline">withdrawing interest</a> are all free. Premium adds auto-withdrawal for convenience.',
      },
      {
        q: "Why should I upgrade to Premium?",
        a: "If your crypto is spread across multiple exchanges, wallets, and DeFi protocols, Premium gives you one cockpit to see everything. Instead of logging into Binance, Coinbase, Ledger Live, and Yahoo Finance separately, you see your entire portfolio across 24 blockchains, personalized yield recommendations with on-chain vs custodial clarity, tax liability, and yield earnings in a single dashboard. The Recommendations Hub shows you exactly how much yield you're missing and which on-chain opportunities match the assets you already hold.",
      },
      {
        q: "Can I cancel Premium anytime?",
        a: "Yes. You can cancel your subscription at any time. You'll keep Premium access until the end of your current billing period. No penalties, no questions asked.",
      },
      {
        q: "Can I pay for Premium with crypto?",
        a: "Yes — crypto is our preferred payment method. Go to Settings → Subscription and choose 'Pay with Crypto.' Select your cryptocurrency (XRP, BTC, ETH, SOL, and more), and we'll show you the exact amount and wallet address to send to. For XRP payments, you'll also get a destination tag. Our system automatically verifies your payment on-chain within seconds and activates your Premium subscription immediately. No KYC, no bank account needed — just send crypto and you're upgraded. Card payments via Stripe are also available as a fallback option.",
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
        a: "Set a target price for any supported crypto (XRP, BTC, ETH, SOL, ADA, and more). Choose whether you want to be notified when the price goes above or below your target. Our system checks prices every 60 seconds and sends you an email notification when your alert triggers. Free users can have up to 3 active alerts; Premium users get unlimited alerts.",
      },
      {
        q: "What is the Yield Calculator?",
        a: "The Yield Calculator is a free public tool (no login required) that lets you estimate how much you'd earn by depositing RLUSD into Soil vaults. Enter any amount, choose Treasury (5.2% APR) or CREDIT+ (8.0% APR), and toggle between simple and compound interest to see projected daily, weekly, monthly, and yearly earnings. Try it at /yield-calculator.",
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
        q: "How does the referral program work?",
        a: "Share your unique referral link with friends. When they sign up and deposit RLUSD, you earn bonus SEED points through Soil Protocol, which can boost your yields over time. If a referred friend upgrades to Premium, you get one free month of Premium.",
      },
      {
        q: "What is XLS-66 Lending?",
        a: "XLS-66 is a proposed XRPL amendment for native on-ledger lending. When it goes live (expected Q2 2026), OwnBank will integrate it so you can lend directly on the XRPL without any intermediary. Premium members get early access.",
      },
    ],
  },
  {
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
    ],
  },
  {
    heading: "XRPL Tools",
    items: [
      {
        q: "What is the Token Manager?",
        a: "The Token Manager lets you view and manage your XRPL trustlines — think of it like opening currency accounts at a bank, except free, instant, and fully in your control. A trustline tells the XRPL: 'I'm willing to hold this token from this issuer.' You can add trustlines for popular tokens like RLUSD (Ripple's USD stablecoin), Sologenic (SOLO), Coreum (CORE), and more with one tap, or manually enter any currency code and issuer address. Removing a trustline (only possible when balance is zero) is like closing an empty account. Everything is signed with your cold wallet — we never touch your keys. Learn more: https://xrpl.org/trust-lines-and-issuing.html",
      },
      {
        q: "How does DEX Trading work?",
        a: "The XRP Ledger has a built-in decentralized exchange (DEX) — no company runs it. When you place an order, it goes directly on the blockchain. If someone has a matching order, the trade happens automatically and settles in 4 seconds. Your funds never leave your wallet until the trade executes. Compare that to a traditional stock exchange: you call a broker, they place the order, it's matched on the NYSE, and settlement takes T+2 (two business days). On the XRPL DEX, you can place limit orders (set your price and wait for a match) or market orders (buy/sell immediately at the best available price). You can view the order book, cancel orders for free (just the tiny network fee), and all signing happens on your cold wallet. Learn more: https://xrpl.org/decentralized-exchange.html",
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
        a: "You can trade any token that has been issued on the XRPL — as long as you have a trustline set for it. Popular pairs include XRP/RLUSD, XRP/USD (Bitstamp), XRP/EUR (Gatehub), SOLO/XRP, and CORE/XRP. The Token Manager makes it easy to add trustlines for these tokens before you start trading. The DEX is fully permissionless — anyone can issue tokens and create markets.",
      },
      {
        q: "Are there fees for using XRPL Tools?",
        a: "CryptoOwnBank charges no platform fees for using the Token Manager, DEX Trading, or Send & Receive. The only cost is the XRPL network fee, which is approximately 0.00001 XRP per transaction — that's a fraction of a fraction of a penny. Compare that to $25–50 wire transfer fees, $5–15 stock trading commissions, or 1–3% exchange fees. The XRPL is one of the cheapest networks to transact on.",
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
    heading: "Payments & Business",
    items: [
      {
        q: "Can I use CryptoOwnBank to accept payments for my business?",
        a: "Yes. Connect your XRPL wallet, set up trustlines for the currencies you want to accept (like RLUSD), and share your payment QR code or wallet address with customers. When they pay, the transaction settles directly to your wallet in 4 seconds. CryptoOwnBank is the tooling layer — we give you the tools to process your own payments. We never sit between you and your customer, never hold funds, and never take a percentage. It's like having a point-of-sale terminal that runs on the blockchain instead of through a payment processor.",
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
        a: "No. The Send & Receive page, Token Manager (for setting up trustlines), and DEX (for currency conversion) are all available on the free tier. Premium adds unlimited blockchain address tracking, full transaction history, and tax reports — which become valuable as your payment volume grows and you need to track everything for accounting and tax filing.",
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
        a: "Yes — this is what we call the circular crypto economy, and it's already possible today. Earn: sell your goods or services and get paid in RLUSD or XRP directly to your wallet. Save: deposit RLUSD into a Soil vault and earn 5–8% APR — more than most bank savings accounts anywhere in the world. Your principal is locked and protected; only interest can be withdrawn. Spend: pay suppliers, vendors, or anyone else with an XRPL wallet. Send money to family. Buy from others who accept crypto. The XRPL handles it all in 4 seconds for fractions of a penny. No bank touches your money at any point in this loop. The more people in your community using XRPL wallets, the less anyone needs traditional banking. A village where 20 people have wallets is a village with its own financial system. Our Getting Started Toolkit for unbanked users at /setup-guide walks through every step of this.",
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
    heading: "Secure Crypto Storage Options",
    items: [
      {
        q: "What is Web3 and how does it relate to storing my crypto?",
        a: "Web3 is the decentralized internet built on blockchain technology. The core idea is simple: you own your data and your assets directly, without relying on a company to hold them for you. In crypto, this comes down to one principle \u2014 if you don't control your private keys, you don't truly own your crypto. Some services will tell you that self-custody isn't enough, that you need to hand your keys to an institutional custodian for safety. But that's just a traditional bank wearing a crypto t-shirt. CryptoOwnBank is built around true ownership. We never hold your keys or your funds. You keep your assets in your own cold wallet (Ledger, ELLIPAL, Arculus, CypheRock, SafePal, etc.) while we provide non-custodial tools for tracking your portfolio across 24+ blockchains, trading on the XRPL DEX, earning 5\u20138% yield on RLUSD through Soil Protocol vaults, and sending payments \u2014 all signed directly on your device.",
      },
      {
        q: "Why should I avoid keeping my crypto on an exchange or with a custodian?",
        a: "When your crypto sits on an exchange or with any custodial service \u2014 whether it's Coinbase, Binance, or a boutique custody firm \u2014 someone else holds your private keys. That means they control your assets. FTX looked institutional-grade too, until $8 billion disappeared. Custodial services add layers of counterparty risk: the custodian can be hacked, go bankrupt, freeze your account, get hit with regulatory action, or simply decide you no longer meet their requirements. Some firms charge thousands for the privilege of holding your keys and call it a 'family office service.' CryptoOwnBank takes the opposite approach. Our dashboard connects to exchanges using read-only API keys just to display your balances. Your assets stay where they are \u2014 we can't move, trade, or withdraw anything. For active use, we recommend keeping assets in your own cold wallet and using XRPL tools for direct DEX trading and payments. No counterparty risk. No custody fees. No one between you and your crypto.",
      },
      {
        q: "Are cold wallets really safe? Some companies say they aren't enough for serious investors.",
        a: "Cold wallets are the gold standard for crypto security, and anyone who tells you otherwise is trying to sell you a custody service. Devices like the Ledger Nano X store your private keys completely offline \u2014 they can't be stolen through phishing, malware, or exchange hacks. The argument that cold wallets 'aren't enough once you have real money' is a sales pitch, not a security fact. What serious investors actually need alongside a cold wallet is better tooling \u2014 portfolio visibility across chains, yield optimization, tax reporting, and payment infrastructure. That's exactly what CryptoOwnBank provides, without ever asking for your keys. Connect your cold wallet through Xaman for XRPL, or add your public address for any of 24+ chains. We auto-detect your tokens, show balances, surface yield opportunities, and let you trade on the XRPL DEX and deposit into Soil vaults \u2014 all signed on your physical device. Your keys never leave the hardware. You get institutional-grade tools with personal-grade ownership.",
      },
      {
        q: "What about 'institutional custody' services \u2014 aren't they safer than doing it myself?",
        a: "Institutional custody means handing your private keys to a company and trusting them to keep your assets safe. They'll talk about insurance, compliance, and audit trails \u2014 but at the end of the day, someone else controls your crypto. That's the exact model that failed with FTX, Celsius, BlockFi, and Voyager. Insurance policies have caps, exclusions, and fine print. Compliance doesn't prevent bankruptcy. Audit trails don't help when a company locks your account. CryptoOwnBank gives you the tools that custodial firms charge thousands for \u2014 portfolio tracking across 24 blockchains, tax reports, yield optimization, payment infrastructure \u2014 while your keys stay on your own hardware wallet. No KYC consultations. No custody fees. No LLC formation to access your own money. We start free (1 exchange, 1 blockchain address, full Soil vault access) and Premium is $29/month for unlimited everything. Compare that to firms that charge per-consultation fees just to tell you what you already own.",
      },
      {
        q: "Do I need a 'family office' or an LLC to manage my crypto?",
        a: "Not to manage it, no. Some companies will sell you LLC formation, trust structures, and concierge services before you even start investing \u2014 adding layers of complexity and cost between you and your assets. Those services have their place for certain legal and estate planning needs, but they're not a prerequisite for securely holding, tracking, and earning yield on your crypto. CryptoOwnBank gives you the operational tools directly: portfolio tracking across 24+ chains, real-time yield recommendations (on-chain vs custodial, clearly labeled), XRPL vaults paying 5\u20138% fixed APR, DEX trading, payment processing, and tax reports \u2014 all non-custodial, all from one dashboard. If you decide you need legal entity structures for estate or tax reasons, you can still do that independently while keeping your assets in your own custody and managing them through CryptoOwnBank. The point is: you should have your tools first and your legal wrappers second \u2014 not the other way around.",
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

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const hasHtml = a.includes("<a ");
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left gap-4"
        data-testid={`faq-toggle-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
      >
        <span className="font-medium text-foreground">{q}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {open && (
        hasHtml ? (
          <p className="pb-5 text-muted-foreground leading-relaxed pr-8" dangerouslySetInnerHTML={{ __html: a }} />
        ) : (
          <p className="pb-5 text-muted-foreground leading-relaxed pr-8">{a}</p>
        )
      )}
    </div>
  );
}

export default function FAQ() {
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <SeoHead
        title="FAQ — CryptoOwnBank | Frequently Asked Questions"
        description="Get answers about CryptoOwnBank — portfolio tracking across 24 blockchains, RLUSD yield vaults, cold wallet security, whale alerts, technical analysis, exchange API keys, stablecoins, and more."
        path="/faq"
        jsonLd={faqJsonLd}
      />
      <div>
        <h1 className="text-3xl font-bold" data-testid="faq-title">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mt-2">Everything you need to know about CryptoOwnBank — portfolio tracking, XRPL tools, payments for consumers and businesses, RLUSD vaults, yield optimization, and keeping control of your crypto.</p>
      </div>
      {faqGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground mb-2" data-testid={`faq-group-${groupIndex}`}>{group.heading}</h2>
          <div className="rounded-lg border bg-card">
            {group.items.map((faq, index) => (
              <FAQItem key={index} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
