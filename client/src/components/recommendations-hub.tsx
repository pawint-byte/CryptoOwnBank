import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  CUSTODY_KNOWLEDGE,
  evaluateAsset,
  isScamToken,
  getStakeableAssets,
  getAssetsWithDefiAlternatives,
  getAssetWarnings,
  getBestInClass,
} from "@/lib/custody-knowledge";
import type { AssetRecommendation, StakedContext, CustodyType, BestInClassEntry } from "@/lib/custody-knowledge";
import {
  RefreshCw, TrendingUp, TrendingDown, Shield, ArrowRightLeft,
  Coins, BarChart3, Bell, ExternalLink, AlertTriangle,
  CheckCircle, XCircle, Mail, Wallet, Info, DollarSign,
  Zap, Lock, Sparkles, Globe, Building2, Trophy, Crown,
} from "lucide-react";

interface WalletData {
  id: string;
  chain: string;
  address: string;
  label?: string;
  balances?: { assetSymbol: string; balance: string; usdValue: string }[];
}

interface ExchangeBalance {
  provider: string;
  asset: string;
  balance: number;
  usdValue: number;
}

interface RecommendationsHubProps {
  addresses: WalletData[];
  exchangeBalances: ExchangeBalance[];
}

export function RecommendationsHub({ addresses, exchangeBalances }: RecommendationsHubProps) {
  const { toast } = useToast();
  const [emailInput, setEmailInput] = useState("");

  const { data: prices, isLoading: pricesLoading } = useQuery<Record<string, { usd: number; usd_24h_change: number }>>({
    queryKey: ["/api/market-data/prices"],
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: yields } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/market-data/yields"],
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: emailData } = useQuery<{ config: any; smtpConfigured: boolean }>({
    queryKey: ["/api/email-config"],
  });

  const { data: alertLogs } = useQuery<any[]>({
    queryKey: ["/api/alert-logs"],
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/market-data/refresh", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/market-data/prices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/market-data/yields"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alert-logs"] });
      toast({ title: "Market data refreshed" });
    },
    onError: () => toast({ title: "Failed to refresh data", variant: "destructive" }),
  });

  const saveEmailMutation = useMutation({
    mutationFn: (email: string) => apiRequest("POST", "/api/email-config", { email, enabled: true, alertTypes: "apy_change,new_opportunity,weekly_digest" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
      toast({ title: "Email settings saved" });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/email-config/test", {}),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({ title: data.sent ? "Test email sent" : data.message || "Could not send" });
    },
  });

  const recommendations: AssetRecommendation[] = [];

  const normalizeSymbol = (s: string) => s.toUpperCase().replace(/\s*\(STAKED\)/i, "");
  const isStakedEntry = (s: string) => /\(staked\)/i.test(s);

  const walletStakedMap: Record<string, Record<string, { usd: number; balance: number }>> = {};
  for (const w of addresses) {
    const walletKey = w.id || w.address;
    if (!walletStakedMap[walletKey]) walletStakedMap[walletKey] = {};
    for (const b of w.balances || []) {
      if (isStakedEntry(b.assetSymbol)) {
        const sym = normalizeSymbol(b.assetSymbol);
        walletStakedMap[walletKey][sym] = {
          usd: parseFloat(b.usdValue) || 0,
          balance: parseFloat(b.balance) || 0,
        };
      }
    }
  }

  for (const w of addresses) {
    const walletKey = w.id || w.address;
    const hasLiquidCounterpart: Record<string, boolean> = {};
    for (const b of w.balances || []) {
      if (!isStakedEntry(b.assetSymbol)) {
        hasLiquidCounterpart[normalizeSymbol(b.assetSymbol)] = true;
      }
    }
    for (const b of w.balances || []) {
      const sym = normalizeSymbol(b.assetSymbol);
      const isStaked = isStakedEntry(b.assetSymbol);
      const usd = parseFloat(b.usdValue) || 0;
      if (isStaked && hasLiquidCounterpart[sym]) {
        continue;
      }
      const stakedInfo = walletStakedMap[walletKey]?.[sym];
      const stakedContext: StakedContext | undefined = !isStaked && stakedInfo
        ? { stakedUsdOnSameWallet: stakedInfo.usd, stakedBalanceOnSameWallet: stakedInfo.balance }
        : undefined;
      const rec = evaluateAsset(sym, "cold_wallet", w.label || `${w.chain} wallet`, usd, isStaked, stakedContext);
      recommendations.push(rec);
    }
  }

  for (const eb of exchangeBalances) {
    const sym = eb.asset.toUpperCase();
    const rec = evaluateAsset(sym, "exchange", eb.provider, eb.usdValue, false);
    recommendations.push(rec);
  }

  const recsBySymbol: Record<string, AssetRecommendation[]> = {};
  for (const r of recommendations) {
    if (!recsBySymbol[r.symbol]) recsBySymbol[r.symbol] = [];
    recsBySymbol[r.symbol].push(r);
  }

  const totalMissedAnnual = recommendations.reduce((sum, r) => sum + r.missedAnnual, 0);
  const scamRecs = recommendations.filter(r => r.type === "scam_warning");
  const actionableRecs = recommendations.filter(r =>
    r.type !== "optimal" && r.type !== "no_action" && r.type !== "no_data" && r.type !== "scam_warning"
  );
  const optimalRecs = recommendations.filter(r => r.type === "optimal");

  const stakeableOwned = getStakeableAssets().filter(a => {
    const owned = recommendations.some(r => r.symbol === a.symbol);
    return owned;
  });
  const defiAltAssets = getAssetsWithDefiAlternatives();
  const allWarnings = getAssetWarnings();
  const bestInClass = getBestInClass();
  const ownedSymbols = new Set(recommendations.map(r => r.symbol));

  const consolidatedAssets: Record<string, { symbol: string; totalBalance: number; totalUsd: number; locations: { source: string; label: string; balance: number; usd: number }[] }> = {};
  for (const w of addresses) {
    for (const b of w.balances || []) {
      const sym = normalizeSymbol(b.assetSymbol);
      if (!consolidatedAssets[sym]) consolidatedAssets[sym] = { symbol: sym, totalBalance: 0, totalUsd: 0, locations: [] };
      const bal = parseFloat(b.balance) || 0;
      const usd = parseFloat(b.usdValue) || 0;
      consolidatedAssets[sym].totalBalance += bal;
      consolidatedAssets[sym].totalUsd += usd;
      consolidatedAssets[sym].locations.push({ source: "wallet", label: w.label || `${w.chain} wallet`, balance: bal, usd });
    }
  }
  for (const eb of exchangeBalances) {
    const sym = eb.asset.toUpperCase();
    if (!consolidatedAssets[sym]) consolidatedAssets[sym] = { symbol: sym, totalBalance: 0, totalUsd: 0, locations: [] };
    consolidatedAssets[sym].totalBalance += eb.balance;
    consolidatedAssets[sym].totalUsd += eb.usdValue;
    consolidatedAssets[sym].locations.push({ source: "exchange", label: eb.provider, balance: eb.balance, usd: eb.usdValue });
  }
  const sortedConsolidated = Object.values(consolidatedAssets).filter(a => a.totalUsd > 0.01 && !isScamToken(a.symbol)).sort((a, b) => b.totalUsd - a.totalUsd);

  const priceEntries = Object.entries(prices || {}).sort((a, b) => (b[1]?.usd || 0) - (a[1]?.usd || 0));

  return (
    <Card data-testid="recommendations-hub">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg">Recommendations & Insights</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          data-testid="button-refresh-market-data"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
          Refresh Data
        </Button>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <Tabs defaultValue="optimize">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4" data-testid="recommendations-tabs">
            <TabsTrigger value="optimize" data-testid="tab-optimize">Optimize</TabsTrigger>
            <TabsTrigger value="consolidated" data-testid="tab-consolidated">By Asset</TabsTrigger>
            <TabsTrigger value="bestinclass" data-testid="tab-bestinclass">Best in Class</TabsTrigger>
            <TabsTrigger value="staking" data-testid="tab-staking">Staking</TabsTrigger>
            <TabsTrigger value="defi" data-testid="tab-defi-tradfi">DeFi vs TradFi</TabsTrigger>
            <TabsTrigger value="prices" data-testid="tab-prices">Prices</TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="optimize" data-testid="tab-content-optimize">
            {totalMissedAnnual > 0 && (
              <div className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 mb-6" data-testid="missed-earnings-banner">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-lg text-amber-800 dark:text-amber-200">
                      ~${totalMissedAnnual.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/year in missed earnings
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Based on current positions, you could earn more by optimizing where your assets sit.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
              <SummaryCard icon={<Zap className="h-5 w-5 text-amber-500" />} label="Actions Available" value={actionableRecs.length} />
              <SummaryCard icon={<CheckCircle className="h-5 w-5 text-green-500" />} label="Already Optimal" value={optimalRecs.length} />
              <SummaryCard icon={<Coins className="h-5 w-5" />} label="Staking Opportunities" value={stakeableOwned.length} />
              {scamRecs.length > 0
                ? <SummaryCard icon={<AlertTriangle className="h-5 w-5 text-red-500" />} label="Scam Tokens" value={scamRecs.length} />
                : <SummaryCard icon={<BarChart3 className="h-5 w-5" />} label="Live Prices" value={priceEntries.length} />
              }
            </div>

            {actionableRecs.length > 0 && (
              <>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Actions to Maximize Your Portfolio
                </h3>
                <div className="space-y-3 mb-6">
                  {actionableRecs
                    .sort((a, b) => b.missedAnnual - a.missedAnnual)
                    .map((rec, i) => (
                      <RecommendationCard key={`${rec.symbol}-${rec.currentLocation}-${i}`} rec={rec} />
                    ))}
                </div>
              </>
            )}

            {optimalRecs.length > 0 && (
              <>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Well-Positioned Assets
                </h3>
                <div className="space-y-2">
                  {optimalRecs.map((rec, i) => (
                    <div key={`${rec.symbol}-opt-${i}`} className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20" data-testid={`optimal-asset-${rec.symbol}-${i}`}>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        <div>
                          <span className="font-medium">{rec.symbol}</span>
                          <span className="text-sm text-muted-foreground ml-2">on {rec.currentLocation}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">${rec.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        {rec.currentYield > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400">Earning ~{rec.currentYield.toFixed(1)}%</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {scamRecs.length > 0 && (
              <>
                <h3 className="font-semibold mb-3 mt-6 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Suspected Scam Tokens ({scamRecs.length})
                </h3>
                <div className="border border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                    These tokens were likely airdropped to your wallets as dust attacks. Do NOT interact with them.
                  </p>
                  <div className="space-y-1">
                    {scamRecs.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm" data-testid={`scam-token-${i}`}>
                        <XCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                        <span className="text-red-700 dark:text-red-300 break-all">{rec.symbol}</span>
                        <span className="text-red-500 dark:text-red-400 text-xs shrink-0">on {rec.currentLocation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {recommendations.filter(r => r.type === "no_data").length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {recommendations.filter(r => r.type === "no_data").length} asset(s) have no optimization data yet: {recommendations.filter(r => r.type === "no_data").map(r => r.symbol).join(", ")}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="consolidated" data-testid="tab-content-consolidated">
            <h3 className="font-semibold mb-3">Your Assets — Consolidated View</h3>
            <p className="text-sm text-muted-foreground mb-4">All your holdings grouped by asset, showing where each position sits.</p>
            {sortedConsolidated.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assets found. Sync your wallets and exchanges.</p>
            ) : (
              <div className="space-y-3">
                {sortedConsolidated.map(asset => {
                  const recs = recsBySymbol[asset.symbol] || [];
                  const hasMissed = recs.some(r => r.missedAnnual > 0);
                  return (
                    <div key={asset.symbol} className="border rounded-lg p-3" data-testid={`consolidated-asset-${asset.symbol}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{asset.symbol}</span>
                          <Badge variant="outline" className="text-xs">{asset.locations.length} location{asset.locations.length > 1 ? "s" : ""}</Badge>
                          {hasMissed && <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Yield available</Badge>}
                        </div>
                        <div className="text-right">
                          <span className="font-medium">${asset.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <p className="text-xs text-muted-foreground">{asset.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {asset.symbol}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {asset.locations.map((loc, i) => (
                          <div key={i} className="flex items-center justify-between text-sm pl-4 py-1 border-l-2 border-muted">
                            <div className="flex items-center gap-2">
                              {loc.source === "wallet" ? <Wallet className="h-3 w-3 text-green-500" /> : <ArrowRightLeft className="h-3 w-3 text-orange-500" />}
                              <span className="text-muted-foreground">{loc.label}</span>
                            </div>
                            <span>{loc.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} (${loc.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                          </div>
                        ))}
                      </div>
                      {recs.filter(r => r.missedAnnual > 0).map((r, ri) => (
                        <div key={ri} className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/30 text-sm flex items-center gap-2">
                          <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="text-amber-800 dark:text-amber-200">
                            ~${r.missedAnnual.toFixed(0)}/yr available via {r.bestYieldSource} ({r.bestYield.toFixed(1)}% APY)
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bestinclass" data-testid="tab-content-bestinclass">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold">Best in Class — Top Yield Opportunities</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The highest-earning opportunities across all assets — sorted by yield. Discover what's worth holding for maximum returns while staying in control of your assets.
            </p>

            {bestInClass.map(group => {
              const isOnChain = !group.category.includes("Custodial");
              const categoryIcon = group.category.includes("Staking") ? (
                <Lock className="h-4 w-4" />
              ) : group.category.includes("DeFi") ? (
                <Sparkles className="h-4 w-4" />
              ) : group.category.includes("Passive") ? (
                <Coins className="h-4 w-4" />
              ) : (
                <Building2 className="h-4 w-4" />
              );

              return (
                <div key={group.category} className="mb-6" data-testid={`bestinclass-${group.category.replace(/\s+/g, "-").toLowerCase()}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={isOnChain ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                      {categoryIcon}
                    </span>
                    <h4 className="font-medium">{group.category}</h4>
                    <Badge variant="outline" className={`text-xs ${isOnChain ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400" : "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"}`}>
                      {isOnChain ? "You Keep Your Keys" : "Company Holds Assets"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{group.description}</p>

                  <div className="space-y-1">
                    {group.entries.map((entry, i) => {
                      const isOwned = ownedSymbols.has(entry.symbol);
                      const isTop3 = i < 3;
                      return (
                        <div
                          key={`${entry.symbol}-${entry.platform}-${i}`}
                          className={`flex items-center justify-between p-2.5 rounded-lg border ${
                            isTop3
                              ? "bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20 dark:to-transparent border-amber-200 dark:border-amber-800"
                              : "bg-card"
                          }`}
                          data-testid={`bestinclass-entry-${entry.symbol}-${i}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isTop3 && (
                              <span className="text-amber-500 shrink-0">
                                {i === 0 ? <Crown className="h-4 w-4" /> : <span className="text-xs font-bold w-4 text-center inline-block">#{i + 1}</span>}
                              </span>
                            )}
                            {!isTop3 && <span className="text-xs text-muted-foreground w-4 text-center shrink-0">#{i + 1}</span>}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{entry.symbol}</span>
                                <span className="text-xs text-muted-foreground truncate">{entry.name}</span>
                                {isOwned && (
                                  <Badge variant="default" className="text-xs px-1.5 py-0 h-4 bg-emerald-600">You Hold This</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="font-medium">{entry.platform}</span>
                                <span>·</span>
                                <span className="truncate">{entry.method}</span>
                                {entry.blockchain && (
                                  <>
                                    <span>·</span>
                                    <span className={`flex items-center gap-0.5 ${isOnChain ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                      {isOnChain ? <Globe className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                                      {entry.blockchain}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={isTop3 ? "default" : "outline"} className={`text-xs ${isTop3 ? "bg-amber-600 hover:bg-amber-700" : ""}`}>
                              {entry.apyRange} APY
                            </Badge>
                            <a href={entry.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" data-testid={`bestinclass-link-${entry.symbol}-${i}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-800 dark:text-emerald-200">CryptoOwnBank Philosophy</p>
                  <p className="text-emerald-700 dark:text-emerald-300 text-xs mt-1">
                    We prioritize on-chain options where you keep ownership of your assets. Custodial exchange options are shown for comparison, but your keys = your crypto. Use blockchain on-ramps and off-ramps to maximize returns while staying in control.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="staking" data-testid="tab-content-staking">
            <h3 className="font-semibold mb-3">Staking Opportunities</h3>
            <p className="text-sm text-muted-foreground mb-4">Earn yield on your assets through staking and DeFi protocols.</p>
            {stakeableOwned.length === 0 ? (
              <p className="text-sm text-muted-foreground">None of your current assets support staking, or add wallets/exchanges to see opportunities.</p>
            ) : (
              <div className="space-y-4">
                {stakeableOwned.map(asset => {
                  const assetRecs = recsBySymbol[asset.symbol] || [];
                  const totalUsd = assetRecs.reduce((s, r) => s + r.usdValue, 0);
                  const notStakedUsd = assetRecs.filter(r => r.type !== "optimal").reduce((s, r) => s + r.usdValue, 0);
                  const bestApy = asset.stakingOptions?.reduce((best, opt) => opt.apyMid > best ? opt.apyMid : best, 0) || 0;
                  const potentialEarning = notStakedUsd * (bestApy / 100);

                  return (
                    <div key={asset.symbol} className="border rounded-lg p-3" data-testid={`staking-asset-${asset.symbol}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{asset.symbol} — {asset.name}</h4>
                        {potentialEarning > 0 && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs">
                            ~${potentialEarning.toFixed(0)}/yr potential
                          </Badge>
                        )}
                      </div>

                      {potentialEarning > 0 && (
                        <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 text-sm mb-3">
                          <Sparkles className="h-3 w-3 text-amber-500 inline mr-1" />
                          <span className="text-amber-800 dark:text-amber-200">
                            You hold ${notStakedUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} in unstaked {asset.symbol} — staking at ~{bestApy.toFixed(1)}% could earn ~${potentialEarning.toFixed(0)}/year
                          </span>
                        </div>
                      )}

                      {yields?.[asset.symbol] && yields[asset.symbol].length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Live DeFi Yields (DefiLlama)</p>
                          <div className="space-y-1">
                            {yields[asset.symbol].map((pool: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                <div>
                                  <span className="font-medium">{pool.protocol}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{pool.chain}</span>
                                </div>
                                <div className="text-right">
                                  <Badge variant="default" className="text-xs">{pool.apy?.toFixed(2)}% APY</Badge>
                                  <p className="text-xs text-muted-foreground">TVL: ${(pool.tvl / 1e6).toFixed(0)}M</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {asset.stakingOptions && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Curated Options</p>
                          <div className="space-y-1">
                            {asset.stakingOptions.map((opt, i) => (
                              <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                                <div className="flex items-center gap-2">
                                  <span className={`shrink-0 ${opt.custodyType === "on_chain" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                    {opt.custodyType === "on_chain" ? <Globe className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                                  </span>
                                  <div>
                                    <span className="font-medium">{opt.platform}</span>
                                    <span className="text-xs text-muted-foreground ml-2">{opt.method}</span>
                                    <span className="text-xs text-muted-foreground ml-1">· {opt.blockchain}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{opt.apyRange}</Badge>
                                  <a href={opt.link} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {asset.exchangeEarnOptions && asset.exchangeEarnOptions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Exchange Earning (custodial)</p>
                          <div className="space-y-1">
                            {asset.exchangeEarnOptions.map((opt, i) => (
                              <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{opt.exchange}</span>
                                  <span className="text-xs text-muted-foreground">{opt.program}</span>
                                  {opt.flexible && <Badge variant="outline" className="text-xs">Flexible</Badge>}
                                </div>
                                <Badge variant="outline" className="text-xs">{opt.apyRange}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="defi" data-testid="tab-content-defi">
            <h3 className="font-semibold mb-3">DeFi vs Traditional Finance</h3>
            <p className="text-sm text-muted-foreground mb-4">Compare yields from traditional savings products with DeFi protocols.</p>
            {defiAltAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No DeFi alternatives data available.</p>
            ) : (
              <div className="space-y-4">
                {defiAltAssets.map(asset => (
                  <div key={asset.symbol} data-testid={`defi-compare-${asset.symbol}`}>
                    <h4 className="font-medium mb-2">{asset.symbol} — {asset.name}</h4>
                    <div className="space-y-2">
                      {asset.defiAlternatives!.map((alt, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2">
                          <div className="border rounded-lg p-3 bg-muted/30">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Traditional</p>
                            <p className="font-medium text-sm">{alt.tradFiProduct}</p>
                            <Badge variant="outline" className="mt-1">{alt.tradFiApy}</Badge>
                          </div>
                          <div className="border rounded-lg p-3 bg-primary/5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <p className="text-xs font-medium text-muted-foreground">DeFi</p>
                              {alt.custodyType === "on_chain" && (
                                <span className="flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                                  <Globe className="h-3 w-3" />
                                  {alt.blockchain}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <p className="font-medium text-sm">{alt.defiProtocol}</p>
                              <a href={alt.link} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="default">{alt.defiApy}</Badge>
                              <Badge variant={alt.riskLevel === "Low" ? "outline" : alt.riskLevel === "Medium" ? "secondary" : "destructive"} className="text-xs">
                                {alt.riskLevel} Risk
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {yields?.[asset.symbol] && yields[asset.symbol].length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Additional Live Yields</p>
                        {yields[asset.symbol].slice(0, 3).map((pool: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm py-1">
                            <span>{pool.protocol} ({pool.chain})</span>
                            <span>{pool.apy?.toFixed(2)}% APY</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prices" data-testid="tab-content-prices">
            <h3 className="font-semibold mb-3">Live Prices</h3>
            {pricesLoading ? (
              <p className="text-sm text-muted-foreground">Loading prices...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {priceEntries.map(([sym, data]) => (
                  <div key={sym} className="flex items-center justify-between p-2 rounded-lg border bg-card" data-testid={`price-card-${sym}`}>
                    <div>
                      <span className="font-medium text-sm">{sym}</span>
                      <p className="text-xs text-muted-foreground">${data?.usd?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</p>
                    </div>
                    <Badge variant={data?.usd_24h_change >= 0 ? "default" : "destructive"} className="text-xs">
                      {data?.usd_24h_change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {data?.usd_24h_change?.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts" data-testid="tab-content-alerts">
            <h3 className="font-semibold mb-3">Notifications & Alerts</h3>

            <div className="border rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-5 w-5" />
                <span className="font-medium">Email Notifications</span>
              </div>

              {!emailData?.smtpConfigured && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded mb-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-800 dark:text-yellow-200">SMTP not configured — email sending is disabled. Contact admin to set up.</span>
                </div>
              )}

              {emailData?.config ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Active: {emailData.config.email}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(emailData.config.alertTypes || "").split(",").map((t: string) => (
                      <Badge key={t} variant="outline" className="text-xs">{t.replace(/_/g, " ")}</Badge>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testEmailMutation.mutate()}
                    disabled={testEmailMutation.isPending || !emailData.smtpConfigured}
                    data-testid="button-test-email"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Test Email
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="max-w-xs"
                    data-testid="input-email"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (emailInput) saveEmailMutation.mutate(emailInput);
                    }}
                    disabled={saveEmailMutation.isPending || !emailInput}
                    data-testid="button-save-email"
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>

            {allWarnings.length > 0 && (
              <div className="border rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" /> Asset Warnings
                </h4>
                <div className="space-y-2">
                  {allWarnings.map(({ symbol, warnings }) => (
                    <div key={symbol}>
                      {warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm py-1">
                          <Badge variant="outline" className="text-xs shrink-0">{symbol}</Badge>
                          <span className="text-muted-foreground">{w}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alertLogs && alertLogs.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Recent Alert Log</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {alertLogs.slice(0, 10).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between text-sm py-1 border-b border-muted last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{log.alertType}</Badge>
                        <span className="text-muted-foreground">{log.message}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {log.sentAt ? new Date(log.sentAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ rec }: { rec: AssetRecommendation }) {
  const typeConfig: Record<string, { icon: React.ReactNode; borderColor: string; bgColor: string }> = {
    move_to_cold: { icon: <Shield className="h-5 w-5 text-blue-500" />, borderColor: "border-blue-300 dark:border-blue-700", bgColor: "bg-blue-50/50 dark:bg-blue-950/20" },
    split_strategy: { icon: <ArrowRightLeft className="h-5 w-5 text-purple-500" />, borderColor: "border-purple-300 dark:border-purple-700", bgColor: "bg-purple-50/50 dark:bg-purple-950/20" },
    stake_available: { icon: <Coins className="h-5 w-5 text-amber-500" />, borderColor: "border-amber-300 dark:border-amber-700", bgColor: "bg-amber-50/50 dark:bg-amber-950/20" },
    defi_yield: { icon: <Sparkles className="h-5 w-5 text-emerald-500" />, borderColor: "border-emerald-300 dark:border-emerald-700", bgColor: "bg-emerald-50/50 dark:bg-emerald-950/20" },
    scam_warning: { icon: <AlertTriangle className="h-5 w-5 text-red-500" />, borderColor: "border-red-300 dark:border-red-700", bgColor: "bg-red-50/50 dark:bg-red-950/20" },
    no_data: { icon: <Info className="h-5 w-5 text-gray-500" />, borderColor: "border-gray-300 dark:border-gray-700", bgColor: "bg-gray-50/50 dark:bg-gray-950/20" },
  };
  const config = typeConfig[rec.type] || typeConfig.no_data;

  return (
    <div className={`border ${config.borderColor} ${config.bgColor} rounded-lg p-4`} data-testid={`recommendation-${rec.symbol}-${rec.type}`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{rec.symbol}</span>
              <Badge variant="outline" className="text-xs">{rec.title}</Badge>
            </div>
            <span className="font-medium text-sm shrink-0">${rec.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>

          {rec.missedAnnual > 0 && (
            <div className="flex items-center gap-2 mb-2 p-2 rounded bg-amber-100/50 dark:bg-amber-900/30">
              <DollarSign className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                ~${rec.missedAnnual.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/year left on the table
              </span>
            </div>
          )}

          {rec.currentYield > 0 && rec.bestYield > rec.currentYield && (
            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="text-muted-foreground">Current: {rec.currentYield.toFixed(1)}%</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium text-green-600 dark:text-green-400">Best: {rec.bestYield.toFixed(1)}% via {rec.bestYieldSource}</span>
            </div>
          )}

          {rec.custodyInfo && (
            <div className={`flex items-center gap-1.5 text-xs mt-2 px-2 py-1 rounded-md w-fit ${
              rec.custodyInfo.type === "on_chain"
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
            }`} data-testid={`custody-info-${rec.symbol}`}>
              {rec.custodyInfo.type === "on_chain" ? (
                <Globe className="h-3 w-3 shrink-0" />
              ) : (
                <Building2 className="h-3 w-3 shrink-0" />
              )}
              <span className="font-medium">
                {rec.custodyInfo.type === "on_chain" ? "On-Chain" : "Custodial"}
                {rec.custodyInfo.blockchain ? ` · ${rec.custodyInfo.blockchain}` : ""}
              </span>
              <span className="hidden sm:inline">— {rec.custodyInfo.explanation}</span>
            </div>
          )}

          {rec.actionItems.length > 0 && (
            <div className="space-y-1 mt-2">
              {rec.actionItems.map((action, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {action.custodyBadge ? (
                    <span className={`mt-0.5 shrink-0 ${
                      action.custodyBadge === "on_chain"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {action.custodyBadge === "on_chain" ? (
                        <Globe className="h-3.5 w-3.5" />
                      ) : (
                        <Building2 className="h-3.5 w-3.5" />
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground mt-0.5">•</span>
                  )}
                  {action.link ? (
                    <a href={action.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1" data-testid={`action-link-${rec.symbol}-${i}`}>
                      {action.text}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">{action.text}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {rec.riskNote && (
            <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
              <Shield className="h-3 w-3 mt-0.5 shrink-0" />
              {rec.riskNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="border rounded-lg p-3 flex items-center gap-3">
      <div>{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
