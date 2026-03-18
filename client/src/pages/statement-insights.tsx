import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import {
  FileSearch,
  Upload,
  Trash2,
  Eye,
  ArrowLeft,
  Landmark,
  PiggyBank,
  TrendingUp,
  CreditCard,
  BarChart3,
  DollarSign,
  Lock,
  Unlock,
  Calendar,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Sparkles,
  Globe,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Building2,
  Wallet,
  Clock,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  cd: "Certificate of Deposit",
  savings: "Savings Account",
  money_market: "Money Market",
  checking: "Checking Account",
  bond: "Bond / Fixed Income",
  brokerage: "Brokerage Account",
  other: "Financial Account",
};

const PRODUCT_TYPE_ICONS: Record<string, typeof Landmark> = {
  cd: Lock,
  savings: PiggyBank,
  money_market: TrendingUp,
  checking: CreditCard,
  bond: Landmark,
  brokerage: BarChart3,
  other: DollarSign,
};

function formatCurrency(value: number | string | null): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function formatRate(value: number | string | null): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return `${num.toFixed(2)}%`;
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(date: string | null): string {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export default function StatementInsights() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: limits } = useQuery<any>({ queryKey: ["/api/subscription/limits"] });

  const { data: sources, isLoading: sourcesLoading } = useQuery<any[]>({
    queryKey: ["/api/statement-sources"],
  });

  const { data: sourceDetail, isLoading: detailLoading } = useQuery<any>({
    queryKey: ["/api/statement-sources", selectedSourceId],
    enabled: !!selectedSourceId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/statements/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/statement-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      if (data.source?.id) {
        setSelectedSourceId(data.source.id);
        queryClient.invalidateQueries({ queryKey: ["/api/statement-sources", data.source.id] });
      }
      const verb = data.isUpdate ? "updated" : "added";
      toast({
        title: `Source ${verb}`,
        description: `${data.source?.institutionName || "Institution"}: ${data.holdingCount || 0} holding(s) detected. ${data.isUpdate ? "Previous holdings were replaced with the latest data." : "Holdings saved to your portfolio."}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/statement-sources/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statement-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      if (selectedSourceId) setSelectedSourceId(null);
      toast({ title: "Source removed", description: "The institution and all its holdings have been removed from your portfolio." });
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith(".pdf") && file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF file", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }
    uploadMutation.mutate(file);
  }, [uploadMutation, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (selectedSourceId && sourceDetail) {
    const source = sourceDetail.source;
    const holdings = sourceDetail.holdings || [];
    const comparisons = sourceDetail.comparisons || [];

    return (
      <div className="space-y-4 sm:space-y-6" data-testid="page-source-detail">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSourceId(null)} data-testid="button-back-sources">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-lg sm:text-2xl font-bold" data-testid="text-source-name">
                {source.institutionName}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {source.accountLabel && <span>{source.accountLabel} · </span>}
              Last updated {timeAgo(source.lastUploadDate)} · {holdings.length} holding(s) · {formatCurrency(source.totalValue)} total
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            data-testid="button-re-upload"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${uploadMutation.isPending ? "animate-spin" : ""}`} />
            Update
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Source-controlled data</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              This data reflects your most recent statement upload for {source.institutionName}. Uploading a new statement will replace these holdings — never duplicate them.
            </p>
          </div>
        </div>

        <DisclaimerBanner variant="persistent" />

        {holdings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FileSearch className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-muted-foreground">No holdings detected</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Upload a newer statement to extract financial data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold">Current Holdings</h2>
              <Badge variant="secondary" className="text-xs">
                {formatCurrency(source.totalValue)} total
              </Badge>
            </div>
            <div className="grid gap-3 sm:gap-4">
              {holdings.map((holding: any, index: number) => {
                const Icon = PRODUCT_TYPE_ICONS[holding.productType] || DollarSign;
                const comparisonData = comparisons?.[index] || [];

                return (
                  <Card key={holding.id} data-testid={`card-holding-${holding.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-sm sm:text-base">
                              {PRODUCT_TYPE_LABELS[holding.productType] || holding.productType}
                            </CardTitle>
                            {holding.label && holding.label.length < 60 && (
                              <CardDescription className="text-xs">
                                {holding.label}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {holding.isLocked ? (
                            <Badge variant="secondary" className="text-[10px]">
                              <Lock className="h-3 w-3 mr-0.5" /> Locked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              <Unlock className="h-3 w-3 mr-0.5" /> Flexible
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Balance</p>
                          <p className="text-sm sm:text-base font-semibold" data-testid={`text-balance-${holding.id}`}>
                            {formatCurrency(holding.balance)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Rate / APY</p>
                          <p className="text-sm sm:text-base font-semibold" data-testid={`text-rate-${holding.id}`}>
                            {formatRate(holding.apy || holding.interestRate)}
                          </p>
                        </div>
                        {holding.term && (
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Term</p>
                            <p className="text-sm sm:text-base font-semibold">{holding.term}</p>
                          </div>
                        )}
                        {holding.maturityDate && (
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Maturity</p>
                            <p className="text-sm sm:text-base font-semibold flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(holding.maturityDate)}
                            </p>
                          </div>
                        )}
                      </div>

                      {sourceDetail.comparisonsLocked ? (
                        <UpgradePrompt
                          feature="Unlock rate comparisons and yield optimization insights with Premium"
                          compact
                        />
                      ) : comparisonData.length > 0 ? (
                        <div className="space-y-3 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            How Your Rate Compares — DYOR
                          </p>
                          {comparisonData.map((comp: any, ci: number) => (
                            <div
                              key={ci}
                              className={`rounded-lg border p-3 sm:p-4 ${
                                comp.disclaimerLevel === "elevated"
                                  ? "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10"
                                  : "bg-muted/30"
                              }`}
                              data-testid={`card-comparison-${holding.id}-${ci}`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{comp.alternative.name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {comp.alternative.rate}% {comp.alternative.rateType} · {comp.alternative.lockup}
                                  </p>
                                </div>
                                {comp.rateDifference !== null && (
                                  <div className="text-right shrink-0">
                                    <p className={`text-sm font-bold ${comp.rateDifference > 0 ? "text-emerald-600 dark:text-emerald-400" : comp.rateDifference < 0 ? "text-red-500" : ""}`}>
                                      {comp.rateDifference > 0 ? "+" : ""}{comp.rateDifference.toFixed(2)}% difference
                                    </p>
                                    {comp.projectedAnnualDifference !== null && (
                                      <p className="text-xs text-muted-foreground">
                                        {comp.projectedAnnualDifference > 0 ? "+" : ""}{formatCurrency(comp.projectedAnnualDifference)}/year (projected)
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-muted-foreground">{comp.liquidityComparison}</p>
                                {comp.disclaimerLevel === "elevated" && (
                                  <div className="flex items-start gap-1.5 mt-1.5">
                                    <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-300">
                                      {comp.riskComparison}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <DisclaimerBanner variant="inline" className="mt-2" />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <CryptoOpportunities holdings={holdings} institutionName={source.institutionName} />
          </div>
        )}
      </div>
    );
  }

  const totalStatementValue = (sources || []).reduce((sum: number, s: any) => sum + parseFloat(s.totalValue || "0"), 0);

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="page-statement-insights">
      <DisclaimerBanner variant="modal" />

      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <FileSearch className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Statement Insights
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Upload bank or brokerage statements to build your full financial picture. Each institution is tracked as a source — uploading a new statement replaces the old data, never duplicates it.
        </p>
      </div>

      <DisclaimerBanner variant="persistent" />

      {totalStatementValue > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bank & Brokerage Total</p>
                  <p className="text-lg sm:text-xl font-bold" data-testid="text-statement-total">
                    {formatCurrency(totalStatementValue)}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {(sources || []).length} source{(sources || []).length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div
            className={`border-2 border-dashed rounded-xl p-6 sm:p-10 text-center transition-colors cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone-upload"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
                e.target.value = "";
              }}
              data-testid="input-file-upload"
            />
            {uploadMutation.isPending ? (
              <div className="space-y-3">
                <div className="h-10 w-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <FileSearch className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Analyzing statement...</p>
                <p className="text-xs text-muted-foreground">Extracting financial product data</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-10 w-10 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Drop a PDF statement here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bank statements, brokerage statements, CD summaries · PDF only · 10MB max
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-2 max-w-md mx-auto">
                    We detect the institution automatically. If a source already exists for that institution, the old holdings are replaced with the new statement data — your portfolio stays accurate without manual cleanup.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-start gap-2 mt-3">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Your PDF is processed in memory and never saved. Only the extracted balances and rates are stored as holdings in your portfolio. The original document is never retained.
            </p>
          </div>
        </CardContent>
      </Card>

      {sourcesLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : sources && sources.length > 0 ? (
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3" data-testid="text-tracked-sources">
            Tracked Sources
          </h2>
          <div className="grid gap-3 sm:gap-4">
            {sources.map((source: any) => (
              <Card
                key={source.id}
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setSelectedSourceId(source.id)}
                data-testid={`card-source-${source.id}`}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm sm:text-base truncate">{source.institutionName}</p>
                        {source.accountLabel && (
                          <Badge variant="outline" className="text-[10px] shrink-0">{source.accountLabel}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(source.lastUploadDate)}
                        </span>
                        <span>·</span>
                        <span>{source.holdingCount || 0} holding{(source.holdingCount || 0) !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm sm:text-base font-bold" data-testid={`text-source-value-${source.id}`}>
                        {formatCurrency(source.totalValue)}
                      </p>
                      {source.holdings && source.holdings.length > 0 && (
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                          {Array.from(new Set(source.holdings.map((h: any) => h.productType))).slice(0, 3).map((type: any) => {
                            const Icon = PRODUCT_TYPE_ICONS[type] || DollarSign;
                            return <Icon key={type} className="h-3 w-3 text-muted-foreground" />;
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setSelectedSourceId(source.id); }}
                        data-testid={`button-view-source-${source.id}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`button-delete-source-${source.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Source</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove {source.institutionName} and all its holdings from your portfolio. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSourceMutation.mutate(source.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">Your complete financial picture starts here</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Upload a bank or brokerage statement to see what your money earns and bring it into your unified portfolio — crypto, real estate, and traditional accounts all in one place.
            </p>
          </CardContent>
        </Card>
      )}

      {limits && limits.statementUploads !== null && (
        <div className="text-xs text-muted-foreground text-center max-w-md mx-auto">
          Statement Insights is a Premium feature. Upgrade to unlock unlimited statement sources, rate comparisons, and yield optimization insights.
        </div>
      )}
    </div>
  );
}

interface CryptoOpp {
  id: string;
  title: string;
  description: string;
  currentProduct: string;
  currentRate: string;
  cryptoAlternative: string;
  cryptoRate: string;
  chain: string;
  riskNote: string;
  link: string;
  category: "yield" | "stablecoin" | "rwa";
}

function generateCryptoOpportunities(holdings: any[]): CryptoOpp[] {
  const opps: CryptoOpp[] = [];
  const totalBalance = holdings.reduce((sum: number, h: any) => sum + (parseFloat(h.balance) || 0), 0);

  const hasSavings = holdings.some((h: any) => ["savings", "money_market", "checking"].includes(h.productType));
  const hasCd = holdings.some((h: any) => h.productType === "cd");
  const hasBrokerage = holdings.some((h: any) => h.productType === "brokerage");

  const savingsHoldings = holdings.filter((h: any) => ["savings", "money_market"].includes(h.productType));
  const avgSavingsRate = savingsHoldings.length > 0
    ? savingsHoldings.reduce((sum: number, h: any) => sum + (parseFloat(h.apy || h.interestRate || "0")), 0) / savingsHoldings.length
    : 0;

  if (hasSavings || hasCd) {
    opps.push({
      id: "soil-credit-plus",
      title: "Soil Credit+ Vault (RLUSD)",
      description: `Your ${hasSavings ? "savings" : "CD"} earns ${avgSavingsRate > 0 ? avgSavingsRate.toFixed(2) + "%" : "a low rate"}. Soil's Credit+ vault earns ~8% APY on RLUSD stablecoin — fully on-chain, non-custodial, $50 minimum.`,
      currentProduct: hasSavings ? "Savings/Money Market" : "Certificate of Deposit",
      currentRate: avgSavingsRate > 0 ? `${avgSavingsRate.toFixed(2)}%` : "Low",
      cryptoAlternative: "Soil Credit+ Vault",
      cryptoRate: "~8% APY",
      chain: "XRPL",
      riskNote: "Smart contract risk. Not FDIC insured. You keep your keys via Xaman wallet.",
      link: "/ownbank/vaults",
      category: "yield",
    });

    opps.push({
      id: "soil-liquid",
      title: "Soil Liquid Vault (RLUSD)",
      description: "If you prefer more flexibility, the Liquid vault earns ~5% APY with easier withdrawal — still on XRPL, still non-custodial.",
      currentProduct: hasSavings ? "Savings Account" : "CD",
      currentRate: avgSavingsRate > 0 ? `${avgSavingsRate.toFixed(2)}%` : "Low",
      cryptoAlternative: "Soil Liquid Vault",
      cryptoRate: "~5% APY",
      chain: "XRPL",
      riskNote: "Smart contract risk. Flexible withdrawal. Not FDIC insured.",
      link: "/ownbank/vaults",
      category: "yield",
    });
  }

  if (totalBalance > 5000) {
    opps.push({
      id: "ondo-usdy",
      title: "Ondo USDY (Tokenized Treasuries)",
      description: "Earn ~5.2% APY backed by US Treasury bonds — tokenized on Ethereum. Institutional grade, transparent collateral. Requires Ondo KYC.",
      currentProduct: "Traditional Savings/CDs",
      currentRate: avgSavingsRate > 0 ? `${avgSavingsRate.toFixed(2)}%` : "Variable",
      cryptoAlternative: "Ondo USDY",
      cryptoRate: "~5.2% APY",
      chain: "Ethereum",
      riskNote: "KYC required by Ondo (not us). Backed by short-term US Treasuries. Smart contract risk.",
      link: "/rwa-yields#protocol-ondo-usdy",
      category: "rwa",
    });
  }

  if (totalBalance > 25000) {
    opps.push({
      id: "ondo-ousg",
      title: "Ondo OUSG (Short-Term US Govt Bonds)",
      description: "For larger positions — ~4.8% APY backed by short-duration US government bonds. $5,000+ minimum. Institutional-grade RWA.",
      currentProduct: "CD/Bond Portfolio",
      currentRate: avgSavingsRate > 0 ? `${avgSavingsRate.toFixed(2)}%` : "Variable",
      cryptoAlternative: "Ondo OUSG",
      cryptoRate: "~4.8% APY",
      chain: "Ethereum",
      riskNote: "KYC required by Ondo. Accredited investor requirements may apply. $5K minimum.",
      link: "/rwa-yields#protocol-ondo-ousg",
      category: "rwa",
    });
  }

  if (hasBrokerage || totalBalance > 10000) {
    opps.push({
      id: "centrifuge",
      title: "Centrifuge (Real-World Lending)",
      description: "Earn 4–10% APY from tokenized invoices, mortgages, and trade finance — real economic activity, not speculation.",
      currentProduct: "Brokerage/Investment Account",
      currentRate: "Market returns",
      cryptoAlternative: "Centrifuge Pools",
      cryptoRate: "4–10% APY",
      chain: "Ethereum",
      riskNote: "Credit risk on underlying loans. Smart contract risk. Various pool minimums.",
      link: "/rwa-yields#protocol-centrifuge",
      category: "rwa",
    });
  }

  return opps;
}

function CryptoOpportunities({ holdings, institutionName }: { holdings: any[]; institutionName: string }) {
  const [decisions, setDecisions] = useState<Record<string, "accepted" | "declined">>({});
  const opps = generateCryptoOpportunities(holdings);

  if (opps.length === 0) return null;

  const handleDecision = (oppId: string, decision: "accepted" | "declined") => {
    setDecisions(prev => ({ ...prev, [oppId]: decision }));
  };

  const undecided = opps.filter(o => !decisions[o.id]);
  const accepted = opps.filter(o => decisions[o.id] === "accepted");
  const declined = opps.filter(o => decisions[o.id] === "declined");

  return (
    <div className="space-y-4" data-testid="section-crypto-opportunities">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h2 className="text-base sm:text-lg font-semibold">Crypto Yield Alternatives</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Based on your {institutionName} holdings, here are crypto alternatives that could earn more on the same capital — all non-custodial, meaning you keep your keys. Review each one and decide if it's worth exploring.
      </p>

      {undecided.length > 0 && (
        <div className="space-y-3">
          {undecided.map(opp => (
            <Card key={opp.id} data-testid={`crypto-opp-${opp.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{opp.title}</p>
                      <Badge variant="outline" className="text-[10px] mt-0.5">{opp.chain}</Badge>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 shrink-0">
                    {opp.cryptoRate}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-3">{opp.description}</p>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-2 rounded bg-muted/50 text-center">
                    <p className="text-[10px] text-muted-foreground">Your Current</p>
                    <p className="text-sm font-semibold">{opp.currentRate}</p>
                    <p className="text-[10px] text-muted-foreground">{opp.currentProduct}</p>
                  </div>
                  <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 text-center">
                    <p className="text-[10px] text-muted-foreground">Crypto Alternative</p>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{opp.cryptoRate}</p>
                    <p className="text-[10px] text-muted-foreground">{opp.cryptoAlternative}</p>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 mb-3 p-2 rounded bg-amber-50 dark:bg-amber-950/20">
                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 dark:text-amber-300">{opp.riskNote}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleDecision(opp.id, "accepted")}
                    data-testid={`button-accept-${opp.id}`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
                    I'm Interested
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDecision(opp.id, "declined")}
                    data-testid={`button-decline-${opp.id}`}
                  >
                    <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />
                    Not Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {accepted.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <ThumbsUp className="h-3.5 w-3.5" />
            You're Interested ({accepted.length})
          </h3>
          {accepted.map(opp => (
            <Card key={opp.id} className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{opp.title}</p>
                  <p className="text-xs text-muted-foreground">{opp.cryptoRate} on {opp.chain}</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs" asChild>
                  <a href={opp.link}>Explore</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {declined.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
            <ThumbsDown className="h-3.5 w-3.5" />
            Not Now ({declined.length})
          </h3>
          {declined.map(opp => (
            <Card key={opp.id} className="opacity-60">
              <CardContent className="p-3 flex items-center justify-between">
                <p className="text-sm">{opp.title}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => handleDecision(opp.id, "accepted")}
                >
                  Reconsider
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
