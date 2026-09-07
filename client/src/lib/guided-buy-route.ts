export type GuidedRailId = "stripe" | "evm" | "lifi" | "thorchain" | "trocador" | "external";

export interface GuidedHolding {
  symbol: string;
  balance: number;
  usdValue: number;
  walletAddress: string;
  chain: string;
}

export interface GuidedRailChoice {
  id: GuidedRailId;
  label: string;
  href?: string;
  unavailableReason?: string;
}

export interface GuidedRouteLeg {
  id: string;
  kind: "buy" | "swap" | "external";
  from?: string;
  to: string;
  amountUsd: number;
  estimatedFeeUsd: number;
  etaMinutes: number;
  sourceWalletAddress?: string;
  destinationAddress: string;
  rails: GuidedRailChoice[];
}

export interface GuidedRoute {
  target: string;
  start: "holding" | "cash" | "external";
  summary: string;
  estimatedReceiveUsd: number;
  estimatedFeeUsd: number;
  etaMinutes: number;
  legs: GuidedRouteLeg[];
}

const EVM = new Set(["ETH", "USDC", "USDT", "DAI", "WBTC", "MATIC", "POL", "AVAX", "ARB", "OP", "BNB"]);
const THOR = new Set(["BTC", "LTC", "DOGE", "BCH"]);
const EXTERNAL_ONLY = new Set(["XRP", "XMR", "RLUSD", "XLM", "SOL", "ADA", "ATOM", "DOT", "TRX", "ALGO", "CRO", "FLR", "HBAR"]);

function positiveHoldings(holdings: GuidedHolding[], target: string) {
  return holdings
    .filter((h) => h.symbol !== target && h.balance > 0 && h.usdValue >= 5)
    .sort((a, b) => b.usdValue - a.usdValue);
}

function thorDeeplink(from: string, to: string, destinationAddress: string, amountUsd: number) {
  const assets: Record<string, string> = {
    BTC: "BTC.BTC", LTC: "LTC.LTC", DOGE: "DOGE.DOGE", BCH: "BCH.BCH",
  };
  const params = new URLSearchParams({
    input: from === "ETH" ? "ETH.ETH" : "ETH.USDC-0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48",
    output: assets[to],
    recipient: destinationAddress,
    inputAmount: String(amountUsd),
  });
  return `https://app.thorswap.finance/swap?${params.toString()}`;
}

export function makeGuidedSwapRails(from: string, to: string, destinationAddress: string, sourceAddress: string | undefined, amountUsd: number): GuidedRailChoice[] {
  if (EVM.has(from) && EVM.has(to) && sourceAddress?.toLowerCase() === destinationAddress.toLowerCase()) {
    return [{ id: "trocador", label: "Trocador (locked recipient)", href: `/buy-crypto?coin=${to}&method=aggregator&address=${encodeURIComponent(destinationAddress)}&from=${from}` }];
  }
  if ((from === "USDC" || from === "ETH") && THOR.has(to)) {
    return [
      { id: "thorchain", label: "THORChain (locked recipient)", href: thorDeeplink(from, to, destinationAddress, amountUsd) },
      { id: "trocador", label: "Trocador fallback (locked recipient)", href: `/buy-crypto?coin=${to}&method=aggregator&address=${encodeURIComponent(destinationAddress)}&from=${from}` },
    ];
  }
  return [{ id: "trocador", label: "Trocador (locked recipient)", href: `/buy-crypto?coin=${to}&method=aggregator&address=${encodeURIComponent(destinationAddress)}&from=${from}` }];
}

export function composeGuidedRoute(input: {
  target: string;
  destinationAddress: string;
  holdings: GuidedHolding[];
  amountUsd: number;
  bridgeAddress?: string;
}): GuidedRoute {
  const target = input.target.toUpperCase();
  const amountUsd = Math.max(25, input.amountUsd || 50);
  const heldTarget = input.holdings.find((h) => h.symbol === target && h.balance > 0);
  if (heldTarget) {
    return {
      target,
      start: "holding",
      summary: `You already hold ${target}. No buy or swap is needed.`,
      estimatedReceiveUsd: heldTarget.usdValue,
      estimatedFeeUsd: 0,
      etaMinutes: 0,
      legs: [],
    };
  }

  if (EXTERNAL_ONLY.has(target)) {
    const source = positiveHoldings(input.holdings, target)[0];
    const from = source?.symbol || "USDC";
    const externalLeg: GuidedRouteLeg = {
      id: `external-${from}-${target}`,
      kind: "external",
      from,
      to: target,
      amountUsd: source?.usdValue || amountUsd,
      estimatedFeeUsd: (source?.usdValue || amountUsd) * 0.02,
      etaMinutes: 20,
      sourceWalletAddress: source?.walletAddress || input.bridgeAddress,
      destinationAddress: input.destinationAddress,
      rails: [{
        id: "external",
        label: target === "XMR" ? "Private/no-account guidance (locked recipient)" : "External guidance (locked recipient)",
        href: `/buy-crypto?coin=${target}&method=aggregator&address=${encodeURIComponent(input.destinationAddress)}&from=${from}`,
      }],
    };
    return {
      target,
      start: source ? "external" : "cash",
      summary: source
        ? `You're holding ${from} → use the working external route to ${target} → it lands in your wallet.`
        : `Buy a supported entry coin → use the working external route to ${target} → it lands in your wallet.`,
      estimatedReceiveUsd: source?.usdValue || amountUsd,
      estimatedFeeUsd: (source?.usdValue || amountUsd) * 0.02,
      etaMinutes: source ? 20 : 25,
      legs: source ? [externalLeg] : [
        {
          id: "buy-USDC",
          kind: "buy",
          to: "USDC",
          amountUsd,
          estimatedFeeUsd: 0,
          etaMinutes: 5,
          destinationAddress: input.bridgeAddress || "",
          rails: [{ id: "stripe", label: "Stripe hosted checkout" }],
        },
        externalLeg,
      ],
    };
  }

  const candidates = positiveHoldings(input.holdings, target);
  const direct = candidates[0];
  if (direct) {
    const spendUsd = Math.min(direct.usdValue, amountUsd);
    const fee = spendUsd * (EVM.has(direct.symbol) && EVM.has(target) ? 0.006 : 0.015);
    return {
      target,
      start: "holding",
      summary: `You're holding ${direct.symbol} → swap to ${target} → ${target} lands in your wallet.`,
      estimatedReceiveUsd: spendUsd - fee,
      estimatedFeeUsd: fee,
      etaMinutes: EVM.has(direct.symbol) && EVM.has(target) ? 8 : 20,
      legs: [{
        id: `swap-${direct.symbol}-${target}`,
        kind: "swap",
        from: direct.symbol,
        to: target,
        amountUsd: spendUsd,
        estimatedFeeUsd: fee,
        etaMinutes: EVM.has(direct.symbol) && EVM.has(target) ? 8 : 20,
        sourceWalletAddress: direct.walletAddress,
        destinationAddress: input.destinationAddress,
        rails: makeGuidedSwapRails(direct.symbol, target, input.destinationAddress, direct.walletAddress, spendUsd),
      }],
    };
  }

  const bridge = EVM.has(target) ? "ETH" : "USDC";
  const swapFee = amountUsd * (EVM.has(target) ? 0.006 : 0.015);
  return {
    target,
    start: "cash",
    summary: `Buy ${bridge} with your card → swap to ${target} → ${target} lands in your wallet.`,
    estimatedReceiveUsd: amountUsd - swapFee,
    estimatedFeeUsd: swapFee,
    etaMinutes: 15,
    legs: [
      {
        id: `buy-${bridge}`,
        kind: "buy",
        to: bridge,
        amountUsd,
        estimatedFeeUsd: 0,
        etaMinutes: 5,
        destinationAddress: input.bridgeAddress || "",
        rails: [{ id: "stripe", label: "Stripe hosted checkout" }],
      },
      {
        id: `swap-${bridge}-${target}`,
        kind: "swap",
        from: bridge,
        to: target,
        amountUsd,
        estimatedFeeUsd: swapFee,
        etaMinutes: 10,
        destinationAddress: input.destinationAddress,
        sourceWalletAddress: input.bridgeAddress,
        rails: makeGuidedSwapRails(bridge, target, input.destinationAddress, input.bridgeAddress, amountUsd),
      },
    ],
  };
}