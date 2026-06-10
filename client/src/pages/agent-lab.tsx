import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Sparkles, Lock, Check, X, Send, Trash2, PenLine } from "lucide-react";
import type { AgentMandate, AgentProposal, AgentPayee } from "@shared/schema";
import { signPayment } from "@/lib/xumm-connector";
import { buildAndSignPayment, getFreighterAddress, connectFreighter } from "@/lib/freighter-connector";
import { RLUSD } from "@/lib/constants";

const EMPTY_PAYEE = {
  chain: "xrpl",
  label: "",
  address: "",
  destinationTag: "",
  assetCode: "XRP",
  issuer: "",
  amount: "",
  note: "",
  enabled: true,
};

export default function AgentLab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [riskTolerance, setRiskTolerance] = useState("conservative");
  const [floorUsd, setFloorUsd] = useState("0");
  const [maxMoveUsd, setMaxMoveUsd] = useState("0");
  const [enabled, setEnabled] = useState(false);

  const [payeeForm, setPayeeForm] = useState<any>({ ...EMPTY_PAYEE });
  const [editingPayeeId, setEditingPayeeId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);

  const isAdmin = !!(user as any)?.isAdmin;

  const mandateQuery = useQuery<AgentMandate | null>({
    queryKey: ["/api/agent/mandate"],
    enabled: isAdmin,
  });

  const proposalsQuery = useQuery<AgentProposal[]>({
    queryKey: ["/api/agent/proposals"],
    enabled: isAdmin,
  });

  const payeesQuery = useQuery<AgentPayee[]>({
    queryKey: ["/api/agent/payees"],
    enabled: isAdmin,
  });

  useEffect(() => {
    const m = mandateQuery.data;
    if (m) {
      setRiskTolerance(m.riskTolerance);
      setFloorUsd(String(m.floorUsd));
      setMaxMoveUsd(String(m.maxMoveUsd));
      setEnabled(m.enabled);
    }
  }, [mandateQuery.data]);

  const saveMandate = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/agent/mandate", {
        riskTolerance,
        floorUsd: Number(floorUsd) || 0,
        maxMoveUsd: Number(maxMoveUsd) || 0,
        enabled,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/mandate"] });
      toast({ title: "Guardrails saved", description: "Your agent rules were updated." });
    },
    onError: (e: any) => toast({ title: "Couldn't save", description: e?.message, variant: "destructive" }),
  });

  const savePayee = useMutation({
    mutationFn: async () => {
      const body = {
        chain: payeeForm.chain,
        label: payeeForm.label,
        address: payeeForm.address,
        destinationTag: payeeForm.destinationTag || null,
        assetCode: payeeForm.assetCode,
        issuer: payeeForm.issuer || null,
        amount: Number(payeeForm.amount) || 0,
        note: payeeForm.note || null,
        enabled: !!payeeForm.enabled,
      };
      const res = editingPayeeId
        ? await apiRequest("PUT", `/api/agent/payees/${editingPayeeId}`, body)
        : await apiRequest("POST", "/api/agent/payees", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/payees"] });
      setPayeeForm({ ...EMPTY_PAYEE });
      setEditingPayeeId(null);
      toast({ title: editingPayeeId ? "Payee updated" : "Payee added", description: "Saved to your whitelist." });
    },
    onError: (e: any) => toast({ title: "Couldn't save payee", description: e?.message, variant: "destructive" }),
  });

  const deletePayee = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/agent/payees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/payees"] });
      toast({ title: "Payee removed" });
    },
    onError: (e: any) => toast({ title: "Couldn't remove", description: e?.message, variant: "destructive" }),
  });

  const generate = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/agent/proposals/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/proposals"] });
      toast({ title: "Proposals refreshed", description: "The agent re-read your holdings and payees." });
    },
    onError: (e: any) => toast({ title: "Couldn't generate", description: e?.message, variant: "destructive" }),
  });

  const decide = useMutation({
    mutationFn: async ({ id, action, txHash }: { id: string; action: "approve" | "dismiss"; txHash?: string }) => {
      const res = await apiRequest("POST", `/api/agent/proposals/${id}/${action}`, txHash ? { txHash } : undefined);
      return res.json();
    },
    onSuccess: (data: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/proposals"] });
      if (vars.action === "approve") {
        toast({ title: "Recorded", description: data?.message ?? "Recorded." });
      } else {
        toast({ title: "Dismissed", description: "Proposal removed from your inbox." });
      }
    },
    onError: (e: any) => toast({ title: "Action failed", description: e?.message, variant: "destructive" }),
  });

  // Real signing happens in the member's OWN wallet. The agent never signs.
  async function signProposal(p: AgentProposal) {
    setSigningId(p.id);
    try {
      const amount = String(p.amount ?? "0");
      const code = (p.assetCode ?? "").toUpperCase();
      let result: { success: boolean; txHash?: string; error?: string };

      if (p.chain === "xrpl") {
        let amountField: string | { currency: string; value: string; issuer: string };
        if (code === "XRP") {
          amountField = Math.round(Number(amount) * 1_000_000).toString();
        } else {
          amountField = {
            currency: code === "RLUSD" ? RLUSD.currency : code,
            value: amount,
            issuer: p.issuer || (code === "RLUSD" ? RLUSD.issuer : ""),
          };
        }
        const opts: any = {};
        if (p.destinationTag) opts.destinationTag = Number(p.destinationTag);
        result = await signPayment(p.toAddress!, amountField, opts);
      } else {
        let source = await getFreighterAddress();
        if (!source) {
          const c = await connectFreighter();
          source = c.address;
          if (!source) {
            toast({ title: "Connect Freighter", description: c.error || "Connect your Stellar wallet to sign.", variant: "destructive" });
            return;
          }
        }
        const asset = code === "XLM"
          ? { type: "native" as const }
          : ({ type: "credit", code, issuer: p.issuer ?? "" } as any);
        result = await buildAndSignPayment({ sourceAddress: source, destination: p.toAddress!, asset, amount });
      }

      if (result.success && result.txHash) {
        await decide.mutateAsync({ id: p.id, action: "approve", txHash: result.txHash });
        toast({ title: "Payment signed", description: "You signed it in your own wallet. Recorded for tracking." });
      } else {
        toast({ title: "Not signed", description: result.error || "The signature wasn't completed.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Signing failed", description: e?.message, variant: "destructive" });
    } finally {
      setSigningId(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Not available
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground" data-testid="text-agent-lab-locked">
            This area isn't available on your account.
          </CardContent>
        </Card>
      </div>
    );
  }

  const proposals = proposalsQuery.data ?? [];
  const pending = proposals.filter((p) => p.status === "pending");
  const decided = proposals.filter((p) => p.status !== "pending");
  const payees = payeesQuery.data ?? [];
  const xrplPayee = payeeForm.chain === "xrpl";
  const issuedToken = xrplPayee ? !["XRP"].includes(payeeForm.assetCode.toUpperCase()) : !["XLM"].includes(payeeForm.assetCode.toUpperCase());

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-agent-lab-title">
          <Sparkles className="h-6 w-6" /> Agent Lab
          <Badge variant="secondary">Hidden prototype</Badge>
        </h1>
        <p className="text-muted-foreground mt-1">
          A private testing ground. The agent reads your holdings and your saved payees, then
          <strong> proposes</strong> moves within your guardrails. It never signs and never holds your funds —
          you sign in your own wallet.
        </p>
      </div>

      <div
        className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
        data-testid="banner-safety"
      >
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
        <p>
          <strong>The agent can't move money — only you can.</strong> Yield moves are draft-only in this
          prototype (no signing wired yet). Outward <strong>payments</strong> to a payee you saved are signed
          in <strong>your own wallet</strong> (Xaman for XRPL, Freighter for Stellar); the agent only prepares
          the exact payment for you to review and sign.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your guardrails</CardTitle>
          <CardDescription>The rules the agent must stay inside.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="risk">Risk tolerance</Label>
            <Select value={riskTolerance} onValueChange={setRiskTolerance}>
              <SelectTrigger id="risk" data-testid="select-risk-tolerance">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative — Treasury vault (5.2%, no lock)</SelectItem>
                <SelectItem value="balanced">Balanced — CREDIT+ vault (8.0%)</SelectItem>
                <SelectItem value="aggressive">Aggressive — CREDIT+ vault (8.0%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="floor">Liquid floor (keep at least this much in stablecoins, USD)</Label>
            <Input
              id="floor" type="number" min="0" value={floorUsd}
              onChange={(e) => setFloorUsd(e.target.value)}
              data-testid="input-floor-usd"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="maxmove">Max per move (USD, 0 = no cap)</Label>
            <Input
              id="maxmove" type="number" min="0" value={maxMoveUsd}
              onChange={(e) => setMaxMoveUsd(e.target.value)}
              data-testid="input-max-move-usd"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled">Agent enabled</Label>
              <p className="text-xs text-muted-foreground">When off, the agent makes no suggestions.</p>
            </div>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} data-testid="switch-enabled" />
          </div>

          <Button onClick={() => saveMandate.mutate()} disabled={saveMandate.isPending} data-testid="button-save-mandate">
            {saveMandate.isPending ? "Saving…" : "Save guardrails"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Payees (your whitelist)</CardTitle>
          <CardDescription>
            The agent can only ever draft a payment to an address you saved here. You set who, how much, and
            which asset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {payees.length > 0 && (
            <div className="space-y-2">
              {payees.map((py) => (
                <div key={py.id} className="flex items-center justify-between rounded-md border p-3 text-sm" data-testid={`row-payee-${py.id}`}>
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {py.label}
                      <Badge variant="outline">{py.chain === "stellar" ? "Stellar" : "XRPL"}</Badge>
                      {!py.enabled && <Badge variant="secondary">paused</Badge>}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {py.amount} {py.assetCode} → {py.address.slice(0, 10)}…{py.address.slice(-4)}
                      {py.destinationTag ? ` (tag ${py.destinationTag})` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => { setEditingPayeeId(py.id); setPayeeForm({
                        chain: py.chain, label: py.label, address: py.address,
                        destinationTag: py.destinationTag ?? "", assetCode: py.assetCode,
                        issuer: py.issuer ?? "", amount: String(py.amount), note: py.note ?? "", enabled: py.enabled,
                      }); }}
                      data-testid={`button-edit-payee-${py.id}`}
                    >
                      <PenLine className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deletePayee.mutate(py.id)} data-testid={`button-delete-payee-${py.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-md border border-dashed p-4 space-y-3">
            <p className="text-sm font-medium">{editingPayeeId ? "Edit payee" : "Add a payee"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Network</Label>
                <Select
                  value={payeeForm.chain}
                  onValueChange={(v) => setPayeeForm({ ...payeeForm, chain: v, assetCode: v === "stellar" ? "XLM" : "XRP" })}
                >
                  <SelectTrigger data-testid="select-payee-chain"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xrpl">XRPL (Xaman)</SelectItem>
                    <SelectItem value="stellar">Stellar (Freighter)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Label</Label>
                <Input value={payeeForm.label} onChange={(e) => setPayeeForm({ ...payeeForm, label: e.target.value })} placeholder="e.g. Contractor Jane" data-testid="input-payee-label" />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Recipient address</Label>
                <Input value={payeeForm.address} onChange={(e) => setPayeeForm({ ...payeeForm, address: e.target.value })} placeholder={xrplPayee ? "r…" : "G…"} data-testid="input-payee-address" />
              </div>
              <div className="grid gap-1.5">
                <Label>Asset</Label>
                <Input value={payeeForm.assetCode} onChange={(e) => setPayeeForm({ ...payeeForm, assetCode: e.target.value.toUpperCase() })} placeholder={xrplPayee ? "XRP / RLUSD" : "XLM / USDC"} data-testid="input-payee-asset" />
              </div>
              <div className="grid gap-1.5">
                <Label>Amount (in that asset)</Label>
                <Input type="number" min="0" step="any" value={payeeForm.amount} onChange={(e) => setPayeeForm({ ...payeeForm, amount: e.target.value })} data-testid="input-payee-amount" />
              </div>
              {xrplPayee && (
                <div className="grid gap-1.5">
                  <Label>Destination tag (optional)</Label>
                  <Input value={payeeForm.destinationTag} onChange={(e) => setPayeeForm({ ...payeeForm, destinationTag: e.target.value })} data-testid="input-payee-tag" />
                </div>
              )}
              {issuedToken && (
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label>Token issuer {payeeForm.assetCode.toUpperCase() === "RLUSD" ? "(optional — RLUSD is built in)" : "(required for issued tokens)"}</Label>
                  <Input value={payeeForm.issuer} onChange={(e) => setPayeeForm({ ...payeeForm, issuer: e.target.value })} placeholder={xrplPayee ? "r… issuer" : "G… issuer"} data-testid="input-payee-issuer" />
                </div>
              )}
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Note (optional)</Label>
                <Input value={payeeForm.note} onChange={(e) => setPayeeForm({ ...payeeForm, note: e.target.value })} placeholder="e.g. monthly retainer" data-testid="input-payee-note" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={!!payeeForm.enabled} onCheckedChange={(v) => setPayeeForm({ ...payeeForm, enabled: v })} data-testid="switch-payee-enabled" />
                <span className="text-sm text-muted-foreground">Active (agent will draft this payment)</span>
              </div>
              <div className="flex gap-2">
                {editingPayeeId && (
                  <Button variant="ghost" onClick={() => { setEditingPayeeId(null); setPayeeForm({ ...EMPTY_PAYEE }); }} data-testid="button-cancel-payee">
                    Cancel
                  </Button>
                )}
                <Button onClick={() => savePayee.mutate()} disabled={savePayee.isPending || !payeeForm.label || !payeeForm.address || !payeeForm.amount} data-testid="button-save-payee">
                  {savePayee.isPending ? "Saving…" : editingPayeeId ? "Update payee" : "Add payee"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Proposals</h2>
        <Button
          variant="outline"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          data-testid="button-generate"
        >
          {generate.isPending ? "Thinking…" : "Generate proposals"}
        </Button>
      </div>

      {proposalsQuery.isLoading && <p className="text-muted-foreground">Loading…</p>}

      {!proposalsQuery.isLoading && pending.length === 0 && (
        <p className="text-muted-foreground" data-testid="text-no-pending">
          No pending proposals. Save your guardrails (and any payees), then click “Generate proposals”.
        </p>
      )}

      <div className="space-y-4">
        {pending.map((p) => {
          const isPayment = p.kind === "payment";
          return (
            <Card key={p.id} data-testid={`card-proposal-${p.id}`}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {isPayment && <Send className="h-4 w-4" />}
                  {p.title}
                </CardTitle>
                {(p.fromAsset || p.toAsset) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {p.fromAsset && <Badge variant="outline">From: {p.fromAsset}</Badge>}
                    {p.toAsset && <Badge variant="outline">To: {p.toAsset}</Badge>}
                    {isPayment && p.amount && <Badge>{p.amount} {p.assetCode}</Badge>}
                    {!isPayment && p.amountUsd && <Badge>${Number(p.amountUsd).toLocaleString()}</Badge>}
                    {isPayment && p.chain && <Badge variant="secondary">{p.chain === "stellar" ? "Stellar" : "XRPL"}</Badge>}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{p.rationale}</p>
                {p.kind !== "info" && (
                  <div className="flex gap-2">
                    {isPayment ? (
                      <Button
                        size="sm"
                        onClick={() => signProposal(p)}
                        disabled={signingId === p.id}
                        data-testid={`button-sign-${p.id}`}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        {signingId === p.id ? "Opening your wallet…" : "Review & sign in your wallet"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => decide.mutate({ id: p.id, action: "approve" })}
                        disabled={decide.isPending}
                        data-testid={`button-approve-${p.id}`}
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve (records decision only)
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decide.mutate({ id: p.id, action: "dismiss" })}
                      disabled={decide.isPending}
                      data-testid={`button-dismiss-${p.id}`}
                    >
                      <X className="h-4 w-4 mr-1" /> Dismiss
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {decided.length > 0 && (
        <div className="space-y-2 pt-4">
          <h3 className="text-sm font-semibold text-muted-foreground">History</h3>
          {decided.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border p-3 text-sm"
              data-testid={`row-decided-${p.id}`}
            >
              <span className="min-w-0 truncate">
                {p.title}
                {p.txHash && <span className="text-xs text-muted-foreground ml-2">tx {p.txHash.slice(0, 8)}…</span>}
              </span>
              <Badge variant={p.status === "approved" ? "default" : "secondary"}>{p.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
