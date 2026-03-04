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

export const SOIL_VAULTS = [
  {
    id: "soil-treasury",
    name: "Soil Treasury Vault",
    description: "US Treasury-backed fixed yield",
    apr: 5.2,
    backing: "US Treasuries",
    address: "rSoiLTreasuryVaultXXXXXXXXXXXXXX",
    minDeposit: 10,
    totalDeposited: 2_450_000,
  },
  {
    id: "soil-private-credit",
    name: "Soil Private Credit Vault",
    description: "Private credit RWA-backed yield",
    apr: 7.8,
    backing: "Private Credit",
    address: "rSoiLPrivateCreditVaultXXXXXXXXXX",
    minDeposit: 50,
    totalDeposited: 1_120_000,
  },
];

export const SOIL_REFERRAL_CODE = "OWNBANK2026";
export const SOIL_REFERRAL_URL = `https://xrpl.soil.co/?af=${SOIL_REFERRAL_CODE}`;

export const AFFILIATE_LINKS = {
  binance: "https://www.binance.com/en/register?ref=YOUR_BINANCE_REF",
  kraken: "https://www.kraken.com/sign-up?ref=YOUR_KRAKEN_REF",
  coinbase: "https://www.coinbase.com/join/YOUR_COINBASE_REF",
};
