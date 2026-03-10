import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Shield,
  Globe,
  TrendingUp,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Landmark,
  CreditCard,
  ArrowRightLeft,
  Banknote,
  Info,
  Wallet,
} from "lucide-react";

interface StablecoinEntry {
  id: string;
  name: string;
  symbol: string;
  issuer: string;
  chains: string[];
  backingType: string;
  regulatoryStatus: string;
  yieldOpportunities: { protocol: string; apy: string; chain: string }[];
  bestUseCase: string;
  marketCap?: string;
  description: string;
}

const STABLECOINS: StablecoinEntry[] = [
  {
    id: "rlusd",
    name: "RLUSD",
    symbol: "RLUSD",
    issuer: "Ripple",
    chains: ["XRPL", "Ethereum"],
    backingType: "USD deposits, US Treasuries",
    regulatoryStatus: "NYDFS-approved",
    yieldOpportunities: [
      { protocol: "Soil Protocol", apy: "5-8%", chain: "XRPL" },
    ],
    bestUseCase: "Yield earning on XRPL, cross-border payments",
    marketCap: "$300M+",
    description:
      "Ripple-issued stablecoin with regulatory approval from the New York Department of Financial Services. Native to XRPL with deep integration into Soil Protocol vaults for yield generation.",
  },
  {
    id: "usdc",
    name: "USD Coin",
    symbol: "USDC",
    issuer: "Circle",
    chains: ["Ethereum", "Solana", "Stellar", "Base", "Polygon", "Avalanche"],
    backingType: "USD reserves, short-term US Treasuries",
    regulatoryStatus: "Regulated (US), MiCA-compliant (EU)",
    yieldOpportunities: [
      { protocol: "Aave", apy: "3-5%", chain: "Ethereum" },
      { protocol: "Compound", apy: "2-4%", chain: "Ethereum" },
      { protocol: "Morpho", apy: "4-7%", chain: "Base" },
    ],
    bestUseCase: "DeFi composability, on/off-ramp, payments",
    marketCap: "$33B+",
    description:
      "The most widely supported regulated stablecoin. Monthly reserve attestations by Deloitte. Available on virtually every major chain and CEX.",
  },
  {
    id: "usdt",
    name: "Tether",
    symbol: "USDT",
    issuer: "Tether Limited",
    chains: ["Ethereum", "Tron", "BSC", "Solana", "Avalanche"],
    backingType: "Commercial paper, US Treasuries, reserves",
    regulatoryStatus: "Unregulated (offshore)",
    yieldOpportunities: [
      { protocol: "Aave", apy: "2-5%", chain: "Ethereum" },
      { protocol: "Venus", apy: "3-6%", chain: "BSC" },
    ],
    bestUseCase: "Trading pairs, high liquidity, Tron transfers",
    marketCap: "$140B+",
    description:
      "The largest stablecoin by market cap with the deepest liquidity across centralized and decentralized exchanges. Dominant on Tron for low-fee transfers.",
  },
  {
    id: "eurcv",
    name: "EUR CoinVertible",
    symbol: "EURCV",
    issuer: "SocGen-FORGE (Societe Generale)",
    chains: ["XRPL", "Stellar", "Ethereum"],
    backingType: "Euro reserves, EU-regulated",
    regulatoryStatus: "MiCA-compliant",
    yieldOpportunities: [
      { protocol: "Institutional pools", apy: "2-4%", chain: "Ethereum" },
    ],
    bestUseCase: "Euro-denominated payments, EU compliance",
    marketCap: "$50M+",
    description:
      "MiCA-compliant euro stablecoin issued by Societe Generale. One of the first institutional-grade euro stablecoins available across multiple chains.",
  },
  {
    id: "pyusd",
    name: "PayPal USD",
    symbol: "PYUSD",
    issuer: "PayPal (Paxos Trust)",
    chains: ["Ethereum", "Solana"],
    backingType: "USD deposits, US Treasuries, reverse repos",
    regulatoryStatus: "NYDFS-regulated (via Paxos)",
    yieldOpportunities: [
      { protocol: "Aave", apy: "2-4%", chain: "Ethereum" },
      { protocol: "Kamino", apy: "4-8%", chain: "Solana" },
    ],
    bestUseCase: "PayPal ecosystem, mainstream adoption bridge",
    marketCap: "$800M+",
    description:
      "PayPal's regulated stablecoin issued through Paxos Trust. Bridging traditional fintech users into crypto with familiar brand trust.",
  },
  {
    id: "dai",
    name: "DAI / USDS",
    symbol: "DAI",
    issuer: "MakerDAO (Sky)",
    chains: ["Ethereum", "Polygon", "Arbitrum", "Optimism"],
    backingType: "Crypto-collateralized (ETH, USDC, RWA)",
    regulatoryStatus: "Decentralized (no single regulator)",
    yieldOpportunities: [
      { protocol: "Maker DSR", apy: "5-8%", chain: "Ethereum" },
      { protocol: "Spark", apy: "5-8%", chain: "Ethereum" },
    ],
    bestUseCase: "Decentralized savings, censorship resistance",
    marketCap: "$5B+",
    description:
      "The original decentralized stablecoin, now transitioning to USDS under the Sky rebrand. Backed by a diversified basket including crypto and real-world assets.",
  },
];

const DECISION_GUIDE = [
  {
    useCase: "Savings & Yield",
    icon: TrendingUp,
    recommended: ["RLUSD", "DAI"],
    reason:
      "RLUSD offers 5-8% via Soil Protocol vaults on XRPL. DAI offers competitive rates through Maker's DSR (Dai Savings Rate).",
  },
  {
    useCase: "Payments & Commerce",
    icon: CreditCard,
    recommended: ["USDC", "PYUSD"],
    reason:
      "USDC has the widest merchant and payment processor support. PYUSD leverages PayPal's existing network for mainstream adoption.",
  },
  {
    useCase: "Trading & Liquidity",
    icon: ArrowRightLeft,
    recommended: ["USDT", "USDC"],
    reason:
      "USDT has the deepest trading pair liquidity. USDC is preferred on regulated exchanges and DeFi protocols.",
  },
  {
    useCase: "Remittances",
    icon: Globe,
    recommended: ["USDC", "RLUSD"],
    reason:
      "USDC on Stellar offers near-instant, low-fee cross-border transfers. RLUSD on XRPL provides fast settlement with Ripple's payment corridors.",
  },
  {
    useCase: "EU Compliance",
    icon: Shield,
    recommended: ["EURCV", "USDC"],
    reason:
      "EURCV is MiCA-compliant and euro-denominated. USDC has received MiCA compliance from Circle for EU operations.",
  },
  {
    useCase: "Censorship Resistance",
    icon: Landmark,
    recommended: ["DAI"],
    reason:
      "DAI is the only major stablecoin with no centralized issuer who can freeze or blacklist addresses. Fully governed by DAO.",
  },
];

interface WalletData {
  id: string;
  chain: string;
  address: string;
  label?: string;
  balances?: { assetSymbol: string; balance: string; usdValue: string }[];
}

function StablecoinCard({ coin }: { coin: StablecoinEntry }) {
  return (
    <Card data-testid={`card-stablecoin-${coin.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap" data-testid={`text-stablecoin-name-${coin.id}`}>
            {coin.name}
            <Badge variant="outline" className="text-xs shrink-0">
              {coin.symbol}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{coin.issuer}</p>
        </div>
        {coin.marketCap && (
          <Badge variant="secondary" className="shrink-0" data-testid={`badge-mcap-${coin.id}`}>
            {coin.marketCap}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground" data-testid={`text-desc-${coin.id}`}>
          {coin.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Chains</p>
            <div className="flex flex-wrap gap-1">
              {coin.chains.map((chain) => (
                <Badge key={chain} variant="outline" className="text-xs">
                  {chain}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Backing</p>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm" data-testid={`text-backing-${coin.id}`}>{coin.backingType}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Regulatory Status</p>
            <div className="flex items-center gap-1.5">
              {coin.regulatoryStatus.includes("Regulated") || coin.regulatoryStatus.includes("approved") || coin.regulatoryStatus.includes("MiCA") ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
              <span className="text-sm" data-testid={`text-regulatory-${coin.id}`}>{coin.regulatoryStatus}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Best Use Case</p>
            <span className="text-sm" data-testid={`text-usecase-${coin.id}`}>{coin.bestUseCase}</span>
          </div>
        </div>

        {coin.yieldOpportunities.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Yield Opportunities</p>
            <div className="space-y-1.5">
              {coin.yieldOpportunities.map((y, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md bg-muted/30 border border-muted px-3 py-2"
                  data-testid={`yield-opp-${coin.id}-${i}`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span className="text-sm">{y.protocol}</span>
                    <Badge variant="outline" className="text-xs">{y.chain}</Badge>
                  </div>
                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 shrink-0">
                    {y.apy} APY
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Stablecoins() {
  const [activeTab, setActiveTab] = useState("directory");

  const { data: walletsData } = useQuery<WalletData[]>({
    queryKey: ["/api/wallets"],
  });

  const stablecoinSymbols = STABLECOINS.map((c) => c.symbol.toUpperCase());
  const altSymbols: Record<string, string> = {
    RLUSD: "RLUSD",
    USDC: "USDC",
    USDT: "USDT",
    EURCV: "EURCV",
    PYUSD: "PYUSD",
    DAI: "DAI",
    USDS: "DAI",
  };

  const userHoldings: { symbol: string; balance: number; usdValue: number; location: string }[] = [];
  if (walletsData) {
    for (const w of walletsData) {
      for (const b of w.balances || []) {
        const sym = b.assetSymbol.toUpperCase().replace(/\s*\(STAKED\)/i, "");
        const mapped = altSymbols[sym];
        if (mapped) {
          userHoldings.push({
            symbol: mapped,
            balance: parseFloat(b.balance) || 0,
            usdValue: parseFloat(b.usdValue) || 0,
            location: w.label || `${w.chain} wallet`,
          });
        }
      }
    }
  }

  const totalStablecoinValue = userHoldings.reduce((sum, h) => sum + h.usdValue, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-stablecoins-title">
          Stablecoin Command Center
        </h1>
        <p className="text-muted-foreground mt-1">
          Your digital dollars, euros, and more — organized across every chain
        </p>
      </div>

      <Card>
        <CardContent className="py-5">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">What are stablecoins?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Stablecoins are crypto tokens pegged to real-world currencies like USD or EUR.
                They combine the speed and programmability of blockchain with the price stability of traditional money.
                Use them for savings, payments, trading, and earning yield — without the volatility of Bitcoin or Ethereum.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {userHoldings.length > 0 && (
        <Card data-testid="card-user-stablecoin-holdings">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Your Stablecoin Holdings</CardTitle>
            <Badge variant="secondary" data-testid="badge-total-stablecoin-value">
              ${totalStablecoinValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userHoldings.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                  data-testid={`holding-stablecoin-${h.symbol}-${i}`}
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{h.symbol}</span>
                    <span className="text-xs text-muted-foreground">{h.location}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">
                      ${h.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {h.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {h.symbol}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 mb-4" data-testid="stablecoins-tabs">
          <TabsTrigger value="directory" data-testid="tab-directory">Directory</TabsTrigger>
          <TabsTrigger value="yield-map" data-testid="tab-yield-map">Where to Earn</TabsTrigger>
          <TabsTrigger value="decision-guide" data-testid="tab-decision-guide">Which One?</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" data-testid="tab-content-directory">
          <div className="grid gap-6 md:grid-cols-2">
            {STABLECOINS.map((coin) => (
              <StablecoinCard key={coin.id} coin={coin} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="yield-map" data-testid="tab-content-yield-map">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Where to Earn Yield on Stablecoins
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Mapping each stablecoin to the protocols and chains where you can earn yield.
              </p>
            </div>

            {STABLECOINS.filter((c) => c.yieldOpportunities.length > 0).map((coin) => (
              <Card key={coin.id} data-testid={`card-yield-${coin.id}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{coin.symbol}</CardTitle>
                    <span className="text-sm text-muted-foreground">by {coin.issuer}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {coin.yieldOpportunities.map((y, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md bg-muted/30 border border-muted px-3 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                          <div>
                            <span className="text-sm font-medium">{y.protocol}</span>
                            <p className="text-xs text-muted-foreground">{y.chain}</p>
                          </div>
                        </div>
                        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                          {y.apy} APY
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardContent className="py-5">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">About Yield Rates</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      APY rates are variable and change based on supply, demand, and protocol mechanics.
                      Rates shown are approximate ranges based on recent data. Always verify current rates
                      on the protocol's website before depositing. Higher yields generally carry higher risk.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="decision-guide" data-testid="tab-content-decision-guide">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-1">
                <Banknote className="h-4 w-4" />
                Which Stablecoin Is Right for You?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose based on your primary use case. Each stablecoin has different strengths.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {DECISION_GUIDE.map((guide) => (
                <Card key={guide.useCase} data-testid={`card-guide-${guide.useCase.toLowerCase().replace(/\s+/g, "-")}`}>
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                    <guide.icon className="h-5 w-5 text-primary shrink-0" />
                    <CardTitle className="text-base" data-testid={`text-guide-usecase-${guide.useCase.toLowerCase().replace(/\s+/g, "-")}`}>
                      {guide.useCase}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Recommended:</span>
                      {guide.recommended.map((sym) => (
                        <Badge key={sym} variant="secondary" className="text-xs">
                          {sym}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-guide-reason-${guide.useCase.toLowerCase().replace(/\s+/g, "-")}`}>
                      {guide.reason}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="py-5">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Risk Considerations</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All stablecoins carry some risk. Centralized stablecoins (USDC, USDT, RLUSD, PYUSD) depend on the issuer
                      maintaining reserves and can freeze addresses. Decentralized stablecoins (DAI) have smart contract risk.
                      No stablecoin is truly "risk-free." Diversifying across multiple stablecoins can reduce single-issuer risk.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <a href="/ownbank/vaults" data-testid="link-goto-vaults">
                <Button className="bg-[#00A4E4] text-white border-[#00A4E4]">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Start Earning on RLUSD Vaults
                </Button>
              </a>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
