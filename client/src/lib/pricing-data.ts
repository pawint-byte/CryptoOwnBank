export const freeTierFeatures = [
  "Import exchange data via CSV (Coinbase, Kraken, Crypto.com, etc.)",
  "Track 1 blockchain address across 32+ blockchains",
  "Soil vault access (deposit + manual withdraw)",
  "Basic Recommendations Hub (see yield opportunities for your assets)",
  "Yield calculator for projected earnings",
  "1 price alert with email notifications",
  "Whale Alerts — last 24 hours of large XRP & RLUSD movements",
  "Technical Analysis — SMA indicators with 30-day charts",
  "7-day transaction history",
];

export const premiumFeatures = [
  "XRPL DEX trading — 44 pairs (Quick Swap + Advanced order book)",
  "Stellar DEX trading — 13 pairs (Quick Swap + live order book)",
  "EVM Swap (1inch — live token balances, MAX button, wallet switching) + Cross-Chain Swap (LI.FI) + XRPL Bridge (bidirectional — EVM↔XRP via Axelar)",
  "WalletConnect — scan QR code to connect MetaMask Mobile, Trust Wallet, Rainbow, Coinbase Wallet, or 50+ other mobile wallets",
  "DCA Orders — automated recurring buys on XRPL (31 pairs) and Stellar (18 pairs) DEX",
  "Earn & Accumulate XRP — withdraw full Soil vault position + DCA a portion into XRP on the DEX (you approve each step in Xaman)",
  "Unlimited CSV imports",
  "Unlimited blockchain addresses across 32+ chains (BTC, ETH, SOL, XRP, ADA, AVAX, ALGO, ATOM, TRX, HBAR, DOT, VET, TON, XLM, MATIC, SUI, FLR, and more)",
  "Full ERC-20, SPL, TRC-20, VIP-180 & CRC-20 token auto-detection",
  "Full Recommendations Hub — Best in Class rankings, staking guides, DeFi comparisons, 'You Hold This' badges",
  "Wallet-specific staking guides (Ledger, ELLIPAL, SafePal, CypheRock, Arculus)",
  "Full transaction history (all time)",
  "CSV import (Ledger Live, Yahoo Finance, CoinTracker)",
  "Unlimited price alerts",
  "Soil vault withdrawals — your keys, your timing",
  "Portfolio search, filter & sort",
  "Statement Insights with rate comparisons",
  "Whale Alerts — extended history + custom thresholds",
  "Technical Analysis — all indicators, pattern detection + 10-year charts",
];

export const annualBonusFeatures = [
  "Complete tax reports (CSV + PDF + TurboTax)",
  "Tax Harvest AI — scan for loss harvesting opportunities",
  "Capital gains & losses calculation",
  "IRS Form 8949 / Schedule D guidance",
  "Save $149/yr vs monthly billing",
];

export const proFeatures = [
  "Everything in Premium",
  "Legacy Plan — dead-man switch with split delivery (Member for Life, included free)",
  "DeFi Borrowing Hub (Aave, Compound, Maple, MakerDAO)",
  "Real Estate Tokenization (RealT, Lofty, Propy)",
  "Batch & payroll recurring payments",
  "Treasury dashboard for business wallets",
  "Up to 5 team member seats",
  "XLS-65/66 Lending (pending validator vote)",
];

export interface LegacyTier {
  name: string;
  addonKey: "legacy-plan-yearly" | "legacy-plan-5yr" | "legacy-plan-lifetime";
  price: string;
  cadence: string;
  blurb: string;
  highlight?: boolean;
}

export const legacyTiers: LegacyTier[] = [
  {
    name: "Annual",
    addonKey: "legacy-plan-yearly",
    price: "$29",
    cadence: "/year",
    blurb:
      "The lowest-cost way to put crypto inheritance in place. Renews yearly until you cancel.",
  },
  {
    name: "5-Year",
    addonKey: "legacy-plan-5yr",
    price: "$99",
    cadence: "/5 years",
    blurb: "Pay once for five years of coverage at a discount. No auto-renew.",
    highlight: true,
  },
  {
    name: "Member for Life",
    addonKey: "legacy-plan-lifetime",
    price: "$499",
    cadence: "one-time",
    blurb:
      "Pay once, covered forever — no renewals, no future price increases. Included free with Pro.",
  },
];
