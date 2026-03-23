import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  FileText, 
  Download, 
  Calculator,
  Calendar,
  TrendingUp,
  TrendingDown,
  Crown,
  Lock,
  Info,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import type { GainEvent, UserSettings } from "@shared/schema";
import type { HarvestOpportunity } from "@shared/financial-math";

interface SubscriptionLimits {
  tier: string;
  billingCycle: string | null;
  exchanges: { limit: number | null; used: number };
  wallets: { limit: number | null; used: number };
  alerts: { limit: number | null; used: number };
  transactionHistoryDays: number | null;
  csvImport: boolean;
  taxReports: boolean;
  autoWithdraw: boolean;
}

interface TaxSummary {
  shortTermGains: number;
  shortTermLosses: number;
  longTermGains: number;
  longTermLosses: number;
  netShortTerm: number;
  netLongTerm: number;
  totalNetGainLoss: number;
  totalIncome: number;
  totalFees: number;
  incomeTransactions: number;
  gainEvents: GainEvent[];
}

export default function TaxReports() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [taxMethod, setTaxMethod] = useState<"FIFO" | "LIFO">("FIFO");
  const { toast } = useToast();

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: limits } = useQuery<SubscriptionLimits>({
    queryKey: ["/api/subscription/limits"],
  });

  const limitsLoaded = !!limits;
  const taxReportsLocked = limitsLoaded && limits.taxReports === false;
  const isMonthlyPremium = limits?.tier === "premium" && limits?.billingCycle === "monthly";
  const upgradeVariant = isMonthlyPremium ? "annual" as const : "premium" as const;
  const taxLockedMessage = isMonthlyPremium
    ? "Tax reports are available on the Annual plan ($199/yr). Switch to annual billing to unlock full tax calculations, PDF exports, and TurboTax-ready downloads."
    : "Tax reports require an Annual Premium plan ($199/yr). Upgrade to calculate capital gains, generate IRS-ready reports, and export for TurboTax.";

  const { data: taxData, isLoading, refetch } = useQuery<TaxSummary>({
    queryKey: ["/api/tax-report", selectedYear, taxMethod],
    enabled: !taxReportsLocked,
  });

  const calculateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/tax-report/calculate", {
        year: parseInt(selectedYear),
        method: taxMethod,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-report"] });
      toast({ title: "Tax calculations updated" });
    },
    onError: () => {
      toast({ title: "Failed to calculate taxes", variant: "destructive" });
    },
  });

  const handleExport = async (format: "csv" | "pdf" | "turbotax") => {
    try {
      const response = await fetch(
        `/api/tax-report/export?year=${selectedYear}&method=${taxMethod}&format=${format}`
      );
      if (response.status === 403) {
        toast({
          title: "Annual Plan Required",
          description: "Tax report exports require an Annual Premium plan ($199/yr). Switch to annual billing for full access.",
          variant: "destructive",
        });
        return;
      }
      if (!response.ok) {
        throw new Error("Export failed");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "pdf" ? "pdf" : "csv";
      const prefix = format === "turbotax" ? "cryptoownbank-turbotax" : "tax-report";
      a.download = `${prefix}-${selectedYear}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      const label = format === "turbotax" ? "TurboTax CSV" : format.toUpperCase();
      toast({ title: `Tax report exported as ${label}` });
    } catch {
      toast({ title: "Failed to export report", variant: "destructive" });
    }
  };

  const isPremium = settings?.subscriptionTier === "premium" || settings?.subscriptionTier === "pro" || settings?.subscriptionTier === "premium_annual";

  const [harvestExpanded, setHarvestExpanded] = useState(false);
  const [selectedBracket, setSelectedBracket] = useState<"24" | "32" | "37">("32");

  const { data: harvestData, isLoading: harvestLoading, refetch: refetchHarvest } = useQuery<HarvestOpportunity[]>({
    queryKey: ["/api/tax/harvest-scan"],
    enabled: !taxReportsLocked && harvestExpanded,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax Reports</h1>
        <p className="text-muted-foreground">
          Calculate and export your capital gains for tax filing
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Report Settings
            </CardTitle>
            <CardDescription>
              Configure your tax report parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Tax Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger data-testid="select-tax-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Calculation Method</Label>
              <RadioGroup
                value={taxMethod}
                onValueChange={(v) => setTaxMethod(v as "FIFO" | "LIFO")}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-3 rounded-md border hover-elevate cursor-pointer">
                  <RadioGroupItem value="FIFO" id="fifo" data-testid="radio-fifo" />
                  <Label htmlFor="fifo" className="flex-1 cursor-pointer">
                    <span className="font-medium">FIFO</span>
                    <p className="text-xs text-muted-foreground">
                      First In, First Out - Sell oldest assets first
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-md border hover-elevate cursor-pointer">
                  <RadioGroupItem value="LIFO" id="lifo" data-testid="radio-lifo" />
                  <Label htmlFor="lifo" className="flex-1 cursor-pointer">
                    <span className="font-medium">LIFO</span>
                    <p className="text-xs text-muted-foreground">
                      Last In, First Out - Sell newest assets first
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {taxReportsLocked ? (
              <UpgradePrompt feature={taxLockedMessage} variant={upgradeVariant} />
            ) : (
              <Button
                className="w-full"
                onClick={() => calculateMutation.mutate()}
                disabled={calculateMutation.isPending}
                data-testid="button-calculate-taxes"
              >
                <Calculator className="h-4 w-4 mr-2" />
                {calculateMutation.isPending ? "Calculating..." : "Calculate Taxes"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="space-y-3">
            <div className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="hidden sm:inline">Tax Summary - {selectedYear}</span>
                  <span className="sm:hidden">Summary - {selectedYear}</span>
                </CardTitle>
                <CardDescription>
                  Using {taxMethod} calculation method
                </CardDescription>
              </div>
            </div>
            {!taxReportsLocked && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("csv")}
                  data-testid="button-export-csv"
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("turbotax")}
                  data-testid="button-export-turbotax"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">TurboTax</span>
                  <span className="sm:hidden">TTax</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("pdf")}
                  data-testid="button-export-pdf"
                >
                  {isPremium ? (
                    <Download className="h-4 w-4 mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  PDF
                  {!isPremium && (
                    <Badge variant="secondary" className="ml-1">
                      <Crown className="h-3 w-3 mr-1" />
                      Pro
                    </Badge>
                  )}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {taxReportsLocked ? (
              <UpgradePrompt feature={taxLockedMessage} variant={upgradeVariant} />
            ) : isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Short-Term (less than 1 year)</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Gains</span>
                        <span className="font-mono text-chart-2">
                          {formatCurrency(taxData?.shortTermGains || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Losses</span>
                        <span className="font-mono text-destructive">
                          {formatCurrency(taxData?.shortTermLosses || 0)}
                        </span>
                      </div>
                      <div className="border-t pt-1 mt-2 flex justify-between font-medium">
                        <span>Net</span>
                        <span
                          className={cn(
                            "font-mono",
                            (taxData?.netShortTerm || 0) >= 0 ? "text-chart-2" : "text-destructive"
                          )}
                        >
                          {formatCurrency(taxData?.netShortTerm || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Long-Term (1 year or more)</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Gains</span>
                        <span className="font-mono text-chart-2">
                          {formatCurrency(taxData?.longTermGains || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Losses</span>
                        <span className="font-mono text-destructive">
                          {formatCurrency(taxData?.longTermLosses || 0)}
                        </span>
                      </div>
                      <div className="border-t pt-1 mt-2 flex justify-between font-medium">
                        <span>Net</span>
                        <span
                          className={cn(
                            "font-mono",
                            (taxData?.netLongTerm || 0) >= 0 ? "text-chart-2" : "text-destructive"
                          )}
                        >
                          {formatCurrency(taxData?.netLongTerm || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm sm:text-base">Total Net Capital Gain/Loss</span>
                    <span
                      className={cn(
                        "text-lg sm:text-xl font-bold font-mono whitespace-nowrap",
                        (taxData?.totalNetGainLoss || 0) >= 0 ? "text-chart-2" : "text-destructive"
                      )}
                      data-testid="text-total-gain-loss"
                    >
                      {formatCurrency(taxData?.totalNetGainLoss || 0)}
                    </span>
                  </div>
                  {(taxData?.totalIncome || 0) > 0 && (
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-sm text-muted-foreground">
                        Ordinary Income (Interest / Staking)
                        <span className="text-xs ml-1">({taxData?.incomeTransactions || 0} events)</span>
                      </span>
                      <span className="font-mono font-medium text-chart-2" data-testid="text-total-income">
                        {formatCurrency(taxData?.totalIncome || 0)}
                      </span>
                    </div>
                  )}
                  {(taxData?.totalFees || 0) > 0 && (
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-sm text-muted-foreground">Total Transaction Fees (deductible)</span>
                      <span className="font-mono text-sm" data-testid="text-total-fees">
                        {formatCurrency(taxData?.totalFees || 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Tax Harvest AI
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                <Crown className="h-3 w-3 mr-0.5" />
                Premium
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHarvestExpanded(!harvestExpanded)}
              data-testid="button-toggle-harvest"
            >
              {harvestExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          <CardDescription>
            Scan your portfolio for unrealized losses and find tax-saving opportunities
          </CardDescription>
        </CardHeader>
        {harvestExpanded && (
          <CardContent className="space-y-4">
            {taxReportsLocked ? (
              <UpgradePrompt feature="Tax Harvest AI requires a Premium or Pro subscription to scan your portfolio for tax-loss harvesting opportunities." variant={upgradeVariant} />
            ) : harvestLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : !harvestData || harvestData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mb-3">
                  <TrendingUp className="h-7 w-7 text-emerald-500" />
                </div>
                <h3 className="text-base font-medium" data-testid="text-no-harvest">No harvest opportunities found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  All your positions are currently at a gain or break-even. Check back when market conditions change.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Tax bracket:</span>
                  {(["24", "32", "37"] as const).map((bracket) => (
                    <Button
                      key={bracket}
                      variant={selectedBracket === bracket ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-3 text-xs"
                      onClick={() => setSelectedBracket(bracket)}
                      data-testid={`button-bracket-${bracket}`}
                    >
                      {bracket}%
                    </Button>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      As of 2026, IRS wash-sale rules do not apply to spot crypto. You can sell at a loss and rebuy the same asset immediately. However, legislation is pending and rules may change. This is not tax advice — consult a CPA.
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="text-xs text-muted-foreground">Opportunities Found</div>
                    <div className="text-xl font-bold mt-1" data-testid="text-harvest-count">{harvestData.length}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="text-xs text-muted-foreground">Total Unrealized Losses</div>
                    <div className="text-xl font-bold text-destructive mt-1" data-testid="text-harvest-total-loss">
                      {formatCurrency(harvestData.reduce((sum, h) => sum + h.unrealizedLoss, 0))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border bg-card sm:col-span-2 lg:col-span-1">
                    <div className="text-xs text-muted-foreground">Est. Tax Savings ({selectedBracket}%)</div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1" data-testid="text-harvest-total-savings">
                      {formatCurrency(harvestData.reduce((sum, h) => {
                        const key = `estTaxSavings${selectedBracket}` as keyof HarvestOpportunity;
                        return sum + (h[key] as number);
                      }, 0))}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Quantity</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Cost Basis</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Current Value</TableHead>
                        <TableHead className="text-right">Unrealized Loss</TableHead>
                        <TableHead className="text-right">Est. Savings</TableHead>
                        <TableHead className="hidden lg:table-cell">Suggested Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {harvestData.map((opp) => {
                        const savings = opp[`estTaxSavings${selectedBracket}` as keyof HarvestOpportunity] as number;
                        return (
                          <TableRow key={opp.assetSymbol} data-testid={`row-harvest-${opp.assetSymbol}`}>
                            <TableCell>
                              <div className="font-medium">{opp.assetSymbol}</div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {opp.holdingPeriod === "long" ? "Long-term" : opp.holdingPeriod === "mixed" ? "Mixed" : "Short-term"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm hidden sm:table-cell">
                              {opp.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm hidden md:table-cell">
                              {formatCurrency(opp.totalCostBasis)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm hidden md:table-cell">
                              {formatCurrency(opp.currentValue)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono text-sm font-medium text-destructive">
                                -{formatCurrency(opp.unrealizedLoss)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                +{formatCurrency(savings)}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <TooltipProvider>
                                <div className="space-y-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-xs cursor-help">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Sell & Rebuy</span>
                                        <span className="text-muted-foreground"> (same asset)</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-[250px]">
                                      <p className="text-xs">Sell to realize the loss, then rebuy immediately. Currently allowed under IRS rules for crypto (no wash-sale rule).</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  {opp.suggestedSwap && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="text-xs cursor-help flex items-center gap-1">
                                          <span className="text-muted-foreground">or swap to</span>
                                          <span className="font-medium">{opp.suggestedSwap.symbol}</span>
                                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="max-w-[250px]">
                                        <p className="text-xs">{opp.suggestedSwap.reason}. Conservative approach if wash-sale rules change.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchHarvest()}
                    data-testid="button-refresh-harvest"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Refresh Scan
                  </Button>
                </div>

                <p className="text-[10px] text-muted-foreground/60 leading-relaxed italic">
                  Tax-Loss Harvesting is an informational tool only. We do not execute trades, provide tax advice, or guarantee results. Crypto wash-sale rules currently do not apply in the US, but tax laws change. Always consult a qualified CPA. Calculations are estimates based on current prices.
                </p>
              </>
            )}
          </CardContent>
        )}
      </Card>

      {!taxReportsLocked && (
      <Card>
        <CardHeader>
          <CardTitle>Gain/Loss Events</CardTitle>
          <CardDescription>
            Individual capital gain and loss events for the selected tax year
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (taxData?.gainEvents?.length || 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No gain/loss events</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No realized gains or losses found for {selectedYear}.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Sold</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Quantity</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Proceeds</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Cost Basis</TableHead>
                    <TableHead className="text-right">Gain/Loss</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxData?.gainEvents?.map((event) => {
                    const isWriteOff = event.disposalType && event.disposalType !== "sale";
                    return (
                    <TableRow key={event.id} className={isWriteOff ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                      <TableCell className="font-mono text-sm">
                        <span className="hidden sm:inline">{format(new Date(event.soldDate), "MMM d, yyyy")}</span>
                        <span className="sm:hidden">{format(new Date(event.soldDate), "M/d/yy")}</span>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {event.assetSymbol}
                          {isWriteOff && (
                            <Badge variant="outline" className="text-[9px] border-amber-400 text-amber-600 dark:text-amber-400" data-testid={`badge-writeoff-${event.id}`}>
                              {event.disposalType === "scam" ? "Scam Loss" :
                               event.disposalType === "hack" ? "Hack Loss" :
                               event.disposalType === "sent_in_error" ? "Sent in Error" :
                               event.disposalType === "lost_keys" ? "Lost Keys" : "Write-Off"}
                            </Badge>
                          )}
                        </div>
                        {isWriteOff && event.disposalNote && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{event.disposalNote}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono hidden md:table-cell">
                        {parseFloat(event.quantity).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right font-mono hidden lg:table-cell">
                        {formatCurrency(parseFloat(event.proceeds))}
                      </TableCell>
                      <TableCell className="text-right font-mono hidden lg:table-cell">
                        {formatCurrency(parseFloat(event.costBasis))}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "font-mono font-medium flex items-center justify-end gap-1",
                            parseFloat(event.gainLoss) >= 0 ? "text-chart-2" : "text-destructive"
                          )}
                        >
                          {parseFloat(event.gainLoss) >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {formatCurrency(parseFloat(event.gainLoss))}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isWriteOff ? (
                          <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400">
                            {event.isLongTerm ? "Long" : "Short"}
                          </Badge>
                        ) : (
                          <Badge variant={event.isLongTerm ? "default" : "secondary"}>
                            {event.isLongTerm ? "Long" : "Short"}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            IRS Filing Guide
          </CardTitle>
          <CardDescription>
            How to use this report when filing your taxes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg border space-y-2">
              <h4 className="font-medium" data-testid="text-form-8949-title">Form 8949 — Capital Gains</h4>
              <p className="text-sm text-muted-foreground">
                Report each sale from the Gain/Loss Events table on IRS Form 8949 (Sales and Dispositions of Capital Assets). Short-term trades go in Part I, long-term in Part II.
              </p>
            </div>
            <div className="p-4 rounded-lg border space-y-2">
              <h4 className="font-medium" data-testid="text-schedule-d-title">Schedule D — Totals</h4>
              <p className="text-sm text-muted-foreground">
                Transfer the totals from Form 8949 to Schedule D of your Form 1040. This is where your net short-term and long-term capital gains/losses are summarized.
              </p>
            </div>
            <div className="p-4 rounded-lg border space-y-2">
              <h4 className="font-medium" data-testid="text-schedule-1-title">Schedule 1 — Soil Interest Income</h4>
              <p className="text-sm text-muted-foreground">
                Soil vault interest payments are taxable as ordinary income in the year received. Report on Schedule 1 (Additional Income), Line 8z as "Other income."
              </p>
            </div>
            <div className="p-4 rounded-lg border space-y-2">
              <h4 className="font-medium" data-testid="text-turbotax-title">TurboTax Import</h4>
              <p className="text-sm text-muted-foreground">
                Click the "TurboTax" export button above to download a CSV formatted for direct import into TurboTax. In TurboTax, go to Investment Income, then select "Upload CSV" and choose the downloaded file.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic" data-testid="text-tax-disclaimer">
            This tool organizes your transaction data to help you prepare for tax reporting — it does not constitute tax advice. Cost basis calculations are estimates based on the data available and may not reflect your complete tax picture. Tax laws vary by jurisdiction and individual circumstances. Always consult a qualified tax professional before filing. CryptoOwnBank is not a tax preparer, CPA, or financial advisor.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
