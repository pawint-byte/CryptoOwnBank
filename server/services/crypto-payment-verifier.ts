import { storage } from "../storage";
import type { CryptoPayment } from "@shared/schema";
import { ADMIN_EMAILS } from "@shared/constants";
import { sendCryptoPaymentReceivedEmail, sendPremiumWelcomeEmail } from "../email";

const CHAIN_TO_ASSET: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  xrp: "XRP",
  rlusd: "RLUSD",
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
  digibyte: "DGB",
  casper: "CSPR",
  nervos: "CKB",
  zilliqa: "ZIL",
  verge: "XVG",
};

type CheckResult = { found: boolean; txHash?: string };

async function safeFetch(url: string, opts?: RequestInit): Promise<Response | null> {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(15000) });
    return res;
  } catch {
    return null;
  }
}

function amountMatch(actual: number, expected: number, tolerance: number): boolean {
  return expected > 0 && Math.abs(actual - expected) <= tolerance;
}

function afterCreation(txTimestamp: number, payment: CryptoPayment): boolean {
  const created = payment.createdAt ? new Date(payment.createdAt).getTime() / 1000 : 0;
  return txTimestamp >= created - 60;
}

// ─── XRP (native) ───
async function checkXrpPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch("https://xrplcluster.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "account_tx",
        params: [{ account: payment.toAddress, limit: 20, forward: false }],
      }),
    });
    if (!res) return { found: false };
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

      if (typeof meta.delivered_amount !== "string") continue;

      const deliveredDrops = parseFloat(meta.delivered_amount);
      const expectedDrops = parseFloat(payment.expectedAmount) * 1_000_000;
      if (amountMatch(deliveredDrops, expectedDrops, 1000)) {
        const txDate = (tx.date + 946684800);
        if (afterCreation(txDate, payment)) {
          return { found: true, txHash: tx.hash };
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] XRP check error:", err);
  }
  return { found: false };
}

// ─── RLUSD (XRPL issued token) ───
const RLUSD_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";

async function checkRlusdPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch("https://xrplcluster.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "account_tx",
        params: [{ account: payment.toAddress, limit: 20, forward: false }],
      }),
    });
    if (!res) return { found: false };
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

      const delivered = meta.delivered_amount;
      if (!delivered || typeof delivered === "string") continue;

      const curr = delivered.currency;
      if (curr !== "RLUSD" && curr !== "524C555344" && !curr.startsWith("524C555344")) continue;
      if (delivered.issuer !== RLUSD_ISSUER) continue;

      const deliveredAmount = parseFloat(delivered.value);
      const expectedAmount = parseFloat(payment.expectedAmount);
      if (amountMatch(deliveredAmount, expectedAmount, 0.01)) {
        const txDate = (tx.date + 946684800);
        if (afterCreation(txDate, payment)) {
          return { found: true, txHash: tx.hash };
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] RLUSD check error:", err);
  }
  return { found: false };
}

// ─── Bitcoin ───
async function checkBtcPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch(`https://blockchain.info/rawaddr/${payment.toAddress}?limit=10`);
    if (!res?.ok) return { found: false };
    const data = await res.json();

    for (const tx of data.txs || []) {
      if (!afterCreation(tx.time, payment)) continue;
      for (const out of tx.out || []) {
        if (out.addr !== payment.toAddress) continue;
        const btcAmount = out.value / 1e8;
        if (amountMatch(btcAmount, parseFloat(payment.expectedAmount), 0.000001)) {
          return { found: true, txHash: tx.hash };
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] BTC check error:", err);
  }
  return { found: false };
}

// ─── Ethereum ───
async function checkEthPayment(payment: CryptoPayment): Promise<CheckResult> {
  return checkEvmPayment(payment, "https://api.etherscan.io/api", process.env.ETHERSCAN_API_KEY, 18, "ETH");
}

// ─── EVM generic checker ───
async function checkEvmPayment(
  payment: CryptoPayment,
  baseUrl: string,
  apiKey: string | undefined,
  decimals: number,
  label: string
): Promise<CheckResult> {
  try {
    const keyParam = apiKey ? `&apikey=${apiKey}` : "";
    const url = `${baseUrl}?module=account&action=txlist&address=${payment.toAddress}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc${keyParam}`;

    const res = await safeFetch(url);
    if (!res?.ok) return { found: false };
    const data = await res.json();
    if (data.status !== "1" || !Array.isArray(data.result)) return { found: false };

    for (const tx of data.result) {
      if (tx.isError === "1") continue;
      if (tx.to?.toLowerCase() !== payment.toAddress.toLowerCase()) continue;
      if (!afterCreation(parseInt(tx.timeStamp), payment)) continue;

      const amount = parseFloat(tx.value) / Math.pow(10, decimals);
      if (amountMatch(amount, parseFloat(payment.expectedAmount), 0.00001)) {
        return { found: true, txHash: tx.hash };
      }
    }
  } catch (err) {
    console.error(`[crypto-verify] ${label} check error:`, err);
  }
  return { found: false };
}

// ─── Solana ───
async function checkSolPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const sigRes = await safeFetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "getSignaturesForAddress",
        params: [payment.toAddress, { limit: 10 }],
      }),
    });
    if (!sigRes) return { found: false };
    const sigData = await sigRes.json();

    for (const sig of sigData?.result || []) {
      if (sig.err) continue;
      if (!afterCreation(sig.blockTime, payment)) continue;

      const txRes = await safeFetch("https://api.mainnet-beta.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1,
          method: "getTransaction",
          params: [sig.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
        }),
      });
      if (!txRes) continue;
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
          if (received > 0 && amountMatch(received, parseFloat(payment.expectedAmount), 0.0001)) {
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

// ─── Polygon (EVM) ───
async function checkPolygonPayment(payment: CryptoPayment): Promise<CheckResult> {
  return checkEvmPayment(payment, "https://api.polygonscan.com/api", process.env.POLYGONSCAN_API_KEY, 18, "MATIC");
}

// ─── Avalanche C-Chain (EVM) ───
async function checkAvalanchePayment(payment: CryptoPayment): Promise<CheckResult> {
  return checkEvmPayment(payment, "https://api.snowtrace.io/api", process.env.SNOWTRACE_API_KEY, 18, "AVAX");
}

// ─── Cronos (EVM) ───
async function checkCronosPayment(payment: CryptoPayment): Promise<CheckResult> {
  return checkEvmPayment(payment, "https://api.cronoscan.com/api", process.env.CRONOSCAN_API_KEY, 18, "CRO");
}

// ─── XDC (EVM-compatible) ───
async function checkXdcPayment(payment: CryptoPayment): Promise<CheckResult> {
  return checkEvmPayment(payment, "https://xdc.blocksscan.io/api", undefined, 18, "XDC");
}

// ─── Dogecoin (BTC-like) ───
async function checkDogePayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch(`https://dogechain.info/api/v1/address/transactions/${payment.toAddress}/1`);
    if (!res?.ok) return { found: false };
    const data = await res.json();

    for (const tx of data.transactions || []) {
      if (!afterCreation(tx.time, payment)) continue;
      for (const out of tx.outputs || []) {
        if (out.address !== payment.toAddress) continue;
        const dogeAmount = parseFloat(out.value);
        if (amountMatch(dogeAmount, parseFloat(payment.expectedAmount), 0.001)) {
          return { found: true, txHash: tx.hash };
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] DOGE check error:", err);
  }
  return { found: false };
}

// ─── Litecoin (BTC-like) ───
async function checkLtcPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch(`https://litecoinspace.org/api/address/${payment.toAddress}/txs`);
    if (!res?.ok) return { found: false };
    const txs = await res.json();

    for (const tx of txs || []) {
      const txTime = tx.status?.block_time || 0;
      if (!afterCreation(txTime, payment)) continue;
      for (const out of tx.vout || []) {
        if (out.scriptpubkey_address !== payment.toAddress) continue;
        const ltcAmount = out.value / 1e8;
        if (amountMatch(ltcAmount, parseFloat(payment.expectedAmount), 0.000001)) {
          return { found: true, txHash: tx.txid };
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] LTC check error:", err);
  }
  return { found: false };
}

// ─── DigiByte (BTC-like) ───
async function checkDigibytePayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch(`https://digiexplorer.info/api/txs/?address=${payment.toAddress}`);
    if (!res?.ok) return { found: false };
    const data = await res.json();

    for (const tx of data.txs || []) {
      if (!afterCreation(tx.time, payment)) continue;
      for (const out of tx.vout || []) {
        const addr = out.scriptPubKey?.addresses?.[0];
        if (addr !== payment.toAddress) continue;
        const dgbAmount = parseFloat(out.value || "0");
        if (amountMatch(dgbAmount, parseFloat(payment.expectedAmount), 0.001)) {
          return { found: true, txHash: tx.txid };
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] DGB check error:", err);
  }
  return { found: false };
}

// ─── Verge (BTC-like) ───
async function checkVergePayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch(`https://verge-blockchain.info/api/txs/?address=${payment.toAddress}`);
    if (!res?.ok) return { found: false };
    const data = await res.json();

    for (const tx of data.txs || []) {
      if (!afterCreation(tx.time, payment)) continue;
      for (const out of tx.vout || []) {
        const addr = out.scriptPubKey?.addresses?.[0];
        if (addr !== payment.toAddress) continue;
        const xvgAmount = parseFloat(out.value || "0");
        if (amountMatch(xvgAmount, parseFloat(payment.expectedAmount), 0.01)) {
          return { found: true, txHash: tx.txid };
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] XVG check error:", err);
  }
  return { found: false };
}

// ─── Cardano ───
async function checkCardanoPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch(`https://cardano-mainnet.blockfrost.io/api/v0/addresses/${payment.toAddress}/transactions?order=desc&count=10`, {
      headers: { "project_id": process.env.BLOCKFROST_API_KEY || "" },
    });
    if (!res?.ok) return { found: false };
    const txs = await res.json();
    if (!Array.isArray(txs)) return { found: false };

    for (const txRef of txs) {
      const txRes = await safeFetch(`https://cardano-mainnet.blockfrost.io/api/v0/txs/${txRef.tx_hash}/utxos`, {
        headers: { "project_id": process.env.BLOCKFROST_API_KEY || "" },
      });
      if (!txRes?.ok) continue;
      const txData = await txRes.json();

      for (const out of txData.outputs || []) {
        if (out.address !== payment.toAddress) continue;
        for (const amt of out.amount || []) {
          if (amt.unit !== "lovelace") continue;
          const adaAmount = parseFloat(amt.quantity) / 1e6;
          if (amountMatch(adaAmount, parseFloat(payment.expectedAmount), 0.001)) {
            if (afterCreation(txRef.block_time, payment)) {
              return { found: true, txHash: txRef.tx_hash };
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] ADA check error:", err);
  }
  return { found: false };
}

// ─── Algorand ───
async function checkAlgorandPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const afterTime = payment.createdAt ? new Date(payment.createdAt).toISOString() : "";
    const res = await safeFetch(
      `https://mainnet-idx.algonode.cloud/v2/transactions?address=${payment.toAddress}&address-role=receiver&limit=10${afterTime ? `&after-time=${afterTime}` : ""}`
    );
    if (!res?.ok) return { found: false };
    const data = await res.json();

    for (const tx of data.transactions || []) {
      if (tx.sender === payment.toAddress) continue;
      const payTx = tx["payment-transaction"];
      if (!payTx) continue;
      if (payTx.receiver !== payment.toAddress) continue;

      const algoAmount = payTx.amount / 1e6;
      if (amountMatch(algoAmount, parseFloat(payment.expectedAmount), 0.001)) {
        const txTime = tx["round-time"] || 0;
        if (afterCreation(txTime, payment)) {
          return { found: true, txHash: tx.id };
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] ALGO check error:", err);
  }
  return { found: false };
}

// ─── Cosmos (ATOM) ───
async function checkCosmosPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch(
      `https://cosmos-rest.publicnode.com/cosmos/tx/v1beta1/txs?events=transfer.recipient='${payment.toAddress}'&order_by=ORDER_BY_DESC&pagination.limit=10`
    );
    if (!res?.ok) return { found: false };
    const data = await res.json();

    for (const txResp of data.tx_responses || []) {
      const txTime = new Date(txResp.timestamp).getTime() / 1000;
      if (!afterCreation(txTime, payment)) continue;

      for (const log of txResp.logs || []) {
        for (const event of log.events || []) {
          if (event.type !== "transfer") continue;
          const attrs = event.attributes || [];
          const recipient = attrs.find((a: any) => a.key === "recipient")?.value;
          const amountAttr = attrs.find((a: any) => a.key === "amount")?.value;
          if (recipient !== payment.toAddress) continue;
          if (!amountAttr) continue;

          const match = amountAttr.match(/^(\d+)uatom$/);
          if (match) {
            const atomAmount = parseFloat(match[1]) / 1e6;
            if (amountMatch(atomAmount, parseFloat(payment.expectedAmount), 0.001)) {
              return { found: true, txHash: txResp.txhash };
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] ATOM check error:", err);
  }
  return { found: false };
}

// ─── Tron (TRX) ───
async function checkTronPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch(
      `https://api.trongrid.io/v1/accounts/${payment.toAddress}/transactions?only_to=true&limit=20`
    );
    if (!res?.ok) return { found: false };
    const data = await res.json();

    for (const tx of data.data || []) {
      if (tx.ret?.[0]?.contractRet !== "SUCCESS") continue;
      const txTime = (tx.block_timestamp || 0) / 1000;
      if (!afterCreation(txTime, payment)) continue;

      if (tx.raw_data?.contract?.[0]?.type !== "TransferContract") continue;
      const val = tx.raw_data.contract[0].parameter?.value;
      if (!val) continue;

      const trxAmount = (val.amount || 0) / 1e6;
      if (amountMatch(trxAmount, parseFloat(payment.expectedAmount), 0.001)) {
        return { found: true, txHash: tx.txID };
      }
    }
  } catch (err) {
    console.error("[crypto-verify] TRX check error:", err);
  }
  return { found: false };
}

// ─── Hedera (HBAR) ───
async function checkHederaPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const afterTs = payment.createdAt ? `&timestamp=gt:${(new Date(payment.createdAt).getTime() / 1000).toFixed(9)}` : "";
    const res = await safeFetch(
      `https://mainnet-public.mirrornode.hedera.com/api/v1/transactions?account.id=${payment.toAddress}&type=credit&limit=10&order=desc${afterTs}`
    );
    if (!res?.ok) return { found: false };
    const data = await res.json();

    for (const tx of data.transactions || []) {
      if (tx.result !== "SUCCESS") continue;
      const txTime = parseFloat(tx.consensus_timestamp || "0");
      if (!afterCreation(txTime, payment)) continue;

      for (const transfer of tx.transfers || []) {
        if (transfer.account !== payment.toAddress) continue;
        const hbarAmount = transfer.amount / 1e8;
        if (hbarAmount > 0 && amountMatch(hbarAmount, parseFloat(payment.expectedAmount), 0.001)) {
          return { found: true, txHash: tx.transaction_id };
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] HBAR check error:", err);
  }
  return { found: false };
}

// ─── Polkadot ───
async function checkPolkadotPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch("https://polkadot.api.subscan.io/api/scan/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: payment.toAddress, row: 10, page: 0, direction: "received" }),
    });
    if (!res?.ok) return { found: false };
    const data = await res.json();

    for (const tx of data.data?.transfers || []) {
      if (!tx.success) continue;
      const txTime = tx.block_timestamp || 0;
      if (!afterCreation(txTime, payment)) continue;

      const dotAmount = parseFloat(tx.amount || "0");
      if (amountMatch(dotAmount, parseFloat(payment.expectedAmount), 0.0001)) {
        return { found: true, txHash: tx.hash };
      }
    }
  } catch (err) {
    console.error("[crypto-verify] DOT check error:", err);
  }
  return { found: false };
}

// ─── VeChain ───
async function checkVechainPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch(
      `https://vethor-node.vechain.org/accounts/${payment.toAddress}/transactions?limit=10&order=desc`
    );
    if (!res?.ok) {
      const altRes = await safeFetch(`https://explore.vechain.org/api/transfers?address=${payment.toAddress}&count=10&offset=0`);
      if (!altRes?.ok) return { found: false };
      const altData = await altRes.json();
      for (const tx of altData.transfers || []) {
        if (tx.recipient?.toLowerCase() !== payment.toAddress.toLowerCase()) continue;
        const vetAmount = parseFloat(tx.amount || "0") / 1e18;
        if (amountMatch(vetAmount, parseFloat(payment.expectedAmount), 0.01)) {
          return { found: true, txHash: tx.meta?.txID || tx.txId };
        }
      }
      return { found: false };
    }
    const data = await res.json();
    for (const tx of data || []) {
      for (const clause of tx.clauses || []) {
        if (clause.to?.toLowerCase() !== payment.toAddress.toLowerCase()) continue;
        const vetAmount = parseFloat(clause.value || "0") / 1e18;
        if (amountMatch(vetAmount, parseFloat(payment.expectedAmount), 0.01)) {
          return { found: true, txHash: tx.id };
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] VET check error:", err);
  }
  return { found: false };
}

// ─── Stellar (XLM) ───
async function checkStellarPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch(
      `https://horizon.stellar.org/accounts/${payment.toAddress}/payments?order=desc&limit=10`
    );
    if (!res?.ok) return { found: false };
    const data = await res.json();

    for (const op of data._embedded?.records || []) {
      if (op.type !== "payment" && op.type !== "path_payment_strict_receive" && op.type !== "path_payment_strict_send") continue;
      if (op.to !== payment.toAddress) continue;
      if (op.asset_type !== "native") continue;

      const xlmAmount = parseFloat(op.amount || "0");
      if (amountMatch(xlmAmount, parseFloat(payment.expectedAmount), 0.0001)) {
        const txTime = new Date(op.created_at).getTime() / 1000;
        if (afterCreation(txTime, payment)) {
          return { found: true, txHash: op.transaction_hash };
        }
      }
    }
  } catch (err) {
    console.error("[crypto-verify] XLM check error:", err);
  }
  return { found: false };
}

// ─── TON ───
async function checkTonPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch(
      `https://toncenter.com/api/v2/getTransactions?address=${payment.toAddress}&limit=10&archival=false`
    );
    if (!res?.ok) return { found: false };
    const data = await res.json();

    for (const tx of data.result || []) {
      const inMsg = tx.in_msg;
      if (!inMsg || !inMsg.value) continue;

      const txTime = tx.utime || 0;
      if (!afterCreation(txTime, payment)) continue;

      const tonAmount = parseFloat(inMsg.value) / 1e9;
      if (amountMatch(tonAmount, parseFloat(payment.expectedAmount), 0.001)) {
        const txHash = tx.transaction_id?.hash || `${tx.utime}_${tx.lt}`;
        return { found: true, txHash };
      }
    }
  } catch (err) {
    console.error("[crypto-verify] TON check error:", err);
  }
  return { found: false };
}

// ─── Zilliqa ───
async function checkZilliqaPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch(`https://api.viewblock.io/v1/zilliqa/addresses/${payment.toAddress}/txs?page=1&type=normal`, {
      headers: { "X-APIKEY": process.env.VIEWBLOCK_API_KEY || "" },
    });
    if (!res?.ok) {
      const altRes = await safeFetch("https://api.zilliqa.com/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "1", jsonrpc: "2.0", method: "GetRecentTransactions", params: [""] }),
      });
      if (!altRes?.ok) return { found: false };
      return { found: false };
    }
    const txs = await res.json();

    for (const tx of txs || []) {
      if (!tx.success) continue;
      if (tx.to?.toLowerCase() !== payment.toAddress.toLowerCase()) continue;

      const txTime = tx.timestamp / 1000 || 0;
      if (!afterCreation(txTime, payment)) continue;

      const zilAmount = parseFloat(tx.value || "0") / 1e12;
      if (amountMatch(zilAmount, parseFloat(payment.expectedAmount), 0.01)) {
        return { found: true, txHash: tx.hash };
      }
    }
  } catch (err) {
    console.error("[crypto-verify] ZIL check error:", err);
  }
  return { found: false };
}

// ─── Casper ───
async function checkCasperPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch(
      `https://event-store-api-clarity-mainnet.make.services/accounts/${payment.toAddress}/transfers?page=1&limit=10&order_direction=DESC`
    );
    if (!res?.ok) return { found: false };
    const data = await res.json();

    for (const transfer of data.data || []) {
      if (transfer.toAccount?.toLowerCase() !== payment.toAddress.toLowerCase() &&
          transfer.to_account?.toLowerCase() !== payment.toAddress.toLowerCase()) continue;

      const txTime = new Date(transfer.timestamp || transfer.block_timestamp || 0).getTime() / 1000;
      if (!afterCreation(txTime, payment)) continue;

      const csprAmount = parseFloat(transfer.amount || "0") / 1e9;
      if (amountMatch(csprAmount, parseFloat(payment.expectedAmount), 0.001)) {
        return { found: true, txHash: transfer.deployHash || transfer.deploy_hash };
      }
    }
  } catch (err) {
    console.error("[crypto-verify] CSPR check error:", err);
  }
  return { found: false };
}

// ─── Nervos (CKB) ───
async function checkNervosPayment(payment: CryptoPayment): Promise<CheckResult> {
  try {
    const res = await safeFetch("https://mainnet-api.explorer.nervos.org/api/v1/address_transactions/" + payment.toAddress + "?page=1&page_size=10");
    if (!res?.ok) return { found: false };
    const data = await res.json();

    for (const tx of data.data || []) {
      const txTime = parseInt(tx.attributes?.block_timestamp || "0") / 1000;
      if (!afterCreation(txTime, payment)) continue;

      const income = parseFloat(tx.attributes?.income || "0");
      const ckbAmount = income / 1e8;
      if (ckbAmount > 0 && amountMatch(ckbAmount, parseFloat(payment.expectedAmount), 0.01)) {
        return { found: true, txHash: tx.attributes?.transaction_hash };
      }
    }
  } catch (err) {
    console.error("[crypto-verify] CKB check error:", err);
  }
  return { found: false };
}

// ─── Chain checker registry ───
const CHAIN_CHECKERS: Record<string, (p: CryptoPayment) => Promise<CheckResult>> = {
  xrp: checkXrpPayment,
  rlusd: checkRlusdPayment,
  bitcoin: checkBtcPayment,
  ethereum: checkEthPayment,
  solana: checkSolPayment,
  polygon: checkPolygonPayment,
  avalanche: checkAvalanchePayment,
  cronos: checkCronosPayment,
  xdc: checkXdcPayment,
  dogecoin: checkDogePayment,
  litecoin: checkLtcPayment,
  digibyte: checkDigibytePayment,
  verge: checkVergePayment,
  cardano: checkCardanoPayment,
  algorand: checkAlgorandPayment,
  cosmos: checkCosmosPayment,
  tron: checkTronPayment,
  hedera: checkHederaPayment,
  polkadot: checkPolkadotPayment,
  vechain: checkVechainPayment,
  stellar: checkStellarPayment,
  ton: checkTonPayment,
  zilliqa: checkZilliqaPayment,
  casper: checkCasperPayment,
  nervos: checkNervosPayment,
};

export async function activateSubscription(payment: CryptoPayment) {
  if (payment.plan.startsWith("addon:")) {
    const addonKey = payment.plan.replace("addon:", "");
    const { ADDONS } = await import("../stripe");
    const addonConfig = ADDONS[addonKey as keyof typeof ADDONS];
    if (!addonConfig) {
      console.error(`[crypto-verify] Unknown addon key: ${addonKey}`);
      return;
    }

    let expiresAt: Date | null;
    if (addonKey === "legacy-plan-lifetime") {
      expiresAt = null;
    } else if (addonKey === "legacy-plan-5yr") {
      expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 5);
    } else if (addonConfig.interval === "year") {
      expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    await storage.createUserAddon({
      userId: payment.userId,
      addonType: addonConfig.type,
      addonKey,
      status: "active",
      paymentMethod: "crypto",
      stripeSubscriptionId: null,
      paidInChain: payment.chain,
      expiresAt,
    });
    console.log(`[crypto-verify] Activated addon ${addonKey} for user ${payment.userId} via ${payment.chain}, expires ${expiresAt ? expiresAt.toISOString() : "never (lifetime)"}`);
    await notifyAdminOfPayment(payment);
    return;
  }

  const billingCycle = (payment.plan === "yearly" || payment.plan === "pro-yearly") ? "yearly" : "monthly";
  const tier = (payment.plan === "pro-monthly" || payment.plan === "pro-yearly") ? "pro" : "premium";
  const existing = await storage.getUserSettings(payment.userId);

  const expiresAt = new Date();
  if (billingCycle === "yearly") {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else {
    expiresAt.setDate(expiresAt.getDate() + 30);
  }

  let renewalWallet = existing?.subscriptionRenewalWallet || null;
  if (!renewalWallet) {
    try {
      const wallets = await storage.getWalletsByUser(payment.userId);
      const xrplWallet = wallets.find(w => w.chain === "xrp" || w.chain === "xrpl");
      if (xrplWallet) {
        renewalWallet = xrplWallet.address;
      }
    } catch {}
  }

  await storage.upsertUserSettings({
    userId: payment.userId,
    subscriptionTier: tier,
    subscriptionBillingCycle: billingCycle,
    subscriptionExpiresAt: expiresAt,
    subscriptionPaymentMethod: "crypto",
    subscriptionRenewalWallet: renewalWallet,
    stripeCustomerId: existing?.stripeCustomerId || null,
    stripeSubscriptionId: existing?.stripeSubscriptionId || null,
  });
  console.log(`[crypto-verify] Activated ${billingCycle} ${tier} for user ${payment.userId} via ${payment.chain} payment ${payment.id}, expires ${expiresAt.toISOString()}`);

  await notifyAdminOfPayment(payment);
}

async function notifyAdminOfPayment(payment: CryptoPayment) {
  try {
    const { db } = await import("../db");
    const { users } = await import("@shared/models/auth");
    const { eq } = await import("drizzle-orm");

    const [user] = await db.select().from(users).where(eq(users.id, payment.userId));
    const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Unknown" : "Unknown";
    const userEmail = user?.email || "unknown";

    const addresses = await storage.getCryptoPaymentAddresses(true);
    const paymentAddr = addresses.find(a => a.chain.toLowerCase() === payment.chain.toLowerCase());
    const walletLabel = paymentAddr?.label || "Unknown";

    const asset = CHAIN_TO_ASSET[payment.chain] || payment.expectedAsset || payment.chain.toUpperCase();

    for (const adminEmail of ADMIN_EMAILS) {
      await sendCryptoPaymentReceivedEmail(adminEmail, {
        userName,
        userEmail,
        plan: payment.plan,
        chain: payment.chain,
        asset,
        amount: payment.expectedAmount,
        toAddress: payment.toAddress,
        walletLabel,
        txHash: payment.txHash,
        usdAmount: payment.usdAmount,
      });
    }

    if (user?.email) {
      const planLabel = payment.plan.includes("pro") ? "Pro" : "Premium";
      const cycle = payment.plan.includes("yearly") ? "Annual" : "Monthly";
      await sendPremiumWelcomeEmail(user.email, `${planLabel} ${cycle} (paid with ${asset})`);
    }

    console.log(`[crypto-verify] Payment notification emails sent for payment ${payment.id}`);
  } catch (err) {
    console.error(`[crypto-verify] Failed to send payment notification:`, err);
  }
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

    try {
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
    } catch (err) {
      console.error(`[crypto-verify] Error checking ${payment.chain} payment ${payment.id}:`, err);
    }
  }
}

let verifierInterval: ReturnType<typeof setInterval> | null = null;

export function startCryptoPaymentVerifier() {
  if (verifierInterval) return;
  const offsetMs = 60 * 60 * 1000;
  setTimeout(() => {
    verifyPendingPayments().catch(err => console.error("[crypto-verify] Initial check error:", err));
    verifierInterval = setInterval(async () => {
      try {
        await verifyPendingPayments();
      } catch (err) {
        console.error("[crypto-verify] Verifier error:", err);
      }
    }, 4 * 60 * 60 * 1000);
  }, offsetMs);
  console.log("[crypto-verify] Payment verifier started (runs every 4h, offset 60min)");
}

export function stopCryptoPaymentVerifier() {
  if (verifierInterval) {
    clearInterval(verifierInterval);
    verifierInterval = null;
  }
}
