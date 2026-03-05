import crypto from "crypto";

const ENCRYPTION_KEY = process.env.SESSION_SECRET!;

function decrypt(text: string): string {
  const parts = text.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = parts[1];
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

interface ExchangeBalance {
  asset: string;
  free: number;
  locked: number;
}

interface ExchangeTrade {
  externalId: string;
  asset: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  fee: number;
  feeCurrency: string;
  date: Date;
}

interface SyncResult {
  balances: ExchangeBalance[];
  trades: ExchangeTrade[];
  error?: string;
}

async function fetchJson(url: string, options?: RequestInit): Promise<any> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return response.json();
}

async function syncBinance(apiKey: string, apiSecret: string, isUS: boolean = false): Promise<SyncResult> {
  const baseUrl = isUS ? "https://api.binance.us" : "https://api.binance.com";
  const timestamp = Date.now();

  const signQuery = (query: string) => {
    const signature = crypto.createHmac("sha256", apiSecret).update(query).digest("hex");
    return `${query}&signature=${signature}`;
  };

  try {
    const accountQuery = signQuery(`timestamp=${timestamp}`);
    const accountData = await fetchJson(`${baseUrl}/api/v3/account?${accountQuery}`, {
      headers: { "X-MBX-APIKEY": apiKey },
    });

    const balances: ExchangeBalance[] = (accountData.balances || [])
      .map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
      }))
      .filter((b: ExchangeBalance) => b.free > 0 || b.locked > 0);

    const trades: ExchangeTrade[] = [];
    const tradingPairs = balances
      .filter(b => b.asset !== "USDT" && b.asset !== "USD" && b.asset !== "BUSD")
      .map(b => `${b.asset}USDT`);

    for (const symbol of tradingPairs.slice(0, 10)) {
      try {
        const tradeQuery = signQuery(`symbol=${symbol}&limit=500&timestamp=${Date.now()}`);
        const tradeData = await fetchJson(`${baseUrl}/api/v3/myTrades?${tradeQuery}`, {
          headers: { "X-MBX-APIKEY": apiKey },
        });

        for (const t of tradeData) {
          trades.push({
            externalId: `binance-${t.id}`,
            asset: symbol.replace("USDT", ""),
            type: t.isBuyer ? "buy" : "sell",
            quantity: parseFloat(t.qty),
            price: parseFloat(t.price),
            fee: parseFloat(t.commission),
            feeCurrency: t.commissionAsset,
            date: new Date(t.time),
          });
        }
      } catch {
        // pair might not exist, skip
      }
    }

    return { balances, trades };
  } catch (error: any) {
    return { balances: [], trades: [], error: error.message };
  }
}

async function syncCryptoCom(apiKey: string, apiSecret: string): Promise<SyncResult> {
  const baseUrl = "https://api.crypto.com/exchange/v1";

  const signRequest = (method: string, id: number, params: any = {}) => {
    const nonce = Date.now();
    const paramsString = Object.keys(params).sort().reduce((a: string, b: string) => {
      return a + b + params[b];
    }, "");
    const sigPayload = method + id + apiKey + paramsString + nonce;
    const sig = crypto.createHmac("sha256", apiSecret).update(sigPayload).digest("hex");
    return { id, method, params, api_key: apiKey, sig, nonce };
  };

  try {
    const balanceReq = signRequest("private/user-balance", 1);
    const balanceData = await fetchJson(`${baseUrl}/private/user-balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(balanceReq),
    });

    const balances: ExchangeBalance[] = [];
    const positionBalances = balanceData?.result?.data || [];
    for (const item of positionBalances) {
      for (const bal of item.position_balances || []) {
        const qty = parseFloat(bal.quantity || "0");
        if (qty > 0) {
          balances.push({
            asset: bal.instrument_name || "",
            free: qty,
            locked: parseFloat(bal.reserved_qty || "0"),
          });
        }
      }
    }

    const trades: ExchangeTrade[] = [];
    try {
      const tradeReq = signRequest("private/get-trades", 2, { page_size: "200" });
      const tradeData = await fetchJson(`${baseUrl}/private/get-trades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tradeReq),
      });

      for (const t of tradeData?.result?.data || []) {
        const pair = t.instrument_name || "";
        const parts = pair.split("_");
        trades.push({
          externalId: `crypto_com-${t.trade_id}`,
          asset: parts[0] || pair,
          type: t.side === "BUY" ? "buy" : "sell",
          quantity: parseFloat(t.traded_quantity || "0"),
          price: parseFloat(t.traded_price || "0"),
          fee: parseFloat(t.fee || "0"),
          feeCurrency: t.fee_instrument_name || "USD",
          date: new Date(t.create_time || Date.now()),
        });
      }
    } catch {
      // trade history might fail, balances still useful
    }

    return { balances, trades };
  } catch (error: any) {
    return { balances: [], trades: [], error: error.message };
  }
}

async function syncCoinbase(apiKey: string, apiSecret: string): Promise<SyncResult> {
  const baseUrl = "https://api.coinbase.com/v2";
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const sign = (method: string, path: string, body: string = "") => {
    const message = timestamp + method + path + body;
    return crypto.createHmac("sha256", apiSecret).update(message).digest("hex");
  };

  const headers = (method: string, path: string) => ({
    "CB-ACCESS-KEY": apiKey,
    "CB-ACCESS-SIGN": sign(method, path),
    "CB-ACCESS-TIMESTAMP": timestamp,
    "CB-VERSION": "2024-01-01",
    "Content-Type": "application/json",
  });

  try {
    const accountsData = await fetchJson(`${baseUrl}/accounts?limit=100`, {
      headers: headers("GET", "/v2/accounts?limit=100"),
    });

    const balances: ExchangeBalance[] = [];
    const trades: ExchangeTrade[] = [];

    for (const account of accountsData?.data || []) {
      const amount = parseFloat(account.balance?.amount || "0");
      if (amount > 0) {
        balances.push({
          asset: account.balance?.currency || account.currency?.code || "",
          free: amount,
          locked: 0,
        });

        try {
          const txPath = `/v2/accounts/${account.id}/transactions?limit=100`;
          const txData = await fetchJson(`${baseUrl.replace("/v2", "")}${txPath}`, {
            headers: headers("GET", txPath),
          });

          for (const tx of txData?.data || []) {
            if (tx.type === "buy" || tx.type === "sell") {
              trades.push({
                externalId: `coinbase-${tx.id}`,
                asset: tx.amount?.currency || "",
                type: tx.type as "buy" | "sell",
                quantity: Math.abs(parseFloat(tx.amount?.amount || "0")),
                price: parseFloat(tx.native_amount?.amount || "0") / Math.abs(parseFloat(tx.amount?.amount || "1")),
                fee: parseFloat(tx.network?.transaction_fee?.amount || "0"),
                feeCurrency: tx.native_amount?.currency || "USD",
                date: new Date(tx.created_at),
              });
            }
          }
        } catch {
          // transaction fetch might fail for some accounts
        }
      }
    }

    return { balances, trades };
  } catch (error: any) {
    return { balances: [], trades: [], error: error.message };
  }
}

async function syncKraken(apiKey: string, apiSecret: string): Promise<SyncResult> {
  const baseUrl = "https://api.kraken.com";

  const signKraken = (path: string, postData: string, nonce: number) => {
    const message = nonce + postData;
    const hash = crypto.createHash("sha256").update(message).digest();
    const secretBuffer = Buffer.from(apiSecret, "base64");
    const hmac = crypto.createHmac("sha512", secretBuffer);
    hmac.update(Buffer.concat([Buffer.from(path), hash]));
    return hmac.digest("base64");
  };

  try {
    const nonce1 = Date.now() * 1000;
    const balancePath = "/0/private/Balance";
    const balancePost = `nonce=${nonce1}`;
    const balanceData = await fetchJson(`${baseUrl}${balancePath}`, {
      method: "POST",
      headers: {
        "API-Key": apiKey,
        "API-Sign": signKraken(balancePath, balancePost, nonce1),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: balancePost,
    });

    const balances: ExchangeBalance[] = [];
    for (const [asset, amount] of Object.entries(balanceData?.result || {})) {
      const qty = parseFloat(amount as string);
      if (qty > 0) {
        let cleanAsset = asset;
        if (asset.startsWith("X") && asset.length === 4) cleanAsset = asset.slice(1);
        if (asset.startsWith("Z") && asset.length === 4) cleanAsset = asset.slice(1);
        if (cleanAsset === "XBT") cleanAsset = "BTC";
        balances.push({ asset: cleanAsset, free: qty, locked: 0 });
      }
    }

    const trades: ExchangeTrade[] = [];
    try {
      const nonce2 = Date.now() * 1000 + 1;
      const tradePath = "/0/private/TradesHistory";
      const tradePost = `nonce=${nonce2}`;
      const tradeData = await fetchJson(`${baseUrl}${tradePath}`, {
        method: "POST",
        headers: {
          "API-Key": apiKey,
          "API-Sign": signKraken(tradePath, tradePost, nonce2),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tradePost,
      });

      for (const [id, t] of Object.entries(tradeData?.result?.trades || {})) {
        const trade = t as any;
        const pair = trade.pair || "";
        let asset = pair.replace(/USD$|USDT$|ZUSD$/, "");
        if (asset.startsWith("X") && asset.length === 4) asset = asset.slice(1);
        if (asset === "XBT") asset = "BTC";

        trades.push({
          externalId: `kraken-${id}`,
          asset,
          type: trade.type === "buy" ? "buy" : "sell",
          quantity: parseFloat(trade.vol || "0"),
          price: parseFloat(trade.price || "0"),
          fee: parseFloat(trade.fee || "0"),
          feeCurrency: "USD",
          date: new Date(parseFloat(trade.time || "0") * 1000),
        });
      }
    } catch {
      // trades might fail
    }

    return { balances, trades };
  } catch (error: any) {
    return { balances: [], trades: [], error: error.message };
  }
}

async function syncUphold(apiKey: string, apiSecret: string): Promise<SyncResult> {
  const baseUrl = "https://api.uphold.com/v0";
  const authToken = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  try {
    const cardsData = await fetchJson(`${baseUrl}/me/cards`, {
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    const balances: ExchangeBalance[] = [];
    const trades: ExchangeTrade[] = [];

    for (const card of cardsData || []) {
      const amount = parseFloat(card.balance || card.available || "0");
      if (amount > 0) {
        balances.push({
          asset: card.currency || "",
          free: amount,
          locked: 0,
        });

        try {
          const txData = await fetchJson(`${baseUrl}/me/cards/${card.id}/transactions?limit=50`, {
            headers: {
              Authorization: `Basic ${authToken}`,
              "Content-Type": "application/json",
            },
          });

          for (const tx of txData || []) {
            if (tx.type === "transfer" && tx.status === "completed") {
              const origin = tx.origin || {};
              const dest = tx.destination || {};
              trades.push({
                externalId: `uphold-${tx.id}`,
                asset: origin.currency || dest.currency || "",
                type: origin.CardId === card.id ? "sell" : "buy",
                quantity: Math.abs(parseFloat(origin.amount || dest.amount || "0")),
                price: parseFloat(tx.denomination?.amount || "0") / Math.abs(parseFloat(origin.amount || "1")),
                fee: parseFloat(tx.fees?.[0]?.amount || "0"),
                feeCurrency: tx.denomination?.currency || "USD",
                date: new Date(tx.createdAt),
              });
            }
          }
        } catch {
          // transaction fetch might fail
        }
      }
    }

    return { balances, trades };
  } catch (error: any) {
    return { balances: [], trades: [], error: error.message };
  }
}

export async function syncExchange(
  provider: string,
  encryptedApiKey: string,
  encryptedApiSecret: string
): Promise<SyncResult> {
  const apiKey = decrypt(encryptedApiKey);
  const apiSecret = decrypt(encryptedApiSecret);

  switch (provider) {
    case "binance":
      return syncBinance(apiKey, apiSecret, false);
    case "binance_us":
      return syncBinance(apiKey, apiSecret, true);
    case "crypto_com":
      return syncCryptoCom(apiKey, apiSecret);
    case "coinbase":
      return syncCoinbase(apiKey, apiSecret);
    case "kraken":
      return syncKraken(apiKey, apiSecret);
    case "uphold":
      return syncUphold(apiKey, apiSecret);
    default:
      return { balances: [], trades: [], error: `Sync not yet supported for ${provider}` };
  }
}
