import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface StatusResp {
  ownerName: string;
  triggeredAt: string | null;
  notifyStartedAt: string | null;
  confirmStartedAt: string | null;
  objectedAt: string | null;
  objectedBy: string | null;
  releasedAt: string | null;
  windowDays: number;
}

export default function LegacyObjectPage() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, error } = useQuery<StatusResp>({
    queryKey: ["/api/legacy-plan/last-resort-status", token],
    queryFn: async () => {
      const res = await fetch(`/api/legacy-plan/last-resort-status/${token}`);
      if (!res.ok) throw new Error((await res.json()).message || "Token invalid");
      return res.json();
    },
    enabled: !!token,
  });

  const submit = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast({ title: "Email required", description: "Enter the email you were notified at.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await apiRequest("POST", `/api/legacy-plan/last-resort-object/${token}`, { email: email.trim(), reason: reason.trim() });
      setSubmitted(true);
      toast({ title: "Objection recorded", description: "The last-resort release is paused for 90 days." });
    } catch (e: any) {
      toast({ title: "Could not record objection", description: e?.message || "Try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-12">
        <p className="text-muted-foreground">Loading objection page...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container max-w-2xl py-12">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Link invalid or expired</AlertTitle>
          <AlertDescription>This objection link is no longer valid. The last-resort cycle may have completed, been cancelled, or already had an objection recorded.</AlertDescription>
        </Alert>
        <div className="mt-6">
          <Link href="/">
            <Button variant="outline">Back to home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (data.releasedAt) {
    return (
      <div className="container max-w-2xl py-12 space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Vault already released</AlertTitle>
          <AlertDescription>
            The encrypted vault for {data.ownerName}'s Legacy Plan was released on {new Date(data.releasedAt).toLocaleString()}. Objections can no longer be recorded.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (submitted || data.objectedAt) {
    return (
      <div className="container max-w-2xl py-12 space-y-6">
        <Card className="border-green-300 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" /> Objection recorded
            </CardTitle>
            <CardDescription>The last-resort release is paused for 90 days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>The plan holder ({data.ownerName}) and the system have logged your objection. After 90 days, if the situation has not been resolved (e.g. shards reconstructed normally, or the plan holder has reappeared), the cycle will restart and you'll be notified again.</p>
            <p className="text-muted-foreground">If the plan holder is alive and well, please ask them to log into CryptoOwnBank and check in to fully cancel the trigger.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
          Object to Last-Resort Vault Release
        </h1>
        <p className="text-muted-foreground mt-2">
          This is for <strong>{data.ownerName}</strong>'s Legacy Plan on CryptoOwnBank.
        </p>
      </div>

      <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle>What's happening</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>The dead-man-switch on this plan fired more than {data.windowDays} days ago, and the SLIP-39 shard recovery has not been completed. To prevent the funds being lost forever, the system will release the full encrypted vault to all listed beneficiaries — UNLESS someone with standing objects.</p>
          {data.notifyStartedAt && <p>Notification phase opened: <strong>{new Date(data.notifyStartedAt).toLocaleDateString()}</strong></p>}
          {data.confirmStartedAt && <p>Confirmation phase opened: <strong>{new Date(data.confirmStartedAt).toLocaleDateString()}</strong></p>}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Record your objection</CardTitle>
          <CardDescription>This pauses the release for 90 days. The cycle then restarts if nothing else changes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Your email (one we contacted you at)</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              data-testid="input-objector-email"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Reason (optional, helpful for the audit log)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Plan holder is alive and recovering in hospital — will check in soon. Or: family is still gathering shards."
              rows={4}
              maxLength={500}
              data-testid="input-objector-reason"
            />
          </div>
          <Button onClick={submit} disabled={busy} className="w-full" data-testid="button-submit-objection">
            {busy ? "Recording..." : "Record objection — pause release for 90 days"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">When NOT to object</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>- If {data.ownerName} has confirmed died and no shards remain — releasing is the right outcome.</p>
          <p>- If you have no relationship to this plan and don't recognize the name — close this page; do not click anything.</p>
        </CardContent>
      </Card>
    </div>
  );
}
