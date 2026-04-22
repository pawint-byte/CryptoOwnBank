import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Eye, Users, CheckCircle, XCircle, Clock, AlertTriangle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import type { FeatureAnnouncement } from "@shared/schema";

type AnnouncementDraft = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  audienceTier: string;
};

const SAVED_DRAFTS: AnnouncementDraft[] = [
  {
    title: "Bitcoin & Lightning Are Now Live on CryptoOwnBank — Send and Receive Sats Without Giving Up Your Keys",
    description: "We just shipped first-class Bitcoin and Lightning Network support — and like everything else on CryptoOwnBank, we never hold a single sat.\n\nWhat's new:\n\n• Bitcoin & Lightning page — go to cryptoownbank.com/bitcoin to send and receive over the Lightning Network in seconds.\n• Send tab — paste any BOLT11 invoice (the long lnbc... strings) OR pay a Lightning Address (alice@walletofsatoshi.com style) by amount in sats, with optional comment. We open the payment directly in your installed Lightning wallet — Phoenix, Muun, Wallet of Satoshi, Breez, Zeus, Alby — and you sign there.\n• Receive tab — paste your own Lightning Address, we verify it works, then display it as a scannable QR plus copyable text. Optional 'request a specific amount' field. Anyone with a Lightning wallet can scan and pay you in 1–3 seconds, anywhere on Earth, for fractions of a cent.\n• Bitcoin on-chain — already part of our portfolio tracker. Add any BTC address (1..., 3..., or bc1...) on the Wallets page and we pull the balance and USD value into your dashboard automatically.\n\nWhat we did NOT do:\n\n• We did NOT build a custodial Lightning wallet. We never hold your sats. We never see your channels. We never have a key. If CryptoOwnBank disappeared tomorrow, your money would still be in Phoenix, Muun, or wherever you signed it.\n• Zero CryptoOwnBank fees on Lightning. The only fees are tiny network routing fees (usually under 1 cent) charged by the Lightning nodes that forward your payment.\n\nWhy this matters:\n\nFor 99% of crypto platforms, 'Lightning support' means depositing sats into a custodial pool. That's how Voyager and Celsius started too. We won't go there. Bitcoin on CryptoOwnBank works the same way Bitcoin was designed to work — your keys, your coins, no exceptions.\n\nThree chains, one dashboard, zero custody. XRPL for institutional-grade savings and DEX trading. Stellar for global payments and remittances. Bitcoin and Lightning for the world's most-trusted store of value and instant micropayments. All from your wallet.\n\nGet started in 2 minutes:\n\n1. Install a Lightning wallet if you don't have one (we recommend Phoenix or Wallet of Satoshi for first-timers).\n2. Open CryptoOwnBank → Bitcoin & Lightning → Receive tab → paste your Lightning Address → Verify & Save.\n3. Send the QR to a friend or post it as your tip jar. Done.\n\nFull walkthrough is in the FAQ under 'Bitcoin & Lightning.'",
    ctaLabel: "Open Bitcoin & Lightning",
    ctaUrl: "https://cryptoownbank.com/bitcoin",
    audienceTier: "all",
  },
  {
    title: "Introducing the Legacy Plan — Protect Your Crypto for Your Family",
    description: "Your crypto shouldn't disappear if something happens to you. Our new Legacy Plan is a dead-man switch that automatically delivers your wallet recovery instructions to the people you trust.\n\n• Set your check-in schedule (weekly, biweekly, monthly, or quarterly)\n• Add multiple beneficiaries with wallet-specific recovery instructions\n• Split delivery mode — split instructions across beneficiaries so they must collaborate\n• Annual review reminders to keep your plan current\n• Works with CypheRock, Ledger, Trezor, Xaman, Tangem, and more\n\nCompetitors charge $40–$250/year for crypto inheritance alone. Get it as a $9.99/mo add-on, or free with Pro.",
    ctaLabel: "Set Up Your Legacy Plan",
    ctaUrl: "https://cryptoownbank.com/legacy-plan",
    audienceTier: "all",
  },
  {
    title: "New: Split Delivery & Annual Review for Legacy Plans",
    description: "Two powerful upgrades to your Legacy Plan:\n\nSplit Delivery — Split your wallet recovery instructions across multiple beneficiaries. No single person gets everything — they must collaborate to recover your wallet. Perfect for high-value cold wallets.\n\nAnnual Review — A yearly attestation that your plan is still accurate. Life changes (divorce, new family members, moved safes) can make your plan outdated. We'll remind you when it's time to review.\n\nBoth features are available now in your Legacy Plan dashboard.",
    ctaLabel: "Review Your Legacy Plan",
    ctaUrl: "https://cryptoownbank.com/legacy-plan",
    audienceTier: "all",
  },
  {
    title: "XRPL DEX Trading & DCA Orders Now Live",
    description: "Trade directly on the XRP Ledger DEX and set up recurring dollar-cost averaging — all non-custodial, all through your Xaman wallet.\n\n• Quick Swap for instant trades across 14+ pairs\n• Advanced order book with limit orders\n• DCA Orders — automated recurring buys (daily, weekly, biweekly, monthly, quarterly)\n• Each DCA execution creates a pending transaction for you to approve in Xaman\n• Full trade history and confirmation emails\n\nYour keys, your trades, your schedule.",
    ctaLabel: "Start Trading",
    ctaUrl: "https://cryptoownbank.com/ownbank/dex",
    audienceTier: "all",
  },
  {
    title: "Stellar Network Integration — Send, Trade, and Manage XLM",
    description: "CryptoOwnBank now supports the Stellar network alongside XRPL. Connect your Stellar wallet and access:\n\n• Stellar Wallet Dashboard — XLM + token balances, reserve display\n• Send & Receive with contacts, QR codes, and payment URIs\n• Token Manager — add/remove trustlines for popular Stellar tokens\n• DEX Trading — Quick Swap and Order Book for 8+ Stellar pairs\n• DCA Orders — recurring buys on the Stellar DEX\n• Invoices — create payment requests with shareable links\n• Remittance Calculator — compare cross-border corridors\n\nTwo chains, one dashboard. Non-custodial.",
    ctaLabel: "Connect Your Stellar Wallet",
    ctaUrl: "https://cryptoownbank.com/stellar/wallet",
    audienceTier: "all",
  },
  {
    title: "Whale Alerts, Technical Analysis & Price Alerts",
    description: "Stay ahead of the market with real-time intelligence:\n\nWhale Alerts — Live monitoring of large XRP (>=1M) and RLUSD (>=500K) transactions on the XRP Ledger. See the big moves as they happen.\n\nTechnical Analysis — Interactive price charts with SMA, EMA, RSI, MACD, and Bollinger Bands for 21 assets.\n\nPrice Alerts — Set custom alerts for any tracked asset. Get notified by email when prices cross your targets.\n\nAll available now from your dashboard.",
    ctaLabel: "Explore Market Tools",
    ctaUrl: "https://cryptoownbank.com/whale-alerts",
    audienceTier: "all",
  },
  {
    title: "New on CryptoOwnBank: Lend XLM and USDC on Stellar with Blend Capital",
    description: "Quick update — we just added a third yield source to your Vaults page.\n\nBlend Capital is now live on CryptoOwnBank.\n\nBlend is a non-custodial lending protocol on Stellar Soroban — the same model as Aave or Compound, but settled on Stellar with sub-cent fees and 5-second finality. You can lend XLM and USDC into pools and earn a live, market-driven supply APY paid by borrowers.\n\nWhat this means for you:\n\nConnect your Stellar address (the G... one you already use with Freighter or LOBSTR).\nClick Sync Position on the Yield Vaults page.\nSee your supplied balance, the live supply APY for each pool, and one-click access to mainnet.blend.capital to deposit or withdraw.\nFunds stay in the Soroban smart contract and your wallet — we never hold them.\n\nYou now have three non-custodial yield sources side by side:\n\nSoil Protocol (XRPL) — fixed 5-8% APR on RLUSD, backed by US Treasuries and private credit.\nDoppler Finance (XRPL) — approximately 3.2% APR on XRP via market-neutral strategies.\nBlend Capital (Stellar) — live, variable lending APY on XLM and USDC.\n\nMany members will want to use all three — stable yield in Soil, more XRP through Doppler, and idle XLM or USDC put to work in Blend.\n\nWe never take fees from your yield. 100% of what you earn on Blend stays in your Stellar wallet.",
    ctaLabel: "Open My Vaults",
    ctaUrl: "https://cryptoownbank.com/ownbank/vaults",
    audienceTier: "all",
  },
  {
    title: "XLS-66 Native Lending Is Coming to XRPL — Get Ready Now",
    description: "Two new amendments — XLS-65 (Single Asset Vaults) and XLS-66 (Lending Protocol) — are being voted on by XRPL validators right now. When they reach 80% consensus for 2 consecutive weeks, non-custodial lending vaults go live directly on the XRP Ledger.\n\nWhat this means for you:\n\nDeposit XRP or RLUSD into on-ledger vaults and earn yield — your tokens never leave your wallet.\nNon-custodial — no exchange, no middleman, no counterparty risk.\nCryptoOwnBank tracks validator voting in real-time so you know exactly when it activates.\n\nWe've built an \"Are You Ready for XLS-66?\" checklist to help you prepare:\n\n- Connect your XRP wallet\n- Link Xaman for transaction signing\n- Set up RLUSD trustlines (for RLUSD vaults)\n- Use the yield calculator to model different scenarios\n\nDo the homework now so you're ready the moment vaults go live. Pro members get first access to all XLS-66 features.\n\nThis is where everything starts — own your crypto, earn yield, and never hand your keys to anyone.",
    ctaLabel: "Check Your XLS-66 Readiness",
    ctaUrl: "https://cryptoownbank.com/xls66-lending",
    audienceTier: "all",
  },
  {
    title: "New: Live Yield Earnings Tracker — Watch Your Money Grow",
    description: "Your dashboard just got more powerful.\n\nIf you have RLUSD deposited in a Soil vault, you'll now see a live Yield Earnings Tracker right on your dashboard — both the main Dashboard and the OwnBank page.\n\nHere's what it shows:\n\nToday — how much you've earned so far today.\nThis Month — your earnings for the current month.\nAll Time — total interest earned since your first deposit.\n\nThe numbers tick upward in real-time, with a live per-second rate so you can literally watch your money grow.\n\nBut here's the part that really matters: Compound Projections.\n\nBased on your actual deposited amounts and APR rates, the tracker shows what you'd earn at 1 Year, 5 Years, and 10 Years — assuming you reinvest your earnings monthly. This is the compound effect: your interest earns interest, and the numbers get very real very fast.\n\nNo platform fees. No middleman. You keep 100% of every dollar you see on that tracker.\n\nThis feature is free for all members with active vault deposits. If you haven't deposited yet, this is your sign — connect your wallet, deposit RLUSD into a Soil vault, and watch the counter start ticking.",
    ctaLabel: "See Your Earnings Live",
    ctaUrl: "https://cryptoownbank.com/ownbank",
    audienceTier: "all",
  },
  {
    title: "New: Crypto News — Headlines That Match Your Holdings",
    description: "We just launched something we've been working on: Crypto News.\n\nIt's a dedicated news page that pulls the latest headlines from CoinDesk, CoinTelegraph, Decrypt, and The Block — refreshed every 15 minutes.\n\nBut here's the part that matters: when you're logged in, a personalized \"For You\" section appears at the top. It scans every article and matches it against the assets you actually hold. If you own XRP, BTC, ETH, SOL, or any of 20+ supported assets, relevant articles surface automatically with asset badges so you know exactly why it matters to you.\n\nNo pop-ups. No banners. No notifications cluttering your dashboard. The news lives on its own page — you go there when you're ready, and the information is waiting.\n\nThis is free for everyone. The personalized \"For You\" matching works for all logged-in users regardless of subscription tier.\n\nYou'll find Crypto News in the sidebar under Market & Yields.",
    ctaLabel: "Check Out Crypto News",
    ctaUrl: "https://cryptoownbank.com/crypto-news",
    audienceTier: "all",
  },
  {
    title: "New: EVM Swap — Trade Thousands of Tokens Across 7 Chains",
    description: "You can now swap any ERC-20 token directly from CryptoOwnBank — powered by the 1inch aggregator, which finds the best price across hundreds of DEXs.\n\nHere's what's included:\n\n7 Chains Supported — Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, and BNB Chain.\nConnect MetaMask — works with browser extension and Ledger hardware wallets.\nBest Price Routing — 1inch scans 300+ liquidity sources to get you the best swap rate.\nNon-Custodial — your tokens never leave your wallet. You sign every transaction yourself.\nAdjustable Slippage — set your tolerance from 0.5% to 3%.\nReal-Time Quotes — see the exact amount you'll receive before you swap.\n\nHow it works:\n1. Connect your MetaMask wallet\n2. Pick your chain and tokens\n3. Enter an amount — we show you the best quote instantly\n4. Approve the token (one-time per token), then swap\n5. Track your transaction on the block explorer\n\nEVM Swap is available now for Premium and Pro members.\n\nOne platform. XRPL, Stellar, and now 7 EVM chains. Your keys, your trades.",
    ctaLabel: "Try EVM Swap",
    ctaUrl: "https://cryptoownbank.com/ownbank/evm-swap",
    audienceTier: "all",
  },
  {
    title: "XLS-66 Validator Update — Here's Where We Stand",
    description: "Quick update on the XLS-66 amendment vote:\n\nXLS-65 (Single Asset Vaults) and XLS-66 (Lending Protocol) are both in the validator voting phase. You can track live progress directly on the XLS-66 page — we pull data straight from the XRPL every 10 minutes.\n\nWhat to do while we wait:\n\n- Complete your readiness checklist — make sure your wallet, Xaman, and trustlines are set up\n- Try the yield calculator — model potential earnings at different APR rates\n- Read \"What is XLS-66 & How Does It Work?\" on the lending page\n\nWhen validators hit 80% for 2 consecutive weeks on rippled 3.1.0+, the feature activates automatically — and CryptoOwnBank will be ready from day one.\n\nNo action required on your end other than being prepared. We'll notify you the moment it goes live.",
    ctaLabel: "Track Validator Progress",
    ctaUrl: "https://cryptoownbank.com/xls66-lending",
    audienceTier: "all",
  },
  {
    title: "New: XRPL Bridge — Move Assets Between XRP Ledger and EVM Chains",
    description: "You can now bridge assets between the XRP Ledger and 7 EVM chains — both directions — directly from CryptoOwnBank.\n\nBidirectional Bridge\nEVM to XRPL: Send tokens from Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, or BNB Chain to the XRP Ledger. Powered by Squid Router + Axelar.\nXRPL to EVM: Send XRP from the XRP Ledger to any EVM chain. Sign with Xaman — one tap on your phone and you're done.\n\nMobile-Friendly\nOn your phone, Xaman and MetaMask are native apps — signing is instant. No browser extensions needed. WalletConnect lets you use your phone wallet even when browsing on desktop.\n\nLive Balances and MAX Button\nBoth directions show your real-time token balance with a MAX button. The XRPL side reserves 10 XRP for your account minimum. The EVM side supports native tokens and ERC-20s.\n\nNon-Custodial\nYou sign every transaction yourself — we never hold your tokens.\n\nAvailable now for Premium and Pro members.",
    ctaLabel: "Try the XRPL Bridge",
    ctaUrl: "https://cryptoownbank.com/ownbank/xrpl-bridge",
    audienceTier: "all",
  },
  {
    title: "New: 14 Ways to Get Crypto — No Exchange Needed",
    description: "We just expanded our Buy Crypto page with every way you can get crypto without signing up for an exchange.\n\nHere's what's available now:\n\nCard & Bank On-Ramps — Buy directly inside your wallet (Xaman, LOBSTR, MetaMask, Ledger, Trust Wallet, Phantom, Keplr) via MoonPay, Transak, Coinify, BTC Direct, Mercuryo, Banxa, Topper, and Coinbase Pay.\n\nP2P Platforms — NoOnes (900+ payment methods, global excluding US), ByBarter (non-custodial P2P with escrow), and Narfex (fully decentralized P2P).\n\nEmerging Market On-Ramps — Onramp.money (India: UPI, IMPS, NEFT) and Digitap (QR-based buying across emerging markets). Built for regions where Western on-ramps don't work well.\n\nTelegram — Buy USDT instantly inside Telegram Wallet with Apple Pay, Google Pay, or your card. Available in 100+ countries.\n\nLocal P2P Communities — Guidance on finding active Telegram and WhatsApp crypto trading groups in your country.\n\nEvery path brings you back to CryptoOwnBank: buy crypto however works for you, add your wallet address here, and we'll track your balances automatically. Then use our DEX trading, DCA orders, cross-chain swaps, yield tools, and payment features — all from one dashboard.\n\nIf someone sends you a payment link and you don't have crypto yet, the pay page now includes a \"Don't have crypto yet?\" helper with the quickest paths to get started.",
    ctaLabel: "See All On-Ramp Options",
    ctaUrl: "https://cryptoownbank.com/buy-crypto",
    audienceTier: "all",
  },
  {
    title: "Legacy Plan Upgrade — Encrypted Vault, 16 Wallet Templates, and Auto-Fill",
    description: "Three major upgrades to your Legacy Plan:\n\nWallet-Specific Recovery Templates\nWhen you add a beneficiary, select the exact wallet type — Ledger, CypheRock, Trezor, ELLIPAL, Tangem, Coldcard, Keystone, BitBox, Xaman, MetaMask, Trust Wallet, Phantom, Exodus, Coinbase Wallet, exchange account, or other — and the form transforms into a template tailored to that wallet's recovery method. Each template tells your survivor exactly what they need and where to find it. They don't need to know crypto.\n\nPre-Fill from Connected Wallets\nSelect a wallet type and the system shows your connected wallets on that device. Check the ones that apply, click Load Selected, and the asset summary fills in with actual addresses and balances from your portfolio. No guessing what's on each device.\n\nEncrypted Vault (Optional)\nYou can now include sensitive recovery data — seed words, PINs, passphrases — encrypted with a passphrase you choose. The encryption uses AES-256-GCM (bank-grade, 256-bit) and happens entirely in your browser. CryptoOwnBank never sees the plaintext. We store only the encrypted ciphertext, which is meaningless without your passphrase.\n\nHow the encryption works: You enter a Legacy Passphrase. Your browser derives a 256-bit key using PBKDF2 (600,000 iterations of SHA-256), generates a random salt and initialization vector, encrypts the data, and stores only the result. The plaintext never touches our servers, is never transmitted over the internet, and cannot be recovered by us — even under a court order, because we do not have the key.\n\nWhen the dead-man switch triggers, your survivor receives the encrypted blob by email. They visit cryptoownbank.com/decrypt, paste it in, enter the passphrase, and decryption happens entirely in their browser. Nothing is sent to any server. The page works offline after loading.\n\nYou share the passphrase separately — verbally, in a will, through an attorney, or in a sealed envelope. Neither the encrypted data nor the passphrase is useful alone.\n\nA Test Decrypt button lets you verify everything works before saving.\n\nAll three features are available now in your Legacy Plan dashboard.",
    ctaLabel: "Update Your Legacy Plan",
    ctaUrl: "https://cryptoownbank.com/legacy-plan",
    audienceTier: "all",
  },
  {
    title: "New: Payments Hub — One Page, Every Payment Tool You Need",
    description: "We just launched the Payments Hub — a single page that answers one question: what do you need to do?\n\nInstead of navigating between XRPL Send, Stellar Invoices, Recurring Payments, and Payment Queue separately, the Payments Hub organizes everything by outcome:\n\nSend Money — wallet-to-wallet transfers on XRPL or Stellar. 4-second settlement, near-zero fees.\n\nGet Paid — generate QR codes and payment links anyone can scan to pay you. No app download needed for the sender.\n\nInvoice a Client — professional crypto invoices with shareable links and payment tracking.\n\nAuto-Pay & Subscriptions — schedule recurring payments for rent, salaries, subscriptions, or regular family support. You approve each one via your wallet.\n\nSend Money Home — cross-border remittances at a fraction of what Western Union, Wise, or Remitly charges. Compare and save.\n\nPay Your Team — batch-send payroll to multiple people in one go. Queue payments offline, sync when ready.\n\nEach card routes you to the right tool on the right chain. No blockchain knowledge required — pick your task, we handle the routing.\n\nNon-custodial throughout. You sign every payment. Your keys stay on your device.\n\nFind it in the sidebar under OwnBank, or go directly to /payments.",
    ctaLabel: "Open Payments Hub",
    ctaUrl: "https://cryptoownbank.com/payments",
    audienceTier: "all",
  },
  {
    title: "New: Spend Crypto Anywhere — Non-Custodial Debit Cards",
    description: "You can now spend crypto at any Visa or Mastercard terminal — directly from your own wallet. No exchange. No custody handoff. No counterparty risk.\n\nWe've added a Crypto Debit Cards guide with the top non-custodial options for 2026:\n\nMetaMask Card (Mastercard) — Spends directly from your MetaMask wallet. Same wallet you use with CryptoOwnBank's EVM Swap. Full DeFi access.\n\nBleap (Mastercard) — 2% flat cashback in USDC, zero FX fees, global coverage. The cleanest all-around option.\n\nGnosis Pay (Visa) — Built on Safe wallet. Funds stay on-chain until you tap to pay. Popular in Europe.\n\nCypher (Visa) — Backed by Y Combinator and Coinbase Ventures. Works at 40M+ terminals worldwide.\n\nCOCA (Visa) — Stablecoin-native with biometric recovery. Rewards paid in stablecoins.\n\nAll cards are reloadable — just send more crypto to your wallet anytime.\n\nThe CryptoOwnBank integration: add your card's wallet address to your dashboard and track your spending balance alongside your full portfolio. When you spend, your balance updates here. When you reload, it updates here. One view of everything.\n\nThis completes the full crypto lifecycle on CryptoOwnBank: buy, track, trade, earn yield, send payments, spend anywhere.",
    ctaLabel: "Compare Crypto Debit Cards",
    ctaUrl: "https://cryptoownbank.com/crypto-debit-cards",
    audienceTier: "all",
  },
  {
    title: "EVM Swap Now Supports Every Token With a Liquidity Pool",
    description: "We upgraded EVM Swap with multi-DEX routing.\n\nPreviously, tokens that weren't indexed by 1inch showed a \"no liquidity\" error and sent you to Uniswap or PancakeSwap to complete the trade on their site. That's gone now.\n\nWhen 1inch doesn't cover a token, EVM Swap automatically routes through the chain's native DEX:\n\nEthereum & Base -- Uniswap\nBNB Chain -- PancakeSwap\nPolygon -- QuickSwap\nArbitrum & Optimism -- SushiSwap\nAvalanche -- TraderJoe\n\nSame experience as before: pick your tokens, see a quote, connect your wallet, sign, done. The routing happens behind the scenes -- you don't need to know or care which DEX is being used.\n\nThis means the full flow -- Token Research to purchase to portfolio tracking -- now happens entirely on CryptoOwnBank. No more copy-pasting contract addresses to external DEXes. No more leaving the site to buy micro-cap tokens.\n\nWorks across all 7 supported chains. Your wallet signs every transaction. Non-custodial throughout.",
    ctaLabel: "Open EVM Swap",
    ctaUrl: "https://cryptoownbank.com/ownbank/evm-swap",
    audienceTier: "premium",
  },
];

export default function AdminAnnouncements() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [audienceTier, setAudienceTier] = useState("all");
  const [confirmSend, setConfirmSend] = useState(false);
  const [showDrafts, setShowDrafts] = useState(true);

  const { data: announcements = [], isLoading } = useQuery<FeatureAnnouncement[]>({
    queryKey: ["/api/admin/announcements"],
  });

  const { data: audienceData } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/announcements/audience-count", audienceTier],
    queryFn: () => fetch(`/api/admin/announcements/audience-count?tier=${audienceTier}`, { credentials: "include" }).then(r => r.json()),
  });

  const sendMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/announcements/send", {
      title, description, ctaLabel, ctaUrl, audienceTier,
    }),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({
        title: data.queued ? "Announcement queued" : "Announcement sent",
        description: data.queued
          ? `Sending to ${data.total} recipients in the background. Refresh in a minute to see delivery stats.`
          : `${data.sent} of ${data.total} emails delivered successfully.`,
      });
      setTitle("");
      setDescription("");
      setCtaLabel("");
      setCtaUrl("");
      setConfirmSend(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
    },
    onError: (err: Error) => {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
      setConfirmSend(false);
    },
  });

  const previewMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/announcements/preview", {
      title, description, ctaLabel, ctaUrl,
    }),
    onSuccess: () => {
      toast({ title: "Preview sent", description: "Check your inbox for the preview email." });
    },
    onError: (err: Error) => {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    },
  });

  const canSend = title.trim() && description.trim();

  const sentTitles = new Set(announcements.map((a) => a.title));

  const sortedDrafts = [...SAVED_DRAFTS].sort((a, b) => {
    const aSent = sentTitles.has(a.title);
    const bSent = sentTitles.has(b.title);
    if (aSent !== bSent) return aSent ? 1 : -1;
    return 0;
  });

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Mail className="h-7 w-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Feature Announcements</h1>
          <p className="text-muted-foreground">Compose and send branded product announcements to your users.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => setShowDrafts(!showDrafts)}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Ready-to-Send Drafts
                  </CardTitle>
                  <CardDescription>
                    {SAVED_DRAFTS.length} drafts — {SAVED_DRAFTS.filter(d => !sentTitles.has(d.title)).length} not yet sent
                  </CardDescription>
                </div>
                {showDrafts ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
            {showDrafts && (
              <CardContent className="space-y-2">
                {sortedDrafts.map((draft, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between gap-3 rounded-md border p-3 cursor-pointer transition-colors ${sentTitles.has(draft.title) ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 opacity-75" : "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"}`}
                    onClick={() => {
                      setTitle(draft.title);
                      setDescription(draft.description);
                      setCtaLabel(draft.ctaLabel);
                      setCtaUrl(draft.ctaUrl);
                      setAudienceTier(draft.audienceTier);
                      setConfirmSend(false);
                      toast({ title: "Draft loaded", description: "Review the content below, then preview or send." });
                    }}
                    data-testid={`draft-${i}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{draft.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{draft.description.split("\n")[0]}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const sentAnn = announcements.find((a) => a.title === draft.title);
                        if (sentAnn) {
                          return (
                            <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                              <CheckCircle className="h-2.5 w-2.5 mr-1" />
                              Sent {sentAnn.sentAt ? new Date(sentAnn.sentAt).toLocaleDateString() : ""}
                            </Badge>
                          );
                        }
                        return (
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
                            <Clock className="h-2.5 w-2.5 mr-1" />
                            Not sent
                          </Badge>
                        );
                      })()}
                      <Badge variant="outline" className="shrink-0 text-[10px]">{draft.audienceTier}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compose Announcement</CardTitle>
              <CardDescription>Write your announcement or load a draft above. Users who unsubscribed won't receive it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ann-title">Title</Label>
                <Input
                  id="ann-title"
                  data-testid="input-announcement-title"
                  placeholder="e.g. Introducing Split Delivery for Legacy Plans"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ann-desc">Description</Label>
                <Textarea
                  id="ann-desc"
                  data-testid="input-announcement-description"
                  placeholder="Describe the feature, update, or news. HTML is supported for the email body."
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ann-cta-label">CTA Button Label (optional)</Label>
                  <Input
                    id="ann-cta-label"
                    data-testid="input-cta-label"
                    placeholder="e.g. Try It Now"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ann-cta-url">CTA Button URL (optional)</Label>
                  <Input
                    id="ann-cta-url"
                    data-testid="input-cta-url"
                    placeholder="e.g. https://cryptoownbank.com/legacy-plan"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={audienceTier} onValueChange={setAudienceTier}>
                  <SelectTrigger data-testid="select-audience-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="premium">Premium & Pro</SelectItem>
                    <SelectItem value="pro">Pro Only</SelectItem>
                  </SelectContent>
                </Select>
                {audienceData && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {audienceData.count} eligible recipient{audienceData.count !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  data-testid="button-preview"
                  disabled={!canSend || previewMutation.isPending}
                  onClick={() => previewMutation.mutate()}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {previewMutation.isPending ? "Sending preview..." : "Send Preview to Me"}
                </Button>

                {!confirmSend ? (
                  <Button
                    data-testid="button-send"
                    disabled={!canSend}
                    onClick={() => setConfirmSend(true)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send to {audienceData?.count ?? "..."} Users
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-amber-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Are you sure?
                    </span>
                    <Button
                      variant="destructive"
                      data-testid="button-confirm-send"
                      disabled={sendMutation.isPending}
                      onClick={() => sendMutation.mutate()}
                    >
                      {sendMutation.isPending ? "Sending..." : `Yes, Send to ${audienceData?.count ?? "..."} Users`}
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmSend(false)}>Cancel</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-lg border bg-card p-4 space-y-3"
                style={{ fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}
              >
                <div className="text-center text-xs font-bold tracking-wider text-[#00A4E4]">
                  CRYPTOOWNBANK
                </div>
                <Separator />
                <h3 className="font-semibold text-base" data-testid="text-preview-title">
                  {title || "Your Title Here"}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-preview-description">
                  {description || "Your description will appear here..."}
                </p>
                {(ctaLabel || ctaUrl) && (
                  <div className="pt-2">
                    <div
                      className="inline-block px-4 py-2 rounded-md text-sm font-medium text-white"
                      style={{ backgroundColor: "#00A4E4" }}
                    >
                      {ctaLabel || "Learn More"}
                    </div>
                  </div>
                )}
                <Separator />
                <p className="text-[10px] text-muted-foreground text-center">
                  Audience: {audienceTier === "all" ? "All users" : audienceTier === "premium" ? "Premium & Pro" : "Pro only"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send History
              </CardTitle>
              <CardDescription>{announcements.length} announcement{announcements.length !== 1 ? "s" : ""} sent — newest first</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No announcements sent yet.</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {sortedAnnouncements.map((ann, idx) => (
                    <div key={ann.id} className={`rounded-md border p-3 space-y-1.5 ${idx === 0 ? "border-emerald-500/30 bg-emerald-500/5" : ""}`} data-testid={`card-announcement-${ann.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm leading-tight">{ann.title}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {idx === 0 && (
                            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30" variant="outline">
                              Latest
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {ann.audienceTier}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{ann.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="h-3 w-3" />
                          {ann.totalSent} delivered
                        </span>
                        {(ann.totalFailed ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-red-500">
                            <XCircle className="h-3 w-3" />
                            {ann.totalFailed} failed
                          </span>
                        )}
                        <span>of {ann.totalRecipients} recipients</span>
                        <span className="ml-auto font-medium">
                          {ann.sentAt ? new Date(ann.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
