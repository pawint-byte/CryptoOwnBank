import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  Shield,
  Clock,
  AlertTriangle,
  Building2,
  TrendingUp,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SnapshotData {
  totalValue: string;
  holdings: Array<{ symbol: string; value: number; percent: number }>;
  businessName?: string;
  businessLogo?: string;
  createdAt: string;
  expiresAt: string;
}

export default function SnapshotPage() {
  const [, params] = useRoute("/snapshot/:token");
  const token = params?.token || "";
  const [data, setData] = useState<SnapshotData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid snapshot link");
      setLoading(false);
      return;
    }
    fetch(`/api/snapshot/${token}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error("not_found");
        if (res.status === 410) throw new Error("expired");
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then(setData)
      .catch((err) => {
        if (err.message === "expired") setError("expired");
        else if (err.message === "not_found") setError("not_found");
        else setError("failed");
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!data?.expiresAt) return;
    const update = () => {
      const diff = new Date(data.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      if (mins > 60) {
        const hours = Math.floor(mins / 60);
        setTimeLeft(`${hours}h ${mins % 60}m`);
      } else {
        setTimeLeft(`${mins}m ${secs}s`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [data?.expiresAt]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="animate-pulse space-y-4 w-full max-w-sm">
          <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            {error === "expired" ? (
              <>
                <Clock className="h-12 w-12 text-amber-500 mx-auto" />
                <h2 className="text-xl font-bold" data-testid="text-snapshot-error">Snapshot Expired</h2>
                <p className="text-sm text-muted-foreground">
                  This portfolio snapshot has expired for security. The owner can generate a new one anytime.
                </p>
              </>
            ) : error === "not_found" ? (
              <>
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                <h2 className="text-xl font-bold" data-testid="text-snapshot-error">Snapshot Not Found</h2>
                <p className="text-sm text-muted-foreground">
                  This snapshot link is invalid or has been deleted.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                <h2 className="text-xl font-bold" data-testid="text-snapshot-error">Something Went Wrong</h2>
                <p className="text-sm text-muted-foreground">
                  Unable to load the snapshot. Please try again.
                </p>
              </>
            )}
            <a href="/">
              <Button variant="outline" data-testid="link-snapshot-home">Go to CryptoOwnBank</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const totalValue = parseFloat(data.totalValue || "0");
  const holdings = (data.holdings || []) as Array<{ symbol: string; value: number; percent: number }>;
  const topHoldings = holdings
    .filter(h => h.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const COLORS = [
    "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
    "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-lime-500",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-4">
        <div className="text-center space-y-3">
          {data.businessLogo && (
            <div className="flex justify-center">
              <img
                src={data.businessLogo}
                alt={data.businessName || ""}
                className="h-12 w-12 rounded-xl object-contain border bg-white shadow-sm"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                data-testid="img-snapshot-logo"
              />
            </div>
          )}
          {data.businessName && (
            <p className="text-sm font-semibold" data-testid="text-snapshot-business">{data.businessName}</p>
          )}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium">
            <Eye className="h-3 w-3" />
            Portfolio Snapshot
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="text-center space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Portfolio Value</p>
              <p className="text-3xl font-bold" data-testid="text-snapshot-total">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {topHoldings.length > 0 && (
              <>
                <div className="h-3 rounded-full overflow-hidden flex">
                  {topHoldings.map((h, i) => (
                    <div
                      key={h.symbol}
                      className={`${COLORS[i % COLORS.length]} transition-all`}
                      style={{ width: `${Math.max(h.percent, 2)}%` }}
                      title={`${h.symbol}: ${h.percent.toFixed(1)}%`}
                    />
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  {topHoldings.map((h, i) => (
                    <div key={h.symbol} className="flex items-center justify-between" data-testid={`row-holding-${h.symbol}`}>
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${COLORS[i % COLORS.length]}`} />
                        <span className="text-sm font-medium">{h.symbol}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          ${h.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {h.percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {holdings.length > 8 && (
                    <p className="text-xs text-center text-muted-foreground">
                      +{holdings.length - 8} more assets
                    </p>
                  )}
                </div>
              </>
            )}

            <Separator />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {new Date(data.createdAt).toLocaleString(undefined, {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                <span className={timeLeft === "Expired" ? "text-red-500 font-semibold" : ""} data-testid="text-snapshot-expiry">
                  {timeLeft === "Expired" ? "Expired" : `Expires in ${timeLeft}`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-card border">
          <Shield className="h-4 w-4 text-emerald-500" />
          <span className="text-[10px] text-muted-foreground">Read-only snapshot. No login or wallet access.</span>
        </div>

        <div className="text-center space-y-2 pt-1">
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-snapshot-home">
            Powered by <span className="font-semibold">CryptoOwnBank</span>
          </a>
          <p className="text-[10px] text-muted-foreground/60">
            This is a point-in-time snapshot. Values may have changed since it was created.
          </p>
        </div>
      </div>
    </div>
  );
}
