import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Fish,
  ExternalLink,
  RefreshCw,
  Settings,
  Lock,
  ArrowRight,
  TrendingUp,
  Clock,
} from "lucide-react";

interface WhaleAlert {
  id: string;
  txHash: string;
  amount: string;
  currency: string;
  senderAddress: string;
  receiverAddress: string;
  usdValue: string | null;
  timestamp: string;
}

interface WhaleAlertSettings {
  xrpThreshold: string;
  rlusdThreshold: string;
  enabled: boolean;
}

interface WhaleAlertsResponse {
  alerts: WhaleAlert[];
  tierRestricted: boolean;
  xrpThreshold: number;
  rlusdThreshold: number;
}

function truncateAddress(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

function formatAmount(amount: string, currency: string) {
  const num = parseFloat(amount);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B ${currency}`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M ${currency}`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K ${currency}`;
  return `${num.toLocaleString()} ${currency}`;
}

function formatThreshold(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString();
}

function formatUsd(usdValue: string | null) {
  if (!usdValue) return "";
  const num = parseFloat(usdValue);
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function WhaleAlerts() {
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const prevAlertIdsRef = useRef<Set<string>>(new Set());

  const { data: subLimits } = useQuery<{ tier: string }>({
    queryKey: ["/api/subscription/limits"],
  });

  const tier = subLimits?.tier || "free";
  const isPaidUser = tier === "premium" || tier === "pro";

  const { data: alertsData, isLoading: alertsLoading } = useQuery<WhaleAlertsResponse>({
    queryKey: ["/api/whale-alerts"],
    refetchInterval: 30_000,
  });

  const { data: settings } = useQuery<WhaleAlertSettings>({
    queryKey: ["/api/whale-alerts/settings"],
  });

  const [xrpThreshold, setXrpThreshold] = useState("");
  const [rlusdThreshold, setRlusdThreshold] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const settingsMutation = useMutation({
    mutationFn: async (data: Partial<WhaleAlertSettings>) => {
      const res = await apiRequest("PUT", "/api/whale-alerts/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whale-alerts/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whale-alerts"] });
      toast({ title: "Settings updated", description: "Your whale alert preferences have been saved. The feed now reflects your custom thresholds." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update settings", variant: "destructive" });
    },
  });

  const alerts = alertsData?.alerts || [];
  const tierRestricted = alertsData?.tierRestricted ?? true;
  const activeXrpThreshold = alertsData?.xrpThreshold ?? 1_000_000;
  const activeRlusdThreshold = alertsData?.rlusdThreshold ?? 500_000;

  const isNotificationsEnabled = isPaidUser && settings?.enabled !== false;

  useEffect(() => {
    if (!isNotificationsEnabled || alerts.length === 0) return;
    const currentIds = new Set(alerts.map((a) => a.id));
    const prevIds = prevAlertIdsRef.current;

    if (prevIds.size > 0) {
      const newAlerts = alerts.filter((a) => !prevIds.has(a.id));
      if (newAlerts.length > 0) {
        const latest = newAlerts[0];
        toast({
          title: `New whale detected`,
          description: `${formatAmount(latest.amount, latest.currency)} ${latest.usdValue ? `(${formatUsd(latest.usdValue)})` : ""} moved on XRPL`,
        });
      }
    }
    prevAlertIdsRef.current = currentIds;
  }, [alerts, isNotificationsEnabled, toast]);

  const xrpAlerts = alerts.filter((a) => a.currency === "XRP");
  const rlusdAlerts = alerts.filter((a) => a.currency === "RLUSD");
  const totalUsd = alerts.reduce((sum, a) => sum + (a.usdValue ? parseFloat(a.usdValue) : 0), 0);

  return (
    <div className="space-y-6" data-testid="page-whale-alerts">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-whale-alerts">
            <Fish className="h-6 w-6 text-[#00A4E4]" />
            Whale Alerts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Large XRP and RLUSD transactions on the XRP Ledger
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/whale-alerts"] })}
            data-testid="button-refresh-whales"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {isPaidUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setXrpThreshold(settings?.xrpThreshold || "1000000");
                setRlusdThreshold(settings?.rlusdThreshold || "500000");
                setAlertsEnabled(settings?.enabled ?? true);
                setShowSettings(!showSettings);
              }}
              data-testid="button-whale-settings"
            >
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card data-testid="card-whale-stat-total">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Total Volume Tracked
            </div>
            <p className="text-2xl font-bold">{formatUsd(totalUsd.toString()) || "$0"}</p>
            <p className="text-xs text-muted-foreground">{alerts.length} whale transactions</p>
          </CardContent>
        </Card>
        <Card data-testid="card-whale-stat-xrp">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <span className="h-3 w-3 rounded-full bg-[#00A4E4]" />
              XRP Whales
            </div>
            <p className="text-2xl font-bold">{xrpAlerts.length}</p>
            <p className="text-xs text-muted-foreground">Threshold: {formatThreshold(activeXrpThreshold)}+ XRP</p>
          </CardContent>
        </Card>
        <Card data-testid="card-whale-stat-rlusd">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              RLUSD Whales
            </div>
            <p className="text-2xl font-bold">{rlusdAlerts.length}</p>
            <p className="text-xs text-muted-foreground">Threshold: {formatThreshold(activeRlusdThreshold)}+ RLUSD</p>
          </CardContent>
        </Card>
      </div>

      {tierRestricted && (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20" data-testid="card-whale-upgrade">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Free tier: Last 24 hours only</p>
              <p className="text-xs text-muted-foreground">Upgrade to Premium or Pro for full history and custom thresholds.</p>
            </div>
            <a href="/settings">
              <Button size="sm" variant="outline" data-testid="button-upgrade-whale">
                Upgrade
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {showSettings && isPaidUser && (
        <Card data-testid="card-whale-settings">
          <CardHeader>
            <CardTitle className="text-lg">Alert Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="xrp-threshold">XRP Threshold (minimum 100,000)</Label>
                <Input
                  id="xrp-threshold"
                  type="number"
                  value={xrpThreshold}
                  onChange={(e) => setXrpThreshold(e.target.value)}
                  placeholder="1000000"
                  min={100000}
                  data-testid="input-xrp-threshold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rlusd-threshold">RLUSD Threshold (minimum 10,000)</Label>
                <Input
                  id="rlusd-threshold"
                  type="number"
                  value={rlusdThreshold}
                  onChange={(e) => setRlusdThreshold(e.target.value)}
                  placeholder="500000"
                  min={10000}
                  data-testid="input-rlusd-threshold"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={alertsEnabled}
                onCheckedChange={setAlertsEnabled}
                data-testid="switch-whale-enabled"
              />
              <Label>Enable in-app whale notifications</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, you will receive a toast notification whenever a new whale transaction matching your thresholds is detected during auto-refresh.
            </p>
            <Button
              onClick={() =>
                settingsMutation.mutate({
                  xrpThreshold,
                  rlusdThreshold,
                  enabled: alertsEnabled,
                })
              }
              disabled={settingsMutation.isPending}
              data-testid="button-save-whale-settings"
            >
              {settingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-whale-feed">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              Live Feed
              <Badge variant="outline" className="text-xs font-normal">
                Auto-refreshes every 30s
              </Badge>
            </CardTitle>
            {alerts.length > 0 && (
              <span className="text-xs text-muted-foreground">{alerts.length} transactions</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Fish className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No whale transactions detected yet</p>
              <p className="text-sm mt-1">
                Monitoring for XRP transfers over {formatThreshold(activeXrpThreshold)} and RLUSD transfers over {formatThreshold(activeRlusdThreshold)}.
                Large transactions will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  data-testid={`whale-alert-${alert.id}`}
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                      alert.currency === "XRP"
                        ? "bg-[#00A4E4]/10"
                        : "bg-emerald-500/10"
                    }`}
                  >
                    <Fish
                      className={`h-5 w-5 ${
                        alert.currency === "XRP" ? "text-[#00A4E4]" : "text-emerald-500"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {formatAmount(alert.amount, alert.currency)}
                      </span>
                      {alert.usdValue && (
                        <Badge variant="secondary" className="text-xs">
                          {formatUsd(alert.usdValue)}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          alert.currency === "XRP"
                            ? "border-[#00A4E4]/30 text-[#00A4E4]"
                            : "border-emerald-500/30 text-emerald-500"
                        }`}
                      >
                        {alert.currency}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                      <span title={alert.senderAddress}>{truncateAddress(alert.senderAddress)}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span title={alert.receiverAddress}>{truncateAddress(alert.receiverAddress)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(alert.timestamp)}
                    </span>
                    <a
                      href={`https://xrpscan.com/tx/${alert.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`link-whale-explorer-${alert.id}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
