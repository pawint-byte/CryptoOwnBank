import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, AlertCircle, CheckCircle2, Loader2, Lock } from "lucide-react";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; capsule: string; beneficiaryName: string; ownerName: string };

type AttemptState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "success" }
  | { kind: "fail" };

export default function VerifyPassphrase() {
  const params = useParams<{ token?: string }>();
  const token = params.token || new URLSearchParams(window.location.search).get("token") || "";
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [passphrase, setPassphrase] = useState("");
  const [attempt, setAttempt] = useState<AttemptState>({ kind: "idle" });

  useEffect(() => {
    if (!token) {
      setLoad({ kind: "error", message: "No verification token in the link." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/legacy-plan/passphrase-verify/${encodeURIComponent(token)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setLoad({ kind: "error", message: data.message || "This verification link is invalid or has expired." });
          return;
        }
        const data = await res.json();
        setLoad({ kind: "ready", capsule: data.capsule, beneficiaryName: data.beneficiaryName, ownerName: data.ownerName });
      } catch {
        setLoad({ kind: "error", message: "Couldn't load the verification page. Please try again." });
      }
    })();
  }, [token]);

  const handleVerify = async () => {
    if (load.kind !== "ready" || !passphrase) return;
    setAttempt({ kind: "checking" });
    try {
      const raw = Uint8Array.from(atob(load.capsule), c => c.charCodeAt(0));
      const salt = raw.slice(0, 16);
      const iv = raw.slice(16, 28);
      const ciphertext = raw.slice(28);
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
      const text = new TextDecoder().decode(decrypted);
      const ok = text.startsWith("OK:");
      setAttempt({ kind: ok ? "success" : "fail" });
      try {
        await fetch(`/api/legacy-plan/passphrase-verify/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: ok }),
        });
      } catch {}
    } catch {
      setAttempt({ kind: "fail" });
      try {
        await fetch(`/api/legacy-plan/passphrase-verify/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: false }),
        });
      } catch {}
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full" data-testid="card-verify-passphrase">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <CardTitle>Verify Your Passphrase</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {load.kind === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground" data-testid="state-loading">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          )}

          {load.kind === "error" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 flex gap-2" data-testid="state-error">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm">{load.message}</p>
            </div>
          )}

          {load.kind === "ready" && attempt.kind !== "success" && (
            <>
              <p className="text-sm leading-relaxed">
                Hello <strong>{load.beneficiaryName}</strong>. <strong>{load.ownerName}</strong> asked us to confirm that you still remember the passphrase for their CryptoOwnBank Legacy Plan vault.
              </p>
              <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/40 p-3 text-xs leading-relaxed">
                <strong>Privacy:</strong> Your passphrase never leaves this browser. We only check whether it correctly opens a small test capsule, then send <em>pass</em> or <em>fail</em> back — nothing else.
              </div>
              <div className="space-y-2">
                <label htmlFor="passphrase" className="text-sm font-medium flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Enter the passphrase {load.ownerName} shared with you
                </label>
                <Input
                  id="passphrase"
                  type="password"
                  value={passphrase}
                  onChange={(e) => { setPassphrase(e.target.value); if (attempt.kind === "fail") setAttempt({ kind: "idle" }); }}
                  placeholder="Your passphrase"
                  data-testid="input-passphrase"
                  autoFocus
                />
              </div>
              {attempt.kind === "fail" && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex gap-2 text-sm" data-testid="state-fail">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">That passphrase didn't work.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Double-check capitalization and spaces. If you can't find it, please reach out to {load.ownerName} now — we've already let them know this attempt failed.
                    </p>
                  </div>
                </div>
              )}
              <Button
                onClick={handleVerify}
                disabled={!passphrase || attempt.kind === "checking"}
                className="w-full"
                data-testid="button-verify"
              >
                {attempt.kind === "checking" ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking...</>
                ) : (
                  "Verify Passphrase"
                )}
              </Button>
            </>
          )}

          {load.kind === "ready" && attempt.kind === "success" && (
            <div className="text-center space-y-3 py-4" data-testid="state-success">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-semibold">You're all set</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your passphrase works correctly. {load.ownerName} will see this confirmation on their dashboard. You can close this page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
