import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Activity, AlertTriangle, DollarSign, Gauge, Plus, Trash2, ShieldOff, ShieldCheck, Mail,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProviderSummary {
  provider: string;
  callCount: number;
  errorCount: number;
  totalCostCents: number;
  avgLatencyMs: number;
}

interface ApiFailure {
  id: number;
  provider: string;
  endpoint: string | null;
  userId: string | null;
  statusCode: number | null;
  errorMessage: string | null;
  requestedAt: string;
}

interface TopConsumer {
  userId: string;
  email: string | null;
  callCount: number;
  costCents: number;
}

interface Budget {
  id: number;
  provider: string;
  period: "daily" | "monthly";
  softLimitCents: number;
  hardLimitCents: number;
  alertEmail: string | null;
  enforced: boolean;
  softAlertSentAt: string | null;
  hardAlertSentAt: string | null;
  periodStartedAt: string;
  currentSpendCents?: number;
}

function fmtMoney(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusOf(b: Budget): { color: string; label: string } {
  const spend = b.currentSpendCents ?? 0;
  if (spend >= b.hardLimitCents) return { color: "destructive", label: "HARD LIMIT" };
  if (spend >= b.softLimitCents) return { color: "secondary", label: "Soft limit" };
  const pctOfSoft = b.softLimitCents > 0 ? (spend / b.softLimitCents) * 100 : 0;
  if (pctOfSoft >= 80) return { color: "outline", label: "Warning" };
  return { color: "default", label: "OK" };
}

export default function AdminApiWatch() {
  const [periodHours, setPeriodHours] = useState<number>(24);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Partial<Budget> | null>(null);
  const { toast } = useToast();

  const summaryQ = useQuery<{ summary: ProviderSummary[]; periodHours: number }>({
    queryKey: ["/api/admin/api-watch/summary", periodHours],
    queryFn: async () => {
      const res = await fetch(`/api/admin/api-watch/summary?periodHours=${periodHours}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const budgetsQ = useQuery<{ budgets: Budget[] }>({
    queryKey: ["/api/admin/api-watch/budgets"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/api-watch/budgets`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const failuresQ = useQuery<{ failures: ApiFailure[] }>({
    queryKey: ["/api/admin/api-watch/failures"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/api-watch/failures?limit=25`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const consumersQ = useQuery<{ consumers: TopConsumer[] }>({
    queryKey: ["/api/admin/api-watch/top-consumers", periodHours],
    queryFn: async () => {
      const res = await fetch(`/api/admin/api-watch/top-consumers?periodHours=${periodHours}&limit=15`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const saveBudget = useMutation({
    mutationFn: async (data: Partial<Budget>) => {
      return await apiRequest("POST", "/api/admin/api-watch/budgets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-watch/budgets"] });
      setBudgetDialogOpen(false);
      setEditingBudget(null);
      toast({ title: "Saved", description: "Budget updated." });
    },
    onError: (e: any) => toast({ title: "Failed", description: String(e?.message || e), variant: "destructive" }),
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/api-watch/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-watch/budgets"] });
      toast({ title: "Removed", description: "Budget deleted." });
    },
  });

  const resetAlerts = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/admin/api-watch/budgets/${id}/reset-alerts`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-watch/budgets"] });
      toast({ title: "Reset", description: "Alert flags cleared. Next breach will re-notify." });
    },
  });

  const openNew = () => {
    setEditingBudget({
      provider: "",
      period: "daily",
      softLimitCents: 500,
      hardLimitCents: 1000,
      alertEmail: "",
      enforced: true,
    });
    setBudgetDialogOpen(true);
  };

  const openEdit = (b: Budget) => {
    setEditingBudget({ ...b });
    setBudgetDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">API Cost Watchdog</h1>
        <p className="text-muted-foreground mt-1">
          Monitor external API spend per provider, set soft and hard ceilings, get emailed when limits hit, and refuse calls automatically past the hard cap.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Label htmlFor="period">Window</Label>
        <Select value={String(periodHours)} onValueChange={(v) => setPeriodHours(Number(v))}>
          <SelectTrigger className="w-40" id="period" data-testid="select-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last hour</SelectItem>
            <SelectItem value="24">Last 24 hours</SelectItem>
            <SelectItem value="168">Last 7 days</SelectItem>
            <SelectItem value="720">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Provider activity</CardTitle>
          <CardDescription>Calls, errors, latency, and estimated cost per provider in the selected window.</CardDescription>
        </CardHeader>
        <CardContent>
          {summaryQ.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Error rate</TableHead>
                  <TableHead className="text-right">Avg latency</TableHead>
                  <TableHead className="text-right">Est. cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(summaryQ.data?.summary || []).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No tracked calls yet in this window. Use trackedFetch() or recordApiCall() in services to populate.</TableCell></TableRow>
                ) : (
                  (summaryQ.data?.summary || []).map((p) => {
                    const errRate = p.callCount > 0 ? (p.errorCount / p.callCount) * 100 : 0;
                    return (
                      <TableRow key={p.provider} data-testid={`row-provider-${p.provider}`}>
                        <TableCell className="font-mono font-medium">{p.provider}</TableCell>
                        <TableCell className="text-right">{p.callCount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{p.errorCount}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={errRate > 5 ? "destructive" : errRate > 1 ? "secondary" : "outline"}>
                            {errRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{Math.round(p.avgLatencyMs)} ms</TableCell>
                        <TableCell className="text-right font-medium">{fmtMoney(p.totalCostCents)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" /> Budgets & ceilings</CardTitle>
            <CardDescription>Soft = warning email. Hard = refuse calls. Alert flags reset when the period rolls over.</CardDescription>
          </div>
          <Button onClick={openNew} data-testid="button-new-budget"><Plus className="h-4 w-4 mr-1" /> Add budget</Button>
        </CardHeader>
        <CardContent>
          {budgetsQ.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Spend / Soft / Hard</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alert email</TableHead>
                  <TableHead>Enforced</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(budgetsQ.data?.budgets || []).length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No budgets configured. Add one to start enforcing ceilings.</TableCell></TableRow>
                ) : (
                  budgetsQ.data!.budgets.map((b) => {
                    const s = statusOf(b);
                    const spend = b.currentSpendCents ?? 0;
                    return (
                      <TableRow key={b.id} data-testid={`row-budget-${b.id}`}>
                        <TableCell className="font-mono font-medium">{b.provider}</TableCell>
                        <TableCell><Badge variant="outline">{b.period}</Badge></TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {fmtMoney(spend)} / {fmtMoney(b.softLimitCents)} / {fmtMoney(b.hardLimitCents)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.color as any}>{s.label}</Badge>
                          {b.hardAlertSentAt && <Badge variant="destructive" className="ml-2"><AlertTriangle className="h-3 w-3 mr-1" />refused</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{b.alertEmail || "—"}</TableCell>
                        <TableCell>
                          {b.enforced ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <ShieldOff className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(b)} data-testid={`button-edit-budget-${b.id}`}>Edit</Button>
                          {(b.softAlertSentAt || b.hardAlertSentAt) && (
                            <Button size="sm" variant="ghost" onClick={() => resetAlerts.mutate(b.id)} data-testid={`button-reset-alerts-${b.id}`}>
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => {
                            if (confirm(`Delete budget for ${b.provider} (${b.period})?`)) deleteBudget.mutate(b.id);
                          }} data-testid={`button-delete-budget-${b.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Recent failures</CardTitle>
            <CardDescription>Latest 25 non-OK responses across all providers.</CardDescription>
          </CardHeader>
          <CardContent>
            {failuresQ.isLoading ? <Skeleton className="h-32 w-full" /> : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(failuresQ.data?.failures || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No failures recorded.</p>
                ) : (
                  failuresQ.data!.failures.map((f) => (
                    <div key={f.id} className="text-xs border rounded p-2 space-y-1" data-testid={`row-failure-${f.id}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium">{f.provider}</span>
                        <span className="text-muted-foreground">{new Date(f.requestedAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{f.statusCode || "ERR"}</Badge>
                        <span className="font-mono text-muted-foreground truncate">{f.endpoint}</span>
                      </div>
                      {f.errorMessage && <p className="text-muted-foreground italic truncate">{f.errorMessage}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Top consumers</CardTitle>
            <CardDescription>Users driving the most API spend in the selected window.</CardDescription>
          </CardHeader>
          <CardContent>
            {consumersQ.isLoading ? <Skeleton className="h-32 w-full" /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(consumersQ.data?.consumers || []).length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No usage data.</TableCell></TableRow>
                  ) : (
                    consumersQ.data!.consumers.map((c) => (
                      <TableRow key={c.userId} data-testid={`row-consumer-${c.userId}`}>
                        <TableCell className="text-xs truncate max-w-[200px]">{c.email || c.userId}</TableCell>
                        <TableCell className="text-right">{c.callCount.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">{fmtMoney(c.costCents)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBudget?.id ? "Edit budget" : "Add budget"}</DialogTitle>
          </DialogHeader>
          {editingBudget && (
            <div className="space-y-3">
              <div>
                <Label>Provider</Label>
                <Input
                  value={editingBudget.provider || ""}
                  onChange={(e) => setEditingBudget({ ...editingBudget, provider: e.target.value })}
                  placeholder="openai, perplexity, coingecko, zerion, ..."
                  data-testid="input-budget-provider"
                />
              </div>
              <div>
                <Label>Period</Label>
                <Select
                  value={editingBudget.period || "daily"}
                  onValueChange={(v) => setEditingBudget({ ...editingBudget, period: v as any })}
                >
                  <SelectTrigger data-testid="select-budget-period"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Soft limit (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={((editingBudget.softLimitCents ?? 0) / 100).toString()}
                    onChange={(e) => setEditingBudget({ ...editingBudget, softLimitCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-budget-soft"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email warning sent.</p>
                </div>
                <div>
                  <Label>Hard limit (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={((editingBudget.hardLimitCents ?? 0) / 100).toString()}
                    onChange={(e) => setEditingBudget({ ...editingBudget, hardLimitCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-budget-hard"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Calls refused.</p>
                </div>
              </div>
              <div>
                <Label>Alert email</Label>
                <Input
                  type="email"
                  value={editingBudget.alertEmail || ""}
                  onChange={(e) => setEditingBudget({ ...editingBudget, alertEmail: e.target.value })}
                  placeholder="you@example.com"
                  data-testid="input-budget-email"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enforced"
                  checked={editingBudget.enforced !== false}
                  onChange={(e) => setEditingBudget({ ...editingBudget, enforced: e.target.checked })}
                  data-testid="checkbox-budget-enforced"
                />
                <Label htmlFor="enforced">Enforce hard limit (refuse calls past hard cap)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => editingBudget && saveBudget.mutate(editingBudget)}
              disabled={!editingBudget?.provider || saveBudget.isPending}
              data-testid="button-save-budget"
            >
              {saveBudget.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Wrap external API calls with <code className="bg-muted px-1 rounded">trackedFetch(provider, url, opts)</code> from <code className="bg-muted px-1 rounded">server/services/api-watchdog.ts</code> to populate this dashboard. SDK clients (OpenAI, Xumm, Stripe) should use <code className="bg-muted px-1 rounded">recordApiCall(...)</code> after each call.
      </p>
    </div>
  );
}
