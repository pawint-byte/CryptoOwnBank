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
import { ShieldAlert, Sparkles, Lock, Check, X } from "lucide-react";
import type { AgentMandate, AgentProposal } from "@shared/schema";

export default function AgentLab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [riskTolerance, setRiskTolerance] = useState("conservative");
  const [floorUsd, setFloorUsd] = useState("0");
  const [maxMoveUsd, setMaxMoveUsd] = useState("0");
  const [enabled, setEnabled] = useState(false);

  const isAdmin = !!(user as any)?.isAdmin;

  const mandateQuery = useQuery<AgentMandate | null>({
    queryKey: ["/api/agent/mandate"],
    enabled: isAdmin,
  });

  const proposalsQuery = useQuery<AgentProposal[]>({
    queryKey: ["/api/agent/proposals"],
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

  const generate = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/agent/proposals/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/proposals"] });
      toast({ title: "Proposals refreshed", description: "The agent re-read your holdings." });
    },
    onError: (e: any) => toast({ title: "Couldn't generate", description: e?.message, variant: "destructive" }),
  });

  const decide = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "dismiss" }) => {
      const res = await apiRequest("POST", `/api/agent/proposals/${id}/${action}`);
      return res.json();
    },
    onSuccess: (data: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/proposals"] });
      if (vars.action === "approve") {
        toast({ title: "Approval recorded", description: data?.message ?? "Recorded." });
      } else {
        toast({ title: "Dismissed", description: "Proposal removed from your inbox." });
      }
    },
    onError: (e: any) => toast({ title: "Action failed", description: e?.message, variant: "destructive" }),
  });

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

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-agent-lab-title">
          <Sparkles className="h-6 w-6" /> Agent Lab
          <Badge variant="secondary">Hidden prototype</Badge>
        </h1>
        <p className="text-muted-foreground mt-1">
          A private testing ground. The agent reads your holdings and <strong>proposes</strong> moves
          within your guardrails — it never signs and never moves money.
        </p>
      </div>

      <div
        className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
        data-testid="banner-safety"
      >
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
        <p>
          <strong>Nothing here moves funds.</strong> Approving a proposal only records your decision so we
          can test the flow. Real signing happens in your own wallet (Xaman) and is not wired into this
          prototype.
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
          No pending proposals. Save your guardrails, then click “Generate proposals”.
        </p>
      )}

      <div className="space-y-4">
        {pending.map((p) => (
          <Card key={p.id} data-testid={`card-proposal-${p.id}`}>
            <CardHeader>
              <CardTitle className="text-base">{p.title}</CardTitle>
              {(p.fromAsset || p.toAsset) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {p.fromAsset && <Badge variant="outline">From: {p.fromAsset}</Badge>}
                  {p.toAsset && <Badge variant="outline">To: {p.toAsset}</Badge>}
                  {p.amountUsd && <Badge>${Number(p.amountUsd).toLocaleString()}</Badge>}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{p.rationale}</p>
              {p.kind !== "info" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => decide.mutate({ id: p.id, action: "approve" })}
                    disabled={decide.isPending}
                    data-testid={`button-approve-${p.id}`}
                  >
                    <Check className="h-4 w-4 mr-1" /> Approve (records decision only)
                  </Button>
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
        ))}
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
              <span>{p.title}</span>
              <Badge variant={p.status === "approved" ? "default" : "secondary"}>{p.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
