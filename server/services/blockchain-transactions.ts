export interface BlockchainTransaction {
  hash: string;
  type: "receive" | "send";
  asset: string;
  quantity: number;
  fee: number;
  timestamp: Date;
  senderAddress?: string;
  recipientAddress?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_TRANSACTIONS = 500;

export async function getEthTransactions(address: string): Promise<BlockchainTransaction[]> {
  const results: BlockchainTransaction[] = [];
  const addr = address.toLowerCase();
  let page = 1;
  const pageSize = 1000;

  try {
    while (results.length < MAX_TRANSACTIONS) {
      const apiKey = process.env.ETHERSCAN_API_KEY || "";
      const keyParam = apiKey ? `&apikey=${apiKey}` : "";
      const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${addr}&startblock=0&endblock=99999999&page=${page}&offset=${pageSize}&sort=asc${keyParam}`;

      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        console.warn(`Etherscan API error: HTTP ${res.status}`);
        break;
      }

      const data = await res.json();
      if (data.status !== "1" || !Array.isArray(data.result)) {
        if (data.message === "No transactions found") break;
        console.warn(`Etherscan response: ${data.message}`);
        break;
      }

      for (const tx of data.result) {
        if (results.length >= MAX_TRANSACTIONS) break;
        if (tx.isError === "1") continue;

        const valueWei = BigInt(tx.value || "0");
        if (valueWei === 0n) continue;

        const from = (tx.from || "").toLowerCase();
        const to = (tx.to || "").toLowerCase();

        if (from === addr && to === addr) continue;

        const ethValue = Number(valueWei / 10n ** 12n) / 1e6;
        const gasUsed = BigInt(tx.gasUsed || "0");
        const gasPrice = BigInt(tx.gasPrice || "0");
        const feeWei = gasUsed * gasPrice;
        const feeEth = Number(feeWei / 10n ** 12n) / 1e6;

        let type: "receive" | "send";
        if (to === addr && from !== addr) {
          type = "receive";
        } else if (from === addr && to !== addr) {
          type = "send";
        } else {
          continue;
        }

        results.push({
          hash: tx.hash,
          type,
          asset: "ETH",
          quantity: ethValue,
          fee: type === "send" ? feeEth : 0,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000),
        });
      }

      if (data.result.length < pageSize) break;
      page++;
      await sleep(250);
    }
  } catch (error) {
    console.error("Failed to fetch ETH transactions:", error);
  }

  return results;
}

export async function getXrpTransactions(address: string): Promise<BlockchainTransaction[]> {
  const results: BlockchainTransaction[] = [];
  let marker: any = undefined;

  try {
    while (results.length < MAX_TRANSACTIONS) {
      const params: any = {
        account: address,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit: 200,
        forward: true,
      };
      if (marker) params.marker = marker;

      const res = await fetch("https://xrplcluster.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "account_tx", params: [params] }),
      });

      if (!res.ok) {
        console.warn(`XRPL account_tx error: HTTP ${res.status}`);
        break;
      }

      const data = await res.json();
      const txResult = data.result;
      if (!txResult || txResult.status !== "success") {
        console.warn("XRPL account_tx failed:", txResult?.error_message || "unknown");
        break;
      }

      const transactions = txResult.transactions || [];
      if (transactions.length === 0) break;

      for (const entry of transactions) {
        if (results.length >= MAX_TRANSACTIONS) break;

        const tx = entry.tx || entry.tx_json;
        const meta = entry.meta;
        if (!tx || !meta) continue;
        if (tx.TransactionType !== "Payment") continue;
        if (meta.TransactionResult !== "tesSUCCESS") continue;

        const delivered = meta.delivered_amount || meta.DeliveredAmount;
        if (!delivered) continue;

        let asset: string;
        let quantity: number;

        if (typeof delivered === "object" && delivered !== null) {
          if (!delivered.currency || !delivered.value) continue;
          asset = delivered.currency;
          if (asset.length === 40) {
            try {
              const decoded = Buffer.from(asset, "hex").toString("utf8").replace(/\0/g, "").trim();
              if (decoded.length > 0 && decoded.length <= 12) asset = decoded;
            } catch {}
          }
          quantity = Number(delivered.value);
          if (isNaN(quantity) || quantity <= 0) continue;
        } else {
          const drops = Number(delivered);
          if (isNaN(drops) || drops <= 0) continue;
          quantity = drops / 1e6;
          asset = "XRP";
        }

        const feeDrop = Number(tx.Fee || 0);
        const feeXrp = feeDrop / 1e6;

        const closeTime = entry.tx?.date || entry.close_time_iso;
        let timestamp: Date;
        if (typeof closeTime === "number") {
          timestamp = new Date((closeTime + 946684800) * 1000);
        } else if (typeof closeTime === "string") {
          timestamp = new Date(closeTime);
        } else {
          continue;
        }

        const dest = tx.Destination;
        const source = tx.Account;

        let type: "receive" | "send";
        if (dest === address && source !== address) {
          type = "receive";
        } else if (source === address && dest !== address) {
          type = "send";
        } else {
          continue;
        }

        results.push({
          hash: tx.hash || entry.hash || "",
          type,
          asset,
          quantity,
          fee: type === "send" ? feeXrp : 0,
          timestamp,
          ...(type === "receive" ? { senderAddress: source } : { recipientAddress: dest }),
        });
      }

      marker = txResult.marker;
      if (!marker) break;
      await sleep(500);
    }
  } catch (error) {
    console.error("Failed to fetch XRP transactions:", error);
  }

  return results;
}

export async function getBtcTransactions(address: string): Promise<BlockchainTransaction[]> {
  const results: BlockchainTransaction[] = [];
  let offset = 0;
  const limit = 50;

  try {
    while (results.length < MAX_TRANSACTIONS) {
      const url = `https://blockchain.info/rawaddr/${address}?limit=${limit}&offset=${offset}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });

      if (res.status === 429) {
        console.warn("blockchain.info rate limited, waiting 10s...");
        await sleep(10000);
        continue;
      }

      if (!res.ok) {
        console.warn(`blockchain.info API error: HTTP ${res.status}`);
        break;
      }

      const data = await res.json();
      const txs = data.txs || [];
      if (txs.length === 0) break;

      for (const tx of txs) {
        if (results.length >= MAX_TRANSACTIONS) break;

        let inputFromAddr = 0;
        let isSender = false;

        for (const input of tx.inputs || []) {
          const prevOut = input.prev_out;
          if (!prevOut) continue;
          if (prevOut.addr === address) {
            inputFromAddr += prevOut.value || 0;
            isSender = true;
          }
        }

        let outputToAddr = 0;
        let outputToOthers = 0;
        let totalOutputAll = 0;

        for (const out of tx.out || []) {
          const val = out.value || 0;
          totalOutputAll += val;
          if (out.addr === address) {
            outputToAddr += val;
          } else {
            outputToOthers += val;
          }
        }

        let totalInputAll = 0;
        for (const input of tx.inputs || []) {
          if (input.prev_out) totalInputAll += input.prev_out.value || 0;
        }
        const feeSatoshis = Math.max(0, totalInputAll - totalOutputAll);

        if (isSender) {
          const netSent = inputFromAddr - outputToAddr - feeSatoshis;
          if (netSent <= 0) continue;

          results.push({
            hash: tx.hash,
            type: "send",
            asset: "BTC",
            quantity: netSent / 1e8,
            fee: feeSatoshis / 1e8,
            timestamp: new Date((tx.time || 0) * 1000),
          });
        } else if (outputToAddr > 0) {
          results.push({
            hash: tx.hash,
            type: "receive",
            asset: "BTC",
            quantity: outputToAddr / 1e8,
            fee: 0,
            timestamp: new Date((tx.time || 0) * 1000),
          });
        }
      }

      if (txs.length < limit) break;
      offset += limit;
      await sleep(1000);
    }
  } catch (error) {
    console.error("Failed to fetch BTC transactions:", error);
  }

  return results;
}
