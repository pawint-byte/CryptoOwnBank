import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ZAxis,
} from "recharts";
import {
  Fish,
  ExternalLink,
  RefreshCw,
  Settings,
  Lock,
  ArrowRight,
  TrendingUp,
  Clock,
  Vault,
  Calendar,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface WhaleAlert {
  id: string;
  txHash: string;
  amount: string;
  currency: string;
  senderAddress: string;
  receiverAddress: string;
  senderLabel: string | null;
  receiverLabel: string | null;
  usdValue: string | null;
  txType: string | null;
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
}

interface XrpMarketStats {
  price: number;
  priceChange24h: number;
  marketCap: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number;
  fullyDilutedValuation: number;
}

interface ScatterPoint {
  x: number;
  y: number;
  amount: number;
  currency: string;
  txType: string | null;
  senderLabel: string | null;
  receiverLabel: string | null;
  senderAddress: string;
  receiverAddress: string;
  usdValue: string | null;
  txHash: string;
  id: string;
  dateLabel: string;
}

interface TimeRange {
  start: number;
  end: number;
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

function formatLargeNumber(num: number, isSupply = false): string {
  if (isSupply) {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    return num.toLocaleString();
  }
  if (num >= 1_000_000_000_000) return `$${(num / 1_000_000_000_000).toFixed(2)}T`;
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  return `$${num.toLocaleString()}`;
}

function formatUsd(usdValue: string | null) {
  if (!usdValue) return "";
  const num = parseFloat(usdValue);
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatYAxis(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString();
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

function getNextEscrowDate(): { date: Date; daysUntil: number } {
  const now = new Date();
  let target = new Date(now.getFullYear(), now.getMonth(), 1);
  if (target <= now) {
    target = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  const diffMs = target.getTime() - now.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return { date: target, daysUntil };
}

function getTxTypeInfo(txType: string | null): { label: string; color: string; icon: "escrow" | "whale" } {
  switch (txType) {
    case "escrow_release": return { label: "Escrow Release", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: "escrow" };
    case "escrow_create": return { label: "Escrow Lock", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30", icon: "escrow" };
    case "escrow_movement": return { label: "Escrow Movement", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30", icon: "escrow" };
    default: return { label: "", color: "", icon: "whale" };
  }
}

function getDotColor(currency: string, txType: string | null): string {
  if (txType && txType.startsWith("escrow")) return "#f59e0b";
  if (currency === "RLUSD") return "#10b981";
  return "#00A4E4";
}

function formatDateShort(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDateFull(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface TimelineTooltipProps {
  active?: boolean;
  payload?: { payload: ScatterPoint }[];
}

function TimelineTooltip({ active, payload }: TimelineTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const typeInfo = getTxTypeInfo(d.txType);
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs space-y-1.5 z-50 max-w-[280px]">
      <p className="font-semibold text-foreground">{formatAmount(d.amount.toString(), d.currency)}</p>
      {d.usdValue && <p className="text-muted-foreground">{formatUsd(d.usdValue)} USD value</p>}
      {typeInfo.label && <p className="text-amber-600 dark:text-amber-400 font-medium">{typeInfo.label}</p>}
      <p className="text-muted-foreground">{d.dateLabel}</p>
      <div className="border-t pt-1.5 mt-1.5 text-muted-foreground">
        <p>{d.senderLabel || truncateAddress(d.senderAddress)} → {d.receiverLabel || truncateAddress(d.receiverAddress)}</p>
      </div>
    </div>
  );
}

export default function WhaleAlerts() {
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [showList, setShowList] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null);
  const prevAlertIdsRef = useRef<Set<string>>(new Set());
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<"left" | "right" | "middle" | null>(null);
  const dragStartX = useRef(0);
  const dragStartRange = useRef<TimeRange | null>(null);

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

  const { data: marketStats } = useQuery<XrpMarketStats>({
    queryKey: ["/api/xrp-market-stats"],
    refetchInterval: 5 * 60 * 1000,
  });

  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const settingsMutation = useMutation({
    mutationFn: async (data: Partial<WhaleAlertSettings>) => {
      const res = await apiRequest("PUT", "/api/whale-alerts/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whale-alerts/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whale-alerts"] });
      toast({ title: "Settings updated", description: "Your whale alert preferences have been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to update settings", variant: "destructive" });
    },
  });

  const alerts = alertsData?.alerts || [];
  const tierRestricted = alertsData?.tierRestricted ?? true;

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
  const escrowAlerts = alerts.filter((a) => a.txType && a.txType.startsWith("escrow"));
  const totalUsd = alerts.reduce((sum, a) => sum + (a.usdValue ? parseFloat(a.usdValue) : 0), 0);

  const nextEscrowDate = getNextEscrowDate();

  const { scatterData, fullRange } = useMemo(() => {
    if (alerts.length === 0) return { scatterData: [], fullRange: { start: Date.now() - 86400000, end: Date.now() } };

    const sorted = [...alerts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const points: ScatterPoint[] = sorted.map((a) => {
      const ts = new Date(a.timestamp).getTime();
      const amount = parseFloat(a.amount);
      return {
        x: ts,
        y: amount,
        amount,
        currency: a.currency,
        txType: a.txType,
        senderLabel: a.senderLabel,
        receiverLabel: a.receiverLabel,
        senderAddress: a.senderAddress,
        receiverAddress: a.receiverAddress,
        usdValue: a.usdValue,
        txHash: a.txHash,
        id: a.id,
        dateLabel: formatDateFull(ts),
      };
    });

    const minTs = points[0].x;
    const maxTs = points[points.length - 1].x;
    const pad = Math.max((maxTs - minTs) * 0.05, 3600000);

    return {
      scatterData: points,
      fullRange: { start: minTs - pad, end: maxTs + pad },
    };
  }, [alerts]);

  const viewRange = timeRange || fullRange;

  const visibleData = useMemo(() => {
    return scatterData.filter((p) => p.x >= viewRange.start && p.x <= viewRange.end);
  }, [scatterData, viewRange]);

  const sliderLeft = fullRange.end > fullRange.start
    ? ((viewRange.start - fullRange.start) / (fullRange.end - fullRange.start)) * 100
    : 0;
  const sliderWidth = fullRange.end > fullRange.start
    ? ((viewRange.end - viewRange.start) / (fullRange.end - fullRange.start)) * 100
    : 100;

  const handleSliderMouseDown = useCallback((e: React.MouseEvent, handle: "left" | "right" | "middle") => {
    e.preventDefault();
    isDragging.current = handle;
    dragStartX.current = e.clientX;
    dragStartRange.current = { ...viewRange };

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current || !sliderRef.current || !dragStartRange.current) return;
      const containerWidth = sliderRef.current.getBoundingClientRect().width;
      const dx = ev.clientX - dragStartX.current;
      const dtFraction = dx / containerWidth;
      const totalSpan = fullRange.end - fullRange.start;
      const dt = dtFraction * totalSpan;

      if (isDragging.current === "middle") {
        const rangeSpan = dragStartRange.current.end - dragStartRange.current.start;
        let newStart = dragStartRange.current.start + dt;
        let newEnd = dragStartRange.current.end + dt;
        if (newStart < fullRange.start) { newStart = fullRange.start; newEnd = fullRange.start + rangeSpan; }
        if (newEnd > fullRange.end) { newEnd = fullRange.end; newStart = fullRange.end - rangeSpan; }
        setTimeRange({ start: newStart, end: newEnd });
      } else if (isDragging.current === "left") {
        const newStart = Math.max(fullRange.start, Math.min(dragStartRange.current.start + dt, dragStartRange.current.end - totalSpan * 0.02));
        setTimeRange({ start: newStart, end: dragStartRange.current.end });
      } else {
        const newEnd = Math.min(fullRange.end, Math.max(dragStartRange.current.end + dt, dragStartRange.current.start + totalSpan * 0.02));
        setTimeRange({ start: dragStartRange.current.start, end: newEnd });
      }
    };

    const onMouseUp = () => {
      isDragging.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [viewRange, fullRange]);

  const zoomIn = useCallback(() => {
    const center = (viewRange.start + viewRange.end) / 2;
    const halfSpan = (viewRange.end - viewRange.start) * 0.35;
    const minSpan = (fullRange.end - fullRange.start) * 0.02;
    if (halfSpan * 2 < minSpan) return;
    setTimeRange({
      start: Math.max(fullRange.start, center - halfSpan),
      end: Math.min(fullRange.end, center + halfSpan),
    });
  }, [viewRange, fullRange]);

  const zoomOut = useCallback(() => {
    const center = (viewRange.start + viewRange.end) / 2;
    const halfSpan = (viewRange.end - viewRange.start) * 0.65;
    setTimeRange({
      start: Math.max(fullRange.start, center - halfSpan),
      end: Math.min(fullRange.end, center + halfSpan),
    });
  }, [viewRange, fullRange]);

  const resetZoom = useCallback(() => {
    setTimeRange(null);
  }, []);

  const yDomain = useMemo(() => {
    if (visibleData.length === 0) return [0, 1000000];
    const maxY = Math.max(...visibleData.map((d) => d.y));
    return [0, maxY * 1.15];
  }, [visibleData]);

  const xTicks = useMemo(() => {
    const span = viewRange.end - viewRange.start;
    const tickCount = 6;
    const step = span / tickCount;
    const ticks: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(viewRange.start + step * i);
    }
    return ticks;
  }, [viewRange]);

  const handleDotClick = useCallback((data: ScatterPoint) => {
    setSelectedAlert(selectedAlert === data.id ? null : data.id);
  }, [selectedAlert]);

  const selectedAlertData = selectedAlert ? alerts.find((a) => a.id === selectedAlert) : null;

  return (
    <div className="space-y-6" data-testid="page-whale-alerts">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-whale-alerts">
            <Fish className="h-6 w-6 text-[#00A4E4]" />
            Whale Alerts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Large XRP and RLUSD transactions on the XRP Ledger — including Ripple escrow releases
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <p className="text-xs text-muted-foreground">Largest XRP transfers</p>
          </CardContent>
        </Card>
        <Card data-testid="card-whale-stat-rlusd">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              RLUSD Whales
            </div>
            <p className="text-2xl font-bold">{rlusdAlerts.length}</p>
            <p className="text-xs text-muted-foreground">Largest RLUSD transfers</p>
          </CardContent>
        </Card>
        <Card data-testid="card-whale-stat-escrow" className="border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Vault className="h-4 w-4 text-amber-500" />
              Ripple Escrow Events
            </div>
            <p className="text-2xl font-bold">{escrowAlerts.length}</p>
            <p className="text-xs text-muted-foreground">{escrowAlerts.length > 0 ? "Releases & locks tracked" : "Monitoring escrow accounts"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/10" data-testid="card-escrow-schedule">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Ripple Monthly Escrow Schedule</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ripple releases ~1 billion XRP from escrow on the 1st of each month. The XRP is either purchased by the market or locked back into escrow. These events are tracked automatically in the feed below.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="text-xs">
                  <span className="text-muted-foreground">Next release: </span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {nextEscrowDate.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
                  {nextEscrowDate.daysUntil === 0 ? "Today" : nextEscrowDate.daysUntil === 1 ? "Tomorrow" : `${nextEscrowDate.daysUntil} days away`}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {tierRestricted && (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20" data-testid="card-whale-upgrade">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Free tier: Last 24 hours only</p>
              <p className="text-xs text-muted-foreground">Upgrade to Premium or Pro for full history.</p>
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
            <div className="flex items-center gap-3">
              <Switch
                checked={alertsEnabled}
                onCheckedChange={setAlertsEnabled}
                data-testid="switch-whale-enabled"
              />
              <Label>Enable in-app whale notifications</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, you will receive a toast notification whenever a new large transaction is detected during auto-refresh.
            </p>
            <Button
              onClick={() =>
                settingsMutation.mutate({
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

      <Card data-testid="card-whale-timeline">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              Transaction Timeline
              <Badge variant="outline" className="text-xs font-normal">
                Auto-refreshes every 30s
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={zoomIn} title="Zoom in" data-testid="button-zoom-in">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={zoomOut} title="Zoom out" data-testid="button-zoom-out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={resetZoom} title="Reset zoom" data-testid="button-zoom-reset">
                <Maximize2 className="h-4 w-4" />
              </Button>
              {alerts.length > 0 && (
                <span className="text-xs text-muted-foreground ml-2">{visibleData.length} of {alerts.length} visible</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-[#00A4E4]" /> XRP
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> RLUSD
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Escrow
            </div>
            <span className="text-xs text-muted-foreground ml-auto">Click a dot to see details</span>
          </div>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <Skeleton className="h-[340px] w-full rounded-lg" />
          ) : alerts.length === 0 ? (
            <div className="h-[340px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Fish className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No whale transactions detected yet</p>
                <p className="text-sm mt-1">
                  Monitoring for the largest XRP and RLUSD transfers on the ledger.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      type="number"
                      dataKey="x"
                      domain={[viewRange.start, viewRange.end]}
                      ticks={xTicks}
                      tickFormatter={(v) => formatDateShort(v)}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      domain={yDomain as [number, number]}
                      tickFormatter={formatYAxis}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      width={60}
                    />
                    <ZAxis type="number" dataKey="amount" range={[60, 400]} />
                    <Tooltip content={<TimelineTooltip />} cursor={false} />
                    <Scatter
                      data={visibleData}
                      isAnimationActive={false}
                      cursor="pointer"
                      onClick={(entry: ScatterPoint) => { if (entry?.id) handleDotClick(entry); }}
                    >
                      {visibleData.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={getDotColor(entry.currency, entry.txType)}
                          fillOpacity={selectedAlert === entry.id ? 1 : 0.7}
                          stroke={selectedAlert === entry.id ? "hsl(var(--foreground))" : getDotColor(entry.currency, entry.txType)}
                          strokeWidth={selectedAlert === entry.id ? 2 : 1}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 px-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{formatDateShort(fullRange.start)}</span>
                  <span className="font-medium">Drag to pan · Handles to resize</span>
                  <span>{formatDateShort(fullRange.end)}</span>
                </div>
                <div
                  ref={sliderRef}
                  className="relative h-8 bg-muted/50 rounded-md border cursor-pointer select-none"
                  data-testid="timeline-slider"
                >
                  <div className="absolute inset-0 flex items-center px-1">
                    {scatterData.map((p) => {
                      const left = ((p.x - fullRange.start) / (fullRange.end - fullRange.start)) * 100;
                      return (
                        <div
                          key={p.id}
                          className="absolute h-2 w-1 rounded-sm opacity-30"
                          style={{
                            left: `${left}%`,
                            backgroundColor: getDotColor(p.currency, p.txType),
                            bottom: "4px",
                          }}
                        />
                      );
                    })}
                  </div>
                  <div
                    className="absolute top-0 bottom-0 bg-[#00A4E4]/15 border border-[#00A4E4]/40 rounded-md"
                    style={{ left: `${sliderLeft}%`, width: `${Math.max(sliderWidth, 2)}%` }}
                    onMouseDown={(e) => handleSliderMouseDown(e, "middle")}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-md hover:bg-[#00A4E4]/30 transition-colors"
                      onMouseDown={(e) => { e.stopPropagation(); handleSliderMouseDown(e, "left"); }}
                    >
                      <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[#00A4E4]/60 rounded-full" />
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-md hover:bg-[#00A4E4]/30 transition-colors"
                      onMouseDown={(e) => { e.stopPropagation(); handleSliderMouseDown(e, "right"); }}
                    >
                      <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[#00A4E4]/60 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedAlertData && (
        <Card className="border-[#00A4E4]/30" data-testid="card-whale-detail">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                selectedAlertData.txType?.startsWith("escrow") ? "bg-amber-500/10" :
                selectedAlertData.currency === "XRP" ? "bg-[#00A4E4]/10" : "bg-emerald-500/10"
              }`}>
                {selectedAlertData.txType?.startsWith("escrow") ? (
                  <Vault className="h-5 w-5 text-amber-500" />
                ) : (
                  <Fish className={`h-5 w-5 ${selectedAlertData.currency === "XRP" ? "text-[#00A4E4]" : "text-emerald-500"}`} />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold">{formatAmount(selectedAlertData.amount, selectedAlertData.currency)}</span>
                  {selectedAlertData.usdValue && (
                    <Badge variant="secondary">{formatUsd(selectedAlertData.usdValue)}</Badge>
                  )}
                  <Badge variant="outline" className={`text-xs ${selectedAlertData.currency === "XRP" ? "border-[#00A4E4]/30 text-[#00A4E4]" : "border-emerald-500/30 text-emerald-500"}`}>
                    {selectedAlertData.currency}
                  </Badge>
                  {(() => { const ti = getTxTypeInfo(selectedAlertData.txType); return ti.label ? <Badge variant="outline" className={`text-xs ${ti.color}`}>{ti.label}</Badge> : null; })()}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    {selectedAlertData.senderLabel && <Badge variant="secondary" className="text-xs font-medium py-0 px-1.5">{selectedAlertData.senderLabel}</Badge>}
                    <span className="font-mono text-xs">{truncateAddress(selectedAlertData.senderAddress)}</span>
                  </span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="inline-flex items-center gap-1">
                    {selectedAlertData.receiverLabel && <Badge variant="secondary" className="text-xs font-medium py-0 px-1.5">{selectedAlertData.receiverLabel}</Badge>}
                    <span className="font-mono text-xs">{truncateAddress(selectedAlertData.receiverAddress)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(selectedAlertData.timestamp)}</span>
                  <span>{new Date(selectedAlertData.timestamp).toLocaleString()}</span>
                  <a
                    href={`https://xrpscan.com/tx/${selectedAlertData.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00A4E4] hover:underline flex items-center gap-1"
                    data-testid="link-detail-explorer"
                  >
                    View on XRPScan <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedAlert(null)} className="shrink-0">
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-whale-feed">
        <CardHeader
          className="cursor-pointer select-none hover:bg-muted/30 transition-colors rounded-t-lg"
          onClick={() => setShowList(!showList)}
          data-testid="button-toggle-list"
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              All Transactions
              <Badge variant="outline" className="text-xs font-normal">
                Sorted by amount
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {alerts.length > 0 && (
                <span className="text-xs text-muted-foreground">{alerts.length} transactions</span>
              )}
              {showList ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </div>
          </div>
        </CardHeader>
        {showList && <CardContent>
          {alertsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No transactions yet.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {alerts.map((alert, idx) => {
                const typeInfo = getTxTypeInfo(alert.txType);
                const isEscrowTx = typeInfo.icon === "escrow";
                const isSelected = selectedAlert === alert.id;
                return (
                  <div
                    key={alert.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? "border-[#00A4E4]/50 bg-[#00A4E4]/5" :
                      isEscrowTx ? "border-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40 dark:hover:bg-amber-950/20" :
                      "hover:bg-muted/30"
                    }`}
                    onClick={() => setSelectedAlert(isSelected ? null : alert.id)}
                    data-testid={`whale-alert-${alert.id}`}
                  >
                    <span className="text-xs text-muted-foreground font-mono w-6 text-right shrink-0">#{idx + 1}</span>
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        isEscrowTx ? "bg-amber-500/10" :
                        alert.currency === "XRP" ? "bg-[#00A4E4]/10" : "bg-emerald-500/10"
                      }`}
                    >
                      {isEscrowTx ? (
                        <Vault className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Fish className={`h-4 w-4 ${alert.currency === "XRP" ? "text-[#00A4E4]" : "text-emerald-500"}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{formatAmount(alert.amount, alert.currency)}</span>
                        {alert.usdValue && <Badge variant="secondary" className="text-xs">{formatUsd(alert.usdValue)}</Badge>}
                        <Badge variant="outline" className={`text-xs ${alert.currency === "XRP" ? "border-[#00A4E4]/30 text-[#00A4E4]" : "border-emerald-500/30 text-emerald-500"}`}>
                          {alert.currency}
                        </Badge>
                        {typeInfo.label && <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>{typeInfo.label}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          {alert.senderLabel && <Badge variant="secondary" className="text-xs font-medium py-0 px-1.5">{alert.senderLabel}</Badge>}
                          <span>{truncateAddress(alert.senderAddress)}</span>
                        </span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="inline-flex items-center gap-1">
                          {alert.receiverLabel && <Badge variant="secondary" className="text-xs font-medium py-0 px-1.5">{alert.receiverLabel}</Badge>}
                          <span>{truncateAddress(alert.receiverAddress)}</span>
                        </span>
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
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`link-whale-explorer-${alert.id}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>}
      </Card>

      {marketStats && (
        <Card data-testid="card-xrp-market-stats">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#00A4E4]" />
              XRP Market Data
              <Badge variant="outline" className="text-xs font-normal">Live</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div data-testid="stat-xrp-price">
                <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                <p className="text-lg font-bold">${marketStats.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</p>
              </div>
              <div data-testid="stat-xrp-change">
                <p className="text-xs text-muted-foreground mb-1">24h Change</p>
                <p className={`text-lg font-bold ${marketStats.priceChange24h >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {marketStats.priceChange24h >= 0 ? "+" : ""}{marketStats.priceChange24h.toFixed(2)}%
                </p>
              </div>
              <div data-testid="stat-xrp-mcap">
                <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
                <p className="text-lg font-bold">{formatLargeNumber(marketStats.marketCap)}</p>
              </div>
              <div data-testid="stat-xrp-circulating">
                <p className="text-xs text-muted-foreground mb-1">Circulating Supply</p>
                <p className="text-lg font-bold">{formatLargeNumber(marketStats.circulatingSupply, true)}</p>
              </div>
              <div data-testid="stat-xrp-total">
                <p className="text-xs text-muted-foreground mb-1">Total Supply</p>
                <p className="text-lg font-bold">{formatLargeNumber(marketStats.totalSupply, true)}</p>
              </div>
              <div data-testid="stat-xrp-max">
                <p className="text-xs text-muted-foreground mb-1">Max Supply</p>
                <p className="text-lg font-bold">{formatLargeNumber(marketStats.maxSupply, true)}</p>
              </div>
              <div data-testid="stat-xrp-circ-pct" className="col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground mb-1">Circulating vs Total</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-[#00A4E4]">
                    {((marketStats.circulatingSupply / (marketStats.totalSupply || 1)) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="w-full h-2 rounded-full bg-muted mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#00A4E4] transition-all"
                    style={{ width: `${Math.min(100, (marketStats.circulatingSupply / (marketStats.totalSupply || 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <div data-testid="stat-xrp-escrow-est">
                <p className="text-xs text-muted-foreground mb-1">Est. In Escrow</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatLargeNumber(Math.max(0, marketStats.totalSupply - marketStats.circulatingSupply), true)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {((Math.max(0, marketStats.totalSupply - marketStats.circulatingSupply) / (marketStats.totalSupply || 1)) * 100).toFixed(1)}% of total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
