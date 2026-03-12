import { Client, type SubscribeRequest } from "xrpl";
import { storage } from "../storage";
import { db } from "../db";
import { priceCache as priceCacheTable } from "@shared/schema";
import { eq } from "drizzle-orm";
import { setSharedXrplClient, resolveWalletLabels } from "./wallet-identity-resolver";

const XRPL_SERVERS = [
  "wss://xrplcluster.com",
  "wss://s1.ripple.com",
  "wss://s2.ripple.com",
];

const RLUSD_CURRENCY_HEX = "524C555344000000000000000000000000000000";
const RLUSD_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";

const CAPTURE_XRP_THRESHOLD = 100_000;
const CAPTURE_RLUSD_THRESHOLD = 10_000;

let whaleClient: Client | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;

function parseAmount(amountField: any): { amount: number; currency: string } | null {
  if (!amountField) return null;
  if (typeof amountField === "string") {
    return { amount: Number(amountField) / 1_000_000, currency: "XRP" };
  }
  if (typeof amountField === "object") {
    const isRlusd =
      amountField.currency === RLUSD_CURRENCY_HEX &&
      amountField.issuer === RLUSD_ISSUER;
    const currency = isRlusd ? "RLUSD" : amountField.currency;
    return { amount: parseFloat(amountField.value || "0"), currency };
  }
  return null;
}

async function getXrpUsdPrice(): Promise<number> {
  try {
    const [cached] = await db.select().from(priceCacheTable).where(eq(priceCacheTable.symbol, "XRP"));
    if (cached) return Number(cached.priceUsd);
  } catch {}
  return 0;
}

async function handleTransaction(tx: any) {
  try {
    const txData = tx.transaction || tx;
    const meta = tx.meta || {};

    if (txData.TransactionType !== "Payment") return;
    if (meta.TransactionResult && meta.TransactionResult !== "tesSUCCESS") return;

    const delivered = meta.delivered_amount || txData.Amount;
    const parsed = parseAmount(delivered);
    if (!parsed) return;

    const { amount, currency } = parsed;

    if (currency === "XRP" && amount < CAPTURE_XRP_THRESHOLD) return;
    if (currency === "RLUSD" && amount < CAPTURE_RLUSD_THRESHOLD) return;
    if (currency !== "XRP" && currency !== "RLUSD") return;

    const rippleEpoch = 946684800;
    const timestamp = txData.date
      ? new Date((txData.date + rippleEpoch) * 1000)
      : new Date();

    let usdValue: string | undefined;
    if (currency === "XRP") {
      const price = await getXrpUsdPrice();
      if (price > 0) usdValue = (amount * price).toFixed(2);
    } else if (currency === "RLUSD") {
      usdValue = amount.toFixed(2);
    }

    const hash = txData.hash || tx.hash || "";
    if (!hash) return;

    const sender = txData.Account || "";
    const receiver = txData.Destination || "";

    let senderLabel: string | null = null;
    let receiverLabel: string | null = null;
    try {
      const labels = await resolveWalletLabels(sender, receiver);
      senderLabel = labels.senderLabel;
      receiverLabel = labels.receiverLabel;
    } catch (resolveErr: unknown) {
      console.error("[whale-monitor] Label resolution failed:", resolveErr instanceof Error ? resolveErr.message : String(resolveErr));
    }

    await storage.createWhaleAlert({
      txHash: hash,
      amount: amount.toString(),
      currency,
      senderAddress: sender,
      receiverAddress: receiver,
      senderLabel,
      receiverLabel,
      usdValue: usdValue || null,
      timestamp,
    });

    const senderInfo = senderLabel ? `${senderLabel} (${sender.slice(0, 8)}...)` : `${sender.slice(0, 12)}...`;
    const receiverInfo = receiverLabel ? `${receiverLabel} (${receiver.slice(0, 8)}...)` : `${receiver.slice(0, 12)}...`;
    console.log(`[whale-monitor] Detected ${currency} whale: ${amount.toLocaleString()} ${currency} ($${usdValue || "?"}) ${senderInfo} -> ${receiverInfo} - ${hash.slice(0, 12)}...`);
  } catch (err: any) {
    if (!err?.message?.includes("duplicate key")) {
      console.error("[whale-monitor] Error processing transaction:", err?.message);
    }
  }
}

async function connectAndSubscribe() {
  for (const server of XRPL_SERVERS) {
    try {
      whaleClient = new Client(server);
      await whaleClient.connect();

      const subscribeReq: SubscribeRequest = {
        command: "subscribe",
        streams: ["transactions"],
      };
      await whaleClient.request(subscribeReq);

      whaleClient.on("transaction", (tx: any) => {
        handleTransaction(tx).catch(() => {});
      });

      whaleClient.on("disconnected", () => {
        console.log("[whale-monitor] Disconnected, will reconnect in 30s");
        scheduleReconnect();
      });

      setSharedXrplClient(whaleClient);
      console.log(`[whale-monitor] Connected to ${server}, monitoring whale transactions`);
      return;
    } catch (err: any) {
      console.error(`[whale-monitor] Failed to connect to ${server}:`, err?.message);
      if (whaleClient) {
        try { await whaleClient.disconnect(); } catch {}
        whaleClient = null;
      }
    }
  }
  console.error("[whale-monitor] All servers failed, retrying in 60s");
  scheduleReconnect(60_000);
}

function scheduleReconnect(delay = 30_000) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    if (isRunning) {
      connectAndSubscribe().catch((err) => {
        console.error("[whale-monitor] Reconnect failed:", err?.message);
        scheduleReconnect(60_000);
      });
    }
  }, delay);
}

export function startWhaleMonitor() {
  if (isRunning) return;
  isRunning = true;
  console.log("[whale-monitor] Starting whale transaction monitor");
  connectAndSubscribe().catch((err) => {
    console.error("[whale-monitor] Initial connection failed:", err?.message);
    scheduleReconnect(10_000);
  });
}

export function stopWhaleMonitor() {
  isRunning = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (whaleClient) {
    whaleClient.disconnect().catch(() => {});
    whaleClient = null;
  }
}
