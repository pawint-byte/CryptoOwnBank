import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

interface PortfolioChartProps {
  data: Array<{ date: string; value: number }>;
  isLoading?: boolean;
}

const chartConfig = {
  value: {
    label: "Portfolio Value",
    color: "hsl(var(--chart-1))",
  },
};

function PortfolioChartGuide({ data }: { data: Array<{ date: string; value: number }> }) {
  const [show, setShow] = useState(false);

  const startVal = data.length > 0 ? data[0].value : 0;
  const endVal = data.length > 0 ? data[data.length - 1].value : 0;
  const change = startVal > 0 ? ((endVal - startVal) / startVal) * 100 : 0;
  const isUp = change >= 0;
  const peak = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0;
  const trough = data.length > 0 ? Math.min(...data.map((d) => d.value)) : 0;

  return (
    <div className="mb-2">
      <button
        onClick={() => setShow(!show)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-toggle-portfolio-guide"
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span>How to read this chart</span>
        {show ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {show && (
        <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs space-y-2 border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="font-medium mb-1">What you're looking at</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><span className="font-medium text-foreground">The line</span> = your total portfolio value over time across all wallets and imported accounts</li>
                <li><span className="font-medium text-foreground">Shaded area</span> = visual fill to make trends easier to see at a glance</li>
                <li><span className="font-medium text-foreground">Hover</span> over any point to see the exact date and dollar value</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Quick read</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><span className="font-medium text-foreground">Trending up</span> = your portfolio is growing — good sign</li>
                <li><span className="font-medium text-foreground">Trending down</span> = value declining — review positions or hold steady</li>
                <li><span className="font-medium text-foreground">Flat line</span> = stable — often means mostly stablecoins or balanced gains/losses</li>
              </ul>
            </div>
          </div>
          {data.length > 1 && (
            <div className="border-t pt-2 flex flex-wrap gap-4 text-muted-foreground">
              <span>Period change: <span className={`font-medium ${isUp ? "text-emerald-500" : "text-red-500"}`}>{isUp ? "+" : ""}{change.toFixed(1)}%</span></span>
              <span>Peak: <span className="font-medium text-foreground">${peak.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
              <span>Low: <span className="font-medium text-foreground">${trough.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PortfolioChart({ data, isLoading }: PortfolioChartProps) {
  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 sm:h-80 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Portfolio Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <PortfolioChartGuide data={data} />
        <ChartContainer config={chartConfig} className="h-48 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
