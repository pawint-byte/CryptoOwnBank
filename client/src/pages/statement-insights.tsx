import { useState, useRef, useCallback, useEffect } from "react";
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
  ChevronRight,
  FileText,
  ShieldCheck,
  Plus,
  Check,
  Minus,
  Sparkles,
  ExternalLink,
  Globe,
  Shield,
  HardDrive,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const TYPE_SHORT: Record<string, string> = {
  cd: "CD", savings: "SAVE", money_market: "MM", checking: "CHK",
  bond: "BOND", brokerage: "INVEST", other: "ACCT",
};

function getProductSymbol(product: any): string {
  const institution = product.institutionName || "Manual";
  const tag = TYPE_SHORT[product.productType] || "ACCT";
  const prefix = institution.replace(/[^A-Za-z0-9]/g, "").substring(0, 10).toUpperCase();

  if (product.rawDescription && product.rawDescription.length < 60) {
    const descTag = product.rawDescription.replace(/[^A-Za-z0-9]/g, "").substring(0, 12).toUpperCase();
    if (descTag && descTag.length > 0) {
      return `${prefix}-${descTag}`;
    }
  }

  return `${prefix}-${tag}`;
}

export default function StatementInsights() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selfDestructTimers, setSelfDestructTimers] = useState<Record<string, number>>({});

  useEffect(() => {
    const hasTimers = Object.values(selfDestructTimers).some(t => t > 0);
    if (!hasTimers) return;

    const interval = setInterval(() => {
      setSelfDestructTimers(prev => {
        const next: Record<string, number> = {};
        let anyExpired = false;
        for (const [id, remaining] of Object.entries(prev)) {
          const newVal = Math.max(0, remaining - 1);
          if (newVal > 0) {
            next[id] = newVal;
          } else {
            anyExpired = true;
          }
        }
        if (anyExpired) {
          queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [Object.keys(selfDestructTimers).length]);

  const { data: limits } = useQuery<any>({ queryKey: ["/api/subscription/limits"] });

  const { data: uploads, isLoading: uploadsLoading } = useQuery<any[]>({
    queryKey: ["/api/statements"],
  });

  const { data: uploadDetail, isLoading: detailLoading } = useQuery<any>({
    queryKey: ["/api/statements", selectedUploadId],
    enabled: !!selectedUploadId,
  });

  const { data: positions } = useQuery<any[]>({ queryKey: ["/api/positions"] });

  const existingSymbols = new Set(
    (positions || []).map((p: any) => String(p.assetSymbol || "").toUpperCase())
  );

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
      queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
      setSelectedUploadId(data.upload.id);
      const selfDestructMinutes = data.selfDestructMinutes || 15;
      setSelfDestructTimers(prev => ({ ...prev, [data.upload.id]: selfDestructMinutes * 60 }));
      toast({
        title: "Statement analyzed",
        description: `Found ${data.products.length} financial product(s). Data self-destructs in ${selfDestructMinutes} minutes.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/statements/${id}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      if (selectedUploadId) setSelectedUploadId(null);
      const removed = data?.removedPositions || 0;
      toast({
        title: "Statement deleted",
        description: removed > 0
          ? `Removed ${removed} portfolio ${removed === 1 ? "entry" : "entries"} that were added from this statement.`
          : "No portfolio entries were linked to this statement.",
      });
    },
  });

  const [importedProducts, setImportedProducts] = useState<Set<string>>(new Set());

  const isProductImported = useCallback((product: any): boolean => {
    if (importedProducts.has(product.id)) return true;
    const symbol = getProductSymbol(product);
    return existingSymbols.has(symbol);
  }, [importedProducts, existingSymbols]);

  const importToPortfolioMutation = useMutation({
    mutationFn: async (product: any) => {
      const balance = product.balance ? parseFloat(product.balance) : 0;
      if (balance <= 0) throw new Error("No balance detected for this product");
      const symbol = getProductSymbol(product);

      if (existingSymbols.has(symbol)) {
        throw new Error(`${symbol} is already in your portfolio`);
      }

      const institution = product.institutionName || "Manual";
      await apiRequest("POST", "/api/positions/manual", {
        assetSymbol: symbol,
        quantity: balance.toString(),
        costPerUnit: "1",
        currentPrice: "1",
        location: institution,
      });

      return product.id;
    },
    onSuccess: (productId: string) => {
      setImportedProducts((prev) => new Set(prev).add(productId));
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({ title: "Added to Portfolio", description: "This asset now appears in your total net worth" });
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  const removeFromPortfolioMutation = useMutation({
    mutationFn: async (product: any) => {
      const symbol = getProductSymbol(product);
      await apiRequest("DELETE", `/api/positions/by-symbol/${encodeURIComponent(symbol)}`);
      return product.id;
    },
    onSuccess: (productId: string) => {
      setImportedProducts((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({ title: "Removed from Portfolio", description: "This entry has been removed from your portfolio" });
    },
    onError: (error: Error) => {
      toast({ title: "Remove failed", description: error.message, variant: "destructive" });
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

  if (selectedUploadId && uploadDetail) {
    const remainingSeconds = selfDestructTimers[selectedUploadId] || 0;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const isExpiring = remainingSeconds > 0 && remainingSeconds <= 120;

    return (
      <div className="space-y-4 sm:space-y-6" data-testid="page-statement-detail">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedUploadId(null)} data-testid="button-back-statements">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold" data-testid="text-statement-filename">
              {uploadDetail.upload.filename}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Uploaded {formatDate(uploadDetail.upload.uploadedAt)} &middot; {uploadDetail.products.length} product(s) detected
            </p>
          </div>
        </div>

        {remainingSeconds > 0 && (
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            isExpiring
              ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30"
              : "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30"
          }`} data-testid="self-destruct-banner">
            <Shield className={`h-5 w-5 shrink-0 ${isExpiring ? "text-red-500 animate-pulse" : "text-amber-500"}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${isExpiring ? "text-red-800 dark:text-red-200" : "text-amber-800 dark:text-amber-200"}`}>
                {isExpiring ? "Self-destructing soon" : "This analysis will self-destruct"}
              </p>
              <p className={`text-xs ${isExpiring ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
                Your statement data is never stored permanently. Make your decisions now — this analysis disappears in{" "}
                <span className="font-mono font-bold">{minutes}:{seconds.toString().padStart(2, "0")}</span>.
              </p>
            </div>
          </div>
        )}

        <DisclaimerBanner variant="persistent" />

        {uploadDetail.products.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FileSearch className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-muted-foreground">No financial products detected</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                This can happen with image-based PDFs or unusual statement formats. Try a different bank or brokerage statement — text-based PDFs from major institutions work best.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold">Detected Products</h2>
              {uploadDetail.products.some((p: any) => p.balance && !isProductImported(p)) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    for (const product of uploadDetail.products) {
                      if (product.balance && !isProductImported(product)) {
                        importToPortfolioMutation.mutate(product);
                      }
                    }
                  }}
                  disabled={importToPortfolioMutation.isPending}
                  data-testid="button-import-all"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add All to Portfolio
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:gap-4">
              {uploadDetail.products.map((product: any, index: number) => {
                const Icon = PRODUCT_TYPE_ICONS[product.productType] || DollarSign;
                const comparisons = uploadDetail.comparisons?.[index] || [];

                return (
                  <Card key={product.id} data-testid={`card-product-${product.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-sm sm:text-base">
                              {PRODUCT_TYPE_LABELS[product.productType] || product.productType}
                            </CardTitle>
                            {product.rawDescription && product.rawDescription.length < 60 && product.rawDescription !== (PRODUCT_TYPE_LABELS[product.productType] || "").substring(0, 50) ? (
                              <CardDescription className="text-xs">
                                {product.institutionName ? `${product.institutionName} · ${product.rawDescription}` : product.rawDescription}
                              </CardDescription>
                            ) : product.institutionName ? (
                              <CardDescription className="text-xs">
                                {product.institutionName}
                              </CardDescription>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {product.isLocked ? (
                            <Badge variant="secondary" className="text-[10px]">
                              <Lock className="h-3 w-3 mr-0.5" /> Locked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              <Unlock className="h-3 w-3 mr-0.5" /> Flexible
                            </Badge>
                          )}
                          {product.balance && (
                            isProductImported(product) ? (
                              <Button
                                variant="default"
                                size="sm"
                                className="h-7 text-[10px] sm:text-xs bg-emerald-600 hover:bg-red-600"
                                onClick={() => removeFromPortfolioMutation.mutate(product)}
                                disabled={removeFromPortfolioMutation.isPending}
                                data-testid={`button-remove-${product.id}`}
                              >
                                <Check className="h-3 w-3 mr-0.5" />
                                <span className="hidden sm:inline">In Portfolio</span>
                                <span className="sm:hidden">Added</span>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] sm:text-xs"
                                onClick={() => importToPortfolioMutation.mutate(product)}
                                disabled={importToPortfolioMutation.isPending}
                                data-testid={`button-import-${product.id}`}
                              >
                                <Plus className="h-3 w-3 mr-0.5" />
                                <span className="hidden sm:inline">Add to Portfolio</span>
                                <span className="sm:hidden">Add</span>
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Balance</p>
                          <p className="text-sm sm:text-base font-semibold" data-testid={`text-balance-${product.id}`}>
                            {formatCurrency(product.balance)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Rate / APY</p>
                          <p className="text-sm sm:text-base font-semibold" data-testid={`text-rate-${product.id}`}>
                            {formatRate(product.apy || product.interestRate)}
                          </p>
                        </div>
                        {product.term && (
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Term</p>
                            <p className="text-sm sm:text-base font-semibold">{product.term}</p>
                          </div>
                        )}
                        {product.maturityDate && (
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Maturity</p>
                            <p className="text-sm sm:text-base font-semibold flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(product.maturityDate)}
                            </p>
                          </div>
                        )}
                      </div>

                      {uploadDetail.comparisonsLocked ? (
                        <UpgradePrompt
                          feature="Unlock rate comparisons and yield optimization insights with Premium"
                          compact
                        />
                      ) : comparisons.length > 0 ? (
                        <div className="space-y-3 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            How Your Rate Compares — DYOR
                          </p>
                          {comparisons.map((comp: any, ci: number) => (
                            <div
                              key={ci}
                              className={`rounded-lg border p-3 sm:p-4 ${
                                comp.disclaimerLevel === "elevated"
                                  ? "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10"
                                  : "bg-muted/30"
                              }`}
                              data-testid={`card-comparison-${product.id}-${ci}`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{comp.alternative.name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {comp.alternative.rate}% {comp.alternative.rateType} &middot; {comp.alternative.lockup}
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

            <CryptoOpportunities products={uploadDetail.products} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="page-statement-insights">
      <DisclaimerBanner variant="modal" />

      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <FileSearch className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Statement Insights
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Your money works somewhere. See exactly what it earns — and what it could earn. Upload a bank or brokerage statement to bring your full financial picture into one view.
        </p>
      </div>

      <DisclaimerBanner variant="persistent" />

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
                    Bank statements, brokerage statements, CD summaries &middot; PDF only &middot; 10MB max
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-2 max-w-sm mx-auto">
                    We extract account types, balances, rates, and maturity dates — then show you how your money compares across traditional and decentralized options. You decide what to do with it. All data self-destructs after 15 minutes.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-start gap-2 mt-3">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Your PDF is processed in memory and never saved. Extracted data self-destructs after 15 minutes — Mission Impossible style. We never store your banking documents.
            </p>
          </div>
        </CardContent>
      </Card>

      {uploadsLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : uploads && uploads.length > 0 ? (
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3" data-testid="text-upload-history">
            Upload History
          </h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploads.map((upload: any) => (
                    <TableRow key={upload.id} data-testid={`row-upload-${upload.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate max-w-[120px] sm:max-w-[200px]">
                            {upload.filename}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground sm:hidden">
                          {formatDate(upload.uploadedAt)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatDate(upload.uploadedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {upload.productCount || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant={upload.status === "complete" ? "default" : upload.status === "failed" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {upload.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {upload.status === "complete" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUploadId(upload.id)}
                              data-testid={`button-view-${upload.id}`}
                            >
                              <Eye className="h-3.5 w-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-${upload.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Statement</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this statement analysis, all detected products, and any portfolio entries that were added from it. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(upload.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <FileSearch className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">Your complete financial picture starts here</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Upload a bank or brokerage statement to see what your money earns, how it compares, and add it all to your unified portfolio — crypto and traditional, in one place.
            </p>
          </CardContent>
        </Card>
      )}

      {limits && limits.statementUploads !== null && (
        <div className="text-xs text-muted-foreground text-center max-w-md mx-auto">
          Statement Insights is a Premium feature. Upgrade to unlock unlimited statement analysis, rate comparisons, and yield optimization insights.
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

function generateCryptoOpportunities(products: any[]): CryptoOpp[] {
  const opps: CryptoOpp[] = [];
  const totalBalance = products.reduce((sum: number, p: any) => sum + (parseFloat(p.balance) || 0), 0);

  const hasSavings = products.some((p: any) => ["savings", "money_market", "checking"].includes(p.productType));
  const hasCd = products.some((p: any) => p.productType === "cd");
  const hasBrokerage = products.some((p: any) => p.productType === "brokerage");

  const savingsProducts = products.filter((p: any) => ["savings", "money_market"].includes(p.productType));
  const avgSavingsRate = savingsProducts.length > 0
    ? savingsProducts.reduce((sum: number, p: any) => sum + (parseFloat(p.apy || p.interestRate || "0")), 0) / savingsProducts.length
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

function CryptoOpportunities({ products }: { products: any[] }) {
  const [decisions, setDecisions] = useState<Record<string, "accepted" | "declined">>({});
  const opps = generateCryptoOpportunities(products);

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
        Based on what we found in your statement, here are crypto alternatives that could earn more on the same capital — all non-custodial, meaning you keep your keys. Review each one and decide if it's worth exploring.
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
            <div key={opp.id} className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10" data-testid={`accepted-opp-${opp.id}`}>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{opp.title}</p>
                  <p className="text-xs text-muted-foreground">{opp.cryptoRate} on {opp.chain}</p>
                </div>
              </div>
              <a href={opp.link} data-testid={`link-explore-${opp.id}`}>
                <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                  Explore
                </Button>
              </a>
            </div>
          ))}
        </div>
      )}

      {declined.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
            <ThumbsDown className="h-3.5 w-3.5" />
            Passed ({declined.length})
          </h3>
          {declined.map(opp => (
            <div key={opp.id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30" data-testid={`declined-opp-${opp.id}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{opp.title}</span>
                <Badge variant="outline" className="text-[10px]">{opp.cryptoRate}</Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7"
                onClick={() => setDecisions(prev => {
                  const next = { ...prev };
                  delete next[opp.id];
                  return next;
                })}
                data-testid={`button-reconsider-${opp.id}`}
              >
                Reconsider
              </Button>
            </div>
          ))}
        </div>
      )}

      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <HardDrive className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Need a Cold Wallet?</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                To use any of these crypto alternatives, you'll need a wallet to hold your keys. Check the Cold Wallets tab in your Recommendations Hub to find the right one for your needs.
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <a href="/ownbank" data-testid="link-cold-wallets-from-statements">
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    <Shield className="h-3 w-3 mr-1" />
                    Cold Wallet Guide
                  </Button>
                </a>
                <a href="/setup-guide" data-testid="link-setup-from-statements">
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    <ArrowRight className="h-3 w-3 mr-1" />
                    Setup Guide
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center max-w-md mx-auto">
        These suggestions are informational only. Crypto investments carry risk and are not FDIC insured. Upload new statements anytime to get updated recommendations as rates change.
      </p>
    </div>
  );
}
