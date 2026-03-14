import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";

interface AllocationChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  isLoading?: boolean;
}

export function AllocationChart({ data, isLoading }: AllocationChartProps) {
  const [showAll, setShowAll] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const VISIBLE_COUNT = 8;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse rounded-full bg-muted mx-auto w-48" />
        </CardContent>
      </Card>
    );
  }

  const chartConfig = data.reduce((acc, item) => {
    acc[item.name] = { label: item.name, color: item.color };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const visibleItems = showAll ? sorted : sorted.slice(0, VISIBLE_COUNT);
  const hiddenCount = sorted.length - VISIBLE_COUNT;
  const hiddenValue = sorted.slice(VISIBLE_COUNT).reduce((sum, item) => sum + item.value, 0);
  const topAssetPct = sorted.length > 0 && total > 0 ? ((sorted[0].value / total) * 100).toFixed(0) : "0";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          data-testid="button-toggle-allocation-guide"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>How to read this chart</span>
          {showGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {showGuide && (
          <div className="mb-3 rounded-lg bg-muted/50 p-3 text-xs space-y-2 border">
            <div>
              <p className="font-medium mb-1">What you're looking at</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><span className="font-medium text-foreground">The ring</span> = your total portfolio split by asset — each color slice is one crypto</li>
                <li><span className="font-medium text-foreground">Bigger slice</span> = that asset makes up more of your portfolio</li>
                <li><span className="font-medium text-foreground">Hover</span> over any slice to see the asset name and dollar value</li>
                <li><span className="font-medium text-foreground">Legend below</span> = lists each asset with its percentage of your total holdings</li>
              </ul>
            </div>
            <div className="border-t pt-2 text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Why this matters</p>
              <p>Diversification reduces risk. If one asset dominates your portfolio (say 80%+), a drop in its price hurts your entire net worth.
                {sorted.length > 0 && <> Your top holding is <span className="font-medium text-foreground">{sorted[0].name}</span> at {topAssetPct}% of your portfolio.</>}
              </p>
            </div>
          </div>
        )}
        <ChartContainer config={chartConfig} className="h-48 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="mt-4 space-y-1.5">
          {visibleItems.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.name}</span>
              </div>
              <span className="font-mono text-muted-foreground text-xs ml-2 flex-shrink-0">
                {total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0"}%
              </span>
            </div>
          ))}
          {hiddenCount > 0 && !showAll && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="text-xs">+{hiddenCount} more assets</span>
              <span className="font-mono text-xs">
                {total > 0 ? ((hiddenValue / total) * 100).toFixed(1) : "0.0"}%
              </span>
            </div>
          )}
        </div>
        {hiddenCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-2 text-xs h-7"
            data-testid="button-toggle-allocation"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show Top {VISIBLE_COUNT}
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show All {sorted.length} Assets
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
