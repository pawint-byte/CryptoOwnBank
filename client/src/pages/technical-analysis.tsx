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
import { BarChart3, Lock, ArrowRight, TrendingUp, AlertTriangle, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
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

interface CandlePattern {
  name: string;
  sentiment: "bullish" | "bearish" | "neutral";
  hint: string;
}

function detectCandlePattern(
  data: OHLCDataPoint[],
  index: number
): CandlePattern | null {
  const c = data[index];
  if (!c) return null;
  const body = Math.abs(c.close - c.open);
  const range = c.high - c.low;
  if (range === 0) return null;
  const bodyRatio = body / range;
  const upperWick = c.high - Math.max(c.open, c.close);
  const lowerWick = Math.min(c.open, c.close) - c.low;
  const isUp = c.close >= c.open;

  const prev = index > 0 ? data[index - 1] : null;
  const prev2 = index > 1 ? data[index - 2] : null;
  const prevBody = prev ? Math.abs(prev.close - prev.open) : 0;
  const prevIsUp = prev ? prev.close >= prev.open : false;
  const prev2IsUp = prev2 ? prev2.close >= prev2.open : false;

  if (prev && prev2) {
    const p2Body = Math.abs(prev2.close - prev2.open);
    if (
      !prev2IsUp && !prevIsUp &&
      bodyRatio < 0.15 &&
      isUp &&
      p2Body > 0 &&
      prevBody < p2Body * 0.5 &&
      c.close > (prev2.open + prev2.close) / 2
    ) {
      return { name: "Morning Star", sentiment: "bullish", hint: "3-candle reversal — downtrend may be ending" };
    }
    if (
      prev2IsUp && prevIsUp &&
      bodyRatio < 0.15 &&
      !isUp &&
      p2Body > 0 &&
      prevBody < p2Body * 0.5 &&
      c.close < (prev2.open + prev2.close) / 2
    ) {
      return { name: "Evening Star", sentiment: "bearish", hint: "3-candle reversal — uptrend may be ending" };
    }
    if (!prev2IsUp && !prevIsUp && isUp && prevIsUp === false) {
      const allUp = isUp && c.close > prev.close && prev.close > prev2.close;
      if (allUp && body > range * 0.5 && prevBody > (prev.high - prev.low) * 0.5) {
        return { name: "Three White Soldiers", sentiment: "bullish", hint: "3 strong green candles — strong buying pressure" };
      }
    }
    if (prev2IsUp && prevIsUp && !isUp) {
      const allDown = !isUp && c.close < prev.close && prev.close < prev2.close;
      if (allDown && body > range * 0.5 && prevBody > (prev.high - prev.low) * 0.5) {
        return { name: "Three Black Crows", sentiment: "bearish", hint: "3 strong red candles — strong selling pressure" };
      }
    }
  }

  if (prev) {
    if (!prevIsUp && isUp && c.close > prev.open && c.open < prev.close && body > prevBody) {
      return { name: "Bullish Engulfing", sentiment: "bullish", hint: "Green candle fully covers previous red — buyers taking over" };
    }
    if (prevIsUp && !isUp && c.close < prev.open && c.open > prev.close && body > prevBody) {
      return { name: "Bearish Engulfing", sentiment: "bearish", hint: "Red candle fully covers previous green — sellers taking over" };
    }
    if (!prevIsUp && isUp && c.close > (prev.open + prev.close) / 2 && c.open < prev.close) {
      return { name: "Piercing Line", sentiment: "bullish", hint: "Green candle pierces past midpoint of previous red — reversal signal" };
    }
    if (prevIsUp && !isUp && c.close < (prev.open + prev.close) / 2 && c.open > prev.close) {
      return { name: "Dark Cloud Cover", sentiment: "bearish", hint: "Red candle drops past midpoint of previous green — reversal signal" };
    }
  }

  if (bodyRatio < 0.08 && range > 0) {
    if (upperWick > body * 3 && lowerWick > body * 3) {
      return { name: "Doji", sentiment: "neutral", hint: "Open ≈ Close — market is undecided, watch the next candle" };
    }
    if (lowerWick > body * 3 && upperWick < body * 1.5) {
      return { name: "Dragonfly Doji", sentiment: "bullish", hint: "Long lower shadow, no upper — buyers pushed price back up" };
    }
    if (upperWick > body * 3 && lowerWick < body * 1.5) {
      return { name: "Gravestone Doji", sentiment: "bearish", hint: "Long upper shadow, no lower — sellers pushed price back down" };
    }
    return { name: "Doji", sentiment: "neutral", hint: "Open ≈ Close — market is undecided, watch the next candle" };
  }

  if (lowerWick > body * 2 && upperWick < body * 0.5 && bodyRatio < 0.35) {
    if (isUp) {
      return { name: "Hammer", sentiment: "bullish", hint: "Long lower wick, small body at top — sellers tried but buyers won" };
    }
    return { name: "Hanging Man", sentiment: "bearish", hint: "Looks like a hammer but in an uptrend — warns of potential reversal" };
  }

  if (upperWick > body * 2 && lowerWick < body * 0.5 && bodyRatio < 0.35) {
    if (!isUp) {
      return { name: "Shooting Star", sentiment: "bearish", hint: "Long upper wick, body at bottom — price was rejected at highs" };
    }
    return { name: "Inverted Hammer", sentiment: "bullish", hint: "Long upper wick after a decline — potential reversal coming" };
  }

  if (bodyRatio > 0.85) {
    return {
      name: isUp ? "Bullish Marubozu" : "Bearish Marubozu",
      sentiment: isUp ? "bullish" : "bearish",
      hint: isUp
        ? "Full green body, almost no wicks — very strong buying"
        : "Full red body, almost no wicks — very strong selling",
    };
  }

  return null;
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
  pattern?: CandlePattern | null;
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
  const pattern = d.pattern;
  const sentimentColor = pattern?.sentiment === "bullish" ? "#22c55e" : pattern?.sentiment === "bearish" ? "#ef4444" : "#f59e0b";
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs space-y-1.5 z-50 max-w-[280px]">
      <p className="font-medium text-foreground">{d.dateLabel}</p>
      {d.open !== undefined && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <span className="text-muted-foreground">Open</span><span>{formatPrice(d.open)}</span>
          <span className="text-muted-foreground">High</span><span>{formatPrice(d.high)}</span>
          <span className="text-muted-foreground">Low</span><span>{formatPrice(d.low)}</span>
          <span className="text-muted-foreground">Close</span><span className="font-medium">{formatPrice(d.close)}</span>
        </div>
      )}
      {pattern && (
        <div className="border-t pt-1.5 mt-1">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: sentimentColor }}
            />
            <span className="font-semibold" style={{ color: sentimentColor }}>
              {pattern.name}
            </span>
            <span className="text-[10px] px-1 py-0.5 rounded font-medium" style={{
              backgroundColor: `${sentimentColor}15`,
              color: sentimentColor,
            }}>
              {pattern.sentiment}
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 leading-snug">{pattern.hint}</p>
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

    const chartData = rawOhlc.map((c, i) => {
      const bbPoint = bbMap.get(c.timestamp);
      const pattern = detectCandlePattern(rawOhlc, i);
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
        pattern,
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

      <CandlestickExplainer />

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

                            const pat = d.pattern;
                            const patColor = pat?.sentiment === "bullish" ? "#22c55e" : pat?.sentiment === "bearish" ? "#ef4444" : "#f59e0b";

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
                                {pat && (
                                  <g>
                                    <polygon
                                      points={`${cx},${(pat.sentiment === "bearish" ? yHigh - 14 : yLow + 14) - 4} ${cx - 4},${pat.sentiment === "bearish" ? yHigh - 14 : yLow + 14} ${cx},${(pat.sentiment === "bearish" ? yHigh - 14 : yLow + 14) + 4} ${cx + 4},${pat.sentiment === "bearish" ? yHigh - 14 : yLow + 14}`}
                                      fill={patColor}
                                      opacity={0.85}
                                    />
                                  </g>
                                )}
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

      <ChartPatternsGuide />
    </div>
  );
}

function CandlestickExplainer() {
  const [show, setShow] = useState(false);

  return (
    <Card className="border-[#00A4E4]/20" data-testid="card-candlestick-explainer">
      <CardContent className="p-0">
        <button
          onClick={() => setShow(!show)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
          data-testid="button-toggle-explainer"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#00A4E4]" />
            <span className="text-sm font-medium">How to Read This Chart</span>
            <Badge variant="outline" className="text-[10px]">New to charts?</Badge>
          </div>
          {show ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {show && (
          <div className="px-4 pb-4 space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anatomy of a Candlestick</h4>
                <div className="flex gap-6 justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-muted-foreground">High</span>
                      <div className="w-[2px] h-6 bg-emerald-500" />
                      <div className="w-8 h-12 bg-emerald-500 rounded-sm flex flex-col items-center justify-between py-1">
                        <span className="text-[8px] text-white font-medium">Close</span>
                        <span className="text-[8px] text-white font-medium">Open</span>
                      </div>
                      <div className="w-[2px] h-4 bg-emerald-500" />
                      <span className="text-[10px] text-muted-foreground">Low</span>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-500">Bullish</span>
                    <span className="text-[10px] text-muted-foreground">Price went UP</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-muted-foreground">High</span>
                      <div className="w-[2px] h-4 bg-red-500" />
                      <div className="w-8 h-12 bg-red-500 rounded-sm flex flex-col items-center justify-between py-1">
                        <span className="text-[8px] text-white font-medium">Open</span>
                        <span className="text-[8px] text-white font-medium">Close</span>
                      </div>
                      <div className="w-[2px] h-6 bg-red-500" />
                      <span className="text-[10px] text-muted-foreground">Low</span>
                    </div>
                    <span className="text-[11px] font-medium text-red-500">Bearish</span>
                    <span className="text-[10px] text-muted-foreground">Price went DOWN</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What Each Part Means</h4>
                <div className="space-y-2.5 text-xs">
                  <div className="flex gap-2">
                    <div className="w-8 h-4 bg-emerald-500/20 border border-emerald-500 rounded-sm shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Body (thick part)</span>
                      <p className="text-muted-foreground">Shows the range between open and close price. Green = closed higher than it opened. Red = closed lower.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex flex-col items-center shrink-0 mt-0.5">
                      <div className="w-[2px] h-4 bg-muted-foreground" />
                    </div>
                    <div>
                      <span className="font-medium">Wicks / Shadows (thin lines)</span>
                      <p className="text-muted-foreground">Upper wick = highest price reached. Lower wick = lowest price reached. Long wicks mean the price was rejected at that level.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-4 shrink-0 mt-0.5 flex items-center justify-center">
                      <div className="w-6 h-[2px] bg-muted-foreground" />
                    </div>
                    <div>
                      <span className="font-medium">Doji (tiny body)</span>
                      <p className="text-muted-foreground">Open and close are almost the same. The market is undecided — could go either way. Wait for the next candle to confirm direction.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium mb-1.5">Quick Decision Framework</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold text-sm leading-none mt-0.5">+</span>
                  <div>
                    <span className="font-medium">Bullish signs:</span>
                    <p className="text-muted-foreground">Long green candles, candles closing near highs, higher lows forming</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold text-sm leading-none mt-0.5">-</span>
                  <div>
                    <span className="font-medium">Bearish signs:</span>
                    <p className="text-muted-foreground">Long red candles, candles closing near lows, lower highs forming</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold text-sm leading-none mt-0.5">?</span>
                  <div>
                    <span className="font-medium">Caution signs:</span>
                    <p className="text-muted-foreground">Long wicks (rejection), dojis (indecision), shrinking candle bodies (momentum fading)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartPatternsGuide() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded(expanded === id ? null : id);

  const candlestickPatterns = [
    {
      id: "single",
      title: "Single Candle Patterns",
      patterns: [
        { name: "Doji", signal: "Neutral", description: "Open and close are nearly equal. Shows indecision — the market is unsure. Watch the next candle for direction.", visual: "─ ┃ ─", color: "text-muted-foreground" },
        { name: "Hammer", signal: "Bullish", description: "Small body at top, long lower wick. After a downtrend, buyers stepped in and pushed price back up. Potential reversal signal.", visual: "▪\n│", color: "text-emerald-500" },
        { name: "Inverted Hammer", signal: "Bullish", description: "Small body at bottom, long upper wick. After a downtrend, buyers tried to push higher. Confirmation needed on next candle.", visual: "│\n▪", color: "text-emerald-500" },
        { name: "Shooting Star", signal: "Bearish", description: "Small body at bottom, long upper wick. After an uptrend, sellers rejected higher prices. Watch for downside follow-through.", visual: "│\n▪", color: "text-red-500" },
        { name: "Hanging Man", signal: "Bearish", description: "Small body at top, long lower wick. After an uptrend, selling pressure appeared but buyers recovered — barely. Weakness signal.", visual: "▪\n│", color: "text-red-500" },
        { name: "Marubozu", signal: "Strong Trend", description: "Full body with no wicks. Strong conviction — buyers (green) or sellers (red) dominated the entire session. Trend continuation.", visual: "█", color: "text-blue-500" },
      ],
    },
    {
      id: "double",
      title: "Double Candle Patterns",
      patterns: [
        { name: "Bullish Engulfing", signal: "Bullish", description: "A large green candle completely engulfs the previous red candle. Buyers overwhelmed sellers — strong reversal signal after a downtrend.", visual: "▪ █", color: "text-emerald-500" },
        { name: "Bearish Engulfing", signal: "Bearish", description: "A large red candle completely engulfs the previous green candle. Sellers overwhelmed buyers — strong reversal signal after an uptrend.", visual: "█ ▪", color: "text-red-500" },
        { name: "Tweezer Top", signal: "Bearish", description: "Two candles with matching highs. Price hit the same ceiling twice and got rejected both times — resistance is holding.", visual: "▪▪", color: "text-red-500" },
        { name: "Tweezer Bottom", signal: "Bullish", description: "Two candles with matching lows. Price hit the same floor twice and bounced both times — support is holding.", visual: "▪▪", color: "text-emerald-500" },
        { name: "Piercing Line", signal: "Bullish", description: "After a downtrend, a green candle opens below the prior close but closes above 50% of the prior red candle. Buyers are fighting back.", visual: "█ █", color: "text-emerald-500" },
        { name: "Dark Cloud Cover", signal: "Bearish", description: "After an uptrend, a red candle opens above the prior close but closes below 50% of the prior green candle. Sellers taking control.", visual: "█ █", color: "text-red-500" },
      ],
    },
    {
      id: "triple",
      title: "Triple Candle Patterns",
      patterns: [
        { name: "Morning Star", signal: "Bullish", description: "Red candle → small body (doji-like) → green candle. The star shows indecision, then buyers take over. Strong bottom reversal.", visual: "█ ▪ █", color: "text-emerald-500" },
        { name: "Evening Star", signal: "Bearish", description: "Green candle → small body → red candle. The star shows momentum fading, then sellers take over. Strong top reversal.", visual: "█ ▪ █", color: "text-red-500" },
        { name: "Three White Soldiers", signal: "Bullish", description: "Three consecutive green candles, each closing higher than the last. Strong buying momentum — uptrend beginning or continuing.", visual: "█ █ █", color: "text-emerald-500" },
        { name: "Three Black Crows", signal: "Bearish", description: "Three consecutive red candles, each closing lower than the last. Strong selling pressure — downtrend beginning or continuing.", visual: "█ █ █", color: "text-red-500" },
      ],
    },
  ];

  const chartPatterns = [
    {
      id: "reversal",
      title: "Reversal Chart Patterns",
      patterns: [
        { name: "Head & Shoulders", signal: "Bearish Reversal", description: "Three peaks: left shoulder, higher head, right shoulder. When price breaks below the 'neckline' (support connecting the two troughs), it signals the uptrend is over. Target: distance from head to neckline, projected downward.", color: "text-red-500" },
        { name: "Inverse Head & Shoulders", signal: "Bullish Reversal", description: "Three troughs: left shoulder, lower head, right shoulder — upside down. When price breaks above the neckline, it signals the downtrend is over. Target: distance from head to neckline, projected upward.", color: "text-emerald-500" },
        { name: "Double Top (M)", signal: "Bearish Reversal", description: "Price hits the same resistance level twice and fails both times, forming an 'M' shape. Break below the middle support confirms the reversal. Strong sellers are defending that price level.", color: "text-red-500" },
        { name: "Double Bottom (W)", signal: "Bullish Reversal", description: "Price hits the same support level twice and bounces both times, forming a 'W' shape. Break above the middle resistance confirms the reversal. Strong buyers are defending that price level.", color: "text-emerald-500" },
        { name: "Rounding Bottom", signal: "Bullish Reversal", description: "A gradual U-shaped transition from selling pressure to buying pressure. Takes time to form — the longer it takes, the more significant the reversal. Often seen before major uptrends.", color: "text-emerald-500" },
      ],
    },
    {
      id: "continuation",
      title: "Continuation Chart Patterns",
      patterns: [
        { name: "Bull Flag", signal: "Bullish Continuation", description: "Sharp price rise (the 'pole') followed by a small downward-sloping channel (the 'flag'). The flag is just a breather — when price breaks above the flag, the uptrend resumes. Target: length of the pole.", color: "text-emerald-500" },
        { name: "Bear Flag", signal: "Bearish Continuation", description: "Sharp price drop (the 'pole') followed by a small upward-sloping channel (the 'flag'). Temporary bounce before sellers push price lower. Break below the flag resumes the downtrend.", color: "text-red-500" },
        { name: "Ascending Triangle", signal: "Bullish", description: "Flat resistance on top, rising support on bottom. Buyers keep pushing higher lows while sellers defend the same level. Eventually, buyers overwhelm — breakout above resistance.", color: "text-emerald-500" },
        { name: "Descending Triangle", signal: "Bearish", description: "Flat support on bottom, falling resistance on top. Sellers keep making lower highs while buyers defend the same level. Eventually, sellers overwhelm — breakdown below support.", color: "text-red-500" },
        { name: "Symmetrical Triangle", signal: "Neutral", description: "Converging trendlines with lower highs and higher lows. Compression builds energy. The breakout direction determines the trend — watch volume for confirmation.", color: "text-blue-500" },
        { name: "Cup & Handle", signal: "Bullish", description: "A U-shaped 'cup' followed by a small downward drift 'handle.' After the cup forms, a small pullback creates a buying opportunity. Break above the handle confirms continuation.", color: "text-emerald-500" },
      ],
    },
  ];

  const indicatorGuide = [
    { name: "SMA (Simple Moving Average)", what: "Average closing price over X periods.", howToUse: "Price above SMA = bullish, below = bearish. SMA 50 crossing above SMA 200 = 'Golden Cross' (very bullish). SMA 50 crossing below SMA 200 = 'Death Cross' (very bearish)." },
    { name: "EMA (Exponential Moving Average)", what: "Like SMA but gives more weight to recent prices — reacts faster.", howToUse: "EMA 12 crossing above EMA 26 = buy signal. Crossing below = sell signal. Better for short-term trading than SMA." },
    { name: "RSI (Relative Strength Index)", what: "Measures momentum on a 0-100 scale.", howToUse: "Above 70 = overbought (price may pull back). Below 30 = oversold (price may bounce). Divergence between RSI and price = potential reversal." },
    { name: "MACD", what: "Shows relationship between two EMAs and their momentum.", howToUse: "MACD line crossing above signal line = buy. Crossing below = sell. Histogram getting bigger = momentum increasing. Histogram shrinking = momentum fading." },
    { name: "Bollinger Bands", what: "SMA with upper/lower bands at 2 standard deviations.", howToUse: "Price touching upper band = potentially overbought. Touching lower band = potentially oversold. Bands squeezing tight = big move coming. Price outside bands = extreme move, likely to revert." },
  ];

  return (
    <Card data-testid="card-patterns-guide">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#00A4E4]" />
          Chart Patterns & Indicators Guide
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Learn to read candlestick patterns, chart formations, and technical indicators to make informed decisions
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00A4E4]" />
            Candlestick Patterns
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Each candle shows the open, high, low, and close for a time period.
            <span className="text-emerald-500 font-medium"> Green = price went up. </span>
            <span className="text-red-500 font-medium"> Red = price went down. </span>
            The body shows open-to-close range. The wicks show the high and low.
          </p>
          <div className="space-y-2">
            {candlestickPatterns.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border overflow-hidden"
              >
                <button
                  onClick={() => toggle(`candle-${group.id}`)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                  data-testid={`button-toggle-${group.id}`}
                >
                  <span className="text-sm font-medium">{group.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{group.patterns.length} patterns</Badge>
                    {expanded === `candle-${group.id}` ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {expanded === `candle-${group.id}` && (
                  <div className="border-t divide-y">
                    {group.patterns.map((p) => (
                      <div key={p.name} className="p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{p.name}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${
                            p.signal === "Bullish" || p.signal === "Strong Trend"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : p.signal === "Bearish"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30"
                                : "bg-muted text-muted-foreground border border-muted"
                          }`} variant="outline">
                            {p.signal}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Chart Patterns
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Chart patterns form over days, weeks, or months. They show the battle between buyers and sellers and help predict where price is headed next.
          </p>
          <div className="space-y-2">
            {chartPatterns.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border overflow-hidden"
              >
                <button
                  onClick={() => toggle(`chart-${group.id}`)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                  data-testid={`button-toggle-chart-${group.id}`}
                >
                  <span className="text-sm font-medium">{group.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{group.patterns.length} patterns</Badge>
                    {expanded === `chart-${group.id}` ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {expanded === `chart-${group.id}` && (
                  <div className="border-t divide-y">
                    {group.patterns.map((p) => (
                      <div key={p.name} className="p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{p.name}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${
                            p.signal.includes("Bullish")
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : p.signal.includes("Bearish")
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30"
                                : "bg-muted text-muted-foreground border border-muted"
                          }`} variant="outline">
                            {p.signal}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            How to Read the Indicators Above
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {indicatorGuide.map((ind) => (
              <div key={ind.name} className="rounded-lg border p-3">
                <p className="text-sm font-medium mb-1">{ind.name}</p>
                <p className="text-xs text-muted-foreground mb-2"><span className="font-medium text-foreground">What it is:</span> {ind.what}</p>
                <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">How to use it:</span> {ind.howToUse}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-[#00A4E4]/5 border border-[#00A4E4]/20 p-4">
          <p className="text-xs font-medium mb-1">Pro Tip: Don't rely on any single pattern or indicator</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The best traders use <span className="font-medium text-foreground">confirmation</span> — look for multiple signals pointing the same direction.
            For example: a bullish engulfing pattern + RSI bouncing off oversold + price above the 50 SMA = strong buy signal.
            A single pattern alone can be misleading. Always check the bigger picture.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
