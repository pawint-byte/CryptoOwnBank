import { Client } from "xrpl";

let xrplClient: Client | null = null;
let connectionPromise: Promise<void> | null = null;

const XRPL_SERVER = "wss://xrplcluster.com";
const RLUSD_CURRENCY = "524C555344000000000000000000000000000000";
const RLUSD_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";

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
  destination: string;
  source: string;
  date: string;
  status: string;
  fee: string;
}

export async function getAccountTransactions(
  address: string,
  limit: number = 20
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
      if (typeof txData.Amount === "string") {
        amount = (Number(txData.Amount) / 1_000_000).toFixed(6);
        currency = "XRP";
      } else if (txData.Amount && typeof txData.Amount === "object") {
        amount = txData.Amount.value || "0";
        currency =
          txData.Amount.currency === RLUSD_CURRENCY
            ? "RLUSD"
            : txData.Amount.currency || "Unknown";
      }

      return {
        hash: txData.hash || tx.hash || "",
        type: txData.TransactionType || "Unknown",
        amount,
        currency,
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

export const SOIL_VAULT_ADDRESS = "rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX";

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
    address: SOIL_VAULT_ADDRESS,
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
    address: SOIL_VAULT_ADDRESS,
    minDeposit: 50,
    totalDeposited: 1_120_000,
  },
];

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
          src === SOIL_VAULT_ADDRESS || dest === SOIL_VAULT_ADDRESS;
        if (!isSoilRelated) continue;

        let amount = 0;
        let currency = "Unknown";
        if (typeof txData.Amount === "object" && txData.Amount) {
          amount = parseFloat(txData.Amount.value || "0");
          currency =
            txData.Amount.currency === RLUSD_CURRENCY
              ? "RLUSD"
              : txData.Amount.currency || "Unknown";
        } else if (typeof txData.Amount === "string") {
          amount = Number(txData.Amount) / 1_000_000;
          currency = "XRP";
        }

        if (amount <= 0) continue;

        const rippleEpoch = 946684800;
        const date = txData.date
          ? new Date((txData.date + rippleEpoch) * 1000).toISOString()
          : "";

        const isDeposit = dest === SOIL_VAULT_ADDRESS;

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
