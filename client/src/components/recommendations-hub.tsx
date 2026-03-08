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
  getStakeableAssets,
  getAssetsWithDefiAlternatives,
  getAssetWarnings,
} from "@/lib/custody-knowledge";
import type { AssetRecommendation } from "@/lib/custody-knowledge";
import {
  RefreshCw, TrendingUp, TrendingDown, Shield, ArrowRightLeft,
  Coins, BarChart3, Bell, ExternalLink, AlertTriangle,
  CheckCircle, XCircle, Mail, Wallet, Info, DollarSign,
  Zap, Lock, Sparkles,
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

  for (const w of addresses) {
    for (const b of w.balances || []) {
      const sym = b.assetSymbol.toUpperCase().replace(/ \(staked\)/, "");
      const isStaked = b.assetSymbol.toLowerCase().includes("staked");
      const usd = parseFloat(b.usdValue) || 0;
      const rec = evaluateAsset(sym, "cold_wallet", w.label || `${w.chain} wallet`, usd, isStaked);
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
  const actionableRecs = recommendations.filter(r =>
    r.type !== "optimal" && r.type !== "no_action" && r.type !== "no_data"
  );
  const optimalRecs = recommendations.filter(r => r.type === "optimal");

  const stakeableOwned = getStakeableAssets().filter(a => {
    const owned = recommendations.some(r => r.symbol === a.symbol);
    return owned;
  });
  const defiAltAssets = getAssetsWithDefiAlternatives();
  const allWarnings = getAssetWarnings();

  const consolidatedAssets: Record<string, { symbol: string; totalBalance: number; totalUsd: number; locations: { source: string; label: string; balance: number; usd: number }[] }> = {};
  for (const w of addresses) {
    for (const b of w.balances || []) {
      const sym = b.assetSymbol.toUpperCase().replace(/ \(staked\)/, "");
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
  const sortedConsolidated = Object.values(consolidatedAssets).filter(a => a.totalUsd > 0.01).sort((a, b) => b.totalUsd - a.totalUsd);

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
              <SummaryCard icon={<BarChart3 className="h-5 w-5" />} label="Live Prices" value={priceEntries.length} />
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
                                <div>
                                  <span className="font-medium">{opt.platform}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{opt.method}</span>
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
                            <p className="text-xs font-medium text-muted-foreground mb-1">DeFi</p>
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

          {rec.actionItems.length > 0 && (
            <div className="space-y-1 mt-2">
              {rec.actionItems.map((action, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span className="text-muted-foreground">{action}</span>
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
