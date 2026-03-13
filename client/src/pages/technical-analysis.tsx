import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Bar,
  CartesianGrid,
  Brush,
  Cell,
  Customized,
} from "recharts";
import { BarChart3, Lock, ArrowRight, TrendingUp, AlertTriangle } from "lucide-react";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  type OHLCDataPoint,
} from "@/lib/indicators";

const TIMEFRAMES = [
  { label: "1D", days: 1, free: true },
  { label: "1W", days: 7, free: true },
  { label: "1M", days: 30, free: true },
  { label: "3M", days: 90, free: false },
  { label: "1Y", days: 365, free: false },
  { label: "3Y", days: 1095, free: false },
  { label: "5Y", days: 1825, free: false },
  { label: "10Y", days: 3650, free: false },
];

type IndicatorKey = "sma20" | "sma50" | "sma200" | "ema12" | "ema26" | "rsi" | "macd" | "bollinger";

const INDICATOR_COLORS: Record<IndicatorKey, string> = {
  sma20: "#f59e0b",
  sma50: "#3b82f6",
  sma200: "#ef4444",
  ema12: "#8b5cf6",
  ema26: "#ec4899",
  rsi: "#06b6d4",
  macd: "#10b981",
  bollinger: "#6366f1",
};

const INDICATOR_MIN_PERIODS: Record<IndicatorKey, number> = {
  sma20: 20,
  sma50: 50,
  sma200: 200,
  ema12: 12,
  ema26: 26,
  rsi: 15,
  macd: 35,
  bollinger: 20,
};

const FREE_INDICATORS: IndicatorKey[] = ["sma20", "sma50", "sma200"];
const PAID_INDICATORS: IndicatorKey[] = ["ema12", "ema26", "rsi", "macd", "bollinger"];

interface OHLCResponse {
  symbol: string;
  days: number;
  ohlc: OHLCDataPoint[];
}

function formatDate(ts: number, days: number) {
  const d = new Date(ts);
  if (days <= 1) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days <= 30) return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" });
}

function formatPrice(val: number) {
  if (val >= 1000) return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (val >= 1) return `$${val.toFixed(2)}`;
  if (val >= 0.01) return `$${val.toFixed(4)}`;
  return `$${val.toFixed(6)}`;
}

interface TooltipPayloadEntry {
  dataKey: string;
  value: number | string | null;
  color: string;
  name: string;
  payload: ChartDataPoint;
}

interface ChartDataPoint {
  timestamp: number;
  dateLabel: string;
  open: number;
  high: number;
  low: number;
  close: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  ema12?: number;
  ema26?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
}

interface RSIDataPoint {
  timestamp: number;
  dateLabel: string;
  rsi?: number;
}

interface MACDDataPoint {
  timestamp: number;
  dateLabel: string;
  macd?: number;
  signal?: number;
  histogram?: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

const HIDDEN_TOOLTIP_KEYS = new Set(["candleBody", "open", "high", "low", "close", "dateLabel", "timestamp", "bbUpper", "bbLower", "bbMiddle"]);

function CustomTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs space-y-1 z-50">
      <p className="font-medium text-foreground">{d.dateLabel}</p>
      {d.open !== undefined && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <span className="text-muted-foreground">Open</span><span>{formatPrice(d.open)}</span>
          <span className="text-muted-foreground">High</span><span>{formatPrice(d.high)}</span>
          <span className="text-muted-foreground">Low</span><span>{formatPrice(d.low)}</span>
          <span className="text-muted-foreground">Close</span><span className="font-medium">{formatPrice(d.close)}</span>
        </div>
      )}
      {payload
        .filter((p) => !HIDDEN_TOOLTIP_KEYS.has(p.dataKey) && p.value != null)
        .map((p) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name || p.dataKey}</span>
            <span className="font-medium">{typeof p.value === "number" ? formatPrice(p.value) : p.value}</span>
          </div>
        ))}
    </div>
  );
}

function RSITooltip({ active, payload }: { active?: boolean; payload?: { payload: RSIDataPoint }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
      <p className="text-muted-foreground">{d?.dateLabel}</p>
      <p className="font-medium" style={{ color: INDICATOR_COLORS.rsi }}>RSI: {d?.rsi?.toFixed(2)}</p>
    </div>
  );
}

function MACDTooltip({ active, payload }: { active?: boolean; payload?: { payload: MACDDataPoint }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs space-y-0.5">
      <p className="text-muted-foreground">{d?.dateLabel}</p>
      <p style={{ color: "#10b981" }}>MACD: {d?.macd?.toFixed(4)}</p>
      <p style={{ color: "#f59e0b" }}>Signal: {d?.signal?.toFixed(4)}</p>
      <p style={{ color: d?.histogram != null && d.histogram >= 0 ? "#22c55e" : "#ef4444" }}>Histogram: {d?.histogram?.toFixed(4)}</p>
    </div>
  );
}

export default function TechnicalAnalysis() {
  const [symbol, setSymbol] = useState("XRP");
  const [days, setDays] = useState(90);
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorKey>>(new Set(["sma20"]));

  const { data: subLimits } = useQuery<{ tier: string }>({
    queryKey: ["/api/subscription/limits"],
  });

  const tier = subLimits?.tier || "free";
  const isPaidUser = tier === "premium" || tier === "pro";

  const { data: symbolsData } = useQuery<{ symbols: string[] }>({
    queryKey: ["/api/technical-analysis/symbols"],
  });

  const { data: ohlcData, isLoading } = useQuery<OHLCResponse>({
    queryKey: ["/api/technical-analysis/ohlc", symbol, days],
    queryFn: async () => {
      const res = await fetch(`/api/technical-analysis/ohlc/${symbol}?days=${days}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch OHLC data");
      return res.json();
    },
  });

  const symbols = symbolsData?.symbols || ["XRP", "BTC", "ETH", "SOL", "XLM"];
  const rawOhlc: OHLCDataPoint[] = ohlcData?.ohlc || [];

  const toggleIndicator = (key: IndicatorKey) => {
    if (!isPaidUser && PAID_INDICATORS.includes(key)) return;
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const insufficientIndicators = useMemo(() => {
    const result: string[] = [];
    for (const key of activeIndicators) {
      const minPeriods = INDICATOR_MIN_PERIODS[key];
      if (rawOhlc.length < minPeriods) {
        result.push(`${key.toUpperCase()} requires ${minPeriods} data points (have ${rawOhlc.length})`);
      }
    }
    return result;
  }, [rawOhlc.length, activeIndicators]);

  const computed = useMemo(() => {
    if (rawOhlc.length === 0) return { chartData: [], rsiData: [], macdData: [] };

    const sma20 = activeIndicators.has("sma20") ? calculateSMA(rawOhlc, 20) : [];
    const sma50 = activeIndicators.has("sma50") ? calculateSMA(rawOhlc, 50) : [];
    const sma200 = activeIndicators.has("sma200") ? calculateSMA(rawOhlc, 200) : [];
    const ema12 = activeIndicators.has("ema12") ? calculateEMA(rawOhlc, 12) : [];
    const ema26 = activeIndicators.has("ema26") ? calculateEMA(rawOhlc, 26) : [];
    const bb = activeIndicators.has("bollinger") ? calculateBollingerBands(rawOhlc, 20, 2) : [];
    const rsi = activeIndicators.has("rsi") ? calculateRSI(rawOhlc, 14) : [];
    const macd = activeIndicators.has("macd") ? calculateMACD(rawOhlc, 12, 26, 9) : [];

    const toMap = (arr: { timestamp: number; value: number }[]) => {
      const m = new Map<number, number>();
      arr.forEach((p) => m.set(p.timestamp, p.value));
      return m;
    };

    const sma20Map = toMap(sma20);
    const sma50Map = toMap(sma50);
    const sma200Map = toMap(sma200);
    const ema12Map = toMap(ema12);
    const ema26Map = toMap(ema26);
    const bbMap = new Map<number, { upper: number; middle: number; lower: number }>();
    bb.forEach((p) => bbMap.set(p.timestamp, { upper: p.upper, middle: p.middle, lower: p.lower }));

    const rsiMap = new Map<number, number>();
    rsi.forEach((p) => rsiMap.set(p.timestamp, p.value));

    const macdMap = new Map<number, { macd: number; signal: number; histogram: number }>();
    macd.forEach((p) => macdMap.set(p.timestamp, { macd: p.macd, signal: p.signal, histogram: p.histogram }));

    const chartData = rawOhlc.map((c) => {
      const bbPoint = bbMap.get(c.timestamp);
      return {
        timestamp: c.timestamp,
        dateLabel: formatDate(c.timestamp, days),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        sma20: sma20Map.get(c.timestamp),
        sma50: sma50Map.get(c.timestamp),
        sma200: sma200Map.get(c.timestamp),
        ema12: ema12Map.get(c.timestamp),
        ema26: ema26Map.get(c.timestamp),
        bbUpper: bbPoint?.upper,
        bbMiddle: bbPoint?.middle,
        bbLower: bbPoint?.lower,
      };
    });

    const rsiData = rawOhlc.map((c) => ({
      timestamp: c.timestamp,
      dateLabel: formatDate(c.timestamp, days),
      rsi: rsiMap.get(c.timestamp),
    }));

    const macdData = rawOhlc.map((c) => {
      const m = macdMap.get(c.timestamp);
      return {
        timestamp: c.timestamp,
        dateLabel: formatDate(c.timestamp, days),
        macd: m?.macd,
        signal: m?.signal,
        histogram: m?.histogram,
      };
    });

    return { chartData, rsiData, macdData };
  }, [rawOhlc, activeIndicators, days]);

  const latestPrice = rawOhlc.length > 0 ? rawOhlc[rawOhlc.length - 1].close : 0;
  const firstPrice = rawOhlc.length > 0 ? rawOhlc[0].close : 0;
  const priceChange = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;

  const yDomain = useMemo(() => {
    if (computed.chartData.length === 0) return [0, 1];
    let min = Infinity;
    let max = -Infinity;
    for (const d of computed.chartData) {
      if (d.low < min) min = d.low;
      if (d.high > max) max = d.high;
      if (d.bbLower && d.bbLower < min) min = d.bbLower;
      if (d.bbUpper && d.bbUpper > max) max = d.bbUpper;
    }
    const padding = (max - min) * 0.05;
    return [min - padding, max + padding];
  }, [computed.chartData]);

  const allIndicators: { key: IndicatorKey; label: string; isPaid: boolean }[] = [
    { key: "sma20", label: "SMA 20", isPaid: false },
    { key: "sma50", label: "SMA 50", isPaid: false },
    { key: "sma200", label: "SMA 200", isPaid: false },
    { key: "ema12", label: "EMA 12", isPaid: true },
    { key: "ema26", label: "EMA 26", isPaid: true },
    { key: "rsi", label: "RSI (14)", isPaid: true },
    { key: "macd", label: "MACD", isPaid: true },
    { key: "bollinger", label: "Bollinger", isPaid: true },
  ];

  const showRSI = activeIndicators.has("rsi");
  const showMACD = activeIndicators.has("macd");

  return (
    <div className="space-y-6" data-testid="page-technical-analysis">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-technical-analysis">
            <BarChart3 className="h-6 w-6 text-[#00A4E4]" />
            Technical Analysis
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Candlestick charts with technical indicators — up to 10 years of history
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="w-[120px]" data-testid="select-ta-symbol">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {symbols.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border overflow-hidden">
            {TIMEFRAMES.map((tf) => {
              const locked = !tf.free && !isPaidUser;
              return (
                <Button
                  key={tf.label}
                  variant={days === tf.days ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none border-0 px-3"
                  onClick={() => !locked && setDays(tf.days)}
                  disabled={locked}
                  data-testid={`button-timeframe-${tf.label}`}
                >
                  {locked && <Lock className="h-3 w-3 mr-1" />}
                  {tf.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold" data-testid="text-ta-price">{formatPrice(latestPrice)}</span>
        {rawOhlc.length > 0 && (
          <Badge
            variant="secondary"
            className={priceChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
            data-testid="badge-ta-change"
          >
            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">{symbol}/USD</span>
      </div>

      <Card data-testid="card-ta-indicators">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            {allIndicators.map(({ key, label, isPaid }) => {
              const locked = isPaid && !isPaidUser;
              const active = activeIndicators.has(key);
              return (
                <Button
                  key={key}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleIndicator(key)}
                  disabled={locked}
                  style={active ? { backgroundColor: INDICATOR_COLORS[key], borderColor: INDICATOR_COLORS[key] } : undefined}
                  data-testid={`button-indicator-${key}`}
                >
                  {locked && <Lock className="h-3 w-3 mr-1" />}
                  {label}
                </Button>
              );
            })}
          </div>
          {!isPaidUser && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>EMA, RSI, MACD, and Bollinger Bands require Premium or Pro.</span>
              <a href="/settings">
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" data-testid="link-ta-upgrade">
                  Upgrade <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {insufficientIndicators.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20" data-testid="card-ta-insufficient">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Insufficient data for some indicators</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                {insufficientIndicators.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-1">Try a longer timeframe to get enough data points.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-ta-chart">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {symbol} Candlestick Chart
            </CardTitle>
            <span className="text-xs text-muted-foreground">Drag the brush below to zoom &amp; pan</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full rounded-lg" />
          ) : rawOhlc.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No price data available</p>
                <p className="text-sm mt-1">Try a different asset or timeframe.</p>
              </div>
            </div>
          ) : (
            <div className="h-[440px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={computed.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="dateLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    interval="preserveStartEnd"
                    minTickGap={50}
                  />
                  <YAxis
                    domain={yDomain as [number, number]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => formatPrice(v)}
                    width={70}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Brush
                    dataKey="dateLabel"
                    height={25}
                    stroke="hsl(var(--border))"
                    fill="hsl(var(--muted))"
                    travellerWidth={8}
                  />

                  {activeIndicators.has("bollinger") && (
                    <>
                      <Area
                        dataKey="bbUpper"
                        stroke="none"
                        fill={INDICATOR_COLORS.bollinger}
                        fillOpacity={0.05}
                        connectNulls={false}
                        dot={false}
                        activeDot={false}
                        name="BB Upper"
                      />
                      <Area
                        dataKey="bbLower"
                        stroke="none"
                        fill="transparent"
                        connectNulls={false}
                        dot={false}
                        activeDot={false}
                        name="BB Lower"
                      />
                      <Line dataKey="bbUpper" stroke={INDICATOR_COLORS.bollinger} strokeWidth={1} dot={false} strokeDasharray="4 2" connectNulls={false} name="BB Upper" />
                      <Line dataKey="bbMiddle" stroke={INDICATOR_COLORS.bollinger} strokeWidth={1} dot={false} connectNulls={false} name="BB Middle" />
                      <Line dataKey="bbLower" stroke={INDICATOR_COLORS.bollinger} strokeWidth={1} dot={false} strokeDasharray="4 2" connectNulls={false} name="BB Lower" />
                    </>
                  )}

                  <Customized
                    component={(props: Record<string, unknown>) => {
                      const xAxisMap = props.xAxisMap as Record<string, { scale: (v: string | number) => number; bandSize?: number; width: number }> | undefined;
                      const yAxisMap = props.yAxisMap as Record<string, { scale: (v: number) => number }> | undefined;
                      if (!xAxisMap || !yAxisMap) return null;
                      const xAxis = Object.values(xAxisMap)[0];
                      const yAxis = Object.values(yAxisMap)[0];
                      if (!xAxis?.scale || !yAxis?.scale) return null;

                      const data = computed.chartData;
                      const bandWidth = xAxis.bandSize || (xAxis.width / data.length);
                      const candleWidth = Math.max(2, Math.min(10, bandWidth * 0.6));

                      return (
                        <g>
                          {data.map((d, i) => {
                            const xPos = xAxis.scale(i != null ? d.dateLabel : i);
                            if (xPos == null || isNaN(xPos)) return null;
                            const yHigh = yAxis.scale(d.high);
                            const yLow = yAxis.scale(d.low);
                            const yOpen = yAxis.scale(d.open);
                            const yClose = yAxis.scale(d.close);
                            if ([yHigh, yLow, yOpen, yClose].some((v) => v == null || isNaN(v))) return null;

                            const isUp = d.close >= d.open;
                            const color = isUp ? "#22c55e" : "#ef4444";
                            const bodyTop = Math.min(yOpen, yClose);
                            const bodyHeight = Math.max(Math.abs(yOpen - yClose), 1);
                            const cx = xPos + bandWidth / 2;

                            return (
                              <g key={`candle-${i}`}>
                                <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth={1} />
                                <rect
                                  x={cx - candleWidth / 2}
                                  y={bodyTop}
                                  width={candleWidth}
                                  height={bodyHeight}
                                  fill={color}
                                  stroke={color}
                                  strokeWidth={0.5}
                                />
                              </g>
                            );
                          })}
                        </g>
                      );
                    }}
                  />

                  <Line
                    dataKey="close"
                    stroke="transparent"
                    strokeWidth={0}
                    dot={false}
                    name="Close"
                    activeDot={false}
                  />

                  {activeIndicators.has("sma20") && (
                    <Line dataKey="sma20" stroke={INDICATOR_COLORS.sma20} strokeWidth={1.5} dot={false} connectNulls={false} name="SMA 20" />
                  )}
                  {activeIndicators.has("sma50") && (
                    <Line dataKey="sma50" stroke={INDICATOR_COLORS.sma50} strokeWidth={1.5} dot={false} connectNulls={false} name="SMA 50" />
                  )}
                  {activeIndicators.has("sma200") && (
                    <Line dataKey="sma200" stroke={INDICATOR_COLORS.sma200} strokeWidth={1.5} dot={false} connectNulls={false} name="SMA 200" />
                  )}
                  {activeIndicators.has("ema12") && (
                    <Line dataKey="ema12" stroke={INDICATOR_COLORS.ema12} strokeWidth={1.5} dot={false} connectNulls={false} name="EMA 12" />
                  )}
                  {activeIndicators.has("ema26") && (
                    <Line dataKey="ema26" stroke={INDICATOR_COLORS.ema26} strokeWidth={1.5} dot={false} connectNulls={false} name="EMA 26" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {showRSI && computed.rsiData.some((d) => d.rsi !== undefined) && (
        <Card data-testid="card-ta-rsi">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              RSI (14)
              <Badge variant="outline" className="text-xs font-normal">Relative Strength Index</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={computed.rsiData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="dateLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    interval="preserveStartEnd"
                    minTickGap={50}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    ticks={[0, 30, 50, 70, 100]}
                    width={35}
                  />
                  <Tooltip content={<RSITooltip />} />
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
                  <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" />
                  <Line dataKey="rsi" stroke={INDICATOR_COLORS.rsi} strokeWidth={1.5} dot={false} connectNulls={false} name="RSI" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground justify-center">
              <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-red-500 rounded" /> Overbought (70+)</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-green-500 rounded" /> Oversold (30-)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {showMACD && computed.macdData.some((d) => d.macd !== undefined) && (
        <Card data-testid="card-ta-macd">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              MACD (12, 26, 9)
              <Badge variant="outline" className="text-xs font-normal">Moving Average Convergence Divergence</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={computed.macdData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="dateLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    interval="preserveStartEnd"
                    minTickGap={50}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    width={50}
                  />
                  <Tooltip content={<MACDTooltip />} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <Bar
                    dataKey="histogram"
                    name="Histogram"
                    isAnimationActive={false}
                  >
                    {computed.macdData.map((entry, index) => (
                      <Cell
                        key={`macd-${index}`}
                        fill={entry.histogram != null && entry.histogram >= 0 ? "#22c55e" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                  <Line dataKey="macd" stroke="#10b981" strokeWidth={1.5} dot={false} connectNulls={false} name="MACD" />
                  <Line dataKey="signal" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls={false} name="Signal" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
