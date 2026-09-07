import { storage } from "../storage";
import { applyCryptoDiscount } from "../stripe";

const CHAIN_TO_COINGECKO: Record<string, string> = {
  bitcoin: "bitcoin", ethereum: "ethereum", solana: "solana",
  xrp: "ripple", rlusd: "ripple-usd", dogecoin: "dogecoin", litecoin: "litecoin",
  cardano: "cardano", avalanche: "avalanche-2", algorand: "algorand",
  cosmos: "cosmos", tron: "tron", hedera: "hedera-hashgraph",
  polkadot: "polkadot", vechain: "vechain", stellar: "stellar",
  ton: "the-open-network", polygon: "matic-network", cronos: "crypto-com-chain",
  xdc: "xdce-crowd-sale", digibyte: "digibyte", casper: "casper-network",
  nervos: "nervos-network", zilliqa: "zilliqa", verge: "verge",
};

const CHAIN_TO_ASSET: Record<string, string> = {
  bitcoin: "BTC", ethereum: "ETH", solana: "SOL", xrp: "XRP", rlusd: "RLUSD",
  dogecoin: "DOGE", litecoin: "LTC", cardano: "ADA", avalanche: "AVAX",
  algorand: "ALGO", cosmos: "ATOM", tron: "TRX", hedera: "HBAR",
  polkadot: "DOT", vechain: "VET", stellar: "XLM", ton: "TON",
  polygon: "MATIC", cronos: "CRO", xdc: "XDC", digibyte: "DGB",
  casper: "CSPR", nervos: "CKB", zilliqa: "ZIL", verge: "XVG",
};

export class CryptoPaymentCreationError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

type CreatorDependencies = {
  getPaymentAddresses: typeof storage.getCryptoPaymentAddresses;
  createPayment: typeof storage.createCryptoPayment;
  fetchPriceUsd: (coingeckoId: string) => Promise<number>;
  random: () => number;
  now: () => Date;
};

const defaultDependencies: CreatorDependencies = {
  getPaymentAddresses: (activeOnly) => storage.getCryptoPaymentAddresses(activeOnly),
  createPayment: (payment) => storage.createCryptoPayment(payment),
  fetchPriceUsd: async (coingeckoId) => {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
    );
    const data = await response.json();
    return Number(data[coingeckoId]?.usd);
  },
  random: Math.random,
  now: () => new Date(),
};

export async function createPendingCryptoPayment(
  input: {
    userId: string;
    plan: string;
    chain: string;
    fullUsdAmount: number;
    joinDate?: Date | null;
  },
  dependencies: CreatorDependencies = defaultDependencies,
) {
  const chain = input.chain.trim().toLowerCase();
  const coingeckoId = CHAIN_TO_COINGECKO[chain];
  if (!coingeckoId) {
    throw new CryptoPaymentCreationError(`Unsupported chain: ${input.chain}`, 400);
  }

  const addresses = await dependencies.getPaymentAddresses(true);
  const paymentAddress = addresses.find(
    (address) => address.chain.trim().toLowerCase() === chain,
  );
  if (!paymentAddress) {
    throw new CryptoPaymentCreationError(
      `No payment address configured for ${input.chain}.`,
      400,
    );
  }

  const price = await dependencies.fetchPriceUsd(coingeckoId);
  if (!Number.isFinite(price) || price <= 0) {
    throw new CryptoPaymentCreationError("Failed to fetch current price.", 500);
  }

  const now = dependencies.now();
  const usdAmount = applyCryptoDiscount(input.fullUsdAmount, chain, {
    now,
    joinDate: input.joinDate ?? null,
  });
  const uniqueSuffix = Math.floor(dependencies.random() * 900 + 100) / 1e8;
  const expectedAmount = (usdAmount / price + uniqueSuffix).toFixed(8);
  const destinationTag =
    chain === "xrp" || chain === "rlusd"
      ? Math.floor(dependencies.random() * 2_000_000_000) + 1
      : null;
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

  return dependencies.createPayment({
    userId: input.userId,
    plan: input.plan,
    chain,
    toAddress: paymentAddress.address,
    expectedAmount,
    expectedAsset: CHAIN_TO_ASSET[chain],
    usdAmount: usdAmount.toFixed(2),
    destinationTag,
    status: "pending",
    expiresAt,
  });
}

export function toPendingCryptoPaymentJson(payment: {
  id: string;
  status: string;
  expectedAmount: string;
  expectedAsset: string;
  toAddress: string;
  destinationTag?: number | null;
}) {
  return {
    id: payment.id,
    status: "pending" as const,
    expectedAmount: payment.expectedAmount,
    expectedAsset: payment.expectedAsset,
    toAddress: payment.toAddress,
    ...(payment.destinationTag != null
      ? { destinationTag: payment.destinationTag }
      : {}),
  };
}