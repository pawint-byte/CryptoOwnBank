interface ChainBalance {
  symbol: string;
  balance: number;
  usdValue: number;
}

interface TokenBalance {
  symbol: string;
  balance: number;
  usdValue: number;
}

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  LTC: "litecoin",
  ADA: "cardano",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  RLUSD: "usd",
};

async function fetchJson(url: string, options?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function getPrices(symbols: string[]): Promise<Record<string, number>> {
  const ids = symbols
    .map((s) => COINGECKO_IDS[s.toUpperCase()])
    .filter(Boolean);
  if (ids.length === 0) return {};

  try {
    const data = await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`
    );
    const prices: Record<string, number> = {};
    for (const sym of symbols) {
      const id = COINGECKO_IDS[sym.toUpperCase()];
      if (id === "usd") {
        prices[sym.toUpperCase()] = 1;
      } else if (id && data[id]?.usd) {
        prices[sym.toUpperCase()] = data[id].usd;
      }
    }
    return prices;
  } catch {
    return {};
  }
}

export async function getBitcoinBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(`https://blockchain.info/balance?active=${address}`);
    const info = data[address];
    if (!info) return [];

    const satoshis = info.final_balance || 0;
    const btc = satoshis / 1e8;
    if (btc <= 0) return [];

    const prices = await getPrices(["BTC"]);
    return [{
      symbol: "BTC",
      balance: btc,
      usdValue: btc * (prices.BTC || 0),
    }];
  } catch (err) {
    console.error("Bitcoin balance fetch error:", err);
    return [];
  }
}

export async function getEthereumBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(
      `https://eth.llamarpc.com`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBalance",
          params: [address, "latest"],
        }),
      }
    );

    const hexBalance = data.result;
    if (!hexBalance || hexBalance === "0x0") return [];

    const wei = BigInt(hexBalance);
    const eth = Number(wei) / 1e18;
    if (eth <= 0) return [];

    const prices = await getPrices(["ETH"]);
    return [{
      symbol: "ETH",
      balance: eth,
      usdValue: eth * (prices.ETH || 0),
    }];
  } catch (err) {
    console.error("Ethereum balance fetch error:", err);
    return [];
  }
}

export async function getSolanaBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address],
      }),
    });

    const lamports = data.result?.value || 0;
    const sol = lamports / 1e9;
    if (sol <= 0) return [];

    const prices = await getPrices(["SOL"]);
    return [{
      symbol: "SOL",
      balance: sol,
      usdValue: sol * (prices.SOL || 0),
    }];
  } catch (err) {
    console.error("Solana balance fetch error:", err);
    return [];
  }
}

export async function getXrpBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson("https://xrplcluster.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "account_info",
        params: [{ account: address, ledger_index: "validated" }],
      }),
    });

    const balances: ChainBalance[] = [];
    const drops = data.result?.account_data?.Balance;
    if (drops) {
      const xrp = Number(drops) / 1e6;
      if (xrp > 0) {
        const prices = await getPrices(["XRP"]);
        balances.push({
          symbol: "XRP",
          balance: xrp,
          usdValue: xrp * (prices.XRP || 0),
        });
      }
    }

    try {
      const linesData = await fetchJson("https://xrplcluster.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "account_lines",
          params: [{ account: address, ledger_index: "validated" }],
        }),
      });

      const lines = linesData.result?.lines || [];
      for (const line of lines) {
        const bal = parseFloat(line.balance);
        if (bal > 0 && line.currency) {
          const symbol = line.currency.length === 3 ? line.currency : `${line.currency.slice(0, 4)}...`;
          const isStable = line.currency === "RLUSD" || line.currency === "USD";
          balances.push({
            symbol: line.currency.length > 20 ? symbol : line.currency,
            balance: bal,
            usdValue: isStable ? bal : 0,
          });
        }
      }
    } catch {}

    return balances;
  } catch (err) {
    console.error("XRP balance fetch error:", err);
    return [];
  }
}

export async function getDogeBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(`https://dogechain.info/api/v1/address/balance/${address}`);
    const doge = parseFloat(data.balance || "0");
    if (doge <= 0) return [];

    const prices = await getPrices(["DOGE"]);
    return [{
      symbol: "DOGE",
      balance: doge,
      usdValue: doge * (prices.DOGE || 0),
    }];
  } catch (err) {
    console.error("Dogecoin balance fetch error:", err);
    return [];
  }
}

export async function getLitecoinBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(`https://litecoinspace.org/api/address/${address}`);
    const funded = data.chain_stats?.funded_txo_sum || 0;
    const spent = data.chain_stats?.spent_txo_sum || 0;
    const ltc = (funded - spent) / 1e8;
    if (ltc <= 0) return [];

    const prices = await getPrices(["LTC"]);
    return [{
      symbol: "LTC",
      balance: ltc,
      usdValue: ltc * (prices.LTC || 0),
    }];
  } catch (err) {
    console.error("Litecoin balance fetch error:", err);
    return [];
  }
}

export async function getCardanoBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(`https://cardano-mainnet.blockfrost.io/api/v0/addresses/${address}`, {
      headers: { project_id: process.env.BLOCKFROST_API_KEY || "" },
    });
    const lovelace = data.amount?.find((a: any) => a.unit === "lovelace")?.quantity || "0";
    const ada = Number(lovelace) / 1e6;
    if (ada <= 0) return [];

    const prices = await getPrices(["ADA"]);
    return [{
      symbol: "ADA",
      balance: ada,
      usdValue: ada * (prices.ADA || 0),
    }];
  } catch (err) {
    console.error("Cardano balance fetch error — Blockfrost API key may be required:", err);
    return [];
  }
}

export type SupportedChain = "bitcoin" | "ethereum" | "solana" | "xrp" | "dogecoin" | "litecoin" | "cardano";

export const CHAIN_CONFIG: Record<SupportedChain, { name: string; symbol: string; addressPattern: string; example: string }> = {
  bitcoin: { name: "Bitcoin", symbol: "BTC", addressPattern: "^(1|3|bc1)", example: "bc1q..." },
  ethereum: { name: "Ethereum", symbol: "ETH", addressPattern: "^0x[a-fA-F0-9]{40}$", example: "0x..." },
  solana: { name: "Solana", symbol: "SOL", addressPattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$", example: "DRpb..." },
  xrp: { name: "XRP Ledger", symbol: "XRP", addressPattern: "^r[1-9A-HJ-NP-Za-km-z]{24,34}$", example: "rXXX..." },
  dogecoin: { name: "Dogecoin", symbol: "DOGE", addressPattern: "^D[1-9A-HJ-NP-Za-km-z]{33}$", example: "D7Y..." },
  litecoin: { name: "Litecoin", symbol: "LTC", addressPattern: "^(L|M|ltc1)", example: "ltc1q..." },
  cardano: { name: "Cardano", symbol: "ADA", addressPattern: "^addr1", example: "addr1..." },
};

export async function getWalletBalances(chain: SupportedChain, address: string): Promise<ChainBalance[]> {
  switch (chain) {
    case "bitcoin":
      return getBitcoinBalance(address);
    case "ethereum":
      return getEthereumBalance(address);
    case "solana":
      return getSolanaBalance(address);
    case "xrp":
      return getXrpBalance(address);
    case "dogecoin":
      return getDogeBalance(address);
    case "litecoin":
      return getLitecoinBalance(address);
    case "cardano":
      return getCardanoBalance(address);
    default:
      return [];
  }
}
