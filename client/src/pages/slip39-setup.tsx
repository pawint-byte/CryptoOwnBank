import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, KeyRound, Layers, Eye, EyeOff, Copy, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { generateShards, mnemonicToHex } from "@/lib/slip39-client";
import { useToast } from "@/hooks/use-toast";

type Preset = {
  id: string;
  name: string;
  description: string;
  threshold: number;
  total: number;
  labels: string[];
};

const PRESETS: Preset[] = [
  {
    id: "family-3of5",
    name: "Family — 3 of 5",
    description: "Three children, your spouse, and a metal backup. Any 3 reconstruct the seed.",
    threshold: 3,
    total: 5,
    labels: ["Spouse", "Child 1", "Child 2", "Child 3", "Metal backup in safe"],
  },
  {
    id: "spouse-attorney-2of3",
    name: "Spouse + attorney — 2 of 3",
    description: "Spouse, attorney, and metal backup. Any 2 reconstruct the seed.",
    threshold: 2,
    total: 3,
    labels: ["Spouse", "Attorney", "Metal backup in safe"],
  },
  {
    id: "extended-3of7",
    name: "Extended family — 3 of 7",
    description: "Larger trust circle (siblings + adult children + metal). Any 3 reconstruct.",
    threshold: 3,
    total: 7,
    labels: ["Sibling 1", "Sibling 2", "Adult child 1", "Adult child 2", "Adult child 3", "Attorney", "Metal backup"],
  },
];

export default function Slip39SetupPage() {
  const { toast } = useToast();
  const [acknowledged, setAcknowledged] = useState(false);
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [seedInput, setSeedInput] = useState("");
  const [showSeed, setShowSeed] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shares, setShares] = useState<string[] | null>(null);
  const [revealedIdx, setRevealedIdx] = useState<Set<number>>(new Set());

  const preset = PRESETS.find((p) => p.id === presetId)!;

  const handleGenerate = async () => {
    setError(null);
    setShares(null);
    setRevealedIdx(new Set());
    if (!seedInput.trim()) {
      setError("Paste your BIP-39 seed phrase first.");
      return;
    }
    setBusy(true);
    try {
      const hex = mnemonicToHex(seedInput);
      const result = generateShards({
        masterSecretHex: hex,
        passphrase,
        groupThreshold: 1,
        groups: [[preset.threshold, preset.total, preset.name]],
      });
      const flat = result.shards.map((s) => s.mnemonic);
      setShares(flat);
      toast({ title: "Shards generated", description: `${flat.length} SLIP-39 shares created in your browser.` });
      try {
        await fetch("/api/legacy-plan/slip39", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ totalShards: preset.total, threshold: preset.threshold }),
        });
      } catch {}
    } catch (e: any) {
      setError(e?.message || "Failed to generate shards.");
    } finally {
      setBusy(false);
    }
  };

  const toggleReveal = (i: number) => {
    setRevealedIdx((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const copyShare = (i: number, mnemonic: string) => {
    navigator.clipboard.writeText(mnemonic);
    toast({ title: `Shard ${i + 1} copied`, description: `Paste into the printed packet for ${preset.labels[i] || `Holder ${i + 1}`}.` });
  };

  const downloadAll = () => {
    if (!shares) return;
    const lines: string[] = [];
    lines.push("CRYPTOOWNBANK SLIP-39 SHARDS");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Scheme: ${preset.name}`);
    lines.push("");
    lines.push("HANDLING:");
    lines.push("- Print this file, cut the shards apart, distribute one per holder");
    lines.push("- Destroy this digital copy immediately after distribution");
    lines.push("- Never store this file on cloud-synced folders or email");
    lines.push("- Each holder needs ONLY their own shard plus this set's threshold to recover");
    lines.push("");
    shares.forEach((s, i) => {
      lines.push("=".repeat(60));
      lines.push(`SHARD ${i + 1} of ${shares.length}  —  HOLDER: ${preset.labels[i] || `Holder ${i + 1}`}`);
      lines.push("=".repeat(60));
      lines.push(s);
      lines.push("");
    });
    lines.push(`Recovery: combine any ${preset.threshold} of these ${preset.total} shards on cryptoownbank.com/decrypt`);
    if (passphrase) lines.push("This set was generated WITH a passphrase. The same passphrase is required to recover.");
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slip39-shards-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setSeedInput("");
    setPassphrase("");
    setShares(null);
    setRevealedIdx(new Set());
    setError(null);
  };

  return (
    <div className="container max-w-3xl mx-auto py-8 space-y-6 px-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-slip39-title">
            <KeyRound className="h-7 w-7 text-blue-500" /> SLIP-39 Setup (Production)
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Split your real wallet's seed phrase into shards. Everything happens in your browser — your seed never leaves this device.
          </p>
        </div>
        <Link href="/legacy-plan">
          <Button variant="outline" size="sm">Back to Legacy Plan</Button>
        </Link>
      </div>

      <Alert variant="destructive" data-testid="alert-airgap-warning">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Read this before pasting any real seed</AlertTitle>
        <AlertDescription className="text-xs space-y-1">
          <p>
            <strong>Maximum-paranoia path:</strong> use the offline open-source tool at{" "}
            <span className="font-mono">iancoleman.io/slip39</span> (Save Page As → USB → air-gapped laptop). See{" "}
            <Link href="/legacy-plan/learn-slip39" className="underline">the offline guide on our Learn page</Link>.
          </p>
          <p>
            <strong>Convenience path (this page):</strong> the SLIP-39 split runs entirely in your browser using a polyfilled
            version of the audited <span className="font-mono">slip39-js</span> library. No network calls happen during the split,
            and we never see your seed. But your browser, OS, and any extensions are part of the trust boundary. Use this on a
            trusted device, ideally with a fresh browser profile and no extensions.
          </p>
          <p>
            After distributing the shards, <strong>destroy your single-source seed</strong> (or move it to a metal backup that
            counts as one of the shards). The whole point is to remove single points of failure.
          </p>
        </AlertDescription>
      </Alert>

      {!acknowledged ? (
        <Card>
          <CardHeader>
            <CardTitle>Acknowledge before continuing</CardTitle>
            <CardDescription>This is a one-time check. Refresh the page to see it again.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm space-y-2 list-disc ml-5">
              <li>I understand my seed phrase will be processed in this browser.</li>
              <li>I am on a trusted device with no malware and minimal extensions.</li>
              <li>I have a plan to physically distribute the shards (print, write on metal, mail, hand-deliver).</li>
              <li>I will destroy or move my single-source seed once distribution is complete.</li>
              <li>I have read <Link href="/legacy-plan/learn-slip39" className="underline">the SLIP-39 explainer</Link> and used the sandbox at least once.</li>
            </ul>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => setAcknowledged(true)} data-testid="button-acknowledge">I understand — continue</Button>
              <Link href="/legacy-plan/learn-slip39">
                <Button variant="outline">Take me to the sandbox first</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card data-testid="card-preset">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> 1. Pick a split scheme</CardTitle>
              <CardDescription>Same presets as the sandbox — pick the one matching your situation.</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={presetId} onValueChange={setPresetId}>
                {PRESETS.map((p) => (
                  <label
                    key={p.id}
                    htmlFor={`preset-${p.id}`}
                    className="flex items-start gap-3 p-3 rounded-md border hover-elevate cursor-pointer"
                    data-testid={`option-preset-${p.id}`}
                  >
                    <RadioGroupItem value={p.id} id={`preset-${p.id}`} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{p.name}</p>
                        <Badge variant="secondary" className="text-xs">{p.threshold}-of-{p.total}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Holders: {p.labels.map((l) => `[${l}]`).join(" ")}
                      </p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card data-testid="card-seed-input">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> 2. Paste your seed phrase</CardTitle>
              <CardDescription>12, 15, 18, 21, or 24 BIP-39 words. Validated locally.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>BIP-39 seed phrase</Label>
                <div className="relative">
                  <Textarea
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value)}
                    placeholder="word1 word2 word3 ..."
                    rows={3}
                    className={`font-mono text-sm ${showSeed ? "" : "blur-sm focus:blur-none"}`}
                    data-testid="input-seed"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => setShowSeed(!showSeed)}
                    data-testid="button-toggle-seed"
                  >
                    {showSeed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Field is blurred until you click the eye. Nothing is sent over the network.</p>
              </div>

              <div className="space-y-1">
                <Label>Optional SLIP-39 passphrase</Label>
                <div className="relative">
                  <Input
                    type={showPassphrase ? "text" : "password"}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Leave empty for standard recovery"
                    data-testid="input-slip39-passphrase"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                  >
                    {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  If set, the same passphrase will be required at recovery time. This is a 25th-word style protection — easy to forget. For most family setups, leave this blank.
                </p>
              </div>

              {error && (
                <Alert variant="destructive" data-testid="alert-generate-error">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleGenerate} disabled={busy} className="w-full" data-testid="button-generate-shards">
                {busy ? "Splitting in your browser..." : "Generate shards"}
              </Button>
            </CardContent>
          </Card>

          {shares && (
            <Card className="border-green-500" data-testid="card-shards-result">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" /> 3. Your shards
                </CardTitle>
                <CardDescription>
                  {shares.length} shards generated. Any {preset.threshold} of them reconstruct your seed. Click to reveal each, then write/print.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {shares.map((s, i) => {
                  const revealed = revealedIdx.has(i);
                  return (
                    <div key={i} className="rounded-md border p-3 space-y-2" data-testid={`shard-${i}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">Shard {i + 1} of {shares.length}</p>
                          <p className="text-xs text-muted-foreground">For: <strong>{preset.labels[i] || `Holder ${i + 1}`}</strong></p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => toggleReveal(i)} data-testid={`button-reveal-${i}`}>
                            {revealed ? <><EyeOff className="h-3 w-3 mr-1" /> Hide</> : <><Eye className="h-3 w-3 mr-1" /> Reveal</>}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => copyShare(i, s)} data-testid={`button-copy-${i}`}>
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </Button>
                        </div>
                      </div>
                      <div className={`font-mono text-xs p-2 rounded bg-muted/50 break-words ${revealed ? "" : "blur-sm select-none"}`}>
                        {s}
                      </div>
                    </div>
                  );
                })}

                <div className="flex gap-2 pt-2">
                  <Button variant="default" onClick={downloadAll} className="flex-1" data-testid="button-download-all">
                    <Download className="h-4 w-4 mr-2" /> Download all (print + destroy)
                  </Button>
                  <Button variant="outline" onClick={reset} data-testid="button-reset">
                    Start over
                  </Button>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm">Next steps — do these in order</AlertTitle>
                  <AlertDescription className="text-xs space-y-1">
                    <p>1. Print the download or hand-write each shard onto a separate card / metal plate.</p>
                    <p>2. Distribute one shard per holder. Verify each holder can read theirs back.</p>
                    <p>3. Tell each holder where the others are (so survivors can collect the threshold).</p>
                    <p>4. <strong>Delete the downloaded file</strong> and clear your clipboard.</p>
                    <p>5. Move or destroy your single-source seed — its job is done.</p>
                    <p>6. Test recovery on <Link href="/decrypt" className="underline">/decrypt</Link> by entering the threshold of shards. If it returns your original seed, you're set.</p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
