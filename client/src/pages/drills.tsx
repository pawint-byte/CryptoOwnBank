import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useUserData } from "@/hooks/use-user-data";
import { deriveAllAddresses } from "@/lib/multi-chain-derive";
import { validateMnemonic } from "bip39";
import type { Wallet } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck, ShieldAlert, KeyRound, Send, HeartHandshake, CheckCircle2, AlertCircle,
  Loader2, Lock, Eye, EyeOff, RotateCcw, Trophy, Clock, ArrowRight, Wallet as WalletIcon,
} from "lucide-react";

type DrillType = "recovery" | "send" | "inheritance" | "scam";

type DrillResult = {
  drillType: DrillType;
  passedAt: string; // ISO
  detail?: string;
};

const DRILL_META: Record<DrillType, { title: string; icon: typeof KeyRound; accent: string; oneLiner: string }> = {
  recovery: {
    title: "Recovery Drill",
    icon: KeyRound,
    accent: "#00A4E4",
    oneLiner: "Prove the words you wrote down actually rebuild your wallet.",
  },
  send: {
    title: "Send Drill",
    icon: Send,
    accent: "#16a34a",
    oneLiner: "Do one tiny real payment so your first real send isn't the scary one.",
  },
  inheritance: {
    title: "Inheritance Drill",
    icon: HeartHandshake,
    accent: "#7c3aed",
    oneLiner: "Prove the people you've chosen could actually get in.",
  },
  scam: {
    title: "Scam-Resistance Drill",
    icon: ShieldAlert,
    accent: "#dc2626",
    oneLiner: "Spot the tricks scammers use to talk your keys out of you.",
  },
};

const RE_TEST_DAYS = 365;

function latestPass(results: DrillResult[], type: DrillType): DrillResult | undefined {
  return results
    .filter((r) => r.drillType === type)
    .sort((a, b) => b.passedAt.localeCompare(a.passedAt))[0];
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function normalizeAddr(addr: string): string {
  const a = addr.trim();
  return a.startsWith("0x") ? a.toLowerCase() : a;
}

export default function DrillsCenter() {
  const { data: results, save, isLoading } = useUserData<DrillResult[]>("drill_results", []);

  const recordPass = (drillType: DrillType, detail?: string) => {
    const next: DrillResult[] = [
      ...results.filter((r) => r.drillType !== drillType),
      { drillType, passedAt: new Date().toISOString(), detail },
    ];
    save(next);
  };

  const gotoDrill = (t: DrillType) => {
    document.getElementById(`drill-${t}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6" style={{ color: "#00A4E4" }} />
          <h1 className="text-2xl font-bold" data-testid="text-drills-title">Practice Drills</h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Reading that something works is not the same as watching it work with your own hands.
          These are safe, graded practice runs of the things that — done wrong — can lose
          everything. Do each one once, get your green check, and use your wallet with real confidence.
          We'll remind you to run them again once a year.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your readiness…
        </div>
      ) : (
        <>
          <ReadinessSnapshot results={results} onGoto={gotoDrill} />
          <div className="space-y-5">
            <RecoveryDrill latest={latestPass(results, "recovery")} onPass={(d) => recordPass("recovery", d)} />
            <SendDrill latest={latestPass(results, "send")} onPass={(d) => recordPass("send", d)} />
            <InheritanceDrill latest={latestPass(results, "inheritance")} onPass={(d) => recordPass("inheritance", d)} />
            <ScamDrill latest={latestPass(results, "scam")} onPass={(d) => recordPass("scam", d)} />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Readiness snapshot — one private view that rolls up all drills    */
/* ---------------------------------------------------------------- */

const DIMENSIONS: { type: DrillType; short: string; done: string; todo: string }[] = [
  {
    type: "recovery",
    short: "Recovery",
    done: "Your backup is proven to rebuild your wallet.",
    todo: "Prove the words you wrote down really restore your wallet.",
  },
  {
    type: "send",
    short: "Sending",
    done: "You've made a real send and know the safe steps.",
    todo: "Do one tiny real send so the first big one isn't scary.",
  },
  {
    type: "inheritance",
    short: "Inheritance",
    done: "You've confirmed your people could really get in.",
    todo: "Prove the people you've chosen could actually access your crypto.",
  },
  {
    type: "scam",
    short: "Scam defense",
    done: "You can spot the messages built to trick your words out of you.",
    todo: "Learn to recognize the tricks scammers use to steal your keys.",
  },
];

function rowState(latest?: DrillResult): "passed" | "stale" | "todo" {
  if (!latest) return "todo";
  return daysSince(latest.passedAt) >= RE_TEST_DAYS ? "stale" : "passed";
}

function ReadinessSnapshot({ results, onGoto }: { results: DrillResult[]; onGoto: (t: DrillType) => void }) {
  const rows = DIMENSIONS.map((d) => {
    const latest = latestPass(results, d.type);
    return { ...d, latest, state: rowState(latest) };
  });
  const ready = rows.filter((r) => r.state === "passed").length;
  const stale = rows.filter((r) => r.state === "stale").length;
  const proven = rows.filter((r) => r.state !== "todo").length;
  const total = DIMENSIONS.length;
  const pct = (ready / total) * 100;

  let headline: string;
  let sub: string;
  if (ready === total) {
    headline = "You're ready — and current";
    sub = "Every drill is passed and up to date, based on your own check-ins. Nothing to do right now.";
  } else if (proven === total && stale > 0) {
    headline = "A quick refresh is due";
    sub = "You've passed them all before — one or more are a year or more old. Run them again to be sure nothing has drifted.";
  } else if (proven === 0) {
    headline = "Let's get you ready";
    sub = "These short, safe drills cover the things that — done wrong — can lose everything. Start with any one below.";
  } else {
    headline = "You're on your way";
    sub = `${ready} of ${total} done. Knock out the rest whenever you have a few minutes.`;
  }

  const next = rows.find((r) => r.state !== "passed");

  return (
    <Card data-testid="card-readiness">
      <CardContent className="py-6 space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" style={{ color: "#00A4E4" }} />
            <h2 className="text-lg font-semibold" data-testid="text-readiness-headline">{headline}</h2>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-readiness-sub">{sub}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium" data-testid="text-readiness-count">{ready} of {total} ready</span>
            {stale > 0 && (
              <span className="text-amber-700 dark:text-amber-400 inline-flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" /> {stale} due for a re-test
              </span>
            )}
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: "#00A4E4" }} data-testid="bar-readiness" />
          </div>
        </div>

        <div className="divide-y rounded-lg border">
          {rows.map((r) => {
            const meta = DRILL_META[r.type];
            const Icon = meta.icon;
            return (
              <div key={r.type} className="flex items-center gap-3 p-3" data-testid={`readiness-row-${r.type}`}>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.accent}1a` }}>
                  <Icon className="h-4 w-4" style={{ color: meta.accent }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.short}</span>
                    {r.state === "passed" && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />}
                    {r.state === "stale" && <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.state === "todo"
                      ? r.todo
                      : r.state === "stale"
                        ? `Last run ${formatDate(r.latest!.passedAt)} — a year or more ago.`
                        : `${r.done} Last run ${formatDate(r.latest!.passedAt)}.`}
                  </p>
                </div>
                {r.state === "todo" && (
                  <Button size="sm" onClick={() => onGoto(r.type)} data-testid={`button-readiness-do-${r.type}`}>Do this</Button>
                )}
                {r.state === "stale" && (
                  <Button size="sm" variant="outline" onClick={() => onGoto(r.type)} data-testid={`button-readiness-retest-${r.type}`}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Re-test
                  </Button>
                )}
                {r.state === "passed" && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 flex-shrink-0" data-testid={`pill-readiness-${r.type}`}>Ready</span>
                )}
              </div>
            );
          })}
        </div>

        {next && (
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2" data-testid="readiness-next">
            <span className="text-sm min-w-0">
              <span className="text-muted-foreground">Your next step: </span>
              <span className="font-medium">{next.state === "stale" ? `Re-test ${next.short.toLowerCase()}` : next.todo}</span>
            </span>
            <Button size="sm" variant="ghost" className="flex-shrink-0" onClick={() => onGoto(next.type)} data-testid="button-readiness-next">
              {next.state === "stale" ? "Re-test" : "Start"} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground" data-testid="text-readiness-privacy">
          This is just for you. CryptoOwnBank doesn't score, rank, or share your readiness with anyone — there's no leaderboard, and nothing leaves your account.
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- */
/* Shared drill shell                                                */
/* ---------------------------------------------------------------- */

function StatusPill({ latest }: { latest?: DrillResult }) {
  if (!latest) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground" data-testid="pill-status">
        Not done yet
      </span>
    );
  }
  const stale = daysSince(latest.passedAt) >= RE_TEST_DAYS;
  if (stale) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 inline-flex items-center gap-1" data-testid="pill-status">
        <Clock className="h-3 w-3" /> Time to re-test
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 inline-flex items-center gap-1" data-testid="pill-status">
      <CheckCircle2 className="h-3 w-3" /> Passed
    </span>
  );
}

function DrillShell({
  type, latest, children,
}: { type: DrillType; latest?: DrillResult; children: React.ReactNode }) {
  const meta = DRILL_META[type];
  const Icon = meta.icon;
  return (
    <Card id={`drill-${type}`} className="scroll-mt-20" data-testid={`card-drill-${type}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.accent}1a` }}>
              <Icon className="h-5 w-5" style={{ color: meta.accent }} />
            </div>
            <div>
              <CardTitle className="text-lg">{meta.title}</CardTitle>
              <CardDescription className="mt-1">{meta.oneLiner}</CardDescription>
            </div>
          </div>
          <StatusPill latest={latest} />
        </div>
        {latest && (
          <p className="text-xs text-muted-foreground pt-2" data-testid={`text-lastpass-${type}`}>
            Last passed {formatDate(latest.passedAt)}
            {daysSince(latest.passedAt) >= RE_TEST_DAYS && " — over a year ago. Run it again to be sure nothing's drifted."}
          </p>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- */
/* 1. Recovery Drill                                                 */
/* ---------------------------------------------------------------- */

function RecoveryDrill({ latest, onPass }: { latest?: DrillResult; onPass: (detail?: string) => void }) {
  const { data: wallets, isLoading } = useQuery<Wallet[]>({ queryKey: ["/api/wallets"] });
  const [open, setOpen] = useState(false);
  const [walletId, setWalletId] = useState<string>("");
  const [phrase, setPhrase] = useState("");
  const [show, setShow] = useState(false);
  const [result, setResult] = useState<"idle" | "checking" | "pass" | "nomatch" | "invalid">("idle");

  const selectable = (wallets || []).filter((w) => !!w.address);
  const selected = selectable.find((w) => w.id === walletId) || selectable[0];

  const reset = () => { setPhrase(""); setResult("idle"); setShow(false); };

  const check = () => {
    if (!selected) return;
    const words = phrase.trim().replace(/\s+/g, " ").toLowerCase();
    if (!validateMnemonic(words)) { setResult("invalid"); return; }
    setResult("checking");
    setTimeout(() => {
      try {
        const derived = deriveAllAddresses(words);
        const target = normalizeAddr(selected.address);
        const hit = derived.some((d) => normalizeAddr(d.address) === target);
        if (hit) {
          setPhrase("");
          setResult("pass");
          onPass(`Verified backup for ${selected.label || selected.chain}`);
        } else {
          setResult("nomatch");
        }
      } catch {
        setResult("invalid");
      }
    }, 50);
  };

  return (
    <DrillShell type="recovery" latest={latest}>
      {!open ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            The single most common way people lose crypto is discovering — too late — that the words
            they wrote down were wrong, incomplete, or in the wrong order. This drill checks your paper
            backup against your real wallet, <strong>entirely on this device</strong>. We never see, send,
            or save your words.
          </p>
          <Button onClick={() => setOpen(true)} data-testid="button-start-recovery">
            {latest ? "Run it again" : "Start the Recovery Drill"} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/40 p-3 text-xs leading-relaxed flex gap-2" data-testid="notice-recovery-privacy">
            <Lock className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              Your recovery words never leave this device. They are checked right here in your browser and
              cleared the moment this drill finishes. CryptoOwnBank does not — and cannot — store them.
              Make sure no one is watching your screen.
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading your wallets…</div>
          ) : selectable.length === 0 ? (
            <div className="rounded-md border p-4 text-sm space-y-2" data-testid="empty-recovery-wallets">
              <p>You don't have a wallet saved here yet, so there's nothing to check your words against.</p>
              <Link href="/wallet/create"><Button variant="outline" size="sm" data-testid="link-create-wallet"><WalletIcon className="h-4 w-4 mr-1" /> Create or add a wallet first</Button></Link>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Which wallet are you testing?</label>
                <Select value={selected?.id} onValueChange={setWalletId}>
                  <SelectTrigger data-testid="select-recovery-wallet"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {selectable.map((w) => (
                      <SelectItem key={w.id} value={w.id} data-testid={`option-wallet-${w.id}`}>
                        {(w.label || w.chain)} — {w.address.slice(0, 8)}…{w.address.slice(-6)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Type your recovery words from your paper backup</label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShow((s) => !s)} data-testid="button-toggle-phrase">
                    {show ? <><EyeOff className="h-3.5 w-3.5 mr-1" /> Hide</> : <><Eye className="h-3.5 w-3.5 mr-1" /> Show</>}
                  </Button>
                </div>
                <Textarea
                  value={phrase}
                  onChange={(e) => { setPhrase(e.target.value); if (result !== "idle" && result !== "checking") setResult("idle"); }}
                  placeholder="Enter your 12 or 24 words, separated by spaces"
                  rows={3}
                  className={show ? "" : "[-webkit-text-security:disc] [text-security:disc]"}
                  data-testid="input-recovery-phrase"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">Type them from your written-down copy — not from memory. That's the whole point: we're testing the paper.</p>
              </div>

              {result === "invalid" && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex gap-2 text-sm" data-testid="result-recovery-invalid">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span>Those don't look like a complete set of valid recovery words. Check the spelling and that you've entered all 12 (or 24) words.</span>
                </div>
              )}
              {result === "nomatch" && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex gap-2 text-sm" data-testid="result-recovery-nomatch">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">These words didn't rebuild this address.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Don't panic — this is exactly what the drill is for. A few things to check: typos or the
                      word order; whether you picked the right wallet above; or, if this wallet was imported from
                      a hardware device or another app, it may use a different (non-standard) derivation path — in
                      that case confirm the words directly in that wallet app instead. Only if your backup genuinely
                      doesn't restore anywhere should you move funds to a fresh wallet.
                    </p>
                  </div>
                </div>
              )}
              {result === "pass" && (
                <div className="rounded-md border border-green-400/50 bg-green-50 dark:bg-green-950/20 p-4 text-center space-y-2" data-testid="result-recovery-pass">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto" />
                  <p className="font-semibold">Your backup works.</p>
                  <p className="text-sm text-muted-foreground">Those words rebuild this exact wallet. If you ever lose every device, this paper gets you back in. Store it somewhere safe and you're done.</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {result !== "pass" ? (
                  <Button onClick={check} disabled={!phrase.trim() || result === "checking"} data-testid="button-check-recovery">
                    {result === "checking" ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Checking…</> : <><ShieldCheck className="h-4 w-4 mr-1" /> Check my backup</>}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => { reset(); }} data-testid="button-recovery-again"><RotateCcw className="h-4 w-4 mr-1" /> Check another wallet</Button>
                )}
                <Button variant="ghost" onClick={() => { reset(); setOpen(false); }} data-testid="button-recovery-close">Close</Button>
              </div>
            </>
          )}
        </div>
      )}
    </DrillShell>
  );
}

/* ---------------------------------------------------------------- */
/* 2. Send Drill                                                     */
/* ---------------------------------------------------------------- */

const SEND_CHECKS = [
  "I checked the receiving address character-by-character against where it came from.",
  "I started with a tiny test amount — not my whole balance.",
  "I understand a sent payment is final: no one, not CryptoOwnBank or the network, can reverse it.",
  "I sent the test and watched it arrive at the destination.",
];

function SendDrill({ latest, onPass }: { latest?: DrillResult; onPass: (detail?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<boolean[]>([false, false, false, false]);
  const [done, setDone] = useState(false);

  const allChecked = checked.every(Boolean);
  const toggle = (i: number) => setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)));

  const finish = () => { setDone(true); onPass("Completed a real test send"); };

  return (
    <DrillShell type="send" latest={latest}>
      {!open ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            The first time you send crypto shouldn't be when it's a large amount and you're nervous.
            In this drill you'll send one tiny real payment — to your own second address, or to a friend
            who'll send it back — and watch it land. After that, sending is just a thing you've done.
          </p>
          <Button onClick={() => setOpen(true)} data-testid="button-start-send">
            {latest ? "Run it again" : "Start the Send Drill"} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      ) : done ? (
        <div className="rounded-md border border-green-400/50 bg-green-50 dark:bg-green-950/20 p-4 text-center space-y-2" data-testid="result-send-pass">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto" />
          <p className="font-semibold">You've sent crypto.</p>
          <p className="text-sm text-muted-foreground">The scary first time is behind you. The motion is the same for any amount — verify the address, start small if unsure, confirm.</p>
          <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setDone(false); setChecked([false, false, false, false]); }} data-testid="button-send-close">Close</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border p-3 text-sm leading-relaxed space-y-2" data-testid="send-instructions">
            <p className="font-medium">How to do it</p>
            <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>Open the Send page and pick a wallet with a small balance.</li>
              <li>Send a tiny amount (enough to cover the small network fee) to an address you control — a second wallet of your own works best.</li>
              <li>Watch it arrive. On XRP and Stellar this takes a few seconds.</li>
            </ol>
            <Link href="/ownbank/send"><Button variant="outline" size="sm" className="mt-1" data-testid="link-open-send"><Send className="h-4 w-4 mr-1" /> Open the Send page</Button></Link>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-medium">Confirm each step as you go</p>
            {SEND_CHECKS.map((label, i) => (
              <label key={i} className="flex items-start gap-2.5 text-sm cursor-pointer" data-testid={`check-send-${i}`}>
                <Checkbox checked={checked[i]} onCheckedChange={() => toggle(i)} className="mt-0.5" />
                <span className="text-muted-foreground">{label}</span>
              </label>
            ))}
          </div>

          <p className="text-xs text-muted-foreground italic">This one's on your honor — your wallet stays private, so we can't see the send from here. The value is real all the same: you've done it once.</p>

          <div className="flex flex-wrap gap-2">
            <Button onClick={finish} disabled={!allChecked} data-testid="button-finish-send"><CheckCircle2 className="h-4 w-4 mr-1" /> I did it — mark passed</Button>
            <Button variant="ghost" onClick={() => setOpen(false)} data-testid="button-send-cancel">Close</Button>
          </div>
        </div>
      )}
    </DrillShell>
  );
}

/* ---------------------------------------------------------------- */
/* 3. Inheritance Drill                                              */
/* ---------------------------------------------------------------- */

type LegacyLite = {
  plan: { id: string } | null;
  beneficiaries: Array<{ id: string; name: string; encryptedVault: string | null }>;
};

function InheritanceDrill({ latest, onPass }: { latest?: DrillResult; onPass: (detail?: string) => void }) {
  const { data, isLoading, isError, error } = useQuery<LegacyLite>({ queryKey: ["/api/legacy-plan"] });
  const [open, setOpen] = useState(false);
  const [reviewedDoc, setReviewedDoc] = useState(false);
  const [verified, setVerified] = useState(false);
  const [done, setDone] = useState(false);

  const forbidden = isError && /^403/.test((error as Error)?.message || "");
  const testable = (data?.beneficiaries || []).filter((b) => !!b.encryptedVault);

  const testLink = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/legacy-beneficiaries/${id}/generate-test-verification-link`, {}),
    onSuccess: async (res) => {
      const body = await res.json().catch(() => ({} as any));
      if (body?.verifyUrl) window.open(body.verifyUrl, "_blank", "noopener");
    },
  });

  const finish = () => { setDone(true); onPass("Tested beneficiary access and reviewed survivor document"); };

  return (
    <DrillShell type="inheritance" latest={latest}>
      {!open ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            A Legacy Plan only works if the people you've chosen can truly get in when it matters. This
            drill lets you stand in their shoes: test that the passphrase actually unlocks the vault, and
            read the exact document they'd receive — so there are no surprises later.
          </p>
          <Button onClick={() => setOpen(true)} data-testid="button-start-inheritance">
            {latest ? "Run it again" : "Start the Inheritance Drill"} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      ) : done ? (
        <div className="rounded-md border border-green-400/50 bg-green-50 dark:bg-green-950/20 p-4 text-center space-y-2" data-testid="result-inheritance-pass">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto" />
          <p className="font-semibold">Your plan holds up.</p>
          <p className="text-sm text-muted-foreground">You've seen for yourself that the passphrase opens the vault and what your people would receive. Re-run this once a year, especially after any change.</p>
          <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setDone(false); setReviewedDoc(false); setVerified(false); }} data-testid="button-inheritance-close">Close</Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading your plan…</div>
      ) : forbidden ? (
        <div className="rounded-md border p-4 text-sm space-y-2" data-testid="forbidden-inheritance">
          <p>The Legacy Plan is part of the Pro plan (or the standalone Legacy add-on). Once you have it, set up the people you trust — then come back here to drill it and prove they could really get in.</p>
          <Link href="/pricing"><Button variant="outline" size="sm" data-testid="link-pricing-inheritance"><ArrowRight className="h-4 w-4 mr-1" /> See plans</Button></Link>
        </div>
      ) : !data?.plan || testable.length === 0 ? (
        <div className="rounded-md border p-4 text-sm space-y-2" data-testid="empty-inheritance">
          <p>
            {!data?.plan
              ? "You don't have a Legacy Plan set up yet."
              : "Your Legacy Plan doesn't have a beneficiary with an encrypted vault yet, so there's nothing to test."}
          </p>
          <Link href="/legacy-plan"><Button variant="outline" size="sm" data-testid="link-legacy-plan"><HeartHandshake className="h-4 w-4 mr-1" /> Open Legacy Plan</Button></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Step 1: passphrase test */}
          <div className="rounded-md border p-3 space-y-2" data-testid="step-passphrase-test">
            <p className="text-sm font-medium">1. Test the passphrase actually unlocks the vault</p>
            <p className="text-xs text-muted-foreground">This opens a private dry-run page in a new tab. Enter the passphrase you set — if it shows "You're all set", it works. This is a test run; nobody is notified and your readiness score is untouched.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {testable.map((b) => (
                <Button key={b.id} variant="outline" size="sm" onClick={() => testLink.mutate(b.id)} disabled={testLink.isPending} data-testid={`button-test-beneficiary-${b.id}`}>
                  {testLink.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Lock className="h-4 w-4 mr-1" />} Test {b.name}'s access
                </Button>
              ))}
            </div>
            <label className="flex items-start gap-2.5 text-sm cursor-pointer pt-1" data-testid="check-verified">
              <Checkbox checked={verified} onCheckedChange={() => setVerified((v) => !v)} className="mt-0.5" />
              <span className="text-muted-foreground">The dry-run page confirmed the passphrase works ("You're all set").</span>
            </label>
          </div>

          {/* Step 2: review survivor doc */}
          <div className="rounded-md border p-3 space-y-2" data-testid="step-review-doc">
            <p className="text-sm font-medium">2. Read what your people would actually receive</p>
            <p className="text-xs text-muted-foreground">Open the survivor document — the same one your beneficiaries get. Make sure the instructions are clear and the wallet details are current.</p>
            <a href="/api/legacy-plan/export?audience=survivor" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" data-testid="link-survivor-doc"><ArrowRight className="h-4 w-4 mr-1" /> Open the survivor document</Button>
            </a>
            <label className="flex items-start gap-2.5 text-sm cursor-pointer pt-1" data-testid="check-reviewed-doc">
              <Checkbox checked={reviewedDoc} onCheckedChange={() => setReviewedDoc((v) => !v)} className="mt-0.5" />
              <span className="text-muted-foreground">I opened it and the instructions are clear and up to date.</span>
            </label>
          </div>

          <p className="text-xs text-muted-foreground italic">The dry-run page shows you the real pass-or-fail with your own eyes; this drill records what you confirmed there. We keep that result private to you.</p>

          <div className="flex flex-wrap gap-2">
            <Button onClick={finish} disabled={!verified || !reviewedDoc} data-testid="button-finish-inheritance"><CheckCircle2 className="h-4 w-4 mr-1" /> Mark passed</Button>
            <Button variant="ghost" onClick={() => setOpen(false)} data-testid="button-inheritance-cancel">Close</Button>
          </div>
        </div>
      )}
    </DrillShell>
  );
}

/* ---------------------------------------------------------------- */
/* 4. Scam-Resistance Drill                                          */
/* ---------------------------------------------------------------- */

type ScamScenario = {
  prompt: string;
  options: { text: string; safe: boolean; why: string }[];
};

const SCAM_SCENARIOS: ScamScenario[] = [
  {
    prompt: "A message from “CryptoOwnBank Support” says there’s a problem with your account and asks you to confirm your recovery words so they can restore it. What do you do?",
    options: [
      { text: "Send the words — it’s official support.", safe: false, why: "No real support — not ours, not any wallet’s — can ever ask for your recovery words. Anyone who does is trying to rob you." },
      { text: "Don’t share them. Real support never needs your recovery words.", safe: true, why: "Exactly. Your recovery words are the keys to everything. We can’t see them and would never ask — and neither would any honest company." },
      { text: "Send just the first few words to be safe.", safe: false, why: "Even part of your phrase is dangerous, and a real company would never ask for any of it. Share nothing." },
    ],
  },
  {
    prompt: "You get a message with a link to “claim a free airdrop — ends in 10 minutes!” The site asks you to enter your recovery phrase to connect. What’s the safe move?",
    options: [
      { text: "Enter the phrase fast before the offer ends.", safe: false, why: "The countdown is the trick — urgency is designed to stop you thinking. A real site never needs your recovery phrase." },
      { text: "Close it. No legitimate site ever asks for your recovery phrase.", safe: true, why: "Right. Connecting a wallet never means typing your secret phrase into a website. Pressure plus “enter your phrase” equals a scam, every time." },
      { text: "Enter a fake phrase to test if it’s real.", safe: false, why: "Don’t engage at all — just close it. There’s nothing to test; the ask itself is the red flag." },
    ],
  },
  {
    prompt: "Someone calls saying they’re from your wallet provider, that your funds are “at risk,” and they need the one-time code that was just sent to you. What do you do?",
    options: [
      { text: "Read them the code so they can secure your account.", safe: false, why: "A one-time code is for you alone. Anyone asking you to read it out is trying to get into your account right now." },
      { text: "Hang up. No one legitimate asks for your one-time codes.", safe: true, why: "Correct. Hang up — and if you’re unsure, reach out through the official app yourself, never a number or link someone sent you." },
    ],
  },
  {
    prompt: "What’s the only place your recovery words should ever be typed?",
    options: [
      { text: "Into your own wallet app, on your own device, when restoring — and nowhere else, to no one.", safe: true, why: "That’s the rule. Your words go into your own wallet to restore it — never into a chat, a call, an email, or a website." },
      { text: "Into an official-looking support chat when they ask.", safe: false, why: "No support chat ever needs them. “Official-looking” is exactly what a convincing scam is built to be." },
      { text: "Into a site that offers to “check if your wallet is safe.”", safe: false, why: "That “safety check” is the theft. A site that wants your phrase is the danger, not the cure." },
    ],
  },
];

function ScamDrill({ latest, onPass }: { latest?: DrillResult; onPass: (detail?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const scenario = SCAM_SCENARIOS[step];
  const isLast = step === SCAM_SCENARIOS.length - 1;
  const chosen = picked !== null ? scenario.options[picked] : null;
  const correct = chosen?.safe === true;

  const restart = () => { setStep(0); setPicked(null); setDone(false); };

  const next = () => {
    if (isLast) {
      setDone(true);
      onPass(`Handled all ${SCAM_SCENARIOS.length} scam scenarios safely`);
    } else {
      setStep((s) => s + 1);
      setPicked(null);
    }
  };

  return (
    <DrillShell type="scam" latest={latest}>
      {!open ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Most stolen crypto isn’t taken by breaking the math — it’s talked out of people. A friendly
            “support agent,” an urgent warning, a too-good airdrop. This drill walks you through the exact
            tricks scammers use, so you recognize them instantly and never hand over the one thing that matters.
          </p>
          <Button onClick={() => { setOpen(true); restart(); }} data-testid="button-start-scam">
            {latest ? "Run it again" : "Start the Scam-Resistance Drill"} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      ) : done ? (
        <div className="rounded-md border border-green-400/50 bg-green-50 dark:bg-green-950/20 p-4 text-center space-y-2" data-testid="result-scam-pass">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto" />
          <p className="font-semibold">You can spot the trap.</p>
          <p className="text-sm text-muted-foreground">
            You handled every scenario the safe way. The one rule under all of them: your recovery words and
            one-time codes go to no one, ever — no matter how official, urgent, or friendly the ask.
          </p>
          <Button variant="ghost" size="sm" onClick={() => { setOpen(false); restart(); }} data-testid="button-scam-close">Close</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span data-testid="text-scam-step">Scenario {step + 1} of {SCAM_SCENARIOS.length}</span>
            <span>Pick the safe response</span>
          </div>

          <div className="rounded-md border p-3 text-sm leading-relaxed" data-testid="text-scam-prompt">{scenario.prompt}</div>

          <div className="space-y-2">
            {scenario.options.map((opt, i) => {
              const isPicked = picked === i;
              const tone = isPicked
                ? (opt.safe ? "border-green-500/60 bg-green-50 dark:bg-green-950/20" : "border-destructive/50 bg-destructive/5")
                : "hover:bg-muted/50";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPicked(i)}
                  disabled={correct}
                  className={`w-full text-left rounded-md border p-3 text-sm transition-colors ${tone} ${correct && !isPicked ? "opacity-50" : ""}`}
                  data-testid={`option-scam-${step}-${i}`}
                >
                  <div className="flex items-start gap-2">
                    {isPicked
                      ? (opt.safe
                        ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        : <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />)
                      : <span className="h-4 w-4 rounded-full border flex-shrink-0 mt-0.5" />}
                    <span>{opt.text}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {chosen && (
            <div className={`rounded-md border p-3 text-sm flex gap-2 ${correct ? "border-green-500/50 bg-green-50 dark:bg-green-950/20" : "border-amber-400/50 bg-amber-50 dark:bg-amber-950/20"}`} data-testid="feedback-scam">
              {correct
                ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />}
              <div>
                <p className="font-medium">{correct ? "Safe choice." : "Not this one — here’s why."}</p>
                <p className="text-muted-foreground text-xs mt-1">{chosen.why}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {correct ? (
              <Button onClick={next} data-testid="button-scam-next">
                {isLast ? <><CheckCircle2 className="h-4 w-4 mr-1" /> Finish — mark passed</> : <>Next scenario <ArrowRight className="h-4 w-4 ml-1" /></>}
              </Button>
            ) : chosen ? (
              <Button variant="outline" onClick={() => setPicked(null)} data-testid="button-scam-retry"><RotateCcw className="h-4 w-4 mr-1" /> Try again</Button>
            ) : null}
            <Button variant="ghost" onClick={() => { setOpen(false); restart(); }} data-testid="button-scam-cancel">Close</Button>
          </div>
        </div>
      )}
    </DrillShell>
  );
}
