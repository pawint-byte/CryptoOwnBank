import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Layers,
  Plus,
  Trash2,
  Pause,
  Play,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  Pencil,
  Copy,
  Shield,
  Info,
  X,
} from "lucide-react";
import { SeoHead } from "@/components/seo-head";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TokenBucket, TokenBucketItem } from "@shared/schema";
import { CATEGORY_COLORS } from "@shared/asset-categories";

type BucketWithItems = TokenBucket & { items: TokenBucketItem[] };
type CuratedBucket = {
  id: string;
  name: string;
  description: string;
  tokens: { symbol: string; allocationPct: string; category: string }[];
};

type PreflightResult = {
  ready: boolean;
  hasWallet: boolean;
  chain: string;
  tokens: { symbol: string; allocationPct: string; needsTrustline: boolean; hasTrustline: boolean; ready: boolean }[];
  missingTrustlineCount: number;
  reserveXrpNeeded: number;
  currentXrpBalance: number;
  hasEnoughReserve: boolean;
  warnings: string[];
};

type PortfolioAnalysis = {
  analysis: { category: string; totalValue: number; percentage: number; tokens: { symbol: string; value: number }[] }[];
  totalPortfolioValue: number;
};

export default function TokenBuckets() {
  const { user, tier } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("curated");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreflightDialog, setShowPreflightDialog] = useState(false);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [editBucket, setEditBucket] = useState<BucketWithItems | null>(null);

  const [newBucket, setNewBucket] = useState({
    name: "",
    description: "",
    bucketType: "custom" as string,
    spendCurrency: "RLUSD",
    spendAmount: "",
    frequency: "weekly",
    chain: "xrpl",
  });
  const [newItems, setNewItems] = useState<{ symbol: string; allocationPct: string; category: string }[]>([
    { symbol: "", allocationPct: "", category: "" },
  ]);

  if (!user) return <UpgradePrompt feature="Token Buckets" requiredTier="free" />;

  const { data: buckets = [], isLoading: loadingBuckets } = useQuery<BucketWithItems[]>({
    queryKey: ["/api/token-buckets"],
  });

  const { data: curatedBuckets = [] } = useQuery<CuratedBucket[]>({
    queryKey: ["/api/token-buckets/curated"],
  });

  const { data: portfolioAnalysis } = useQuery<PortfolioAnalysis>({
    queryKey: ["/api/token-buckets/portfolio-analysis"],
  });

  const { data: preflight, isLoading: loadingPreflight } = useQuery<PreflightResult>({
    queryKey: ["/api/token-buckets/preflight", selectedBucketId],
    enabled: !!selectedBucketId && showPreflightDialog,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/token-buckets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/token-buckets"] });
      setShowCreateDialog(false);
      resetForm();
      toast({ title: "Bucket created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/token-buckets/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/token-buckets"] });
      setEditBucket(null);
      toast({ title: "Bucket updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/token-buckets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/token-buckets"] });
      toast({ title: "Bucket deleted" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/token-buckets/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/token-buckets"] });
    },
  });

  function resetForm() {
    setNewBucket({ name: "", description: "", bucketType: "custom", spendCurrency: "RLUSD", spendAmount: "", frequency: "weekly", chain: "xrpl" });
    setNewItems([{ symbol: "", allocationPct: "", category: "" }]);
  }

  function addTokenRow() {
    setNewItems([...newItems, { symbol: "", allocationPct: "", category: "" }]);
  }

  function removeTokenRow(idx: number) {
    setNewItems(newItems.filter((_, i) => i !== idx));
  }

  function updateTokenRow(idx: number, field: string, value: string) {
    const updated = [...newItems];
    (updated[idx] as any)[field] = value;
    setNewItems(updated);
  }

  function totalAllocation() {
    return newItems.reduce((sum, i) => sum + (parseFloat(i.allocationPct) || 0), 0);
  }

  function handleCreateBucket() {
    if (!newBucket.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const validItems = newItems.filter(i => i.symbol.trim() && parseFloat(i.allocationPct) > 0);
    if (validItems.length === 0) {
      toast({ title: "Add at least one token", variant: "destructive" });
      return;
    }
    const total = validItems.reduce((s, i) => s + parseFloat(i.allocationPct), 0);
    if (Math.abs(total - 100) > 0.01) {
      toast({ title: `Allocations total ${total.toFixed(1)}%, must be 100%`, variant: "destructive" });
      return;
    }
    createMutation.mutate({ ...newBucket, items: validItems });
  }

  function handleUseCurated(curated: CuratedBucket) {
    setNewBucket({
      name: curated.name,
      description: curated.description,
      bucketType: "curated",
      spendCurrency: "RLUSD",
      spendAmount: "",
      frequency: "weekly",
      chain: "xrpl",
    });
    setNewItems(curated.tokens.map(t => ({ ...t })));
    setShowCreateDialog(true);
  }

  function openPreflight(bucketId: string) {
    setSelectedBucketId(bucketId);
    setShowPreflightDialog(true);
  }

  const myBuckets = buckets.filter(b => b.bucketType === "custom" || b.bucketType === "curated");
  const balancedBuckets = buckets.filter(b => b.bucketType === "balanced");

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <SeoHead title="Token Buckets | CryptoOwnBank" description="Build diversified crypto baskets with automated DCA" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-token-buckets-title">
            <Layers className="h-6 w-6" /> Token Buckets
          </h1>
          <p className="text-muted-foreground mt-1">Build diversified crypto baskets and DCA into them automatically</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} data-testid="button-create-bucket">
          <Plus className="h-4 w-4 mr-2" /> Create Bucket
        </Button>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex gap-3">
          <Shield className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-500">Non-Custodial</p>
            <p className="text-muted-foreground">Token Buckets execute via your connected wallet. Each token swap in a bucket requires your signature. On XRPL, tokens other than XRP require trustlines (2 XRP reserve each). The pre-flight check will show exactly what is needed before any DCA runs.</p>
          </div>
        </CardContent>
      </Card>

      {portfolioAnalysis && portfolioAnalysis.totalPortfolioValue > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" /> Portfolio Category Breakdown
            </CardTitle>
            <CardDescription>Your current holdings by asset category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {portfolioAnalysis.analysis.slice(0, 12).map(cat => (
                <div key={cat.category} className="rounded-lg border p-3" data-testid={`category-${cat.category}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.category] || "#888" }} />
                    <span className="text-xs font-medium truncate">{cat.category}</span>
                  </div>
                  <p className="text-sm font-semibold">{cat.percentage.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">${cat.totalValue.toFixed(0)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-bucket-type">
          <TabsTrigger value="curated" data-testid="tab-curated">Curated</TabsTrigger>
          <TabsTrigger value="my-buckets" data-testid="tab-my-buckets">My Buckets ({myBuckets.length})</TabsTrigger>
          <TabsTrigger value="balanced" data-testid="tab-balanced">Balanced</TabsTrigger>
        </TabsList>

        <TabsContent value="curated" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">Pre-built baskets curated by theme. Click "Use This" to create one with your own DCA settings.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {curatedBuckets.map(cb => (
              <Card key={cb.id} data-testid={`curated-bucket-${cb.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{cb.name}</CardTitle>
                  <CardDescription className="text-xs">{cb.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    {cb.tokens.map(t => (
                      <div key={t.symbol} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[t.category] || "#888" }} />
                          <span className="font-mono">{t.symbol}</span>
                        </div>
                        <span className="text-muted-foreground">{t.allocationPct}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted flex overflow-hidden">
                    {cb.tokens.map((t, i) => (
                      <div
                        key={i}
                        className="h-full"
                        style={{
                          width: `${t.allocationPct}%`,
                          backgroundColor: CATEGORY_COLORS[t.category] || "#888",
                        }}
                      />
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleUseCurated(cb)} data-testid={`button-use-curated-${cb.id}`}>
                    <Copy className="h-3 w-3 mr-2" /> Use This Bucket
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="my-buckets" className="space-y-4 mt-4">
          {loadingBuckets ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : myBuckets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Layers className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No buckets yet. Create a custom one or pick from the curated list.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {myBuckets.map(bucket => (
                <BucketCard
                  key={bucket.id}
                  bucket={bucket}
                  onToggleStatus={(id, status) => toggleStatusMutation.mutate({ id, status })}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onPreflight={(id) => openPreflight(id)}
                  onEdit={(b) => setEditBucket(b)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="balanced" className="space-y-4 mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <PieChart className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium mb-2">Balanced Bucket</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                A balanced bucket takes the top-performing token from each major category to build a diversified basket.
                Create a custom bucket with tokens from different categories for the same effect.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => {
                setNewBucket(prev => ({ ...prev, bucketType: "balanced", name: "Balanced Portfolio" }));
                setShowCreateDialog(true);
              }} data-testid="button-create-balanced">
                <Plus className="h-4 w-4 mr-2" /> Create Balanced Bucket
              </Button>
            </CardContent>
          </Card>
          {balancedBuckets.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              {balancedBuckets.map(bucket => (
                <BucketCard
                  key={bucket.id}
                  bucket={bucket}
                  onToggleStatus={(id, status) => toggleStatusMutation.mutate({ id, status })}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onPreflight={(id) => openPreflight(id)}
                  onEdit={(b) => setEditBucket(b)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); resetForm(); } else setShowCreateDialog(true); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Token Bucket</DialogTitle>
            <DialogDescription>Define your bucket tokens and DCA settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Bucket Name</Label>
              <Input value={newBucket.name} onChange={e => setNewBucket({ ...newBucket, name: e.target.value })} placeholder="My DeFi Basket" data-testid="input-bucket-name" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={newBucket.description} onChange={e => setNewBucket({ ...newBucket, description: e.target.value })} placeholder="A mix of top DeFi protocols" rows={2} data-testid="input-bucket-description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Spend Currency</Label>
                <Select value={newBucket.spendCurrency} onValueChange={v => setNewBucket({ ...newBucket, spendCurrency: v })}>
                  <SelectTrigger data-testid="select-spend-currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RLUSD">RLUSD</SelectItem>
                    <SelectItem value="XRP">XRP</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount per Run</Label>
                <Input type="number" step="0.01" value={newBucket.spendAmount} onChange={e => setNewBucket({ ...newBucket, spendAmount: e.target.value })} placeholder="50.00" data-testid="input-spend-amount" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Frequency</Label>
                <Select value={newBucket.frequency} onValueChange={v => setNewBucket({ ...newBucket, frequency: v })}>
                  <SelectTrigger data-testid="select-frequency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chain</Label>
                <Select value={newBucket.chain} onValueChange={v => setNewBucket({ ...newBucket, chain: v })}>
                  <SelectTrigger data-testid="select-chain"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xrpl">XRPL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Tokens & Allocations</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={Math.abs(totalAllocation() - 100) < 0.01 ? "default" : "destructive"} data-testid="badge-allocation-total">
                    {totalAllocation().toFixed(1)}% / 100%
                  </Badge>
                  <Button type="button" variant="ghost" size="sm" onClick={addTokenRow} data-testid="button-add-token">
                    <Plus className="h-3 w-3 mr-1" /> Token
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {newItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      className="flex-1"
                      value={item.symbol}
                      onChange={e => updateTokenRow(idx, "symbol", e.target.value.toUpperCase())}
                      placeholder="BTC"
                      data-testid={`input-token-symbol-${idx}`}
                    />
                    <Input
                      className="w-20"
                      type="number"
                      step="0.1"
                      value={item.allocationPct}
                      onChange={e => updateTokenRow(idx, "allocationPct", e.target.value)}
                      placeholder="%"
                      data-testid={`input-token-pct-${idx}`}
                    />
                    {newItems.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeTokenRow(idx)} data-testid={`button-remove-token-${idx}`}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {newItems.length > 1 && newBucket.spendAmount && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-xs font-medium mb-2 flex items-center gap-1"><Info className="h-3 w-3" /> Per-run cost estimate</p>
                <div className="space-y-1">
                  {newItems.filter(i => i.symbol && parseFloat(i.allocationPct) > 0).map((item, idx) => {
                    const amt = (parseFloat(newBucket.spendAmount) || 0) * (parseFloat(item.allocationPct) / 100);
                    return (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="font-mono">{item.symbol}</span>
                        <span>{amt.toFixed(2)} {newBucket.spendCurrency}</span>
                      </div>
                    );
                  })}
                  <div className="border-t pt-1 mt-1 flex justify-between text-xs font-medium">
                    <span>Total + est. fees ({newItems.filter(i => i.symbol).length} swaps)</span>
                    <span>{(parseFloat(newBucket.spendAmount) || 0).toFixed(2)} {newBucket.spendCurrency}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }} data-testid="button-cancel-create">Cancel</Button>
            <Button onClick={handleCreateBucket} disabled={createMutation.isPending} data-testid="button-submit-bucket">
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Bucket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreflightDialog} onOpenChange={(open) => { if (!open) { setShowPreflightDialog(false); setSelectedBucketId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Pre-Flight Wallet Check
            </DialogTitle>
            <DialogDescription>Checking wallet readiness for this bucket</DialogDescription>
          </DialogHeader>
          {loadingPreflight ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : preflight ? (
            <div className="space-y-4">
              <div className={`rounded-lg p-3 ${preflight.ready ? "bg-green-500/10 border-green-500/30" : "bg-amber-500/10 border-amber-500/30"} border`}>
                <div className="flex items-center gap-2">
                  {preflight.ready ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                  <span className="font-medium">{preflight.ready ? "Wallet Ready" : "Setup Required"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Token Readiness</p>
                {preflight.tokens.map(t => (
                  <div key={t.symbol} className="flex items-center justify-between text-sm border rounded-lg px-3 py-2" data-testid={`preflight-token-${t.symbol}`}>
                    <span className="font-mono">{t.symbol} ({t.allocationPct}%)</span>
                    <div className="flex items-center gap-2">
                      {t.needsTrustline && (
                        <Badge variant={t.hasTrustline ? "default" : "secondary"} className="text-xs">
                          {t.hasTrustline ? "Trustline OK" : "Needs Trustline"}
                        </Badge>
                      )}
                      {t.ready ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {preflight.warnings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Warnings</p>
                  {preflight.warnings.map((w, i) => (
                    <div key={i} className="flex gap-2 text-sm bg-amber-500/5 rounded-lg p-3 border border-amber-500/20">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {preflight.chain === "xrpl" && preflight.missingTrustlineCount > 0 && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="font-medium mb-1">Reserve Summary</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-muted-foreground">Base reserve:</span><span>10 XRP</span>
                    <span className="text-muted-foreground">Trustline reserves:</span><span>{preflight.reserveXrpNeeded} XRP ({preflight.missingTrustlineCount} x 2)</span>
                    <span className="text-muted-foreground">Total needed:</span><span className="font-medium">{10 + preflight.reserveXrpNeeded} XRP</span>
                    <span className="text-muted-foreground">Your balance:</span><span className={preflight.hasEnoughReserve ? "text-green-500" : "text-amber-500"}>{preflight.currentXrpBalance.toFixed(2)} XRP</span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPreflightDialog(false); setSelectedBucketId(null); }} data-testid="button-close-preflight">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editBucket && (
        <EditBucketDialog
          bucket={editBucket}
          onClose={() => setEditBucket(null)}
          onSave={(id, data) => updateMutation.mutate({ id, data })}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function BucketCard({
  bucket,
  onToggleStatus,
  onDelete,
  onPreflight,
  onEdit,
}: {
  bucket: BucketWithItems;
  onToggleStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onPreflight: (id: string) => void;
  onEdit: (b: BucketWithItems) => void;
}) {
  return (
    <Card data-testid={`bucket-card-${bucket.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {bucket.name}
              <Badge variant={bucket.status === "active" ? "default" : "secondary"} className="text-xs">{bucket.status}</Badge>
              {bucket.bucketType !== "custom" && <Badge variant="outline" className="text-xs">{bucket.bucketType}</Badge>}
            </CardTitle>
            {bucket.description && <CardDescription className="text-xs mt-1">{bucket.description}</CardDescription>}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(bucket)} data-testid={`button-edit-bucket-${bucket.id}`}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onToggleStatus(bucket.id, bucket.status === "active" ? "paused" : "active")} data-testid={`button-toggle-bucket-${bucket.id}`}>
              {bucket.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(bucket.id)} data-testid={`button-delete-bucket-${bucket.id}`}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {bucket.items.map(item => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.category || "Other"] || "#888" }} />
                <span className="font-mono">{item.symbol}</span>
                {item.category && <span className="text-xs text-muted-foreground">({item.category})</span>}
              </div>
              <span className="text-muted-foreground">{item.allocationPct}%</span>
            </div>
          ))}
        </div>
        <div className="w-full h-2 rounded-full bg-muted flex overflow-hidden">
          {bucket.items.map((item, i) => (
            <div
              key={i}
              className="h-full"
              style={{
                width: `${item.allocationPct}%`,
                backgroundColor: CATEGORY_COLORS[item.category || "Other"] || "#888",
              }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{bucket.spendAmount ? `${bucket.spendAmount} ${bucket.spendCurrency}` : "No DCA set"} / {bucket.frequency || "—"}</span>
          <span>Chain: {bucket.chain?.toUpperCase()}</span>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={() => onPreflight(bucket.id)} data-testid={`button-preflight-${bucket.id}`}>
          <Shield className="h-3 w-3 mr-2" /> Pre-Flight Check
        </Button>
      </CardContent>
    </Card>
  );
}

function EditBucketDialog({
  bucket,
  onClose,
  onSave,
  isPending,
}: {
  bucket: BucketWithItems;
  onClose: () => void;
  onSave: (id: string, data: any) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(bucket.name);
  const [description, setDescription] = useState(bucket.description || "");
  const [spendAmount, setSpendAmount] = useState(bucket.spendAmount || "");
  const [frequency, setFrequency] = useState(bucket.frequency || "weekly");
  const [spendCurrency, setSpendCurrency] = useState(bucket.spendCurrency || "RLUSD");
  const [items, setItems] = useState(
    bucket.items.map(i => ({ symbol: i.symbol, allocationPct: i.allocationPct, category: i.category || "" }))
  );

  function total() {
    return items.reduce((s, i) => s + (parseFloat(i.allocationPct) || 0), 0);
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bucket</DialogTitle>
          <DialogDescription>Update your bucket settings and allocations</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} data-testid="input-edit-bucket-name" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} data-testid="input-edit-bucket-description" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Currency</Label>
              <Select value={spendCurrency} onValueChange={setSpendCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RLUSD">RLUSD</SelectItem>
                  <SelectItem value="XRP">XRP</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" value={spendAmount} onChange={e => setSpendAmount(e.target.value)} data-testid="input-edit-spend-amount" />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tokens</Label>
              <Badge variant={Math.abs(total() - 100) < 0.01 ? "default" : "destructive"}>{total().toFixed(1)}% / 100%</Badge>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input className="flex-1" value={item.symbol} onChange={e => {
                    const u = [...items]; u[idx].symbol = e.target.value.toUpperCase(); setItems(u);
                  }} placeholder="BTC" />
                  <Input className="w-20" type="number" value={item.allocationPct} onChange={e => {
                    const u = [...items]; u[idx].allocationPct = e.target.value; setItems(u);
                  }} placeholder="%" />
                  {items.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setItems([...items, { symbol: "", allocationPct: "", category: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Add Token
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            const validItems = items.filter(i => i.symbol && parseFloat(i.allocationPct) > 0);
            onSave(bucket.id, { name, description, spendAmount, spendCurrency, frequency, items: validItems });
          }} disabled={isPending} data-testid="button-save-edit">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
