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
  QI: "benqi",
  DGB: "digibyte",
  CSPR: "casper-network",
  TRX: "tron",
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

    const trxBalance = (account.balance || 0) / 1e6;
    if (trxBalance > 0) {
      const prices = await getPrices(["TRX"]);
      balances.push({
        symbol: "TRX",
        balance: trxBalance,
        usdValue: trxBalance * (prices.TRX || 0),
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

    const balStr = account.balance || "0";
    const dot = parseFloat(balStr);
    if (dot <= 0) return [];

    const prices = await getPrices(["DOT"]);
    console.log(`Polkadot scan: found DOT balance for ${address}`);
    return [{
      symbol: "DOT",
      balance: dot,
      usdValue: dot * (prices.DOT || 0),
    }];
  } catch (err) {
    console.error("Polkadot balance fetch error:", err);
    return [];
  }
}

export async function getVechainBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(`https://vet.blockscout.com/api/v2/addresses/${address}`);

    const balances: ChainBalance[] = [];

    if (data.coin_balance) {
      const vet = Number(BigInt(data.coin_balance) / 10n ** 12n) / 1e6;
      if (vet > 0) {
        const prices = await getPrices(["VET"]);
        balances.push({
          symbol: "VET",
          balance: vet,
          usdValue: vet * (prices.VET || 0),
        });
      }
    }

    try {
      const tokenData = await fetchJson(
        `https://vet.blockscout.com/api/v2/addresses/${address}/tokens?type=ERC-20`
      );
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
          balances.push({ symbol, balance: bal, usdValue: 0 });
        }
      }
    } catch {}

    console.log(`VeChain scan: found ${balances.length} assets for ${address}`);
    return balances;
  } catch (err) {
    console.error("VeChain balance fetch error:", err);
    return [];
  }
}

export async function getDigibyteBalance(address: string): Promise<ChainBalance[]> {
  try {
    const data = await fetchJson(`https://dgb1.trezor.io/api/v2/address/${address}?details=basic`);
    const balance = data.balance || "0";
    const dgb = Number(balance) / 1e8;
    if (dgb <= 0) return [];

    const prices = await getPrices(["DGB"]);
    console.log(`DigiByte scan: found balance for ${address}`);
    return [{
      symbol: "DGB",
      balance: dgb,
      usdValue: dgb * (prices.DGB || 0),
    }];
  } catch (err) {
    console.error("DigiByte balance fetch error:", err);
    return [];
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

export async function getCronosBalance(address: string): Promise<ChainBalance[]> {
  const balances: ChainBalance[] = [];

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

    console.log(`Cronos scan: found ${balances.length} assets for ${address}`);
  } catch (err) {
    console.error("Cronos balance fetch error:", err);
  }

  return balances;
}

export type SupportedChain = "bitcoin" | "ethereum" | "solana" | "xrp" | "dogecoin" | "litecoin" | "cardano" | "avalanche" | "algorand" | "cosmos" | "tron" | "hedera" | "polkadot" | "vechain" | "digibyte" | "casper" | "cronos";

export const CHAIN_CONFIG: Record<SupportedChain, { name: string; symbol: string; addressPattern: string; example: string }> = {
  bitcoin: { name: "Bitcoin", symbol: "BTC", addressPattern: "^(1|3|bc1)", example: "bc1q..." },
  ethereum: { name: "Ethereum", symbol: "ETH", addressPattern: "^0x[a-fA-F0-9]{40}$", example: "0x..." },
  solana: { name: "Solana", symbol: "SOL", addressPattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$", example: "DRpb..." },
  xrp: { name: "XRP Ledger", symbol: "XRP", addressPattern: "^r[1-9A-HJ-NP-Za-km-z]{24,34}$", example: "rXXX..." },
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
  cronos: { name: "Cronos", symbol: "CRO", addressPattern: "^0x[a-fA-F0-9]{40}$", example: "0x..." },
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
    default:
      return [];
  }
}
