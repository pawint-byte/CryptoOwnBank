import { Client } from "xrpl";

let xrplClient: Client | null = null;
let connectionPromise: Promise<void> | null = null;

const XRPL_SERVER = "wss://xrplcluster.com";
import { RLUSD } from "@/lib/constants";
const RLUSD_CURRENCY = RLUSD.currency;
const RLUSD_ISSUER = RLUSD.issuer;

async function getClient(): Promise<Client> {
  if (xrplClient && xrplClient.isConnected()) {
    return xrplClient;
  }

  if (connectionPromise) {
    await connectionPromise;
    if (xrplClient && xrplClient.isConnected()) {
      return xrplClient;
    }
  }

  xrplClient = new Client(XRPL_SERVER);
  connectionPromise = xrplClient.connect();
  await connectionPromise;
  connectionPromise = null;
  return xrplClient;
}

export async function disconnectClient(): Promise<void> {
  if (xrplClient && xrplClient.isConnected()) {
    await xrplClient.disconnect();
  }
  xrplClient = null;
  connectionPromise = null;
}

export interface XrplBalances {
  xrp: number;
  rlusd: number;
}

export async function getBalances(address: string): Promise<XrplBalances> {
  try {
    const client = await getClient();
    const response = await client.request({
      command: "account_info",
      account: address,
      ledger_index: "validated",
    });

    const xrpDrops = response.result.account_data.Balance;
    const xrp = Number(xrpDrops) / 1_000_000;

    let rlusd = 0;
    try {
      const lines = await client.request({
        command: "account_lines",
        account: address,
        ledger_index: "validated",
      });

      const rlusdLine = lines.result.lines.find(
        (line: any) =>
          line.currency === RLUSD_CURRENCY || line.currency === "RLUSD"
      );
      if (rlusdLine) {
        rlusd = Math.max(0, Number(rlusdLine.balance));
      }
    } catch {
    }

    return { xrp, rlusd };
  } catch (error: any) {
    if (error?.data?.error === "actNotFound") {
      return { xrp: 0, rlusd: 0 };
    }
    throw error;
  }
}

export interface XrplTransaction {
  hash: string;
  type: string;
  amount: string;
  currency: string;
  amount2: string;
  currency2: string;
  destination: string;
  source: string;
  date: string;
  status: string;
  fee: string;
}

function parseXrplAmount(amountField: any): { amount: string; currency: string } {
  if (!amountField) return { amount: "0", currency: "" };
  if (typeof amountField === "string") {
    return {
      amount: (Number(amountField) / 1_000_000).toFixed(6),
      currency: "XRP",
    };
  }
  if (typeof amountField === "object") {
    return {
      amount: amountField.value || "0",
      currency: amountField.currency === RLUSD_CURRENCY ? "RLUSD" : (amountField.currency || "Unknown"),
    };
  }
  return { amount: "0", currency: "" };
}

export async function getAccountTransactions(
  address: string,
  limit: number = 50
): Promise<XrplTransaction[]> {
  try {
    const client = await getClient();
    const response = await client.request({
      command: "account_tx",
      account: address,
      limit,
      ledger_index_min: -1,
      ledger_index_max: -1,
    });

    return (response.result.transactions || []).map((tx: any) => {
      const txData = tx.tx || tx.tx_json || {};
      const meta = tx.meta || {};
      const rippleEpoch = 946684800;
      const date = txData.date
        ? new Date((txData.date + rippleEpoch) * 1000).toISOString()
        : "";

      let amount = "0";
      let currency = "XRP";
      let amount2 = "";
      let currency2 = "";
      const txType = txData.TransactionType || "Unknown";

      if (txType === "Payment") {
        const delivered = meta.delivered_amount || txData.Amount;
        const parsed = parseXrplAmount(delivered);
        amount = parsed.amount;
        currency = parsed.currency;
      } else if (txType === "OfferCreate") {
        const gets = parseXrplAmount(txData.TakerGets);
        const pays = parseXrplAmount(txData.TakerPays);
        if (txData.Account === address) {
          amount = gets.amount;
          currency = gets.currency;
          amount2 = pays.amount;
          currency2 = pays.currency;
        } else {
          amount = pays.amount;
          currency = pays.currency;
          amount2 = gets.amount;
          currency2 = gets.currency;
        }
      } else if (txType === "TrustSet") {
        const limitAmount = txData.LimitAmount;
        if (limitAmount && typeof limitAmount === "object") {
          amount = limitAmount.value || "0";
          currency = limitAmount.currency === RLUSD_CURRENCY ? "RLUSD" : (limitAmount.currency || "");
        }
      } else if (txType === "OfferCancel") {
        amount = "0";
        currency = "";
      } else {
        const parsed = parseXrplAmount(txData.Amount);
        amount = parsed.amount;
        currency = parsed.currency;
      }

      return {
        hash: txData.hash || tx.hash || "",
        type: txType,
        amount,
        currency,
        amount2,
        currency2,
        destination: txData.Destination || "",
        source: txData.Account || "",
        date,
        status:
          meta.TransactionResult === "tesSUCCESS" ? "Success" : "Failed",
        fee: txData.Fee
          ? (Number(txData.Fee) / 1_000_000).toFixed(6)
          : "0",
      };
    });
  } catch {
    return [];
  }
}

export async function getXrpPrice(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd"
    );
    const data = await response.json();
    return data.ripple?.usd || 0;
  } catch {
    return 0;
  }
}

export function calculateAccruedInterest(
  principal: number,
  apr: number,
  depositDateStr: string
): number {
  const depositDate = new Date(depositDateStr);
  const now = new Date();
  const daysDiff =
    (now.getTime() - depositDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff <= 0) return 0;
  return principal * (apr / 100) * (daysDiff / 365);
}

export const SOIL_VAULT_ADDRESSES = [
  "rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX",
  "rnvp6FiucXE7kjR8LKRocosWmg8pGhFZa8",
];
export const SOIL_VAULT_ADDRESS = SOIL_VAULT_ADDRESSES[0];

export const SOIL_VAULTS = [
  {
    id: "soil-treasury",
    name: "Soil Treasury Vault",
    description: "US Treasury-backed fixed yield",
    apr: 5.2,
    backing: "US Treasuries",
    riskLevel: "Lower risk",
    withdrawalTerms: "3-day rolling withdrawal",
    bestFor: "Users who want stability and quicker access to funds",
    address: "rnvp6FiucXE7kjR8LKRocosWmg8pGhFZa8",
    minDeposit: 10,
    totalDeposited: 2_450_000,
  },
  {
    id: "soil-credit-plus",
    name: "Soil CREDIT+ Vault",
    description: "Private credit RWA-backed yield",
    apr: 8.0,
    backing: "Private Credit",
    riskLevel: "Higher risk",
    withdrawalTerms: "90-day notice + 10-day cooldown",
    bestFor: "Users willing to lock funds longer for higher returns",
    address: "rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX",
    minDeposit: 50,
    totalDeposited: 1_120_000,
  },
];

export const DOPPLER_ADDRESSES = {
  deposit: "rEPQxsSVER2r4HeVR4APrVCB45K68rqgp2",
  treasury: "rprFy94qJB5riJpMmnPDp3ttmVKfcrFiuq",
  withdrawal: "rGuVpUBfprkb1cmKFGbL8c48fQWT3xEwyZ",
};

export const DOPPLER_VAULTS = [
  {
    id: "doppler-xrp",
    name: "Doppler XRP Vault",
    description: "Market-neutral XRP yield strategy via Doppler Finance",
    apr: 3.2,
    backing: "Market-Neutral Strategies",
    riskLevel: "Medium risk",
    withdrawalTerms: "7-day withdrawal period",
    bestFor: "XRP holders who want to earn yield without selling",
    asset: "XRP",
    provider: "Doppler Finance",
    custodyNote: "Fireblocks + Ceffu (MirrorX) custody with on-chain proof-of-reserve",
    depositUrl: "https://app.doppler.finance/vaults",
    docsUrl: "https://docs.doppler.finance/user-guide/doppler-vaults",
    xamanBlogUrl: "https://xaman.app/blog/doppler",
    depositAddress: "rEPQxsSVER2r4HeVR4APrVCB45K68rqgp2",
    treasuryAddress: "rprFy94qJB5riJpMmnPDp3ttmVKfcrFiuq",
    withdrawalAddress: "rGuVpUBfprkb1cmKFGbL8c48fQWT3xEwyZ",
  },
];

export const DOPPLER_APP_URL = "https://app.doppler.finance/vaults";

export const BLEND_VAULTS = [
  {
    id: "blend-fixed-xlm",
    poolKey: "FIXEDXLM",
    name: "Blend Fixed XLM Pool",
    description: "Supply XLM or USDC on Stellar Soroban to earn lending interest. Non-custodial.",
    network: "Stellar (Soroban)",
    assets: ["XLM", "USDC"],
    riskLevel: "Medium risk",
    withdrawalTerms: "Liquidity-dependent (typically immediate)",
    bestFor: "Stellar holders who want non-custodial yield on XLM or USDC",
    provider: "Blend Capital",
    custodyNote: "Non-custodial Soroban smart contract. You retain control of your assets via Freighter or other Stellar wallets.",
    depositUrl: "https://mainnet.blend.capital",
    docsUrl: "https://docs.blend.capital",
  },
];

export const BLEND_APP_URL = "https://mainnet.blend.capital";

export interface SoilTransaction {
  hash: string;
  type: "deposit" | "interest";
  amount: number;
  currency: string;
  date: string;
  fee: string;
  status: string;
}

export async function getSoilTransactions(
  address: string
): Promise<SoilTransaction[]> {
  try {
    const client = await getClient();
    const soilTxns: SoilTransaction[] = [];
    let marker: any = undefined;
    let hasMore = true;

    while (hasMore) {
      const request: any = {
        command: "account_tx",
        account: address,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit: 100,
      };
      if (marker) request.marker = marker;

      const response = await client.request(request);
      const txs = response.result.transactions || [];

      for (const tx of txs) {
        const txData = tx.tx || tx.tx_json || {};
        const meta = tx.meta || {};

        if (meta.TransactionResult !== "tesSUCCESS") continue;
        if (txData.TransactionType !== "Payment") continue;

        const src = txData.Account || "";
        const dest = txData.Destination || "";
        const isSoilRelated =
          SOIL_VAULT_ADDRESSES.includes(src) || SOIL_VAULT_ADDRESSES.includes(dest);
        if (!isSoilRelated) continue;

        let amount = 0;
        let currency = "Unknown";
        const deliveredAmount = meta.delivered_amount || txData.Amount;
        if (typeof deliveredAmount === "object" && deliveredAmount) {
          amount = parseFloat(deliveredAmount.value || "0");
          currency =
            deliveredAmount.currency === RLUSD_CURRENCY
              ? "RLUSD"
              : deliveredAmount.currency || "Unknown";
        } else if (typeof deliveredAmount === "string") {
          amount = Number(deliveredAmount) / 1_000_000;
          currency = "XRP";
        }

        if (amount <= 0) continue;

        const rippleEpoch = 946684800;
        const date = txData.date
          ? new Date((txData.date + rippleEpoch) * 1000).toISOString()
          : "";

        const isDeposit = SOIL_VAULT_ADDRESSES.includes(dest);

        soilTxns.push({
          hash: txData.hash || (tx as any).hash || "",
          type: isDeposit ? "deposit" : "interest",
          amount,
          currency,
          date,
          fee: txData.Fee
            ? (Number(txData.Fee) / 1_000_000).toFixed(6)
            : "0",
          status: "Success",
        });
      }

      marker = response.result.marker;
      hasMore = !!marker;
    }

    return soilTxns.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  } catch {
    return [];
  }
}

export interface XrplTrustline {
  currency: string;
  issuer: string;
  balance: string;
  limit: string;
  quality_in: number;
  quality_out: number;
  no_ripple: boolean;
  freeze: boolean;
}

export async function getAccountTrustlines(address: string): Promise<XrplTrustline[]> {
  try {
    const client = await getClient();
    const trustlines: XrplTrustline[] = [];
    let marker: any = undefined;
    let hasMore = true;

    while (hasMore) {
      const request: any = {
        command: "account_lines",
        account: address,
        ledger_index: "validated",
        limit: 200,
      };
      if (marker) request.marker = marker;

      const response = await client.request(request);
      const lines = (response.result as any).lines || [];

      for (const line of lines) {
        trustlines.push({
          currency: line.currency === RLUSD_CURRENCY ? "RLUSD" : line.currency,
          issuer: line.account,
          balance: line.balance,
          limit: line.limit,
          quality_in: line.quality_in || 0,
          quality_out: line.quality_out || 0,
          no_ripple: !!line.no_ripple,
          freeze: !!line.freeze,
        });
      }

      marker = (response.result as any).marker;
      hasMore = !!marker;
    }

    return trustlines;
  } catch (error: any) {
    if (error?.data?.error === "actNotFound") {
      return [];
    }
    throw error;
  }
}

export interface XrplOffer {
  seq: number;
  flags: number;
  takerGets: { amount: string; currency: string; issuer?: string };
  takerPays: { amount: string; currency: string; issuer?: string };
  quality: string;
  expiration?: number;
}

export async function getAccountOffers(address: string): Promise<XrplOffer[]> {
  try {
    const client = await getClient();
    const offers: XrplOffer[] = [];
    let marker: any = undefined;
    let hasMore = true;

    while (hasMore) {
      const request: any = {
        command: "account_offers",
        account: address,
        ledger_index: "validated",
        limit: 200,
      };
      if (marker) request.marker = marker;

      const response = await client.request(request);
      const rawOffers = (response.result as any).offers || [];

      for (const offer of rawOffers) {
        offers.push({
          seq: offer.seq,
          flags: offer.flags || 0,
          takerGets: parseXrplAmount(offer.taker_gets),
          takerPays: parseXrplAmount(offer.taker_pays),
          quality: offer.quality || "0",
          expiration: offer.expiration,
        });
      }

      marker = (response.result as any).marker;
      hasMore = !!marker;
    }

    return offers;
  } catch (error: any) {
    if (error?.data?.error === "actNotFound") {
      return [];
    }
    throw error;
  }
}

export interface OrderBookEntry {
  account: string;
  amount: string;
  price: string;
  totalCurrency: string;
  totalAmount: string;
  quality: string;
}

export interface OrderBookResult {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export async function getOrderBook(
  base: { currency: string; issuer?: string },
  counter: { currency: string; issuer?: string },
  limit: number = 20
): Promise<OrderBookResult> {
  try {
    const client = await getClient();

    const formatCurrency = (c: { currency: string; issuer?: string }) => {
      if (c.currency === "XRP") return { currency: "XRP" };
      return { currency: c.currency, issuer: c.issuer };
    };

    const [asksResponse, bidsResponse] = await Promise.all([
      client.request({
        command: "book_offers",
        taker_gets: formatCurrency(base) as any,
        taker_pays: formatCurrency(counter) as any,
        limit,
        ledger_index: "validated",
      }),
      client.request({
        command: "book_offers",
        taker_gets: formatCurrency(counter) as any,
        taker_pays: formatCurrency(base) as any,
        limit,
        ledger_index: "validated",
      }),
    ]);

    const parseOfferEntry = (offer: any): OrderBookEntry => {
      const gets = parseXrplAmount(offer.TakerGets);
      const pays = parseXrplAmount(offer.TakerPays);
      const getsNum = parseFloat(gets.amount) || 0;
      const paysNum = parseFloat(pays.amount) || 0;
      const price = getsNum > 0 ? (paysNum / getsNum).toString() : "0";

      return {
        account: offer.Account || "",
        amount: gets.amount,
        price,
        totalCurrency: pays.currency,
        totalAmount: pays.amount,
        quality: offer.quality || "0",
      };
    };

    const asks = ((asksResponse.result as any).offers || []).map(parseOfferEntry);
    const bids = ((bidsResponse.result as any).offers || []).map(parseOfferEntry);

    return { bids, asks };
  } catch {
    return { bids: [], asks: [] };
  }
}

export const SOIL_REFERRAL_CODE = "OWNBANK2026";
export const SOIL_REFERRAL_URL = `https://xrpl.soil.co/?af=${SOIL_REFERRAL_CODE}`;

export const AFFILIATE_LINKS = {
  binance: "https://binance.us/universal_JHHGDSKDJ/auth/registration?ref=53969196",
  kraken: "https://proinvite.kraken.com/9f1e/oya30ft6",
  coinbase: "https://coinbase.com/join/TT3HJ4K?src=ios-link",
  cryptoCom: "https://crypto.com/app/24csm6d4km",
  uphold: "https://wallet.uphold.com/signup?referral=6dacaf8d55&campaign=uw_p_d_w_acq_raf&utm_source=raf&utm_medium=referafriend",
};

export const WALLET_AFFILIATE_LINKS = [
  {
    name: "Cypherock",
    url: "https://cypherock.com/store/?ref=PETER.WINT",
    color: "bg-orange-500/10 border-orange-500/20",
    iconColor: "text-orange-600 dark:text-orange-400",
    description: "Supports XRP & XRPL tokens (RLUSD). No seed phrase — keys split across 4 cards + 1 vault. If you lose a card, you can still recover with any 2 of the 5 pieces.",
    safety: "No seed phrase to steal or lose",
  },
  {
    name: "ELLIPAL",
    url: "https://www.ellipal.com/?rfsn=9012773.864657d",
    color: "bg-slate-500/10 border-slate-500/20",
    iconColor: "text-slate-600 dark:text-slate-400",
    description: "Supports XRP & XRPL tokens (RLUSD). 100% air-gapped — no USB, WiFi, or Bluetooth connection. Signs transactions via QR code only, so your keys never touch the internet.",
    safety: "Fully air-gapped — zero online exposure",
  },
  {
    name: "Ledger",
    url: "https://shop.ledger.com/pages/referral-program?referral_code=H7DFZEAP8RPK4",
    color: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    description: "Supports XRP & XRPL tokens (RLUSD). Industry-leading hardware wallet with Bluetooth (Nano X) or USB (Nano S Plus). Pairs with Xaman for seamless XRPL transaction signing.",
    safety: "Secure Element chip — keys never leave the device",
  },
];
