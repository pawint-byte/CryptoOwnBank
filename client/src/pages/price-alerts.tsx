import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Trash2, TrendingUp, TrendingDown, Crown, AlertTriangle } from "lucide-react";
import type { PriceAlert, UserSettings } from "@shared/schema";
import { Link } from "wouter";

const CRYPTO_ASSETS = [
  { symbol: "XRP", name: "XRP" },
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "DOT", name: "Polkadot" },
  { symbol: "MATIC", name: "Polygon" },
  { symbol: "LINK", name: "Chainlink" },
];

const FREE_ALERT_LIMIT = 3;

export default function PriceAlerts() {
  const { toast } = useToast();
  const [asset, setAsset] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");

  const { data: alerts, isLoading: alertsLoading } = useQuery<PriceAlert[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const isPremium = settings?.subscriptionTier === "premium";
  const activeAlerts = alerts?.filter((a) => a.isActive && !a.triggered) || [];
  const triggeredAlerts = alerts?.filter((a) => a.triggered) || [];
  const activeCount = activeAlerts.length;
  const atLimit = !isPremium && activeCount >= FREE_ALERT_LIMIT;

  const createMutation = useMutation({
    mutationFn: async (data: { asset: string; targetPrice: string; direction: string }) => {
      const res = await apiRequest("POST", "/api/alerts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      setAsset("");
      setTargetPrice("");
      setDirection("above");
      toast({ title: "Alert created", description: "You'll be notified when the price target is hit." });
    },
    onError: (error: Error) => {
      const msg = error.message;
      if (msg.includes("403")) {
        toast({ title: "Alert limit reached", description: "Free users can have up to 3 active alerts. Upgrade to Premium for unlimited.", variant: "destructive" });
      } else {
        toast({ title: "Failed to create alert", description: msg, variant: "destructive" });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alert deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete alert", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !targetPrice) return;
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: "Invalid price", description: "Please enter a valid price greater than 0.", variant: "destructive" });
      return;
    }
    createMutation.mutate({ asset, targetPrice, direction });
  };

  const formatPrice = (price: string | number) => {
    const num = typeof price === "string" ? parseFloat(price) : price;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(num);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Price Alerts</h1>
          <p className="text-sm text-muted-foreground">Get notified when crypto prices hit your targets.</p>
        </div>
        {!isPremium && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" data-testid="badge-alert-count">
              {activeCount}/{FREE_ALERT_LIMIT} alerts used
            </Badge>
          </div>
        )}
        {isPremium && (
          <Badge variant="secondary" data-testid="badge-premium-status">
            <Crown className="h-3 w-3 mr-1" />
            Premium — Unlimited
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Create Alert
          </CardTitle>
        </CardHeader>
        <CardContent>
          {atLimit ? (
            <div className="text-center py-6 space-y-3">
              <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-medium" data-testid="text-limit-reached">Alert limit reached</p>
              <p className="text-sm text-muted-foreground">
                Free users can create up to {FREE_ALERT_LIMIT} active alerts. Upgrade to Premium for unlimited alerts.
              </p>
              <Button asChild data-testid="button-upgrade-premium">
                <Link href="/settings">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="asset">Asset</Label>
                <Select value={asset} onValueChange={setAsset}>
                  <SelectTrigger id="asset" data-testid="select-asset">
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRYPTO_ASSETS.map((a) => (
                      <SelectItem key={a.symbol} value={a.symbol} data-testid={`select-item-${a.symbol}`}>
                        {a.symbol} — {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetPrice">Target Price (USD)</Label>
                <Input
                  id="targetPrice"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  data-testid="input-target-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as "above" | "below")}>
                  <SelectTrigger id="direction" data-testid="select-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Goes above</SelectItem>
                    <SelectItem value="below">Goes below</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={createMutation.isPending || !asset || !targetPrice} data-testid="button-create-alert">
                {createMutation.isPending ? "Creating..." : "Create Alert"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : activeAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-active-alerts">
              No active alerts. Create one above to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between gap-4 rounded-md border p-3"
                  data-testid={`alert-active-${alert.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {alert.direction === "above" ? (
                      <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {alert.asset} {alert.direction === "above" ? "rises above" : "drops below"}{" "}
                        {formatPrice(alert.targetPrice)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDate(alert.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(alert.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-alert-${alert.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {triggeredAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Triggered Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {triggeredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between gap-4 rounded-md border p-3 opacity-70"
                  data-testid={`alert-triggered-${alert.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {alert.direction === "above" ? (
                      <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {alert.asset} {alert.direction === "above" ? "rose above" : "dropped below"}{" "}
                        {formatPrice(alert.targetPrice)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Triggered {formatDate(alert.triggeredAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(alert.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-triggered-${alert.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
