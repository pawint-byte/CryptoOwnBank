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
  LINK: "chainlink",
  UNI: "uniswap",
  AAVE: "aave",
  MKR: "maker",
  SNX: "havven",
  COMP: "compound-governance-token",
  CRV: "curve-dao-token",
  LDO: "lido-dao",
  RPL: "rocket-pool",
  ENS: "ethereum-name-service",
  GRT: "the-graph",
  FET: "fetch-ai",
  RNDR: "render-token",
  IMX: "immutable-x",
  ARB: "arbitrum",
  OP: "optimism",
  PEPE: "pepe",
  SHIB: "shiba-inu",
  APE: "apecoin",
  SAND: "the-sandbox",
  MANA: "decentraland",
  AXS: "axie-infinity",
  SUSHI: "sushi",
  "1INCH": "1inch",
  BAT: "basic-attention-token",
  ZRX: "0x",
  ANKR: "ankr",
  CHZ: "chiliz",
  GALA: "gala",
  JASMY: "jasmycoin",
  BLUR: "blur",
  DYDX: "dydx-chain",
  QSP: "quantstamp",
  ELON: "dogelon-mars",
  HEX: "hex",
  RSR: "reserve-rights-token",
  AMP: "amp-token",
  ACH: "alchemy-pay",
  ALI: "artificial-liquid-intelligence",
  XYO: "xyo-network",
  XPR: "proton",
  OOKI: "ooki",
  IQ: "everipedia",
  KRL: "kryll",
  RADAR: "dappradar",
  MXC: "mxc",
  SPELL: "spell-token",
  ONDO: "ondo-finance",
  BTT: "bittorrent",
  INJ: "injective-protocol",
  BLZ: "bluzelle",
  UMA: "uma",
  TON: "the-open-network",
  WOJAK: "wojak",
  NCT: "polyswarm",
  STX: "blockstack",
  FIL: "filecoin",
  ATOM: "cosmos",
  NEAR: "near",
  ALGO: "algorand",
  XLM: "stellar",
  HBAR: "hedera-hashgraph",
  VET: "vechain",
  WBTC: "wrapped-bitcoin",
  STETH: "staked-ether",
  RETH: "rocket-pool-eth",
  CBETH: "coinbase-wrapped-staked-eth",
  WETH: "weth",
  DAI: "dai",
  CRO: "crypto-com-chain",
  LEO: "leo-token",
  OKB: "okb",
  QNT: "quant-network",
  WSOL: "solana",
  JUP: "jupiter-exchange-solana",
  BONK: "bonk",
  MSOL: "msol",
  RAY: "raydium",
  ORCA: "orca",
  PYTH: "pyth-network",
  JTO: "jito-governance-token",
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
  const balances: ChainBalance[] = [];

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
    if (hexBalance && hexBalance !== "0x0") {
      const wei = BigInt(hexBalance);
      const eth = Number(wei / 10n ** 12n) / 1e6;
      if (eth > 0) {
        const prices = await getPrices(["ETH"]);
        balances.push({
          symbol: "ETH",
          balance: eth,
          usdValue: eth * (prices.ETH || 0),
        });
      }
    }
  } catch (err) {
    console.error("Ethereum native balance fetch error:", err);
  }

  try {
    const stablecoins = new Set(["USDT", "USDC", "DAI", "BUSD", "TUSD", "USDP", "FRAX", "LUSD", "GUSD", "RLUSD"]);
    const tokenEntries: Array<{ symbol: string; balance: number }> = [];
    const blockscoutUrl = `https://eth.blockscout.com/api/v2/addresses/${address}/tokens?type=ERC-20`;

    let nextPageParams: any = null;
    let pageCount = 0;

    do {
      let url = blockscoutUrl;
      if (nextPageParams) {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(nextPageParams)) {
          params.set(k, String(v));
        }
        url += `&${params.toString()}`;
      }

      const tokenData = await fetchJson(url);
      const items = tokenData.items || [];

      for (const item of items) {
        const token = item.token || {};
        const symbol = (token.symbol || "").toUpperCase();
        const decimals = parseInt(token.decimals || "18");
        const rawBalance = item.value || "0";

        if (!symbol || rawBalance === "0") continue;

        const rawBal = BigInt(rawBalance);
        let bal: number;
        if (decimals <= 6) {
          bal = Number(rawBal) / Math.pow(10, decimals);
        } else {
          bal = Number(rawBal / (10n ** BigInt(decimals - 6))) / 1e6;
        }

        if (bal > 0.000001) {
          tokenEntries.push({ symbol, balance: bal });
        }
      }

      nextPageParams = tokenData.next_page_params || null;
      pageCount++;
    } while (nextPageParams && pageCount < 10);

    if (tokenEntries.length > 0) {
      const tokenSymbols = tokenEntries.map(e => e.symbol);
      const ids = tokenSymbols
        .filter(s => !stablecoins.has(s))
        .map(s => COINGECKO_IDS[s])
        .filter(Boolean);

      let tokenPrices: Record<string, number> = {};
      if (ids.length > 0) {
        try {
          const uniqueIds = [...new Set(ids)];
          const priceData = await fetchJson(
            `https://api.coingecko.com/api/v3/simple/price?ids=${uniqueIds.join(",")}&vs_currencies=usd`
          );
          for (const sym of tokenSymbols) {
            const id = COINGECKO_IDS[sym];
            if (id && priceData[id]?.usd) {
              tokenPrices[sym] = priceData[id].usd;
            }
          }
        } catch {}
      }

      for (const entry of tokenEntries) {
        let usdValue = 0;
        if (stablecoins.has(entry.symbol)) {
          usdValue = entry.balance;
        } else if (tokenPrices[entry.symbol]) {
          usdValue = entry.balance * tokenPrices[entry.symbol];
        }

        balances.push({
          symbol: entry.symbol,
          balance: entry.balance,
          usdValue,
        });
      }
    }

    console.log(`Blockscout ERC-20 scan: found ${tokenEntries.length} tokens for ${address}`);
  } catch (err) {
    console.error("ERC-20 token scan error (Blockscout):", err);
  }

  return balances;
}

export async function getSolanaBalance(address: string): Promise<ChainBalance[]> {
  const balances: ChainBalance[] = [];
  const RPC_URL = "https://api.mainnet-beta.solana.com";

  try {
    const data = await fetchJson(RPC_URL, {
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
    if (sol > 0) {
      const prices = await getPrices(["SOL"]);
      balances.push({
        symbol: "SOL",
        balance: sol,
        usdValue: sol * (prices.SOL || 0),
      });
    }
  } catch (err) {
    console.error("Solana native balance fetch error:", err);
  }

  try {
    const tokenData = await fetchJson(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "getTokenAccountsByOwner",
        params: [
          address,
          { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
          { encoding: "jsonParsed" },
        ],
      }),
    });

    const tokenAccounts = tokenData.result?.value || [];
    if (tokenAccounts.length > 0) {
      const SPL_TOKEN_MAP: Record<string, { symbol: string; decimals: number; coingeckoId?: string }> = {
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": { symbol: "USDC", decimals: 6 },
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": { symbol: "USDT", decimals: 6 },
        "So11111111111111111111111111111111111111112": { symbol: "WSOL", decimals: 9, coingeckoId: "solana" },
        "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": { symbol: "JUP", decimals: 6, coingeckoId: "jupiter-exchange-solana" },
        "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": { symbol: "BONK", decimals: 5, coingeckoId: "bonk" },
        "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs": { symbol: "ETH", decimals: 8, coingeckoId: "ethereum" },
        "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": { symbol: "mSOL", decimals: 9, coingeckoId: "msol" },
        "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": { symbol: "stSOL", decimals: 9, coingeckoId: "lido-staked-sol" },
        "RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a": { symbol: "RLSOL", decimals: 9 },
        "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": { symbol: "RAY", decimals: 6, coingeckoId: "raydium" },
        "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE": { symbol: "ORCA", decimals: 6, coingeckoId: "orca" },
        "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3": { symbol: "PYTH", decimals: 6, coingeckoId: "pyth-network" },
        "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL": { symbol: "JTO", decimals: 9, coingeckoId: "jito-governance-token" },
        "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk": { symbol: "WEN", decimals: 5, coingeckoId: "wen-4" },
        "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof": { symbol: "RNDR", decimals: 8, coingeckoId: "render-token" },
      };

      const stablecoins = new Set(["USDC", "USDT"]);

      const parsedTokens: Array<{ symbol: string; balance: number; coingeckoId?: string }> = [];
      for (const account of tokenAccounts) {
        try {
          const parsed = account.account?.data?.parsed?.info;
          if (!parsed) continue;

          const mint = parsed.mint;
          const amount = parsed.tokenAmount;
          if (!amount || amount.uiAmount <= 0) continue;

          const tokenInfo = SPL_TOKEN_MAP[mint];
          const symbol = tokenInfo?.symbol || `SPL:${mint.slice(0, 6)}`;
          if (amount.uiAmount > 0.000001) {
            parsedTokens.push({
              symbol,
              balance: amount.uiAmount,
              coingeckoId: tokenInfo?.coingeckoId,
            });
          }
        } catch { continue; }
      }

      const idsToFetch = [...new Set(
        parsedTokens
          .filter(t => !stablecoins.has(t.symbol) && t.coingeckoId)
          .map(t => t.coingeckoId!)
      )];

      let splPrices: Record<string, number> = {};
      if (idsToFetch.length > 0) {
        try {
          const priceData = await fetchJson(
            `https://api.coingecko.com/api/v3/simple/price?ids=${idsToFetch.join(",")}&vs_currencies=usd`
          );
          for (const [id, val] of Object.entries(priceData)) {
            if ((val as any)?.usd) splPrices[id] = (val as any).usd;
          }
        } catch {}
      }

      for (const token of parsedTokens) {
        let usdValue = 0;
        if (stablecoins.has(token.symbol)) {
          usdValue = token.balance;
        } else if (token.coingeckoId && splPrices[token.coingeckoId]) {
          usdValue = token.balance * splPrices[token.coingeckoId];
        }
        balances.push({ symbol: token.symbol, balance: token.balance, usdValue });
      }
    }
  } catch (err) {
    console.error("Solana SPL token scan error:", err);
  }

  return balances;
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
