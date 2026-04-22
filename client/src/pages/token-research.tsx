import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { SeoHead } from "@/components/seo-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Copy,
  Users,
  Coins,
  FileCode,
  Eye,
  Wallet,
  Scale,
  Fuel,
  Droplets,
  Link2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { EVM_CHAINS } from "@/lib/evm-wallet";

const CHAIN_EXPLORERS: Record<number, { name: string; url: string }> = {
  1: { name: "Etherscan", url: "https://etherscan.io" },
  137: { name: "PolygonScan", url: "https://polygonscan.com" },
  42161: { name: "Arbiscan", url: "https://arbiscan.io" },
  10: { name: "OP Explorer", url: "https://optimistic.etherscan.io" },
  8453: { name: "BaseScan", url: "https://basescan.org" },
  43114: { name: "SnowTrace", url: "https://snowtrace.io" },
  56: { name: "BscScan", url: "https://bscscan.com" },
};

const DEXSCREENER_CHAINS: Record<number, string> = {
  1: "ethereum",
  137: "polygon",
  42161: "arbitrum",
  10: "optimism",
  8453: "base",
  43114: "avalanche",
  56: "bsc",
};

interface TokenSafety {
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  greenFlags: string[];
  redFlags: string[];
  holderCount: number;
  isHoneypot: boolean;
}

interface TokenSearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  large: string;
  marketCapRank: number | null;
  currentPrice: number | null;
  marketCap: number | null;
  volume24h: number | null;
  priceChange24h: number | null;
  platforms: { chainId: number; address: string; platform: string }[];
  allPlatforms: { platform: string; address: string; chainId: number | null }[];
  safety: TokenSafety | null;
  platformSafety?: Record<string, TokenSafety>;
}

interface TokenResearchResult {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
  isContract: boolean;
  riskScore: number | null;
  riskLevel: "low" | "medium" | "high" | "unknown";
  warnings: string[];
  signals: string[];
  goplus?: {
    isOpenSource: boolean;
    isProxy: boolean;
    isMintable: boolean;
    canTakeBackOwnership: boolean;
    ownerChangeBalance: boolean;
    hiddenOwner: boolean;
    isHoneypot: boolean;
    buyTax: number;
    sellTax: number;
    holderCount: number | null;
    lpHolderCount: number | null;
    ownerAddress: string | null;
    creatorAddress: string | null;
    isAntiWhale: boolean;
    tradingCooldown: boolean;
    isBlacklisted: boolean;
    transferPausable: boolean;
    cannotSellAll: boolean;
    externalCall: boolean;
  };
}

function RiskBadge({ level, score }: { level: string; score: number | null }) {
  if (level === "unknown" || score === null) {
    return (
      <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30" data-testid="badge-risk-unknown">
        <HelpCircle className="h-3 w-3 mr-1" />
        Unknown Risk
      </Badge>
    );
  }
  if (level === "high") {
    return (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/30" data-testid="badge-risk-high">
        <ShieldX className="h-3 w-3 mr-1" />
        High Risk ({score}%)
      </Badge>
    );
  }
  if (level === "medium") {
    return (
      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30" data-testid="badge-risk-medium">
        <ShieldAlert className="h-3 w-3 mr-1" />
        Medium Risk ({score}%)
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-500/10 text-green-600 border-green-500/30" data-testid="badge-risk-low">
      <ShieldCheck className="h-3 w-3 mr-1" />
      Lower Risk ({score}%)
    </Badge>
  );
}

function SecurityCheckRow({ label, safe, detail }: { label: string; safe: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-2 text-sm">
        {safe ? (
          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
        )}
        <span>{label}</span>
      </div>
      {detail && <span className="text-xs text-muted-foreground font-mono">{detail}</span>}
    </div>
  );
}

export default function TokenResearch() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  const [chainId, setChainId] = useState<number>(1);
  const [contractAddress, setContractAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TokenResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [educationOpen, setEducationOpen] = useState(false);
  const [lookupMode, setLookupMode] = useState<"address" | "search">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      toast({ title: "Enter at least 2 characters", variant: "destructive" });
      return;
    }
    setSearching(true);
    setSearchResults([]);
    try {
      const data = await apiRequest("GET", `/api/token-research/search?q=${encodeURIComponent(q)}`);
      const json = await data.json();
      setSearchResults(json.results || []);
      if ((json.results || []).length === 0) {
        toast({ title: "No tokens found", description: `No results for "${q}". Try a different name or symbol.` });
      }
    } catch (err: any) {
      toast({ title: "Search failed", description: err?.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }, [searchQuery, toast]);

  const selectSearchToken = useCallback(async (token: TokenSearchResult, platform: { chainId: number; address: string }) => {
    setChainId(platform.chainId);
    setContractAddress(platform.address);
    setSearchResults([]);
    setSearchQuery("");
    setLookupMode("address");
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await apiRequest("GET", `/api/token-research/${platform.chainId}/${platform.address}`);
      const json = await r.json();
      setResult(json);
    } catch (err: any) {
      setError(err?.message || "Failed to research token");
      toast({ title: "Research failed", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleResearch = useCallback(async () => {
    const addr = contractAddress.trim();
    if (!addr) {
      toast({ title: "Enter a contract address", variant: "destructive" });
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      toast({ title: "Invalid address", description: "Contract addresses start with 0x followed by 40 hex characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiRequest("GET", `/api/token-research/${chainId}/${addr.toLowerCase()}`);
      const json = await data.json();
      setResult(json);
    } catch (err: any) {
      const msg = err?.message || "Failed to research token";
      setError(msg);
      toast({ title: msg.includes("No contract found") ? "Token not found on this chain" : "Research failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [contractAddress, chainId, toast]);

  const explorer = CHAIN_EXPLORERS[chainId];
  const dexScreenerChain = DEXSCREENER_CHAINS[chainId];

  const copyAddress = () => {
    navigator.clipboard.writeText(contractAddress.trim());
    toast({ title: "Address copied" });
  };

  return (
    <div className="space-y-6">
      <SeoHead
        title="Token Research — CryptoOwnBank | Analyze Any Token Before You Trade"
        description="Research any ERC-20 token before trading. Check contract safety, honeypot detection, holder count, tax analysis, and more. Non-custodial, free for Premium users."
        path="/token-research"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-token-research-title">Token Research</h1>
          <p className="text-muted-foreground">Analyze any token's contract before you trade. Paste the address, check the safety signals.</p>
        </div>
        <Badge variant="outline" data-testid="badge-research-tool">
          <Search className="h-3 w-3 mr-1" />
          Research Tool
        </Badge>
      </div>

      <Collapsible open={educationOpen} onOpenChange={setEducationOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                How to Use Token Research
              </CardTitle>
              {educationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border p-4 space-y-2">
                  <p className="text-sm font-semibold">Where to find contract addresses</p>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2"><span className="text-primary font-bold">1.</span> <a href="https://dexscreener.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">DEXScreener</a> — Real-time new token launches on all major DEXs</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-bold">2.</span> <a href="https://www.dextools.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">DEXTools</a> — New pairs, holder data, and liquidity info</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-bold">3.</span> <a href="https://www.geckoterminal.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GeckoTerminal</a> — Token pools across many chains (by CoinGecko)</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-bold">4.</span> Project announcements on Twitter/X, Discord, or Telegram</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-bold">5.</span> Block explorers like Etherscan — search by token name</li>
                  </ul>
                </div>
                <div className="rounded-md border p-4 space-y-2">
                  <p className="text-sm font-semibold">The complete flow</p>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2"><span className="text-primary font-bold">1.</span> Find a token's contract address from a trusted source</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-bold">2.</span> Paste it here and run the safety analysis</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-bold">3.</span> Review the risk score, warnings, and security checks</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-bold">4.</span> If comfortable, click "Trade on EVM Swap" to buy via 1inch</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-bold">5.</span> After buying, add the token to your wallet (see FAQ below)</li>
                  </ul>
                </div>
              </div>
              <div className="rounded-md border p-4 space-y-3" data-testid="card-choosing-chain">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  Choosing a Chain (When a Token is on Multiple Chains)
                </p>
                <p className="text-sm text-muted-foreground">
                  Many tokens are deployed on more than one chain. For example, a token might be available on both Ethereum and BNB Chain. Here's what to consider when deciding which version to buy:
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md bg-muted/50 p-3 space-y-1">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <Droplets className="h-3.5 w-3.5 text-blue-500" />
                      Liquidity & Volume
                    </p>
                    <p className="text-xs text-muted-foreground">The chain with more trading volume usually gives you a better price. More liquidity means less slippage -- you get closer to the listed price. Check DEXScreener to compare volume across chains.</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3 space-y-1">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <Fuel className="h-3.5 w-3.5 text-orange-500" />
                      Gas Fees
                    </p>
                    <p className="text-xs text-muted-foreground">Ethereum gas fees can range from $2-50+ per swap. BNB Chain, Polygon, Arbitrum, and Base typically cost under $1. For smaller purchases, high gas fees can eat a significant percentage of your investment.</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3 space-y-1">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-green-500" />
                      Contract Security
                    </p>
                    <p className="text-xs text-muted-foreground">The same project can have different contract code on different chains. Run Token Research on both and compare the risk scores. One chain's contract might be verified while another isn't.</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3 space-y-1">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-purple-500" />
                      Bridge Risk
                    </p>
                    <p className="text-xs text-muted-foreground">If a token originated on Ethereum and was bridged to another chain, the bridged version depends on the bridge contract's security. If the bridge is exploited, the bridged version could lose its value.</p>
                  </div>
                </div>
                <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Rule of thumb:</span> For larger amounts, prioritize the chain with the most liquidity (usually Ethereum for established tokens). For smaller amounts, prioritize the chain with lower gas fees (BNB Chain, Polygon, Arbitrum, or Base). Also consider what you already hold in your wallet -- buying on a chain where you already have funds avoids the extra cost and risk of bridging.
                  </p>
                </div>
              </div>
              <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 p-4 space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Important: This is a research tool, not financial advice
                </p>
                <p className="text-sm text-muted-foreground">
                  Even tokens with low risk scores can lose value. A "safe" contract does not mean a good investment. Many new tokens fail regardless of contract quality. Never invest more than you can afford to lose.
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card data-testid="card-token-lookup">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Look Up Token
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mb-2">
            <Button
              variant={lookupMode === "search" ? "default" : "outline"}
              size="sm"
              onClick={() => setLookupMode("search")}
              data-testid="button-mode-search"
            >
              <Search className="h-3.5 w-3.5 mr-1.5" />
              Search by Name
            </Button>
            <Button
              variant={lookupMode === "address" ? "default" : "outline"}
              size="sm"
              onClick={() => setLookupMode("address")}
              data-testid="button-mode-address"
            >
              <FileCode className="h-3.5 w-3.5 mr-1.5" />
              By Contract Address
            </Button>
          </div>

          {lookupMode === "search" ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Search by name or symbol (e.g. PEPE, Uniswap, Chainlink)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                  data-testid="input-token-search"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                />
                <Button
                  onClick={handleSearch}
                  disabled={searching || searchQuery.trim().length < 2}
                  className="sm:w-auto"
                  data-testid="button-search"
                >
                  {searching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {(() => {
                    const tradeableCount = searchResults.filter(t => t.platforms.length > 0).length;
                    const safeCount = searchResults.filter(t => t.safety?.riskLevel === "low").length;
                    return (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found.
                          {tradeableCount > 0 && <span className="text-primary font-medium"> {tradeableCount} tradeable on EVM Swap.</span>}
                          {safeCount > 0 && <span className="text-green-600 font-medium"> {safeCount} passed safety checks.</span>}
                        </p>
                        <p className="text-[10px] text-muted-foreground"><strong>Tradeable</strong> = swappable in-app via our EVM DEX (Ethereum, Base, Arbitrum, Optimism, BNB, Polygon, etc.). <strong>Not Tradeable</strong> = lives on a non-EVM chain (e.g. Hyperliquid, Solana-only tokens, app-specific L1s) — you'd need a CEX or that chain's native bridge to buy it. Results sorted by tradeability and market cap. Safety checked via GoPlus. Always DYOR.</p>
                      </div>
                    );
                  })()}
                  <div className="max-h-[600px] overflow-y-auto space-y-2 rounded-md border p-2">
                    {searchResults.map((token, idx) => {
                      const isTradeable = token.platforms.length > 0;
                      const safety = token.safety;
                      const isTopMatch = idx === 0 && isTradeable && safety?.riskLevel === "low";
                      return (
                      <div
                        key={token.id}
                        className={`rounded-md border p-3 space-y-2 transition-colors ${
                          isTopMatch
                            ? "border-green-500/40 bg-green-500/5 hover:bg-green-500/10"
                            : isTradeable
                              ? "hover:bg-accent/50"
                              : "opacity-60 hover:opacity-80 hover:bg-accent/30"
                        }`}
                        data-testid={`search-result-${token.id}`}
                      >
                        <div className="flex items-center gap-3">
                          {token.thumb && (
                            <img src={token.thumb} alt="" className="h-8 w-8 rounded-full" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm truncate">{token.name}</p>
                              <Badge variant="secondary" className="font-mono text-xs shrink-0">{token.symbol}</Badge>
                              {token.marketCapRank && (
                                <span className="text-xs text-muted-foreground shrink-0">#{token.marketCapRank}</span>
                              )}
                              {isTopMatch && (
                                <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]" data-testid={`badge-best-match-${token.id}`}>
                                  <CheckCircle className="h-3 w-3 mr-0.5" />
                                  Best Match
                                </Badge>
                              )}
                              {isTradeable && (
                                <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]" data-testid={`badge-tradeable-${token.id}`}>
                                  <Wallet className="h-3 w-3 mr-0.5" />
                                  Tradeable
                                </Badge>
                              )}
                              {!isTradeable && (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground" data-testid={`badge-not-tradeable-${token.id}`}>
                                  Not Tradeable
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {token.currentPrice !== null && (
                                <span>${token.currentPrice < 0.01 ? token.currentPrice.toFixed(8) : token.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                              )}
                              {token.priceChange24h !== null && (
                                <span className={token.priceChange24h >= 0 ? "text-green-600" : "text-red-600"}>
                                  {token.priceChange24h >= 0 ? "+" : ""}{token.priceChange24h.toFixed(2)}%
                                </span>
                              )}
                              {token.marketCap !== null && token.marketCap > 0 && (
                                <span>MCap: ${token.marketCap >= 1e9 ? (token.marketCap / 1e9).toFixed(2) + "B" : token.marketCap >= 1e6 ? (token.marketCap / 1e6).toFixed(2) + "M" : token.marketCap.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {safety && (
                          <div className={`rounded-md px-3 py-2 text-xs ${
                            safety.riskLevel === "low"
                              ? "bg-green-500/10 border border-green-500/20"
                              : safety.riskLevel === "medium"
                                ? "bg-yellow-500/10 border border-yellow-500/20"
                                : "bg-red-500/10 border border-red-500/20"
                          }`} data-testid={`safety-summary-${token.id}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              {safety.riskLevel === "low" ? (
                                <ShieldCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              ) : safety.riskLevel === "medium" ? (
                                <ShieldAlert className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
                              ) : (
                                <ShieldX className="h-3.5 w-3.5 text-red-600 shrink-0" />
                              )}
                              <span className={`font-medium ${
                                safety.riskLevel === "low" ? "text-green-600" : safety.riskLevel === "medium" ? "text-yellow-600" : "text-red-600"
                              }`}>
                                {safety.riskLevel === "low" ? "Lower Risk" : safety.riskLevel === "medium" ? "Medium Risk" : "High Risk"} ({safety.riskScore}%)
                              </span>
                              {safety.holderCount > 0 && (
                                <span className="text-muted-foreground ml-auto">{safety.holderCount.toLocaleString()} holders</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {safety.greenFlags.slice(0, 4).map((flag) => (
                                <span key={flag} className="inline-flex items-center gap-0.5 text-green-600">
                                  <CheckCircle className="h-3 w-3" /> {flag}
                                </span>
                              ))}
                              {safety.redFlags.map((flag) => (
                                <span key={flag} className="inline-flex items-center gap-0.5 text-red-600">
                                  <XCircle className="h-3 w-3" /> {flag}
                                </span>
                              ))}
                            </div>
                            {safety.isHoneypot && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-red-600 font-medium">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                WARNING: Honeypot detected - you may not be able to sell this token
                              </div>
                            )}
                          </div>
                        )}

                        {token.platforms.length > 0 && (
                          <div className="space-y-2 mt-1">
                            {token.platforms.map((p) => {
                              const pKey = `${p.chainId}:${p.address.toLowerCase()}`;
                              const pSafety = token.platformSafety?.[pKey] || null;
                              return (
                              <div key={`${token.id}-${p.chainId}`} className="rounded border bg-muted/30 p-2 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="secondary" className="text-xs">{EVM_CHAINS[p.chainId]?.name || `Chain ${p.chainId}`}</Badge>
                                    {pSafety && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          {pSafety.riskLevel === "low" ? (
                                            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                                          ) : pSafety.riskLevel === "medium" ? (
                                            <ShieldAlert className="h-3.5 w-3.5 text-yellow-600" />
                                          ) : (
                                            <ShieldX className="h-3.5 w-3.5 text-red-600" />
                                          )}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{pSafety.riskLevel === "low" ? "Lower" : pSafety.riskLevel === "medium" ? "Medium" : "High"} risk ({pSafety.riskScore}%) on {EVM_CHAINS[p.chainId]?.name}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                  <div className="flex gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7"
                                      onClick={() => selectSearchToken(token, p)}
                                      data-testid={`button-analyze-${token.id}-${p.chainId}`}
                                    >
                                      <Shield className="h-3 w-3 mr-1" />
                                      Full Analysis
                                    </Button>
                                    <Link href={`/evm-swap?chain=${p.chainId}&token=${p.address}`}>
                                      <Button
                                        size="sm"
                                        className={`text-xs h-7 ${pSafety?.riskLevel === "high" ? "bg-red-600 hover:bg-red-700" : "bg-primary"}`}
                                        data-testid={`button-trade-${token.id}-${p.chainId}`}
                                      >
                                        <ArrowRight className="h-3 w-3 mr-1" />
                                        Trade on EVM Swap
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground font-mono break-all select-all">{p.address}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 shrink-0"
                                    onClick={() => {
                                      navigator.clipboard.writeText(p.address);
                                      toast({ title: "Copied", description: "Contract address copied to clipboard" });
                                    }}
                                    data-testid={`button-copy-${token.id}-${p.chainId}`}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        )}
                        {token.platforms.length === 0 && token.allPlatforms && token.allPlatforms.length > 0 && (
                          <div className="space-y-1.5 mt-1">
                            <p className="text-xs text-muted-foreground">Available on non-EVM chains (not tradeable via EVM Swap):</p>
                            <div className="flex flex-wrap gap-1.5">
                              {token.allPlatforms.slice(0, 5).map((p) => (
                                <Badge key={p.platform} variant="secondary" className="text-[10px] font-mono">
                                  {p.platform.replace(/-/g, " ")}
                                </Badge>
                              ))}
                            </div>
                            {token.allPlatforms.some(p => p.address) && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1 break-all select-all">
                                  {token.allPlatforms[0].address}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 shrink-0"
                                  onClick={() => {
                                    navigator.clipboard.writeText(token.allPlatforms[0].address);
                                    toast({ title: "Copied", description: "Contract address copied to clipboard" });
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                        {token.platforms.length === 0 && (!token.allPlatforms || token.allPlatforms.length === 0) && (
                          <p className="text-xs text-muted-foreground italic">Contract data not available yet</p>
                        )}
                        {!isTradeable && (
                          <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2.5 mt-1.5 space-y-1.5">
                            <p className="text-xs font-medium flex items-center gap-1.5">
                              <Info className="h-3.5 w-3.5 text-blue-600" />
                              How to acquire {token.symbol}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              This token isn't on an EVM chain we route to, so you can't swap it inside CryptoOwnBank. To buy it: (1) check if a centralized exchange lists it, (2) buy with USD/USDT/USDC there, (3) withdraw to your own wallet on its native chain, then (4) add that wallet address here so it shows in your portfolio.
                            </p>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              <a href={`https://www.coingecko.com/en/coins/${token.id}#markets`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline" data-testid={`link-markets-${token.id}`}>
                                <ExternalLink className="h-3 w-3" />Where to buy ({token.symbol})
                              </a>
                              <a href={`https://www.coinbase.com/price/${token.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline" data-testid={`link-coinbase-${token.id}`}>
                                <ExternalLink className="h-3 w-3" />Check Coinbase
                              </a>
                              <a href={`https://www.binance.com/en/trade/${token.symbol}_USDT`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline" data-testid={`link-binance-${token.id}`}>
                                <ExternalLink className="h-3 w-3" />Check Binance
                              </a>
                              <Link href="/wallets" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline" data-testid={`link-add-wallet-${token.id}`}>
                                <ArrowRight className="h-3 w-3" />Add wallet to track
                              </Link>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-3 mt-1.5 pt-1.5 border-t">
                          <a
                            href={`https://www.coingecko.com/en/coins/${token.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                            data-testid={`link-coingecko-${token.id}`}
                          >
                            <ExternalLink className="h-3 w-3" /> CoinGecko
                          </a>
                          <a
                            href={`https://dexscreener.com/search?q=${token.symbol}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                            data-testid={`link-dexscreener-${token.id}`}
                          >
                            <ExternalLink className="h-3 w-3" /> DEXScreener
                          </a>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={chainId.toString()}
                onValueChange={(val) => { setChainId(parseInt(val)); setResult(null); setError(null); }}
              >
                <SelectTrigger className="w-full sm:w-48" data-testid="select-research-chain">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVM_CHAINS).map(([id, chain]) => (
                    <SelectItem key={id} value={id} data-testid={`select-chain-${id}`}>
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="0x... (paste contract address)"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  data-testid="input-contract-address"
                  onKeyDown={(e) => { if (e.key === "Enter") handleResearch(); }}
                />
                {contractAddress && (
                  <Button variant="ghost" size="icon" onClick={copyAddress} data-testid="button-copy-address">
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                onClick={handleResearch}
                disabled={loading || !contractAddress.trim()}
                className="sm:w-auto"
                data-testid="button-research"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Research
                  </>
                )}
              </Button>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-600 dark:text-red-400" data-testid="text-research-error">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="pt-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {result && !loading && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2" data-testid="card-token-info">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2" data-testid="text-token-name">
                    {result.name}
                    <Badge variant="secondary" className="font-mono" data-testid="badge-token-symbol">{result.symbol}</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-1" data-testid="text-token-address">{result.address}</p>
                </div>
                <RiskBadge level={result.riskLevel} score={result.riskScore} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Chain</p>
                    <p className="text-sm font-medium" data-testid="text-token-chain">{EVM_CHAINS[result.chainId]?.name || `Chain ${result.chainId}`}</p>
                  </div>
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Decimals</p>
                    <p className="text-sm font-medium font-mono" data-testid="text-token-decimals">{result.decimals}</p>
                  </div>
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total Supply</p>
                    <p className="text-sm font-medium font-mono truncate" data-testid="text-token-supply">{result.totalSupply || "N/A"}</p>
                  </div>
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Holders</p>
                    <p className="text-sm font-medium font-mono" data-testid="text-token-holders">
                      {result.goplus?.holderCount ? result.goplus.holderCount.toLocaleString() : "N/A"}
                    </p>
                  </div>
                </div>

                {result.warnings.length > 0 && (
                  <div className="rounded-md bg-red-500/10 border border-red-500/30 p-4 space-y-2" data-testid="card-warnings">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Warnings ({result.warnings.length})
                    </p>
                    <ul className="space-y-1">
                      {result.warnings.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.signals.length > 0 && (
                  <div className="rounded-md bg-green-500/10 border border-green-500/30 p-4 space-y-2" data-testid="card-signals">
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Positive Signals ({result.signals.length})
                    </p>
                    <ul className="space-y-1">
                      {result.signals.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.goplus && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-primary" />
                      Contract Security Checks
                    </p>
                    <div className="rounded-md border p-3">
                      <SecurityCheckRow label="Source code verified" safe={result.goplus.isOpenSource} />
                      <SecurityCheckRow label="Not a honeypot" safe={!result.goplus.isHoneypot} />
                      <SecurityCheckRow label="Owner cannot modify balances" safe={!result.goplus.ownerChangeBalance} />
                      <SecurityCheckRow label="No hidden owner" safe={!result.goplus.hiddenOwner} />
                      <SecurityCheckRow label="Cannot reclaim ownership" safe={!result.goplus.canTakeBackOwnership} />
                      <SecurityCheckRow label="Supply not mintable" safe={!result.goplus.isMintable} />
                      <SecurityCheckRow label="Transfers not pausable" safe={!result.goplus.transferPausable} />
                      <SecurityCheckRow label="Can sell full balance" safe={!result.goplus.cannotSellAll} />
                      <SecurityCheckRow label="No blacklist function" safe={!result.goplus.isBlacklisted} />
                      <SecurityCheckRow
                        label="Buy tax"
                        safe={result.goplus.buyTax <= 0.05}
                        detail={`${(result.goplus.buyTax * 100).toFixed(1)}%`}
                      />
                      <SecurityCheckRow
                        label="Sell tax"
                        safe={result.goplus.sellTax <= 0.05}
                        detail={`${(result.goplus.sellTax * 100).toFixed(1)}%`}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card data-testid="card-trade-actions">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowRight className="h-5 w-5 text-primary" />
                    Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(result as any).isPresale && (
                    <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 p-3 text-sm text-yellow-700 dark:text-yellow-400" data-testid="presale-warning">
                      <div className="flex items-center gap-2 font-medium mb-1">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        Presale / No DEX Liquidity
                      </div>
                      <p className="text-xs">This token has no detected liquidity pools on supported DEXes. It may only be purchasable through the project's official presale site. Trading via EVM Swap will likely fail.</p>
                    </div>
                  )}
                  <Link href={`/ownbank/evm-swap?chain=${result.chainId}&token=${result.address}`}>
                    <Button className={`w-full ${(result as any).isPresale ? "opacity-60" : ""}`} data-testid="button-trade-evm-swap">
                      <Wallet className="h-4 w-4 mr-2" />
                      {(result as any).isPresale ? "Try EVM Swap (may fail — no DEX liquidity)" : "Trade on EVM Swap"}
                    </Button>
                  </Link>

                  {explorer && (
                    <a
                      href={`${explorer.url}/token/${result.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="w-full" data-testid="button-view-explorer">
                        <Eye className="h-4 w-4 mr-2" />
                        View on {explorer.name}
                      </Button>
                    </a>
                  )}

                  {dexScreenerChain && (
                    <a
                      href={`https://dexscreener.com/${dexScreenerChain}/${result.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="w-full" data-testid="button-view-dexscreener">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on DEXScreener
                      </Button>
                    </a>
                  )}

                  <a
                    href={`https://www.dextools.io/app/en/${dexScreenerChain || "ether"}/pair-explorer/${result.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="w-full" data-testid="button-view-dextools">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on DEXTools
                    </Button>
                  </a>
                </CardContent>
              </Card>

              <Card data-testid="card-wallet-tip">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    After You Buy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    New tokens may not appear in your wallet automatically. To see them:
                  </p>
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="font-medium text-foreground">Add to MetaMask (Mobile):</p>
                    <ol className="space-y-1 text-xs">
                      <li>1. Open MetaMask and tap the <strong>Tokens &gt;</strong> header on your home screen</li>
                      <li>2. Scroll to the bottom and tap <strong>+ Add a token</strong></li>
                      <li>3. Switch to the <strong>Custom token</strong> tab</li>
                      <li>4. Paste the contract address:</li>
                      <li className="font-mono text-[11px] break-all bg-muted p-1.5 rounded select-all">{result.address}</li>
                      <li>5. Symbol and decimals fill automatically</li>
                      <li>6. Tap <strong>Import</strong></li>
                    </ol>
                  </div>
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="font-medium text-foreground">Add to MetaMask (Desktop/Browser Extension):</p>
                    <ol className="space-y-1 text-xs">
                      <li>1. Open MetaMask and click <strong>Import tokens</strong> at the bottom of the token list</li>
                      <li>2. Paste the contract address:</li>
                      <li className="font-mono text-[11px] break-all bg-muted p-1.5 rounded select-all">{result.address}</li>
                      <li>3. Symbol and decimals fill automatically</li>
                      <li>4. Click <strong>Next</strong> then <strong>Import</strong></li>
                    </ol>
                  </div>
                  <p className="text-xs">
                    Similar steps work for Coinbase Wallet, Trust Wallet, and other EVM wallets. Look for "Add/Import token" in your wallet's token list.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {result.riskLevel === "high" && (
            <div className="flex items-start gap-3 rounded-lg border-2 border-red-500/50 bg-red-500/10 p-4 text-sm" data-testid="warning-high-risk">
              <ShieldX className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-600 dark:text-red-400">High Risk Token</p>
                <p className="text-muted-foreground mt-1">
                  This token has multiple security red flags. Proceed with extreme caution. High-risk tokens may be scams, honeypots, or rug pulls. You could lose your entire investment. CryptoOwnBank does not recommend trading this token.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm" data-testid="disclaimer-token-research">
        <Info className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Disclaimer</p>
          <p>
            Token Research is an informational tool only. It does not constitute financial advice, an endorsement, or a recommendation to buy any token. Safety analysis is based on automated contract checks and may not detect all risks. Many new tokens are scams or fail — always do your own research and never invest more than you can afford to lose. CryptoOwnBank does not hold your funds and is not responsible for any trading losses.
          </p>
        </div>
      </div>
    </div>
  );
}
