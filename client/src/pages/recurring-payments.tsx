import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarClock,
  Plus,
  Pause,
  Play,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Repeat,
  Users,
  History,
  ExternalLink,
} from "lucide-react";
import { useStellarStore } from "@/lib/stellar-store";

type ScheduledPayment = {
  id: string;
  userId: string;
  payeeName: string;
  payeeAddress: string;
  chain: string;
  amount: string;
  currency: string;
  frequency: string;
  nextRunAt: string;
  lastRunAt: string | null;
  status: string;
  memo: string | null;
  destinationTag: string | null;
  totalRuns: number | null;
  runsCompleted: number | null;
  createdAt: string;
};

type PaymentExecution = {
  id: string;
  scheduledPaymentId: string;
  userId: string;
  status: string;
  xamanPayloadId: string | null;
  txHash: string | null;
  amount: string;
  errorMessage: string | null;
  executedAt: string;
};

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 Weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const CHAIN_OPTIONS = [
  { value: "xrpl", label: "XRPL", color: "#00A4E4" },
  { value: "stellar", label: "Stellar", color: "#7B61FF" },
];

const BASE_CURRENCY_OPTIONS: Record<string, string[]> = {
  xrpl: ["XRP", "RLUSD"],
  stellar: ["XLM", "USDC"],
};

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
    active: { variant: "default", className: "bg-emerald-500 hover:bg-emerald-600" },
    paused: { variant: "secondary", className: "bg-amber-500 hover:bg-amber-600 text-white" },
    completed: { variant: "outline", className: "border-muted-foreground" },
    pending: { variant: "secondary", className: "bg-blue-500 hover:bg-blue-600 text-white" },
    failed: { variant: "destructive", className: "" },
  };
  const c = config[status] || config.active;
  return <Badge variant={c.variant} className={c.className} data-testid={`badge-status-${status}`}>{status}</Badge>;
}

function CreatePaymentDialog({ onCreated, defaultChain }: { onCreated: () => void; defaultChain?: string }) {
  const { balances: stellarBalances } = useStellarStore();
  const getCurrencyOptions = (ch: string): string[] => {
    if (ch === "stellar" && stellarBalances.length > 0) {
      const fromWallet = stellarBalances.map((b) => b.asset_code);
      const base = BASE_CURRENCY_OPTIONS.stellar || [];
      const merged = [...new Set([...fromWallet, ...base])];
      return merged;
    }
    return BASE_CURRENCY_OPTIONS[ch] || [];
  };
  const [open, setOpen] = useState(false);
  const [chain, setChain] = useState(defaultChain === "stellar" ? "stellar" : "xrpl");
  const [currency, setCurrency] = useState(defaultChain === "stellar" ? "XLM" : "XRP");
  const [payeeName, setPayeeName] = useState("");
  const [payeeAddress, setPayeeAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [nextRunAt, setNextRunAt] = useState("");
  const [memo, setMemo] = useState("");
  const [destinationTag, setDestinationTag] = useState("");
  const [totalRuns, setTotalRuns] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/scheduled-payments", {
        payeeName,
        payeeAddress,
        chain,
        amount: parseFloat(amount),
        currency,
        frequency,
        nextRunAt: new Date(nextRunAt).toISOString(),
        memo: memo || null,
        destinationTag: destinationTag || null,
        totalRuns: totalRuns ? parseInt(totalRuns) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-payments"] });
      toast({ title: "Recurring payment created", description: `${amount} ${currency} to ${payeeName} — ${frequency}` });
      setOpen(false);
      resetForm();
      onCreated();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to create payment", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setPayeeName(""); setPayeeAddress(""); setAmount(""); setMemo("");
    setDestinationTag(""); setTotalRuns(""); setNextRunAt("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-payment">
          <Plus className="h-4 w-4 mr-2" />
          New Recurring Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Recurring Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Chain</Label>
              <Select value={chain} onValueChange={(v) => { setChain(v); setCurrency(getCurrencyOptions(v)[0]); }}>
                <SelectTrigger data-testid="select-chain">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHAIN_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger data-testid="select-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getCurrencyOptions(chain).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Payee Name</Label>
            <Input
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="e.g., Electric Company"
              data-testid="input-payee-name"
            />
          </div>
          <div>
            <Label>Payee Address</Label>
            <Input
              value={payeeAddress}
              onChange={(e) => setPayeeAddress(e.target.value)}
              placeholder={chain === "xrpl" ? "rXXX..." : "GXXX..."}
              data-testid="input-payee-address"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                data-testid="input-amount"
              />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger data-testid="select-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>First Payment Date</Label>
            <Input
              type="datetime-local"
              value={nextRunAt}
              onChange={(e) => setNextRunAt(e.target.value)}
              data-testid="input-next-run"
            />
          </div>
          {chain === "xrpl" && (
            <div>
              <Label>Destination Tag (optional)</Label>
              <Input
                value={destinationTag}
                onChange={(e) => setDestinationTag(e.target.value)}
                placeholder="e.g., 12345"
                data-testid="input-destination-tag"
              />
            </div>
          )}
          <div>
            <Label>Memo (optional)</Label>
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Payment note..."
              rows={2}
              data-testid="input-memo"
            />
          </div>
          <div>
            <Label>Total Runs (optional — leave blank for indefinite)</Label>
            <Input
              type="number"
              value={totalRuns}
              onChange={(e) => setTotalRuns(e.target.value)}
              placeholder="e.g., 12 for 1 year monthly"
              data-testid="input-total-runs"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => createMutation.mutate()}
            disabled={!payeeName || !payeeAddress || !amount || !nextRunAt || createMutation.isPending}
            data-testid="button-confirm-create"
          >
            {createMutation.isPending ? "Creating..." : "Create Recurring Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RecurringPayments() {
  const { toast } = useToast();
  const [location] = useLocation();
  const isStellarRoute = location.startsWith("/stellar");

  const { data: subLimits } = useQuery<{ tier: string; limits: Record<string, number> }>({
    queryKey: ["/api/subscription/limits"],
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery<ScheduledPayment[]>({
    queryKey: ["/api/scheduled-payments"],
  });

  const { data: executions = [], isLoading: loadingExecutions } = useQuery<PaymentExecution[]>({
    queryKey: ["/api/payment-executions"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/scheduled-payments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-payments"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/scheduled-payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-executions"] });
      toast({ title: "Payment deleted" });
    },
  });

  if (subLimits && !subLimits.recurringPayments) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-recurring">Recurring Payments</h1>
          <p className="text-muted-foreground mt-1">Automate your crypto bill payments on XRPL and Stellar</p>
        </div>
        <UpgradePrompt feature="Recurring payments let you schedule automatic crypto payments to any address — bills, subscriptions, payroll, or regular transfers." />
      </div>
    );
  }

  const activePayments = payments.filter((p) => p.status === "active");
  const pausedPayments = payments.filter((p) => p.status === "paused");
  const completedPayments = payments.filter((p) => p.status === "completed");

  const chainColor = (chain: string) => chain === "xrpl" ? "#00A4E4" : "#7B61FF";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-recurring">Recurring Payments</h1>
          <p className="text-muted-foreground mt-1">Schedule automatic crypto payments on XRPL and Stellar</p>
        </div>
        <CreatePaymentDialog onCreated={() => {}} defaultChain={isStellarRoute ? "stellar" : undefined} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold" data-testid="stat-active">{activePayments.length}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold" data-testid="stat-paused">{pausedPayments.length}</div>
            <div className="text-xs text-muted-foreground">Paused</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold" data-testid="stat-completed">{completedPayments.length}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold" data-testid="stat-executions">{executions.length}</div>
            <div className="text-xs text-muted-foreground">Executions</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <p className="font-medium mb-1">How Recurring Payments Work</p>
              <p>
                When a payment is due, CryptoOwnBank creates a payment request that you approve in your wallet (Xaman for XRPL, or your Stellar wallet).
                We never hold your keys or initiate transactions without your approval. You stay in full control.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="schedules">
        <TabsList>
          <TabsTrigger value="schedules" data-testid="tab-schedules">
            <Repeat className="h-4 w-4 mr-1.5" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <History className="h-4 w-4 mr-1.5" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="mt-4 space-y-3">
          {loadingPayments ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading schedules...</CardContent></Card>
          ) : payments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1" data-testid="text-no-payments">No Recurring Payments Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Set up your first recurring payment to automate regular crypto transfers.
                </p>
                <CreatePaymentDialog onCreated={() => {}} defaultChain={isStellarRoute ? "stellar" : undefined} />
              </CardContent>
            </Card>
          ) : (
            payments.map((payment) => (
              <Card key={payment.id} data-testid={`card-payment-${payment.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${chainColor(payment.chain)}15` }}
                      >
                        <Send className="h-5 w-5" style={{ color: chainColor(payment.chain) }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate" data-testid={`text-payee-${payment.id}`}>{payment.payeeName}</span>
                          <StatusBadge status={payment.status} />
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {payment.amount} {payment.currency} · {FREQUENCY_OPTIONS.find(f => f.value === payment.frequency)?.label || payment.frequency}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono truncate">{payment.payeeAddress.slice(0, 8)}...{payment.payeeAddress.slice(-6)}</span>
                          {payment.memo && <span> · {payment.memo}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Next Run</div>
                        <div className="font-medium">
                          {payment.status === "completed" ? "Done" : new Date(payment.nextRunAt).toLocaleDateString()}
                        </div>
                      </div>
                      {payment.totalRuns && (
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Runs</div>
                          <div className="font-medium">{payment.runsCompleted || 0}/{payment.totalRuns}</div>
                        </div>
                      )}
                      <div className="flex gap-1">
                        {payment.status === "active" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateMutation.mutate({ id: payment.id, data: { status: "paused" } })}
                            data-testid={`button-pause-${payment.id}`}
                            title="Pause"
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {payment.status === "paused" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateMutation.mutate({ id: payment.id, data: { status: "active" } })}
                            data-testid={`button-resume-${payment.id}`}
                            title="Resume"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(payment.id)}
                          data-testid={`button-delete-${payment.id}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {loadingExecutions ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading history...</CardContent></Card>
          ) : executions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1" data-testid="text-no-history">No Payment History</h3>
                <p className="text-sm text-muted-foreground">
                  Payment executions will appear here once your scheduled payments run.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {executions.map((exec) => {
                const payment = payments.find((p) => p.id === exec.scheduledPaymentId);
                const statusIcon = exec.status === "pending" ? Clock :
                  exec.status === "failed" ? XCircle : CheckCircle2;
                const StatusIcon = statusIcon;
                return (
                  <Card key={exec.id} data-testid={`card-execution-${exec.id}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <StatusIcon className={`h-5 w-5 shrink-0 ${
                        exec.status === "pending" ? "text-blue-500" :
                        exec.status === "failed" ? "text-red-500" : "text-emerald-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {payment?.payeeName || "Unknown"} — {exec.amount} {payment?.currency || ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(exec.executedAt).toLocaleString()}
                          {exec.txHash && <span> · tx: {exec.txHash.slice(0, 10)}...</span>}
                          {exec.errorMessage && <span className="text-red-500"> · {exec.errorMessage}</span>}
                        </div>
                      </div>
                      {exec.status === "pending" && payment?.chain === "stellar" && (
                        <a
                          href={(() => {
                            const ASSET_MAP: Record<string, string> = {
                              USDC: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
                            };
                            let uri = `web+stellar:pay?destination=${payment.payeeAddress}&amount=${exec.amount}`;
                            const issuer = ASSET_MAP[payment.currency];
                            if (issuer) uri += `&asset_code=${payment.currency}&asset_issuer=${issuer}`;
                            if (payment.memo) uri += `&memo=${encodeURIComponent(payment.memo)}`;
                            return uri;
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`button-sign-stellar-${exec.id}`}
                        >
                          <Button size="sm" className="bg-[#7B61FF] hover:bg-[#6a4fee] text-white text-xs h-7">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Sign
                          </Button>
                        </a>
                      )}
                      <StatusBadge status={exec.status} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
