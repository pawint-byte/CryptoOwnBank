import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Eye, ArrowLeft, Wallet, TrendingUp, ShieldCheck, Loader2 } from "lucide-react";

type SeatView = {
  seat: { id: string; role: string; ownerName: string };
  wallets: {
    wallet: { id: string; chain: string; label: string | null; address: string };
    balances: { id: string; assetSymbol: string; balance: string; usdValue: string | null }[];
  }[];
  positions: { id: string; assetSymbol: string; quantity: string; averageCost: string | null }[];
  totals: { totalUsd: number };
};

export default function FamilyViewPage() {
  const [, params] = useRoute("/family/view/:seatId");
  const seatId = params?.seatId;

  const { data, isLoading, error } = useQuery<SeatView>({
    queryKey: ["/api/family-seats", seatId, "view"],
    queryFn: async () => {
      const res = await fetch(`/api/family-seats/${seatId}/view`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!seatId,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>{(error as Error)?.message || "Couldn't load this account."}</AlertDescription>
        </Alert>
        <Link href="/family"><Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Family</Button></Link>
      </div>
    );
  }

  const { seat, wallets, positions, totals } = data;

  return (
    <div className="space-y-4 max-w-5xl mx-auto p-4">
      {/* Guest banner */}
      <div className="rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/40 p-3 flex items-center justify-between" data-testid="banner-guest">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-blue-600" />
          <div>
            <div className="font-semibold text-sm">Viewing as guest of {seat.ownerName}</div>
            <div className="text-xs text-muted-foreground">Read-only access · You cannot move funds, swap, or change settings.</div>
          </div>
        </div>
        <Link href="/family"><Button size="sm" variant="ghost" data-testid="button-back-family"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
      </div>

      {/* Total card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Portfolio total</CardTitle>
          <CardDescription>{seat.ownerName}'s combined portfolio value</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold" data-testid="text-portfolio-total">${totals.totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-muted-foreground mt-1">Across {wallets.length} wallet(s) and {positions.length} position(s)</div>
        </CardContent>
      </Card>

      {/* Wallets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          {wallets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No wallets yet.</p>
          ) : (
            <div className="space-y-3">
              {wallets.map(w => {
                const usd = w.balances.reduce((s, b) => s + (b.usdValue ? Number(b.usdValue) : 0), 0);
                return (
                  <div key={w.wallet.id} className="rounded border p-3" data-testid={`row-wallet-${w.wallet.id}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{w.wallet.label || `${w.wallet.chain.toUpperCase()} wallet`}</div>
                        <div className="text-xs text-muted-foreground"><Badge variant="outline" className="text-[10px] mr-1">{w.wallet.chain.toUpperCase()}</Badge>{w.wallet.address}</div>
                      </div>
                      <div className="text-right font-semibold">${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                    {w.balances.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                        {w.balances.map(b => (
                          <div key={b.id} className="flex justify-between rounded bg-muted/40 px-2 py-1">
                            <span className="font-medium">{b.assetSymbol}</span>
                            <span className="text-muted-foreground">{Number(b.balance).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Positions */}
      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {positions.map(p => (
                <div key={p.id} className="flex justify-between text-sm py-1 border-b last:border-0" data-testid={`row-position-${p.id}`}>
                  <span className="font-medium">{p.assetSymbol}</span>
                  <span className="text-muted-foreground">{Number(p.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription className="text-xs">This is a read-only view. {seat.ownerName} can revoke your access at any time. CryptoOwnBank never gives you private keys or seed phrases.</AlertDescription>
      </Alert>
    </div>
  );
}
