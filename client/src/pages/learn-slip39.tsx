import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Shield, BookOpen, FlaskConical, Sparkles, AlertTriangle, CheckCircle2,
  XCircle, RefreshCw, ArrowRight, Copy, Info, Users, KeyRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type GroupSpec = { label: string; memberThreshold: number; memberCount: number };
type Preset = { id: string; name: string; tagline: string; groupThreshold: number; groups: GroupSpec[] };

const PRESETS: Preset[] = [
  {
    id: "3-of-5-family",
    name: "Family of 3 children (3-of-5, recommended)",
    tagline: "Vault holds 1 shard, each of 3 children holds 1, you keep 1 on metal. Any 3 reconstruct.",
    groupThreshold: 3,
    groups: [
      { label: "CryptoOwnBank vault", memberThreshold: 1, memberCount: 1 },
      { label: "Child 1", memberThreshold: 1, memberCount: 1 },
      { label: "Child 2", memberThreshold: 1, memberCount: 1 },
      { label: "Child 3", memberThreshold: 1, memberCount: 1 },
      { label: "You (metal backup)", memberThreshold: 1, memberCount: 1 },
    ],
  },
  {
    id: "2-of-3-spouse",
    name: "Spouse + attorney (2-of-3)",
    tagline: "Vault, spouse, and attorney each hold 1 shard. Any 2 reconstruct. Simpler, less fault-tolerant.",
    groupThreshold: 2,
    groups: [
      { label: "CryptoOwnBank vault", memberThreshold: 1, memberCount: 1 },
      { label: "Spouse", memberThreshold: 1, memberCount: 1 },
      { label: "Attorney", memberThreshold: 1, memberCount: 1 },
    ],
  },
  {
    id: "3-of-7-extended",
    name: "Extended family (3-of-7)",
    tagline: "Distribute across many heirs. Up to 4 shards can be lost before recovery is impossible.",
    groupThreshold: 3,
    groups: [
      { label: "CryptoOwnBank vault", memberThreshold: 1, memberCount: 1 },
      { label: "Heir 1", memberThreshold: 1, memberCount: 1 },
      { label: "Heir 2", memberThreshold: 1, memberCount: 1 },
      { label: "Heir 3", memberThreshold: 1, memberCount: 1 },
      { label: "Heir 4", memberThreshold: 1, memberCount: 1 },
      { label: "Heir 5", memberThreshold: 1, memberCount: 1 },
      { label: "Attorney safe", memberThreshold: 1, memberCount: 1 },
    ],
  },
];

type GenerateResponse = {
  ok: true;
  testMnemonic: string;
  wordCount: 12 | 24;
  groupThreshold: number;
  groups: { label: string; memberThreshold: number; memberCount: number; groupIndex: number }[];
  shards: { groupIndex: number; groupLabel: string; memberIndex: number; mnemonic: string }[];
  notice: string;
};

type RecoverResponse =
  | { ok: true; recoveredEntropyHex: string; recoveredMnemonic: string | null; shardsUsed: number; notice: string }
  | { ok: false; message: string };

export default function LearnSlip39() {
  const { toast } = useToast();
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id);
  const [wordCount, setWordCount] = useState<12 | 24>(24);
  const [generated, setGenerated] = useState<GenerateResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedShards, setSelectedShards] = useState<number[]>([]);
  const [extraShard, setExtraShard] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoverResult, setRecoverResult] = useState<RecoverResponse | null>(null);

  const preset = useMemo(() => PRESETS.find(p => p.id === presetId)!, [presetId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setSelectedShards([]);
    setRecoverResult(null);
    setExtraShard("");
    try {
      const res = await fetch("/api/slip39/sandbox/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          wordCount,
          groupThreshold: preset.groupThreshold,
          groups: preset.groups,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      setGenerated(json);
      toast({ title: "Sandbox shards generated", description: `${json.shards.length} shards from a fresh test phrase. No real wallet involved.` });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const toggleShard = (idx: number) => {
    setRecoverResult(null);
    setSelectedShards(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  const handleRecover = async () => {
    if (!generated) return;
    setRecovering(true);
    setRecoverResult(null);
    try {
      const shardsToUse = selectedShards.map(i => generated.shards[i].mnemonic);
      if (extraShard.trim()) shardsToUse.push(extraShard.trim());
      const res = await fetch("/api/slip39/sandbox/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ shards: shardsToUse }),
      });
      const json = await res.json();
      setRecoverResult(json);
    } catch (e: any) {
      setRecoverResult({ ok: false, message: e.message || "Network error" });
    } finally {
      setRecovering(false);
    }
  };

  const copyShard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast({ title: "Copied" }); } catch {}
  };

  const matched = recoverResult?.ok && generated && recoverResult.recoveredMnemonic === generated.testMnemonic;

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Learn SLIP-39 (Hands-On)</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            A safe, interactive sandbox to understand how Shamir's Secret Sharing works before you ever
            consider using it on a real wallet. Every seed phrase on this page is generated fresh by the
            sandbox and controls no real money.
          </p>
        </div>
        <Link href="/legacy-plan">
          <Button variant="outline" data-testid="link-back-to-legacy">Back to Legacy Plan</Button>
        </Link>
      </div>

      <Alert className="border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle>This is a learning sandbox. Use test data only.</AlertTitle>
        <AlertDescription>
          Never paste your real 12 or 24-word recovery phrase here. The Generate button below creates a
          brand-new fake phrase that controls nothing. When the real CryptoOwnBank SLIP-39 setup ships, it
          will run entirely in your browser with no network calls. This sandbox uses the server only because
          there is no real secret to protect.
        </AlertDescription>
      </Alert>

      <Card data-testid="card-explainer">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle>What is SLIP-39, in plain language?</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="kid">
            <AccordionItem value="kid">
              <AccordionTrigger data-testid="accordion-kid">Explain it to me like I'm in fifth grade</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>
                  Imagine your crypto is treasure inside a chest, and the chest only opens with a long
                  password (we call it a seed phrase — usually 24 words). If you write the password on
                  one piece of paper and lose it, the treasure is gone forever. If you give the whole
                  password to one person, they could take everything. Both options are scary.
                </p>
                <p>
                  SLIP-39 is a magic puzzle box. It takes your one password and turns it into, say, five
                  puzzle pieces (we call them <strong>shards</strong>). The rule is: any three of those
                  five pieces, put together, rebuild the password. Any two pieces? They show nothing —
                  not even a hint. It's like invisible ink that only appears when enough pieces meet.
                </p>
                <p>
                  Now you can give one piece to each kid, keep one yourself on a metal plate, and let
                  CryptoOwnBank hold one (released only after you pass away). If one kid loses their
                  piece, the other two kids plus the platform piece still make three. The treasure is
                  safe even when life gets messy.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="tech">
              <AccordionTrigger data-testid="accordion-tech">Explain it with the proper technical terms</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>
                  <strong>SLIP-39</strong> (Satoshi Labs Improvement Proposal 39) is an open standard from
                  the Trezor team. It takes a BIP-39 seed and splits it using <strong>Shamir's Secret
                  Sharing (SSS)</strong>, an information-theoretic scheme by Adi Shamir (1979).
                </p>
                <p>
                  The original entropy is encoded as the constant term of a random polynomial of degree
                  M-1 over a finite field. The algorithm evaluates the polynomial at N distinct points to
                  produce <strong>N shards</strong>. Lagrange interpolation across any M points
                  reconstructs the polynomial — and therefore the original secret. Fewer than M points
                  yield zero information about the constant term: the remaining brute-force space is
                  identical to the full secret space.
                </p>
                <p>
                  Each SLIP-39 shard is encoded as a 20-word mnemonic from a specialized 1024-word list
                  (different from the BIP-39 list). Shards include checksums, identifier metadata, and
                  group/member indices so combining tools can validate consistency.
                </p>
                <p>
                  Compared to a naive word split (giving each party a slice of the original BIP-39 words):
                  SSS is fault-tolerant (you can lose up to N-M shards), entropy-preserving (no leak from
                  partial knowledge), and tamper-evident (mismatched shards from different splits won't
                  combine).
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="how-fits">
              <AccordionTrigger data-testid="accordion-how-fits">How will this fit into my Legacy Plan?</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>
                  When the real feature ships, you'll generate the split client-side in your browser
                  (nothing sent to us in plaintext). One shard goes into your CryptoOwnBank encrypted
                  vault, released only after the dead-man switch fires. The other shards go into each
                  beneficiary's encrypted packet alongside the recovery instructions you already write.
                  You can also keep a physical shard yourself on a metal plate.
                </p>
                <p>
                  After the trigger, beneficiaries each receive their packet by email, decrypt with the
                  passphrase you shared with them out-of-band, and meet to combine M shards. The platform
                  never sees the reconstructed seed — the combination happens in their browser, on the
                  recovery page.
                </p>
                <p>
                  The encrypted vault stays the recovery <em>map</em> first and foremost (which wallets
                  exist, what's in them, where the hardware lives). SLIP-39 is layered on top for any
                  wallet whose balance justifies the extra ceremony.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card data-testid="card-step1">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Step 1 — Pick a preset and generate test shards</CardTitle>
          </div>
          <CardDescription>
            The sandbox will create a fresh fake 24-word seed and split it according to the preset you choose.
            Nothing here touches real money.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preset</Label>
              <Select value={presetId} onValueChange={setPresetId}>
                <SelectTrigger data-testid="select-preset"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESETS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{preset.tagline}</p>
            </div>
            <div className="space-y-2">
              <Label>Test seed length</Label>
              <Select value={String(wordCount)} onValueChange={(v) => setWordCount(Number(v) === 12 ? 12 : 24)}>
                <SelectTrigger data-testid="select-word-count"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 words (most secure)</SelectItem>
                  <SelectItem value="12">12 words</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Most hardware wallets default to 24.</p>
            </div>
          </div>

          <div className="rounded-md border p-3 bg-muted/30 text-sm">
            <p className="font-medium mb-2 flex items-center gap-2"><Users className="h-4 w-4" /> Shards this preset will produce:</p>
            <ul className="space-y-1 ml-6 list-disc">
              {preset.groups.map((g, i) => (
                <li key={i}>{g.label}</li>
              ))}
            </ul>
            <p className="mt-2 text-muted-foreground">
              Threshold: <strong>{preset.groupThreshold} of {preset.groups.length}</strong> shards required to recover.
            </p>
          </div>

          <Button onClick={handleGenerate} disabled={generating} data-testid="button-generate">
            {generating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate fresh test shards
          </Button>
        </CardContent>
      </Card>

      {generated && (
        <>
          <Card data-testid="card-shards">
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <CardTitle>Step 2 — Your sandbox shards</CardTitle>
              </div>
              <CardDescription>
                These {generated.shards.length} shards were generated from a fresh test seed. Tick the boxes to
                pick which ones to combine in Step 3.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Test seed (would normally never be revealed in production):</strong>{" "}
                  <span className="font-mono break-all">{generated.testMnemonic}</span>
                </AlertDescription>
              </Alert>

              <div className="grid gap-3">
                {generated.shards.map((s, i) => (
                  <div key={i} className="rounded-md border p-3 space-y-2" data-testid={`shard-card-${i}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`shard-${i}`}
                          checked={selectedShards.includes(i)}
                          onCheckedChange={() => toggleShard(i)}
                          data-testid={`checkbox-shard-${i}`}
                        />
                        <Label htmlFor={`shard-${i}`} className="cursor-pointer">
                          <Badge variant="outline" className="mr-2">Shard {i + 1}</Badge>
                          {s.groupLabel}
                        </Label>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => copyShard(s.mnemonic)} data-testid={`button-copy-${i}`}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="font-mono text-xs break-all bg-muted/50 p-2 rounded">{s.mnemonic}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-recover">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                <CardTitle>Step 3 — Try to recover</CardTitle>
              </div>
              <CardDescription>
                Tick {generated.groupThreshold} or more shards above and click Combine. Then try again with
                fewer shards to see how recovery fails. (Optional: paste a mistyped shard below to see how it
                rejects bad input.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-1">
                <p>You have selected <strong>{selectedShards.length}</strong> of <strong>{generated.shards.length}</strong> shards.</p>
                <p className="text-muted-foreground text-xs">
                  Threshold to recover: {generated.groupThreshold}.
                  {selectedShards.length < generated.groupThreshold && " Recovery will fail until you select enough."}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Optional: paste an extra shard manually (e.g. one mistyped word to see it fail)</Label>
                <Textarea
                  value={extraShard}
                  onChange={(e) => setExtraShard(e.target.value)}
                  placeholder="(leave empty to use only the ticked shards above)"
                  rows={2}
                  className="font-mono text-xs"
                  data-testid="textarea-extra-shard"
                />
              </div>

              <Button onClick={handleRecover} disabled={recovering || (selectedShards.length === 0 && !extraShard.trim())} data-testid="button-recover">
                {recovering ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Combine selected shards
              </Button>

              {recoverResult && recoverResult.ok && (
                <Alert className={matched ? "border-green-500/50 bg-green-500/10" : "border-amber-500/50 bg-amber-500/10"}>
                  {matched ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                  <AlertTitle>{matched ? "Recovered — and it matches the original test seed" : "Recovered something, but it does not match the original seed"}</AlertTitle>
                  <AlertDescription className="space-y-2 text-xs mt-2">
                    <p><strong>Recovered mnemonic:</strong> <span className="font-mono break-all">{recoverResult.recoveredMnemonic || "(not BIP-39 compatible)"}</span></p>
                    <p><strong>Original test seed:</strong> <span className="font-mono break-all">{generated.testMnemonic}</span></p>
                    {!matched && <p className="text-muted-foreground">If you mixed shards from different splits or had a typo in your extra shard, recovery can succeed mathematically but produce a different secret. In a real recovery you'd never see this — you'd only have one set of shards.</p>}
                  </AlertDescription>
                </Alert>
              )}

              {recoverResult && !recoverResult.ok && (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle>Recovery failed (this is the expected result with too few or invalid shards)</AlertTitle>
                  <AlertDescription className="text-xs mt-2">
                    {recoverResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card data-testid="card-cypherock">
        <CardHeader>
          <CardTitle>Already a Cypherock user? You're most of the way there</CardTitle>
          <CardDescription>How SLIP-39 compares to the Cypherock X1 family wallet you may already own.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Cypherock works on a very similar idea: your seed lives split across multiple cards (X1
            cards), and you need a threshold of cards to access funds. If you already use Cypherock and
            it's working for you, the mental jump to SLIP-39 is small. The main differences:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-md border p-3 bg-muted/30">
              <p className="font-medium mb-1">Cypherock X1</p>
              <ul className="list-disc ml-5 text-xs space-y-1 text-muted-foreground">
                <li>Hardware-based: shards live on physical NFC cards plus a USB device</li>
                <li>Fixed 2-of-5 by default (4 cards + 1 main device)</li>
                <li>Self-contained — no software dependency for recovery</li>
                <li>One-time hardware purchase (~$200)</li>
                <li>Best for: self-recovery and small trusted family groups</li>
              </ul>
            </div>
            <div className="rounded-md border p-3 bg-muted/30">
              <p className="font-medium mb-1">SLIP-39 in CryptoOwnBank</p>
              <ul className="list-disc ml-5 text-xs space-y-1 text-muted-foreground">
                <li>Software-based: shards are 20-word mnemonics you can write on cards or metal</li>
                <li>Configurable: any M-of-N up to 16 (3-of-5, 2-of-3, 4-of-7, etc.)</li>
                <li>Built into the dead-man switch — one shard auto-released after trigger</li>
                <li>No extra hardware required</li>
                <li>Best for: inheritance, geographic distribution, mixed-trust groups</li>
              </ul>
            </div>
          </div>
          <p>
            <strong>Honest take:</strong> if Cypherock already covers your use case (you can access
            your own wallet by collecting your cards, and you've handed cards to family for
            inheritance), there's no urgent reason to add SLIP-39 on top. The Legacy Plan vault
            then just needs to tell your beneficiaries <em>where the Cypherock cards are</em> and
            how to use them. SLIP-39 inside CryptoOwnBank becomes useful when (a) you don't want
            to buy more hardware, (b) you want one shard automatically released by the dead-man
            switch, or (c) your trusted parties live in different countries and you'd rather mail
            them a printed mnemonic than a physical NFC card.
          </p>
          <p className="text-xs text-muted-foreground">
            Not yet using Cypherock and curious? It's a solid alternative to the SLIP-39 approach for
            people who prefer hardware over software. We have a referral link on the{" "}
            <Link href="/quick-start" className="underline">Setup Guide</Link>.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-airgap">
        <CardHeader>
          <CardTitle>For the truly air-gapped: do it offline on a disconnected machine</CardTitle>
          <CardDescription>
            When you graduate from this sandbox to your real wallet, here's the maximum-paranoia path.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            We will ship a fully client-side SLIP-39 generator inside CryptoOwnBank — but for users
            who want to never touch the internet during the conversion, the gold standard is the
            community-audited open-source tool by Ian Coleman. It's the same library used by
            hardware wallet researchers and security professionals.
          </p>
          <ol className="list-decimal ml-6 space-y-1 text-xs">
            <li>On any computer, visit <span className="font-mono">https://iancoleman.io/slip39/</span> and use your browser's <em>Save Page As</em> feature.</li>
            <li>Move the saved <span className="font-mono">.html</span> file to a USB stick.</li>
            <li>Take the USB stick to a computer that has never been connected to the internet (an old laptop with WiFi disabled works).</li>
            <li>Open the saved file in the offline browser. The page runs entirely locally — no network calls.</li>
            <li>Enter your real seed phrase, generate the shards, write them down on metal/paper.</li>
            <li>Wipe the temporary computer and the USB stick. Destroy the original single-source seed.</li>
          </ol>
          <p className="text-muted-foreground">
            Source code is auditable on GitHub at iancoleman/slip39. Verifying the saved page's
            checksum against the GitHub release is the strongest possible guarantee that nothing
            was tampered with on the way from the website to your offline machine.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-next">
        <CardHeader>
          <CardTitle>What to try next</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Once the sandbox feels obvious to you, here are the experiments worth running:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Generate the 3-of-5 preset, then try recovering with only 2 shards. Watch it fail clearly.</li>
            <li>Recover with exactly 3 shards (any 3). Watch it succeed.</li>
            <li>Recover with all 5 shards. Watch it still succeed — extra shards are fine.</li>
            <li>Switch to the 2-of-3 preset and feel how much simpler it is.</li>
            <li>Generate a new set, then paste an old shard from the previous set into the extra-shard box. See how mixing splits doesn't work.</li>
          </ul>
          <p className="pt-2 text-muted-foreground">
            The real SLIP-39 setup for your actual wallets isn't built yet — we're shipping it next, with a
            fully client-side flow and an offline-downloadable version for the air-gapped purists. The whole
            point of this sandbox is so you'll already understand exactly what's happening when that lands.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
