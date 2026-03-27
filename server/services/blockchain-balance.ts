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

const XRPL_HEX_CURRENCIES: Record<string, string> = {
  "524C555344000000000000000000000000000000": "RLUSD",
  "4156415800000000000000000000000000000000": "AVAX",
  "41544F4D00000000000000000000000000000000": "ATOM",
  "414C474F00000000000000000000000000000000": "ALGO",
  "4E45415200000000000000000000000000000000": "NEAR",
  "5045504500000000000000000000000000000000": "PEPE",
  "424F4E4B00000000000000000000000000000000": "BONK",
  "4141564500000000000000000000000000000000": "AAVE",
  "4D41544943000000000000000000000000000000": "MATIC",
  "5A42434E00000000000000000000000000000000": "ZBCN",
  "434F524500000000000000000000000000000000": "CORE",
  "454C5300000000000000000000000000000000000": "ELS",
  "4353430000000000000000000000000000000000": "CSC",
};

function decodeXrplCurrency(currency: string): string {
  if (currency.length <= 3) return currency;
  if (currency.length === 40) {
    if (XRPL_HEX_CURRENCIES[currency]) return XRPL_HEX_CURRENCIES[currency];
    try {
      const decoded = Buffer.from(currency, "hex").toString("utf8").replace(/\0/g, "").trim();
      if (decoded && /^[A-Za-z0-9]+$/.test(decoded)) return decoded;
    } catch {}
  }
  return currency;
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
  ASM: "assemble-protocol",
  ATH: "aethir",
  DAG: "constellation-labs",
  FLR: "flare-networks",
  WFLR: "flare-networks",
  KAS: "kaspa",
  MINA: "mina-protocol",
  NXRA: "allianceblock-nexera",
  SOLO: "sologenic",
  TAO: "bittensor",
  MONKY: "wise-monkey",
  EGLD: "elrond-erd-2",
  EOS: "eos",
  KSM: "kusama",
  ONE: "harmony",
  ROSE: "oasis-network",
  RVN: "ravencoin",
  SEI: "sei-network",
  SUI: "sui",
  THETA: "theta-token",
  ARPA: "arpa",
  BARA: "capybara-memecoin",
  BEAMX: "beam-2",
  CAW: "a-hunters-dream",
  CELR: "celer-network",
  CORGIAI: "corgiai",
  DOGS: "dogs-2",
  FTM: "fantom",
  MOBILE: "helium-mobile",
  IOST: "iostoken",
  IOTX: "iotex",
  LUNC: "terra-luna",
  MBL: "moviebloc",
  PDA: "playdapp",
  PENGU: "pudgy-penguins",
  S: "sonic-svm",
  TOSHI: "toshi",
  VVS: "vvs-finance",
  ZBCN: "zebec-protocol",
  VAULTA: "vaulta",
  COS: "contentos",
  COTI: "coti",
  STMX: "stormx",
  SUNDOG: "sundog",
  XVG: "verge",
  XDC: "xdce-crowd-sale",
  POL: "matic-network",
  TONIC: "tectonic",
  AWE: "awe",
  PRO: "propy",
  XTZ: "tezos",
  ICP: "internet-computer",
  QI: "benqi",
  DGB: "digibyte",
  CSPR: "casper-network",
  TRX: "tron",
  CKB: "nervos-network",
  ZIL: "zilliqa",
  VTHO: "vethor-token",
  DNT: "district0x",
  EPX: "ellipsis-x",
  LSS: "lossless",
  PRQ: "parsiq",
  REEF: "reef",
  VRA: "verasity",
  XCN: "onyxcoin",
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

async function loadPricesFromDb(): Promise<Record<string, number>> {
  try {
    const { db } = await import("../db");
    const { priceCache: priceCacheTable } = await import("@shared/schema");
    const rows = await db.select().from(priceCacheTable);
    const prices: Record<string, number> = {};
    for (const row of rows) {
      prices[row.symbol.toUpperCase()] = parseFloat(row.priceUsd);
    }
    return prices;
  } catch {
    return {};
  }
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
    if (Object.keys(prices).length > 0) return prices;
    return await loadPricesFromDb();
  } catch {
    return await loadPricesFromDb();
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

      const dbPrices = await loadPricesFromDb();
      for (const sym of tokenSymbols) {
        if (dbPrices[sym]) tokenPrices[sym] = dbPrices[sym];
      }

      const missingSymbols = tokenSymbols.filter(s => !tokenPrices[s] && !stablecoins.has(s) && COINGECKO_IDS[s]);
      if (missingSymbols.length > 0) {
        try {
          const missingIds = [...new Set(missingSymbols.map(s => COINGECKO_IDS[s]).filter(Boolean))];
          const priceData = await fetchJson(
            `https://api.coingecko.com/api/v3/simple/price?ids=${missingIds.join(",")}&vs_currencies=usd`
          );
          for (const sym of missingSymbols) {
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
    const prices = await getPrices(["SOL"]);
    if (sol > 0) {
      balances.push({
        symbol: "SOL",
        balance: sol,
        usdValue: sol * (prices.SOL || 0),
      });
    }

    try {
      const stakeData = await fetchJson(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 10,
          method: "getStakeActivation" in {} ? "getStakeActivation" : "getProgramAccounts",
          params: [
            "Stake11111111111111111111111111111111111111",
            {
              encoding: "jsonParsed",
              filters: [
                { memcmp: { offset: 12, bytes: address } },
              ],
            },
          ],
        }),
      });
      const stakeAccounts = stakeData.result || [];
      let totalStakedSol = 0;
      for (const acc of stakeAccounts) {
        const info = acc.account?.data?.parsed?.info;
        if (info?.stake?.delegation?.stake) {
          totalStakedSol += parseInt(info.stake.delegation.stake) / 1e9;
        }
      }
      if (totalStakedSol > 0.001) {
        balances.push({
          symbol: "SOL (staked)",
          balance: totalStakedSol,
          usdValue: totalStakedSol * (prices.SOL || 0),
        });
      }
    } catch {}
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
          const symbol = decodeXrplCurrency(line.currency);
          const isStable = symbol === "RLUSD" || symbol === "USD";
          balances.push({
            symbol,
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
    const data = await fetchJson(`https://dogecoin.atomicwallet.io/api/v2/address/${address}`);
    const satoshis = data.balance || "0";
    const doge = parseInt(satoshis) / 1e8;
    if (doge <= 0) return [];

    const prices = await getPrices(["DOGE"]);
    return [{
      symbol: "DOGE",
      balance: doge,
      usdValue: doge * (prices.DOGE || 0),
    }];
  } catch (err) {
    console.error("Dogecoin primary API error, trying fallback:", err);
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
    } catch (err2) {
      console.error("Dogecoin fallback also failed:", err2);
      return [];
    }
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
    const resp = await fetch(`https://api.koios.rest/api/v1/address_info`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ _addresses: [address] }),
    });
    if (!resp.ok) throw new Error(`Koios HTTP ${resp.status}`);
    const data = await resp.json();
    const entry = Array.isArray(data) ? data[0] : null;
    if (!entry) return [];

    const singleAddrLovelace = parseInt(entry.balance || "0");
    const singleAddrAda = singleAddrLovelace / 1e6;

    const prices = await getPrices(["ADA"]);
    const balances: ChainBalance[] = [];
    let isDelegated = false;

    if (entry.stake_address) {
      try {
        const stakeResp = await fetch(`https://api.koios.rest/api/v1/account_info`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ _stake_addresses: [entry.stake_address] }),
        });
        if (stakeResp.ok) {
          const stakeData = await stakeResp.json();
          const stakeEntry = Array.isArray(stakeData) ? stakeData[0] : null;
          if (stakeEntry && stakeEntry.delegated_pool) {
            isDelegated = true;

            const utxoAda = parseInt(stakeEntry.utxo || "0") / 1e6;
            const walletAda = utxoAda > 0 ? utxoAda : singleAddrAda;
            balances.push({
              symbol: "ADA (staked)",
              balance: walletAda,
              usdValue: walletAda * (prices.ADA || 0),
            });
            const totalRewards = parseInt(stakeEntry.rewards_available || "0") / 1e6;
            if (totalRewards > 0.01) {
              balances.push({
                symbol: "ADA (rewards)",
                balance: totalRewards,
                usdValue: totalRewards * (prices.ADA || 0),
              });
            }
          }
        }
      } catch {}
    }

    if (!isDelegated) {
      if (singleAddrAda <= 0) return [];
      balances.push({
        symbol: "ADA",
        balance: singleAddrAda,
        usdValue: singleAddrAda * (prices.ADA || 0),
      });
    }

    console.log(`Cardano scan: found ${balances.length} assets for ${address.slice(0, 15)}...`);
    return balances;
  } catch (err) {
    console.error("Cardano balance fetch error:", err);
    try {
      const data = await fetchJson(`https://cardano-mainnet.blockfrost.io/api/v0/addresses/${address}`, {
        headers: { project_id: process.env.BLOCKFROST_API_KEY || "" },
      });
      const lovelace = data.amount?.find((a: any) => a.unit === "lovelace")?.quantity || "0";
      const ada = Number(lovelace) / 1e6;
      if (ada <= 0) return [];
      const prices = await getPrices(["ADA"]);
      return [{ symbol: "ADA", balance: ada, usdValue: ada * (prices.ADA || 0) }];
    } catch (err2) {
      console.error("Cardano Blockfrost fallback also failed:", err2);
      return [];
    }
  }
}

export async function getAvalancheBalance(address: string): Promise<ChainBalance[]> {
  const balances: ChainBalance[] = [];

  try {
    const data = await fetchJson(
      `https://glacier-api.avax.network/v1/chains/43114/addresses/${address}/balances:listErc20`
    );

    const native = data.nativeTokenBalance;
    if (native && native.balance && native.balance !== "0") {
      const wei = BigInt(native.balance);
      const avax = Number(wei / 10n ** 12n) / 1e6;
      if (avax > 0) {
        const price = native.price?.value || 0;
        balances.push({
          symbol: "AVAX",
          balance: avax,
          usdValue: avax * price,
        });
      }
    }

    const tokens = data.erc20TokenBalances || [];
    for (const token of tokens) {
      const symbol = (token.symbol || "").toUpperCase();
      const decimals = parseInt(token.decimals || "18");
      const rawBalance = token.balance || "0";

      if (!symbol || rawBalance === "0") continue;

      const rawBal = BigInt(rawBalance);
      let bal: number;
      if (decimals <= 6) {
        bal = Number(rawBal) / Math.pow(10, decimals);
      } else {
        bal = Number(rawBal / (10n ** BigInt(decimals - 6))) / 1e6;
      }

      if (bal > 0.000001) {
        const price = token.price?.value || 0;
        let usdValue = bal * price;

        if (!usdValue && COINGECKO_IDS[symbol]) {
          try {
            const prices = await getPrices([symbol]);
            if (prices[symbol]) usdValue = bal * prices[symbol];
          } catch {}
        }

        balances.push({ symbol, balance: bal, usdValue });
      }
    }

    console.log(`Glacier AVAX scan: found ${balances.length} tokens for ${address}`);
  } catch (err) {
    console.error("Avalanche balance fetch error:", err);
  }

  return balances;
}

export async function getAlgorandBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(`https://mainnet-api.algonode.cloud/v2/accounts/${address}`);
    const microAlgos = data.amount || 0;
    const algo = microAlgos / 1e6;
    if (algo <= 0) return [];

    const prices = await getPrices(["ALGO"]);
    const balances: ChainBalance[] = [{
      symbol: "ALGO",
      balance: algo,
      usdValue: algo * (prices.ALGO || 0),
    }];

    const assets = data.assets || [];
    if (assets.length > 0) {
      const asaIds: Record<string, { symbol: string; decimals: number }> = {
        "31566704": { symbol: "USDC", decimals: 6 },
        "312769": { symbol: "USDT", decimals: 6 },
        "386192725": { symbol: "goETH", decimals: 8 },
        "386195940": { symbol: "goBTC", decimals: 8 },
        "793124631": { symbol: "VEST", decimals: 6 },
        "287867876": { symbol: "OPUL", decimals: 10 },
        "226701642": { symbol: "YLDY", decimals: 6 },
        "700965019": { symbol: "VESTIGE", decimals: 7 },
        "523683256": { symbol: "AKITA", decimals: 0 },
      };

      for (const asset of assets) {
        if (asset.amount > 0 && asaIds[String(asset["asset-id"])]) {
          const info = asaIds[String(asset["asset-id"])];
          const bal = asset.amount / Math.pow(10, info.decimals);
          const stablecoins = new Set(["USDC", "USDT"]);
          balances.push({
            symbol: info.symbol,
            balance: bal,
            usdValue: stablecoins.has(info.symbol) ? bal : 0,
          });
        }
      }
    }

    console.log(`Algorand scan: found ${balances.length} assets for ${address}`);
    return balances;
  } catch (err) {
    console.error("Algorand balance fetch error:", err);
    return [];
  }
}

export async function getCosmosBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(
      `https://rest.cosmos.directory/cosmoshub/cosmos/bank/v1beta1/balances/${address}`
    );

    const balances: ChainBalance[] = [];
    const denomBalances = data.balances || [];

    for (const entry of denomBalances) {
      if (entry.denom === "uatom") {
        const atom = parseInt(entry.amount) / 1e6;
        if (atom > 0) {
          const prices = await getPrices(["ATOM"]);
          balances.push({
            symbol: "ATOM",
            balance: atom,
            usdValue: atom * (prices.ATOM || 0),
          });
        }
      }
    }

    try {
      const stakingData = await fetchJson(
        `https://rest.cosmos.directory/cosmoshub/cosmos/staking/v1beta1/delegations/${address}`
      );
      const delegations = stakingData.delegation_responses || [];
      let stakedAtom = 0;
      for (const d of delegations) {
        stakedAtom += parseInt(d.balance?.amount || "0") / 1e6;
      }
      if (stakedAtom > 0) {
        const prices = await getPrices(["ATOM"]);
        balances.push({
          symbol: "ATOM (staked)",
          balance: stakedAtom,
          usdValue: stakedAtom * (prices.ATOM || 0),
        });
      }
    } catch {}

    console.log(`Cosmos scan: found ${balances.length} assets for ${address}`);
    return balances;
  } catch (err) {
    console.error("Cosmos balance fetch error:", err);
    return [];
  }
}

export async function getTronBalance(address: string): Promise<ChainBalance[]> {
  const balances: ChainBalance[] = [];

  try {
    const data = await fetchJson(`https://api.trongrid.io/v1/accounts/${address}`);
    const account = data.data?.[0];
    if (!account) return [];

    const trxLiquid = (account.balance || 0) / 1e6;
    let trxFrozen = 0;

    if (account.frozen) {
      for (const f of account.frozen) {
        trxFrozen += (f.frozen_balance || 0) / 1e6;
      }
    }

    if (account.account_resource?.frozen_balance_for_energy) {
      trxFrozen += (account.account_resource.frozen_balance_for_energy.frozen_balance || 0) / 1e6;
    }

    if (account.frozenV2) {
      for (const f of account.frozenV2) {
        trxFrozen += (f.amount || 0) / 1e6;
      }
    }

    if (account.delegated_frozen_balance_for_bandwidth) {
      trxFrozen += (account.delegated_frozen_balance_for_bandwidth || 0) / 1e6;
    }

    const prices = await getPrices(["TRX"]);
    if (trxLiquid > 0) {
      balances.push({
        symbol: "TRX",
        balance: trxLiquid,
        usdValue: trxLiquid * (prices.TRX || 0),
      });
    }
    if (trxFrozen > 0) {
      balances.push({
        symbol: "TRX (staked)",
        balance: trxFrozen,
        usdValue: trxFrozen * (prices.TRX || 0),
      });
    }

    const trc20 = account.trc20 || [];
    const knownTRC20: Record<string, { symbol: string; decimals: number }> = {
      "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t": { symbol: "USDT", decimals: 6 },
      "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8": { symbol: "USDC", decimals: 6 },
      "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR": { symbol: "WTRX", decimals: 6 },
      "TFczxzPhnThNSqr5by8tvxsdCFRRz6cPNq": { symbol: "APENFT", decimals: 6 },
      "TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S": { symbol: "SUN", decimals: 18 },
      "TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4": { symbol: "BTT", decimals: 18 },
      "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7": { symbol: "WIN", decimals: 6 },
      "TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9": { symbol: "JST", decimals: 18 },
    };

    for (const tokenObj of trc20) {
      for (const [contract, rawBalance] of Object.entries(tokenObj)) {
        const info = knownTRC20[contract];
        if (info && rawBalance && String(rawBalance) !== "0") {
          const bal = Number(BigInt(String(rawBalance))) / Math.pow(10, info.decimals);
          if (bal > 0.000001) {
            const stablecoins = new Set(["USDT", "USDC"]);
            balances.push({
              symbol: info.symbol,
              balance: bal,
              usdValue: stablecoins.has(info.symbol) ? bal : 0,
            });
          }
        }
      }
    }

    console.log(`Tron scan: found ${balances.length} assets for ${address}`);
  } catch (err) {
    console.error("Tron balance fetch error:", err);
  }

  return balances;
}

export async function getHederaBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(
      `https://mainnet-public.mirrornode.hedera.com/api/v1/balances?account.id=${address}`
    );

    const entry = data.balances?.[0];
    if (!entry) return [];

    const hbar = (entry.balance || 0) / 1e8;
    if (hbar <= 0) return [];

    const prices = await getPrices(["HBAR"]);
    const balances: ChainBalance[] = [{
      symbol: "HBAR",
      balance: hbar,
      usdValue: hbar * (prices.HBAR || 0),
    }];

    const tokens = entry.tokens || [];
    for (const token of tokens) {
      if (token.balance > 0) {
        try {
          const tokenInfo = await fetchJson(
            `https://mainnet-public.mirrornode.hedera.com/api/v1/tokens/${token.token_id}`
          );
          const symbol = (tokenInfo.symbol || token.token_id).toUpperCase();
          const decimals = parseInt(tokenInfo.decimals || "8");
          const bal = token.balance / Math.pow(10, decimals);
          if (bal > 0.000001) {
            balances.push({ symbol, balance: bal, usdValue: 0 });
          }
        } catch {
          balances.push({ symbol: token.token_id, balance: token.balance, usdValue: 0 });
        }
      }
    }

    console.log(`Hedera scan: found ${balances.length} assets for ${address}`);
    return balances;
  } catch (err) {
    console.error("Hedera balance fetch error:", err);
    return [];
  }
}

export async function getPolkadotBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(
      `https://polkadot.api.subscan.io/api/v2/scan/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: address }),
      }
    );

    const account = data.data?.account;
    if (!account) return [];

    const freeBalance = parseFloat(account.balance || "0");
    const bonded = parseFloat(account.bonded || "0");
    const reserved = parseFloat(account.reserved || "0");
    const totalDot = freeBalance + bonded + reserved;

    if (totalDot <= 0) return [];

    const balances: ChainBalance[] = [];
    const prices = await getPrices(["DOT"]);
    const dotPrice = prices.DOT || 0;

    if (freeBalance > 0) {
      balances.push({ symbol: "DOT", balance: freeBalance, usdValue: freeBalance * dotPrice });
    }
    if (bonded > 0) {
      balances.push({ symbol: "DOT (staked)", balance: bonded, usdValue: bonded * dotPrice });
    }

    console.log(`Polkadot scan: free=${freeBalance}, bonded=${bonded}, reserved=${reserved} for ${address}`);
    return balances;
  } catch (err) {
    console.error("Polkadot balance fetch error:", err);
    return [];
  }
}

export async function getVechainBalance(address: string): Promise<ChainBalance[]> {
  const balances: ChainBalance[] = [];
  try {
    const data = await fetchJson(`https://vethor-node.vechain.com/accounts/${address}`);

    const prices = await getPrices(["VET", "VTHO"]);

    if (data.balance) {
      const vetWei = BigInt(data.balance);
      const vet = Number(vetWei / 10n ** 12n) / 1e6;
      if (vet > 0) {
        balances.push({ symbol: "VET", balance: vet, usdValue: vet * (prices.VET || 0) });
      }
    }

    if (data.energy) {
      const vthoWei = BigInt(data.energy);
      const vtho = Number(vthoWei / 10n ** 12n) / 1e6;
      if (vtho > 0) {
        balances.push({ symbol: "VTHO", balance: vtho, usdValue: vtho * (prices.VTHO || 0) });
      }
    }

    console.log(`VeChain scan: found ${balances.length} assets for ${address}`);
  } catch (err) {
    console.error("VeChain balance fetch error:", err);
  }
  return balances;
}

export async function getDigibyteBalance(address: string): Promise<ChainBalance[]> {
  try {
    const resp = await fetch(`https://chainz.cryptoid.info/dgb/api.dws?q=getbalance&a=${address}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const dgb = parseFloat(text);
    if (isNaN(dgb) || dgb <= 0) throw new Error("CryptoID returned 0 or invalid");

    const prices = await getPrices(["DGB"]);
    console.log(`DigiByte scan: found balance for ${address}`);
    return [{
      symbol: "DGB",
      balance: dgb,
      usdValue: dgb * (prices.DGB || 0),
    }];
  } catch (err) {
    console.error("DigiByte CryptoID error, trying Blockchair:", err);
    try {
      const data = await fetchJson(`https://api.blockchair.com/digibyte/dashboards/address/${address}`);
      const addrData = data?.data?.[address];
      if (!addrData) return [];
      const satoshis = addrData.address?.balance || 0;
      const dgb = satoshis / 1e8;
      if (dgb <= 0) return [];
      const prices = await getPrices(["DGB"]);
      console.log(`DigiByte scan (Blockchair): found balance for ${address}`);
      return [{
        symbol: "DGB",
        balance: dgb,
        usdValue: dgb * (prices.DGB || 0),
      }];
    } catch (err2) {
      console.error("DigiByte Blockchair fallback also failed:", err2);
      return [];
    }
  }
}

export async function getCasperBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(`https://api.casperstats.io/v2/account/${address}`);
    const balance = parseFloat(data.balance || "0");
    const cspr = balance / 1e9;
    if (cspr <= 0) return [];

    const prices = await getPrices(["CSPR"]);
    console.log(`Casper scan: found balance for ${address}`);
    return [{
      symbol: "CSPR",
      balance: cspr,
      usdValue: cspr * (prices.CSPR || 0),
    }];
  } catch (err) {
    console.error("Casper balance fetch error:", err);
    return [];
  }
}

async function getCryptoOrgNativeBalance(address: string): Promise<ChainBalance[]> {
  const balances: ChainBalance[] = [];
  try {
    const data = await fetchJson(`https://crypto.org/explorer/api/v1/accounts/${address}`);
    const account = data?.result;
    if (!account) return [];

    const prices = await getPrices(["CRO"]);
    const croPrice = prices.CRO || 0;

    let liquidCro = 0;
    const liquidEntry = account.balance?.find((b: any) => b.denom === "basecro");
    if (liquidEntry) {
      liquidCro = (parseFloat(liquidEntry.amount) || 0) / 1e8;
    }

    let stakedCro = 0;
    const stakedEntries = account.bondedBalance || [];
    for (const entry of stakedEntries) {
      if (entry.denom === "basecro") {
        stakedCro += (parseFloat(entry.amount) || 0) / 1e8;
      }
    }

    let rewardsCro = 0;
    const rewardEntries = account.totalRewards || [];
    for (const entry of rewardEntries) {
      if (entry.denom === "basecro") {
        rewardsCro += (parseFloat(entry.amount) || 0) / 1e8;
      }
    }

    if (liquidCro > 0) {
      balances.push({ symbol: "CRO", balance: liquidCro, usdValue: liquidCro * croPrice });
    }
    if (stakedCro > 0) {
      balances.push({ symbol: "CRO (staked)", balance: stakedCro, usdValue: stakedCro * croPrice });
    }

    console.log(`Crypto.org native scan: found ${balances.length} assets for ${address.slice(0, 12)}...`);
  } catch (err) {
    console.error("Crypto.org native balance error:", err);
  }
  return balances;
}

export async function getCronosBalance(address: string): Promise<ChainBalance[]> {
  const balances: ChainBalance[] = [];

  if (!address.startsWith("cro1") && !address.startsWith("0x")) {
    console.log(`Cronos: skipping non-Cronos address ${address.slice(0, 12)}...`);
    return [];
  }

  if (address.startsWith("cro1")) {
    return getCryptoOrgNativeBalance(address);
  }

  try {
    const data = await fetchJson(
      `https://cronos.org/explorer/api?module=account&action=balance&address=${address}`
    );

    if (data.status === "1" && data.result && data.result !== "0") {
      const wei = BigInt(data.result);
      const cro = Number(wei / 10n ** 12n) / 1e6;
      if (cro > 0) {
        const prices = await getPrices(["CRO"]);
        balances.push({
          symbol: "CRO",
          balance: cro,
          usdValue: cro * (prices.CRO || 0),
        });
      }
    }

    try {
      const tokenData = await fetchJson(
        `https://cronos.org/explorer/api?module=account&action=tokenlist&address=${address}`
      );
      if (tokenData.status === "1" && Array.isArray(tokenData.result)) {
        for (const token of tokenData.result) {
          const symbol = (token.symbol || "").toUpperCase();
          const decimals = parseInt(token.decimals || "18");
          const rawBalance = token.balance || "0";
          if (!symbol || rawBalance === "0") continue;
          const rawBal = BigInt(rawBalance);
          let bal: number;
          if (decimals <= 6) {
            bal = Number(rawBal) / Math.pow(10, decimals);
          } else {
            bal = Number(rawBal / (10n ** BigInt(decimals - 6))) / 1e6;
          }
          if (bal > 0.000001) {
            const stablecoins = new Set(["USDT", "USDC", "DAI"]);
            balances.push({
              symbol,
              balance: bal,
              usdValue: stablecoins.has(symbol) ? bal : 0,
            });
          }
        }
      }
    } catch {}

    console.log(`Cronos EVM scan: found ${balances.length} assets for ${address}`);
  } catch (err) {
    console.error("Cronos balance fetch error:", err);
  }

  return balances;
}

export async function getNervosBalance(address: string): Promise<ChainBalance[]> {
  const balances: ChainBalance[] = [];
  try {
    const data = await fetchJson(
      `https://mainnet-api.explorer.nervos.org/api/v1/addresses/${address}`,
      { headers: { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json" } }
    );
    const attrs = Array.isArray(data.data) ? data.data[0]?.attributes : data.data?.attributes;
    if (attrs) {
      const shannonBalance = BigInt(attrs.balance || "0");
      const ckb = Number(shannonBalance / 10n ** 2n) / 1e6;
      if (ckb > 0) {
        const prices = await getPrices(["CKB"]);
        balances.push({ symbol: "CKB", balance: ckb, usdValue: ckb * (prices.CKB || 0) });
      }
      if (Array.isArray(attrs.udt_accounts)) {
        for (const udt of attrs.udt_accounts) {
          const symbol = (udt.symbol || "").toUpperCase();
          const amount = parseFloat(udt.amount || "0");
          const decimals = parseInt(udt.decimal || "0");
          if (!symbol || amount === 0) continue;
          const bal = amount / Math.pow(10, decimals);
          if (bal > 0.000001) {
            balances.push({ symbol, balance: bal, usdValue: 0 });
          }
        }
      }
    }
    console.log(`CKB scan: found ${balances.length} assets for ${address}`);
  } catch (err) {
    console.error("Nervos CKB balance fetch error:", err);
  }
  return balances;
}

function bech32ToHex(bech32Addr: string): string | null {
  try {
    const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    const sepIdx = bech32Addr.lastIndexOf("1");
    if (sepIdx < 1) return null;
    const dataStr = bech32Addr.slice(sepIdx + 1, -6);
    const data5bit: number[] = [];
    for (const c of dataStr) {
      const v = CHARSET.indexOf(c);
      if (v === -1) return null;
      data5bit.push(v);
    }
    const data8bit: number[] = [];
    let acc = 0, bits = 0;
    for (const v of data5bit) {
      acc = (acc << 5) | v;
      bits += 5;
      while (bits >= 8) {
        bits -= 8;
        data8bit.push((acc >> bits) & 0xff);
      }
    }
    return data8bit.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

export async function getZilliqaBalance(address: string): Promise<ChainBalance[]> {
  const balances: ChainBalance[] = [];
  try {
    let hexAddr = address;
    if (address.startsWith("zil1")) {
      const converted = bech32ToHex(address);
      if (converted) hexAddr = converted;
    }
    if (hexAddr.startsWith("0x")) hexAddr = hexAddr.slice(2);
    const hexAddrLower = hexAddr.toLowerCase();
    const hexAddr0x = "0x" + hexAddrLower;

    const resp = await fetch("https://api.zilliqa.com/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "1", jsonrpc: "2.0", method: "GetBalance", params: [hexAddrLower] }),
    });
    const data = await resp.json();
    const prices = await getPrices(["ZIL"]);
    const zilPrice = prices.ZIL || 0;

    if (data.result && data.result.balance) {
      const qaBalance = BigInt(data.result.balance);
      const zil = Number(qaBalance / 10n ** 6n) / 1e6;
      if (zil > 0) {
        balances.push({ symbol: "ZIL", balance: zil, usdValue: zil * zilPrice });
      }
    }

    try {
      const STAKING_PROXY = "zil1v25at4s3eh9w34uqqhe3vdvfsvcwq6un3fupc2";
      const stakingHex = bech32ToHex(STAKING_PROXY);
      if (stakingHex) {
        const stateResp = await fetch("https://api.zilliqa.com/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: "1", jsonrpc: "2.0", method: "GetSmartContractSubState",
            params: [stakingHex.replace("0x", ""), "deposit_amt_deleg", [hexAddr0x]],
          }),
        });
        const stateData = await stateResp.json();
        if (stateData.result?.deposit_amt_deleg?.[hexAddr0x]) {
          const delegations = stateData.result.deposit_amt_deleg[hexAddr0x];
          let totalStaked = 0n;
          for (const ssnAddr of Object.keys(delegations)) {
            totalStaked += BigInt(delegations[ssnAddr]);
          }
          const stakedZil = Number(totalStaked / 10n ** 6n) / 1e6;
          if (stakedZil > 0.01) {
            balances.push({ symbol: "ZIL (staked)", balance: stakedZil, usdValue: stakedZil * zilPrice });
          }
        }

        const rewardResp = await fetch("https://api.zilliqa.com/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: "1", jsonrpc: "2.0", method: "GetSmartContractSubState",
            params: [stakingHex.replace("0x", ""), "deleg_stake_per_cycle", [hexAddr0x]],
          }),
        });
        const rewardData = await rewardResp.json();
        if (rewardData.result?.deleg_stake_per_cycle?.[hexAddr0x]) {
          const buffResp = await fetch("https://api.zilliqa.com/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: "1", jsonrpc: "2.0", method: "GetSmartContractSubState",
              params: [stakingHex.replace("0x", ""), "buff_deposit_deleg", [hexAddr0x]],
            }),
          });
          const buffData = await buffResp.json();
          let buffTotal = 0n;
          if (buffData.result?.buff_deposit_deleg?.[hexAddr0x]) {
            const buffs = buffData.result.buff_deposit_deleg[hexAddr0x];
            for (const ssnAddr of Object.keys(buffs)) {
              const cycles = buffs[ssnAddr];
              for (const cycle of Object.keys(cycles)) {
                buffTotal += BigInt(cycles[cycle]);
              }
            }
          }
          const buffZil = Number(buffTotal / 10n ** 6n) / 1e6;
          if (buffZil > 0.01) {
            balances.push({ symbol: "ZIL (rewards)", balance: buffZil, usdValue: buffZil * zilPrice });
          }
        }
      }
    } catch (stakingErr) {
      console.error("ZIL staking data fetch error:", stakingErr);
    }

    console.log(`ZIL scan: found ${balances.length} assets for ${address}`);
  } catch (err) {
    console.error("Zilliqa balance fetch error:", err);
  }
  return balances;
}

export async function getXdcBalance(address: string): Promise<ChainBalance[]> {
  const balances: ChainBalance[] = [];
  const xdcAddress = address.startsWith("xdc") ? "0x" + address.slice(3) : address;

  try {
    const data = await fetchJson(
      `https://rpc.xdc.org`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBalance",
          params: [xdcAddress, "latest"],
        }),
      }
    );

    const hexBalance = data.result;
    if (hexBalance && hexBalance !== "0x0") {
      const wei = BigInt(hexBalance);
      const xdc = Number(wei / 10n ** 12n) / 1e6;
      if (xdc > 0) {
        const prices = await getPrices(["XDC"]);
        balances.push({
          symbol: "XDC",
          balance: xdc,
          usdValue: xdc * (prices.XDC || 0),
        });
      }
    }
  } catch (err) {
    console.error("XDC native balance fetch error:", err);
  }

  try {
    const tokenData = await fetchJson(
      `https://xdc.blocksscan.io/api/tokens/holding/${xdcAddress}?page=1&limit=50`
    );
    const items = tokenData?.items || tokenData?.data || [];
    if (Array.isArray(items)) {
      const stablecoins = new Set(["USDT", "USDC", "FXUSD"]);
      for (const item of items) {
        const token = item.token || item;
        const symbol = (token.symbol || "").toUpperCase();
        const decimals = parseInt(token.decimals || "18");
        const rawBalance = item.quantity || item.balance || "0";
        if (!symbol || rawBalance === "0") continue;
        try {
          const rawBal = BigInt(rawBalance);
          let bal: number;
          if (decimals <= 6) {
            bal = Number(rawBal) / Math.pow(10, decimals);
          } else {
            bal = Number(rawBal / (10n ** BigInt(decimals - 6))) / 1e6;
          }
          if (bal > 0.000001) {
            const cgId = COINGECKO_IDS[symbol];
            let usdValue = 0;
            if (stablecoins.has(symbol)) {
              usdValue = bal;
            } else if (cgId) {
              const prices = await getPrices([symbol]);
              usdValue = bal * (prices[symbol] || 0);
            }
            balances.push({ symbol, balance: bal, usdValue });
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error("XDC token balance fetch error:", err);
  }

  console.log(`XDC scan: found ${balances.length} assets for ${address.slice(0, 12)}...`);
  return balances;
}

export async function getPolygonBalance(address: string): Promise<ChainBalance[]> {
  const balances: ChainBalance[] = [];

  try {
    const data = await fetchJson(
      `https://polygon-bor-rpc.publicnode.com`, {
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
      const pol = Number(wei / 10n ** 12n) / 1e6;
      if (pol > 0) {
        const prices = await getPrices(["POL"]);
        balances.push({
          symbol: "POL",
          balance: pol,
          usdValue: pol * (prices.POL || 0),
        });
      }
    }
  } catch (err) {
    console.error("Polygon native balance fetch error:", err);
  }

  try {
    const stablecoins = new Set(["USDT", "USDC", "DAI", "BUSD"]);
    const tokenEntries: Array<{ symbol: string; balance: number }> = [];
    const blockscoutUrl = `https://polygon.blockscout.com/api/v2/addresses/${address}/tokens?type=ERC-20`;

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
          const dbPrices = await loadPricesFromDb();
          for (const sym of tokenSymbols) {
            if (dbPrices[sym]) tokenPrices[sym] = dbPrices[sym];
          }
          const missingSymbols = tokenSymbols.filter(s => !tokenPrices[s] && !stablecoins.has(s) && COINGECKO_IDS[s]);
          if (missingSymbols.length > 0) {
            const missingIds = [...new Set(missingSymbols.map(s => COINGECKO_IDS[s]).filter(Boolean))];
            const priceData = await fetchJson(
              `https://api.coingecko.com/api/v3/simple/price?ids=${missingIds.join(",")}&vs_currencies=usd`
            );
            for (const sym of missingSymbols) {
              const id = COINGECKO_IDS[sym];
              if (id && priceData[id]?.usd) {
                tokenPrices[sym] = priceData[id].usd;
              }
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
  } catch (err) {
    console.error("Polygon token balance fetch error:", err);
  }

  console.log(`Polygon scan: found ${balances.length} assets for ${address.slice(0, 12)}...`);
  return balances;
}

async function getSuiBalance(address: string): Promise<ChainBalance[]> {
  try {
    const resp = await fetch("https://fullnode.mainnet.sui.io:443", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "suix_getBalance", params: [address] }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await resp.json();
    if (json.result) {
      const balance = Number(json.result.totalBalance) / 1e9;
      const cgId = COINGECKO_IDS["SUI"];
      let usdPrice = 0;
      if (cgId) {
        try {
          const priceResp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`);
          const priceData = await priceResp.json();
          usdPrice = priceData[cgId]?.usd || 0;
        } catch {}
      }
      return [{ symbol: "SUI", balance, usdValue: balance * usdPrice }];
    }
    return [];
  } catch (err) {
    console.error("SUI balance fetch error:", err);
    return [];
  }
}

async function getSonicBalance(address: string): Promise<ChainBalance[]> {
  try {
    const resp = await fetch("https://rpc.soniclabs.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await resp.json();
    if (json.result) {
      const balance = Number(BigInt(json.result)) / 1e18;
      const cgId = COINGECKO_IDS["S"];
      let usdPrice = 0;
      if (cgId) {
        try {
          const priceResp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`);
          const priceData = await priceResp.json();
          usdPrice = priceData[cgId]?.usd || 0;
        } catch {}
      }
      return [{ symbol: "S", balance, usdValue: balance * usdPrice }];
    }
    return [];
  } catch (err) {
    console.error("Sonic balance fetch error:", err);
    return [];
  }
}

async function getFetBalance(address: string): Promise<ChainBalance[]> {
  try {
    if (address.startsWith("fetch1")) {
      const resp = await fetch(`https://rest-fetchhub.fetch.ai/cosmos/bank/v1beta1/balances/${address}`, {
        signal: AbortSignal.timeout(15000),
      });
      const json = await resp.json();
      const balances: ChainBalance[] = [];
      const fetEntry = (json.balances || []).find((b: any) => b.denom === "afet");
      if (fetEntry) {
        const balance = Number(fetEntry.amount) / 1e18;
        const cgId = COINGECKO_IDS["FET"];
        let usdPrice = 0;
        if (cgId) {
          try {
            const priceResp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`);
            const priceData = await priceResp.json();
            usdPrice = priceData[cgId]?.usd || 0;
          } catch {}
        }
        balances.push({ symbol: "FET", balance, usdValue: balance * usdPrice });
      }
      return balances;
    }
    if (address.startsWith("0x")) {
      const resp = await fetch("https://eth.llamarpc.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "eth_call",
          params: [{ to: "0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85", data: "0x70a08231" + address.slice(2).toLowerCase().padStart(64, "0") }, "latest"],
        }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await resp.json();
      if (json.result) {
        const balance = Number(BigInt(json.result)) / 1e18;
        const cgId = COINGECKO_IDS["FET"];
        let usdPrice = 0;
        if (cgId) {
          try {
            const priceResp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`);
            const priceData = await priceResp.json();
            usdPrice = priceData[cgId]?.usd || 0;
          } catch {}
        }
        return [{ symbol: "FET", balance, usdValue: balance * usdPrice }];
      }
    }
    return [];
  } catch (err) {
    console.error("FET balance fetch error:", err);
    return [];
  }
}

export type SupportedChain = "bitcoin" | "ethereum" | "solana" | "xrp" | "flare" | "dogecoin" | "litecoin" | "cardano" | "avalanche" | "algorand" | "cosmos" | "tron" | "hedera" | "polkadot" | "vechain" | "digibyte" | "casper" | "cronos" | "nervos" | "zilliqa" | "ton" | "stellar" | "verge" | "xdc" | "polygon" | "sui" | "sonic" | "fet";

export const CHAIN_CONFIG: Record<SupportedChain, { name: string; symbol: string; addressPattern: string; example: string }> = {
  bitcoin: { name: "Bitcoin", symbol: "BTC", addressPattern: "^(1|3|bc1)", example: "bc1q..." },
  ethereum: { name: "Ethereum", symbol: "ETH", addressPattern: "^0x[a-fA-F0-9]{40}$", example: "0x..." },
  solana: { name: "Solana", symbol: "SOL", addressPattern: "^[1-9A-HJ-NP-Za-km-z]{43,44}$", example: "DRpb..." },
  xrp: { name: "XRP Ledger", symbol: "XRP", addressPattern: "^r[1-9A-HJ-NP-Za-km-z]{24,34}$", example: "rXXX..." },
  flare: { name: "Flare", symbol: "FLR", addressPattern: "^0x[a-fA-F0-9]{40}$", example: "0x..." },
  dogecoin: { name: "Dogecoin", symbol: "DOGE", addressPattern: "^D[1-9A-HJ-NP-Za-km-z]{33}$", example: "D7Y..." },
  litecoin: { name: "Litecoin", symbol: "LTC", addressPattern: "^(L|M|ltc1)", example: "ltc1q..." },
  cardano: { name: "Cardano", symbol: "ADA", addressPattern: "^addr1", example: "addr1..." },
  avalanche: { name: "Avalanche C-Chain", symbol: "AVAX", addressPattern: "^0x[a-fA-F0-9]{40}$", example: "0x..." },
  algorand: { name: "Algorand", symbol: "ALGO", addressPattern: "^[A-Z2-7]{58}$", example: "ALGO..." },
  cosmos: { name: "Cosmos Hub", symbol: "ATOM", addressPattern: "^cosmos1", example: "cosmos1..." },
  tron: { name: "Tron", symbol: "TRX", addressPattern: "^T[1-9A-HJ-NP-Za-km-z]{33}$", example: "T..." },
  hedera: { name: "Hedera", symbol: "HBAR", addressPattern: "^0\\.0\\.", example: "0.0.12345" },
  polkadot: { name: "Polkadot", symbol: "DOT", addressPattern: "^1[1-9A-HJ-NP-Za-km-z]{47}$", example: "1..." },
  vechain: { name: "VeChain", symbol: "VET", addressPattern: "^0x[a-fA-F0-9]{40}$", example: "0x..." },
  digibyte: { name: "DigiByte", symbol: "DGB", addressPattern: "^(D|dgb1)", example: "D..." },
  casper: { name: "Casper", symbol: "CSPR", addressPattern: "^0[12]", example: "01..." },
  cronos: { name: "Cronos", symbol: "CRO", addressPattern: "^(0x[a-fA-F0-9]{40}|cro1)", example: "0x..." },
  nervos: { name: "Nervos CKB", symbol: "CKB", addressPattern: "^ckb1", example: "ckb1q..." },
  zilliqa: { name: "Zilliqa", symbol: "ZIL", addressPattern: "^(zil1|0x)", example: "zil1..." },
  ton: { name: "TON", symbol: "TON", addressPattern: "^(EQ|UQ|0:|kf)", example: "UQ..." },
  stellar: { name: "Stellar", symbol: "XLM", addressPattern: "^G[A-Z2-7]{55}$", example: "G..." },
  verge: { name: "Verge", symbol: "XVG", addressPattern: "^D[1-9A-HJ-NP-Za-km-z]{33}$", example: "D..." },
  xdc: { name: "XDC Network", symbol: "XDC", addressPattern: "^(xdc[a-fA-F0-9]{40}|0x[a-fA-F0-9]{40})$", example: "xdc..." },
  polygon: { name: "Polygon", symbol: "POL", addressPattern: "^0x[a-fA-F0-9]{40}$", example: "0x..." },
  sui: { name: "Sui", symbol: "SUI", addressPattern: "^0x[a-fA-F0-9]{64}$", example: "0x..." },
  sonic: { name: "Sonic", symbol: "S", addressPattern: "^0x[a-fA-F0-9]{40}$", example: "0x..." },
  fet: { name: "Fetch.ai / ASI", symbol: "FET", addressPattern: "^(fetch1|0x)", example: "fetch1..." },
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
    case "flare":
      return getFlareBalance(address);
    case "dogecoin":
      return getDogeBalance(address);
    case "litecoin":
      return getLitecoinBalance(address);
    case "cardano":
      return getCardanoBalance(address);
    case "avalanche":
      return getAvalancheBalance(address);
    case "algorand":
      return getAlgorandBalance(address);
    case "cosmos":
      return getCosmosBalance(address);
    case "tron":
      return getTronBalance(address);
    case "hedera":
      return getHederaBalance(address);
    case "polkadot":
      return getPolkadotBalance(address);
    case "vechain":
      return getVechainBalance(address);
    case "digibyte":
      return getDigibyteBalance(address);
    case "casper":
      return getCasperBalance(address);
    case "cronos":
      return getCronosBalance(address);
    case "nervos":
      return getNervosBalance(address);
    case "zilliqa":
      return getZilliqaBalance(address);
    case "stellar":
      return getStellarBalance(address);
    case "verge":
      return getVergeBalance(address);
    case "ton":
      return getTonBalance(address);
    case "xdc":
      return getXdcBalance(address);
    case "polygon":
      return getPolygonBalance(address);
    case "sui":
      return getSuiBalance(address);
    case "sonic":
      return getSonicBalance(address);
    case "fet":
      return getFetBalance(address);
    default:
      return [];
  }
}

export function detectCorrectChain(storedChain: SupportedChain, address: string): SupportedChain | null {
  const a = address.trim();
  const currentPattern = CHAIN_CONFIG[storedChain]?.addressPattern;
  if (currentPattern && new RegExp(currentPattern).test(a)) {
    return null;
  }
  const priorityOrder: SupportedChain[] = [
    "bitcoin", "ethereum", "solana", "xrp", "flare", "ton", "litecoin", "dogecoin",
    "tron", "cardano", "algorand", "cosmos", "hedera", "polkadot",
    "stellar", "vechain", "cronos", "nervos", "zilliqa", "digibyte",
    "casper", "verge", "avalanche", "xdc", "polygon", "sui", "sonic", "fet",
  ];
  for (const chain of priorityOrder) {
    if (chain === storedChain) continue;
    const pattern = CHAIN_CONFIG[chain]?.addressPattern;
    if (pattern && new RegExp(pattern).test(a)) {
      return chain;
    }
  }
  return null;
}

export async function getFlareBalance(address: string): Promise<ChainBalance[]> {
  const balances: ChainBalance[] = [];
  const FLARE_RPC = "https://flare-api.flare.network/ext/C/rpc";
  const WFLR_CONTRACT = "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d";

  try {
    const nativeRes = await fetch(FLARE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [address, "latest"],
      }),
    });
    const nativeData = await nativeRes.json();
    if (nativeData.result) {
      const wei = BigInt(nativeData.result);
      const flr = Number(wei / 10n ** 12n) / 1e6;
      if (flr > 0) {
        const prices = await getPrices(["FLR"]);
        balances.push({
          symbol: "FLR",
          balance: flr,
          usdValue: flr * (prices.FLR || 0),
        });
      }
    }
  } catch (e) {
    console.log(`Flare native balance error for ${address.slice(0, 12)}...:`, e);
  }

  try {
    const balanceOfData = "0x70a08231" + address.slice(2).toLowerCase().padStart(64, "0");
    const wflrRes = await fetch(FLARE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "eth_call",
        params: [{ to: WFLR_CONTRACT, data: balanceOfData }, "latest"],
      }),
    });
    const wflrData = await wflrRes.json();
    if (wflrData.result && wflrData.result !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      const wei = BigInt(wflrData.result);
      const wflr = Number(wei / 10n ** 12n) / 1e6;
      if (wflr > 0) {
        const prices = await getPrices(["FLR"]);
        balances.push({
          symbol: "WFLR",
          balance: wflr,
          usdValue: wflr * (prices.FLR || 0),
        });
      }
    }
  } catch (e) {
    console.log(`Flare WFLR balance error for ${address.slice(0, 12)}...:`, e);
  }

  console.log(`Flare: found ${balances.length} assets for ${address.slice(0, 12)}...`);
  return balances;
}

export async function getTonBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(`https://toncenter.com/api/v2/getAddressBalance?address=${address}`);
    if (!data.ok || !data.result) return [];
    const nanoton = BigInt(data.result);
    const ton = Number(nanoton / 1000000n) / 1000;
    if (ton <= 0) return [];
    const prices = await getPrices(["TON"]);
    const balances: ChainBalance[] = [{
      symbol: "TON",
      balance: ton,
      usdValue: ton * (prices.TON || 0),
    }];
    try {
      const jettonData = await fetchJson(`https://toncenter.com/api/v3/jetton/wallets?owner_address=${address}&limit=50`);
      if (jettonData.jetton_wallets && Array.isArray(jettonData.jetton_wallets)) {
        for (const jw of jettonData.jetton_wallets) {
          const rawBal = jw.balance || "0";
          if (rawBal === "0") continue;
          const symbol = (jw.jetton?.symbol || jw.jetton?.name || "").toUpperCase();
          if (!symbol) continue;
          const decimals = parseInt(jw.jetton?.decimals || "9");
          const bigBal = BigInt(rawBal);
          const bal = Number(bigBal / (10n ** BigInt(Math.max(0, decimals - 6)))) / 1e6;
          if (bal > 0.000001) {
            const stablecoins = new Set(["USDT", "USDC"]);
            balances.push({
              symbol,
              balance: bal,
              usdValue: stablecoins.has(symbol) ? bal : 0,
            });
          }
        }
      }
    } catch {}
    return balances;
  } catch (err) {
    console.error("TON balance fetch error:", err);
    return [];
  }
}

export async function getVergeBalance(address: string): Promise<ChainBalance[]> {
  const apis = [
    async () => {
      const resp = await fetch(`https://chainz.cryptoid.info/xvg/api.dws?q=getbalance&a=${address}`, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      if (text.includes("unknown") || text.includes("expired")) throw new Error("API unavailable");
      return parseFloat(text);
    },
    async () => {
      const data = await fetchJson(`https://verge-blockchain.info/ext/getbalance/${address}`);
      if (typeof data === "number") return data;
      if (typeof data === "string") return parseFloat(data);
      throw new Error("Unexpected response");
    },
    async () => {
      const data = await fetchJson(`https://api.blockchair.com/verge/dashboards/address/${address}`);
      if (!data?.data?.[address]) throw new Error("No data from Blockchair");
      const addrData = data.data[address].address;
      const satoshis = addrData?.balance || 0;
      return satoshis / 1e8;
    },
  ];

  for (const apiFn of apis) {
    try {
      const xvg = await apiFn();
      if (isNaN(xvg) || xvg <= 0) continue;
      const prices = await getPrices(["XVG"]);
      return [{ symbol: "XVG", balance: xvg, usdValue: xvg * (prices.XVG || 0) }];
    } catch {}
  }
  console.warn(`Verge: all APIs failed for ${address.slice(0, 12)}...`);
  return [];
}

export async function getStellarBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(`https://horizon.stellar.org/accounts/${address}`);
    const balances: ChainBalance[] = [];
    const prices = await getPrices(["XLM", "USDC", "USDT"]);

    for (const bal of data.balances || []) {
      if (bal.asset_type === "native") {
        const amount = parseFloat(bal.balance) || 0;
        if (amount > 0) {
          balances.push({
            symbol: "XLM",
            balance: amount,
            usdValue: amount * (prices.XLM || 0),
          });
        }
      } else if (bal.asset_code) {
        const amount = parseFloat(bal.balance) || 0;
        if (amount > 0) {
          const symbol = bal.asset_code.toUpperCase();
          const price = prices[symbol] || 0;
          const usdValue = ["USDC", "USDT"].includes(symbol) ? amount : amount * price;
          balances.push({ symbol, balance: amount, usdValue });
        }
      }
    }
    return balances;
  } catch (e) {
    console.error("Stellar balance error:", e);
    return [];
  }
}
