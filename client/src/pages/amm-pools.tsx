import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SeoHead } from "@/components/seo-head";
import { useAuth } from "@/hooks/use-auth";
import { useXrplStore } from "@/lib/xrpl-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Droplets,
  TrendingUp,
  Wallet,
  ExternalLink,
  RefreshCw,
  Info,
  PieChart,
  AlertTriangle,
  CheckCircle,
  Percent,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  ArrowRight,
  PlusCircle,
  Copy,
  Smartphone,
} from "lucide-react";

interface AmmPool {
  id: string;
  label: string;
  asset1Amount: string;
  asset1Currency: string;
  asset2Amount: string;
  asset2Currency: string;
  lpTokenBalance: string;
  tradingFeePercent: number;
  account: string;
}

interface AmmPosition {
  id: string;
  label: string;
  lpTokens: number;
  totalLpTokens: number;
  sharePercent: number;
  userAsset1: number;
  userAsset2: number;
  asset1Currency: string;
  asset2Currency: string;
  tradingFeePercent: number;
  totalPoolAsset1: number;
  totalPoolAsset2: number;
}

function formatNumber(n: number | string, decimals = 2): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function AmmPools() {
  const { user } = useAuth();
  const { walletAddress, isConnected } = useXrplStore();
  const { toast } = useToast();
  const [showGuide, setShowGuide] = useState(false);
  const [provideLpPool, setProvideLpPool] = useState<AmmPool | null>(null);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied`, description: text });
  };

  const { data: pools = [], isLoading: poolsLoading, refetch: refetchPools } = useQuery<AmmPool[]>({
    queryKey: ["/api/xrpl/amm-pools"],
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: positions = [], isLoading: positionsLoading, refetch: refetchPositions } = useQuery<AmmPosition[]>({
    queryKey: ["/api/xrpl/amm-positions", walletAddress],
    queryFn: () => fetch(`/api/xrpl/amm-positions/${walletAddress}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!walletAddress && isConnected && !!user,
    refetchInterval: 5 * 60 * 1000,
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
      <SeoHead
        title="XRPL AMM Liquidity Pools | CryptoOwnBank"
        description="Track XRPL AMM liquidity pools and your LP positions. Earn fees by providing liquidity on the XRP Ledger DEX."
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Droplets className="h-7 w-7 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">XRPL AMM Pools</h1>
            <p className="text-muted-foreground text-sm">Liquidity pools on the XRP Ledger — earn trading fees by providing liquidity</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { refetchPools(); if (walletAddress) refetchPositions(); }}
          data-testid="button-refresh-amm"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-500/15 p-2 shrink-0">
              <PlusCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="font-semibold text-base" data-testid="text-earn-fees-title">
                Earn real trading fees by providing liquidity
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Deposit two assets (e.g. XRP + RLUSD) into an AMM pool and you earn a share of every trade that happens in that pool. Fees are paid in the same two assets and accrue automatically into your LP position — no smart contract, no middleman, fully on-chain. Tap <span className="font-medium text-foreground">Provide Liquidity</span> on any pool below for step-by-step instructions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {positions.length > 0 && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2" data-testid="text-your-positions">
              <Wallet className="h-5 w-5 text-blue-500" />
              Your Liquidity Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {positions.map((pos) => (
                <Card key={pos.id} className="border-blue-500/30" data-testid={`card-position-${pos.id}`}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold" data-testid={`text-position-label-${pos.id}`}>{pos.label}</p>
                      <Badge variant="outline" className="text-blue-600 border-blue-500/30 text-xs">
                        {pos.sharePercent.toFixed(4)}% share
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Your {pos.asset1Currency}</p>
                        <p className="font-medium" data-testid={`text-user-asset1-${pos.id}`}>{formatNumber(pos.userAsset1)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Your {pos.asset2Currency}</p>
                        <p className="font-medium" data-testid={`text-user-asset2-${pos.id}`}>{formatNumber(pos.userAsset2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">LP Tokens</p>
                        <p className="font-medium">{formatNumber(pos.lpTokens, 4)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Trading Fee</p>
                        <p className="font-medium text-green-600">{pos.tradingFeePercent}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {positionsLoading && isConnected && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2" data-testid="text-active-pools">
            <PieChart className="h-5 w-5 text-blue-500" />
            Active AMM Pools
          </CardTitle>
        </CardHeader>
        <CardContent>
          {poolsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-md" />
              ))}
            </div>
          ) : pools.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Droplets className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">No active AMM pools found on the XRPL at this time.</p>
              <p className="text-xs text-muted-foreground">AMM pools require two assets with active liquidity. Check back as more pools are created.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pools.map((pool) => (
                <div
                  key={pool.id}
                  className="rounded-lg border p-4 hover:bg-accent/30 transition-colors"
                  data-testid={`card-pool-${pool.id}`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-sm" data-testid={`text-pool-label-${pool.id}`}>{pool.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pool Account: {pool.account?.slice(0, 8)}...{pool.account?.slice(-6)}
                      </p>
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/30" variant="outline">
                      <Percent className="h-3 w-3 mr-1" />
                      {pool.tradingFeePercent}% fee
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">{pool.asset1Currency} in Pool</p>
                      <p className="font-medium" data-testid={`text-pool-asset1-${pool.id}`}>{formatNumber(pool.asset1Amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{pool.asset2Currency} in Pool</p>
                      <p className="font-medium" data-testid={`text-pool-asset2-${pool.id}`}>{formatNumber(pool.asset2Amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">LP Tokens</p>
                      <p className="font-medium">{formatNumber(pool.lpTokenBalance, 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Trading Fee</p>
                      <p className="font-medium text-green-600">{pool.tradingFeePercent}% per trade</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="default"
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => setProvideLpPool(pool)}
                      data-testid={`button-provide-lp-${pool.id}`}
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1" />
                      Provide Liquidity
                    </Button>
                    <Link href="/ownbank/dex">
                      <Button size="sm" variant="outline" className="text-xs" data-testid={`button-trade-${pool.id}`}>
                        <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                        Trade Pair
                      </Button>
                    </Link>
                    <a
                      href={`https://xrpscan.com/account/${pool.account}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" className="text-xs" data-testid={`button-view-pool-${pool.id}`}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        XRPScan
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowGuide(!showGuide)}
          data-testid="button-toggle-guide"
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-amber-500" />
              How XRPL AMM Works
            </CardTitle>
            {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showGuide && (
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Provide Liquidity</p>
                  <p>Deposit equal value of two assets into an AMM pool. You receive LP tokens representing your share of the pool.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <TrendingUp className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Earn Trading Fees</p>
                  <p>Every trade that goes through the pool pays a fee (typically 0.1-1%). This fee is distributed proportionally to all LP providers.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Impermanent Loss Risk</p>
                  <p>If the price ratio of the two assets changes significantly, you may end up with less value than if you had held the assets separately. This is called impermanent loss. It becomes permanent only when you withdraw.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Wallet className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Non-Custodial</p>
                  <p>XRPL AMM pools are native to the ledger. Your assets are held by the AMM smart contract on-chain — no intermediary, no platform risk. You can withdraw your share at any time.</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Note:</strong> CryptoOwnBank tracks your AMM positions and shows your share of each pool. To provide or withdraw liquidity, use your Xaman wallet or an XRPL DEX interface that supports AMM operations.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {!isConnected && user && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-amber-500" />
              <div>
                <p className="font-medium">Connect Your XRPL Wallet</p>
                <p className="text-sm text-muted-foreground">Connect via Xaman to see your AMM liquidity positions and track fees earned.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!provideLpPool} onOpenChange={(open) => { if (!open) setProvideLpPool(null); }}>
        <DialogContent className="max-w-lg" data-testid="dialog-provide-liquidity">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-blue-600" />
              Provide Liquidity to {provideLpPool?.label}
            </DialogTitle>
            <DialogDescription>
              Add {provideLpPool?.asset1Currency} and {provideLpPool?.asset2Currency} to this AMM pool to start earning {provideLpPool?.tradingFeePercent}% on every trade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
              <p className="text-xs text-muted-foreground">Pool Account (AMM address)</p>
              <div className="flex items-center gap-2">
                <code className="text-xs break-all flex-1" data-testid="text-pool-account">{provideLpPool?.account}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={() => provideLpPool && copyText(provideLpPool.account, "Pool address")}
                  data-testid="button-copy-pool-account"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-500/15 text-blue-600 h-6 w-6 flex items-center justify-center text-xs font-semibold shrink-0">1</div>
                <div className="flex-1">
                  <p className="font-medium">Open Xaman on your phone</p>
                  <p className="text-xs text-muted-foreground">Make sure the wallet you want to LP from is selected at the top of the Home tab.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-500/15 text-blue-600 h-6 w-6 flex items-center justify-center text-xs font-semibold shrink-0">2</div>
                <div className="flex-1">
                  <p className="font-medium">Tap <span className="font-semibold">xApps</span> in the bottom nav</p>
                  <p className="text-xs text-muted-foreground">XRPL AMM operations live inside Xaman xApps (mini-apps), not in a built-in menu.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-500/15 text-blue-600 h-6 w-6 flex items-center justify-center text-xs font-semibold shrink-0">3</div>
                <div className="flex-1">
                  <p className="font-medium">Open an AMM xApp</p>
                  <p className="text-xs text-muted-foreground">Tap the search icon (top-right) and open <span className="font-medium">Magnetic</span> (the #1 XRPL DEX/AMM xApp). <span className="font-medium">FirstLedger</span> and <span className="font-medium">Sologenic</span> also work.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-500/15 text-blue-600 h-6 w-6 flex items-center justify-center text-xs font-semibold shrink-0">4</div>
                <div className="flex-1">
                  <p className="font-medium">Find the {provideLpPool?.asset1Currency}/{provideLpPool?.asset2Currency} pool</p>
                  <p className="text-xs text-muted-foreground">Inside Magnetic: tap <span className="font-medium">Pools</span> (or <span className="font-medium">Liquidity</span>), search the pair, and tap <span className="font-medium">Add Liquidity</span>. You can paste the pool address above to find the exact pool.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-500/15 text-blue-600 h-6 w-6 flex items-center justify-center text-xs font-semibold shrink-0">5</div>
                <div className="flex-1">
                  <p className="font-medium">Choose amounts &amp; sign</p>
                  <p className="text-xs text-muted-foreground">Single-sided or balanced deposit — the xApp will show the LP tokens you'll receive. Xaman pops up to sign the AMMDeposit transaction. Slide to confirm.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-500/15 text-green-600 h-6 w-6 flex items-center justify-center text-xs font-semibold shrink-0">6</div>
                <div className="flex-1">
                  <p className="font-medium">Come back here to track</p>
                  <p className="text-xs text-muted-foreground">Once your LP tokens land, your position shows up in <span className="font-medium">Your Liquidity Positions</span> above with fees accruing automatically.</p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Impermanent loss</p>
                  <p className="text-xs text-amber-700/90 dark:text-amber-400/90">If the price ratio of {provideLpPool?.asset1Currency} / {provideLpPool?.asset2Currency} shifts significantly while you're in the pool, you may end up with less total value than if you'd just held the assets. Stable-stable pools (e.g. RLUSD/USDC) have minimal IL; volatile pairs have more.</p>
                </div>
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-start gap-2">
                <Smartphone className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  In-app one-tap LP deposits via Xaman are coming soon. For now, the steps above use Xaman's native AMM interface — same wallet, same security, just a few more taps.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <a
              href={`https://xrpscan.com/account/${provideLpPool?.account}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none"
            >
              <Button variant="outline" className="w-full" data-testid="button-dialog-xrpscan">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                View pool on XRPScan
              </Button>
            </a>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
              onClick={() => setProvideLpPool(null)}
              data-testid="button-dialog-close"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
