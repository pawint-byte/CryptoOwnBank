import { storage } from "../storage";
import type { CryptoPayment } from "@shared/schema";

const CHAIN_TO_ASSET: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  xrp: "XRP",
  dogecoin: "DOGE",
  litecoin: "LTC",
  cardano: "ADA",
  avalanche: "AVAX",
  algorand: "ALGO",
  cosmos: "ATOM",
  tron: "TRX",
  hedera: "HBAR",
  polkadot: "DOT",
  vechain: "VET",
  stellar: "XLM",
  ton: "TON",
  polygon: "MATIC",
  cronos: "CRO",
  xdc: "XDC",
};

async function checkXrpPayment(payment: CryptoPayment): Promise<{ found: boolean; txHash?: string }> {
  try {
    const res = await fetch("https://xrplcluster.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "account_tx",
        params: [{
          account: payment.toAddress,
          limit: 20,
          forward: false,
        }],
      }),
    });
    const data = await res.json();
    const txs = data?.result?.transactions || [];

    for (const entry of txs) {
      const tx = entry.tx || entry.tx_json;
      const meta = entry.meta;
      if (!tx || !meta) continue;
      if (tx.TransactionType !== "Payment") continue;
      if (meta.TransactionResult !== "tesSUCCESS") continue;

      if (tx.Destination !== payment.toAddress) continue;

      if (payment.destinationTag && tx.DestinationTag !== payment.destinationTag) continue;

      const deliveredStr = typeof meta.delivered_amount === "string"
        ? meta.delivered_amount
        : meta.delivered_amount?.value;
      if (!deliveredStr) continue;

      const deliveredDrops = typeof meta.delivered_amount === "string"
        ? parseFloat(meta.delivered_amount)
        : parseFloat(meta.delivered_amount.value) * 1_000_000;

      const expectedDrops = parseFloat(payment.expectedAmount) * 1_000_000;
      const tolerance = 1000;

      if (Math.abs(deliveredDrops - expectedDrops) <= tolerance) {
        const txDate = new Date((tx.date + 946684800) * 1000);
        if (txDate >= (payment.createdAt || new Date(0))) {
          return { found: true, txHash: tx.hash };
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] XRP check error:", err);
  }
  return { found: false };
}

async function checkBtcPayment(payment: CryptoPayment): Promise<{ found: boolean; txHash?: string }> {
  try {
    const res = await fetch(`https://blockchain.info/rawaddr/${payment.toAddress}?limit=10`);
    if (!res.ok) return { found: false };
    const data = await res.json();

    for (const tx of data.txs || []) {
      const txTime = new Date(tx.time * 1000);
      if (txTime < (payment.createdAt || new Date(0))) continue;

      for (const out of tx.out || []) {
        if (out.addr !== payment.toAddress) continue;
        const btcAmount = out.value / 1e8;
        const expected = parseFloat(payment.expectedAmount);
        if (Math.abs(btcAmount - expected) <= 0.000001) {
          return { found: true, txHash: tx.hash };
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] BTC check error:", err);
  }
  return { found: false };
}

async function checkEthPayment(payment: CryptoPayment): Promise<{ found: boolean; txHash?: string }> {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY || "";
    const keyParam = apiKey ? `&apikey=${apiKey}` : "";
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${payment.toAddress}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc${keyParam}`;

    const res = await fetch(url);
    if (!res.ok) return { found: false };
    const data = await res.json();

    if (data.status !== "1" || !Array.isArray(data.result)) return { found: false };

    for (const tx of data.result) {
      if (tx.isError === "1") continue;
      if (tx.to?.toLowerCase() !== payment.toAddress.toLowerCase()) continue;

      const txTime = new Date(parseInt(tx.timeStamp) * 1000);
      if (txTime < (payment.createdAt || new Date(0))) continue;

      const ethAmount = parseFloat(tx.value) / 1e18;
      const expected = parseFloat(payment.expectedAmount);
      if (expected > 0 && Math.abs(ethAmount - expected) <= 0.00001) {
        return { found: true, txHash: tx.hash };
      }
    }
  } catch (err) {
    console.error("[crypto-verify] ETH check error:", err);
  }
  return { found: false };
}

async function checkSolPayment(payment: CryptoPayment): Promise<{ found: boolean; txHash?: string }> {
  try {
    const sigRes = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSignaturesForAddress",
        params: [payment.toAddress, { limit: 10 }],
      }),
    });
    const sigData = await sigRes.json();
    const signatures = sigData?.result || [];

    for (const sig of signatures) {
      if (sig.err) continue;
      const sigTime = new Date(sig.blockTime * 1000);
      if (sigTime < (payment.createdAt || new Date(0))) continue;

      const txRes = await fetch("https://api.mainnet-beta.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTransaction",
          params: [sig.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
        }),
      });
      const txData = await txRes.json();
      const tx = txData?.result;
      if (!tx?.meta) continue;

      const preBalances = tx.meta.preBalances || [];
      const postBalances = tx.meta.postBalances || [];
      const accounts = tx.transaction?.message?.accountKeys || [];

      for (let i = 0; i < accounts.length; i++) {
        const pubkey = typeof accounts[i] === "string" ? accounts[i] : accounts[i].pubkey;
        if (pubkey === payment.toAddress) {
          const received = (postBalances[i] - preBalances[i]) / 1e9;
          const expected = parseFloat(payment.expectedAmount);
          if (received > 0 && expected > 0 && Math.abs(received - expected) <= 0.0001) {
            return { found: true, txHash: sig.signature };
          }
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] SOL check error:", err);
  }
  return { found: false };
}

const SUPPORTED_CHAINS = new Set(["xrp", "bitcoin", "ethereum", "solana"]);

const CHAIN_CHECKERS: Record<string, (p: CryptoPayment) => Promise<{ found: boolean; txHash?: string }>> = {
  xrp: checkXrpPayment,
  bitcoin: checkBtcPayment,
  ethereum: checkEthPayment,
  solana: checkSolPayment,
};

async function activateSubscription(payment: CryptoPayment) {
  const billingCycle = payment.plan === "yearly" ? "yearly" : "monthly";
  const existing = await storage.getUserSettings(payment.userId);
  await storage.upsertUserSettings({
    userId: payment.userId,
    subscriptionTier: "premium",
    subscriptionBillingCycle: billingCycle,
    stripeCustomerId: existing?.stripeCustomerId || null,
    stripeSubscriptionId: existing?.stripeSubscriptionId || null,
    autoWithdrawEnabled: existing?.autoWithdrawEnabled ?? false,
    autoWithdrawWallet: existing?.autoWithdrawWallet || null,
  });
  console.log(`[crypto-verify] Activated ${billingCycle} premium for user ${payment.userId} via ${payment.chain} payment ${payment.id}`);
}

async function verifyPendingPayments() {
  const pending = await storage.getPendingCryptoPayments();
  const now = new Date();

  for (const payment of pending) {
    if (payment.expiresAt && new Date(payment.expiresAt) < now) {
      await storage.updateCryptoPaymentStatus(payment.id, "expired");
      console.log(`[crypto-verify] Payment ${payment.id} expired`);
      continue;
    }

    const checker = CHAIN_CHECKERS[payment.chain];
    if (!checker) {
      console.warn(`[crypto-verify] No verifier for chain ${payment.chain}, skipping payment ${payment.id}`);
      continue;
    }

    const result = await checker(payment);

    if (result.found) {
      if (result.txHash) {
        const existingPayments = await storage.getPendingCryptoPayments();
        const allPayments = [...existingPayments, ...(await storage.getCryptoPaymentsByUser(payment.userId))];
        const alreadyClaimed = allPayments.some(
          (p) => p.id !== payment.id && p.txHash === result.txHash && p.status === "confirmed"
        );
        if (alreadyClaimed) {
          console.warn(`[crypto-verify] txHash ${result.txHash} already claimed, skipping payment ${payment.id}`);
          continue;
        }
      }
      await storage.updateCryptoPaymentStatus(payment.id, "confirmed", result.txHash);
      await activateSubscription(payment);
    }
  }
}

let verifierInterval: ReturnType<typeof setInterval> | null = null;

export function startCryptoPaymentVerifier() {
  if (verifierInterval) return;
  verifierInterval = setInterval(async () => {
    try {
      await verifyPendingPayments();
    } catch (err) {
      console.error("[crypto-verify] Verifier error:", err);
    }
  }, 60_000);
  console.log("[crypto-verify] Payment verifier started (runs every 60 seconds)");
}

export function stopCryptoPaymentVerifier() {
  if (verifierInterval) {
    clearInterval(verifierInterval);
    verifierInterval = null;
  }
}
