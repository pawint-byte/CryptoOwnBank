import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeoHead } from "@/components/seo-head";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { UserWallet } from "@shared/schema";
import {
  STAGES,
  STAGE_STATUS_LABELS,
  loadStageStatuses,
  saveStageStatuses,
  loadStageVerified,
  saveStageVerified,
  computeFreshness,
  formatVerifiedDate,
  isStageActive,
  type StageStatus,
  type Freshness,
} from "@/lib/wealth-stages";
import {
  Compass,
  ShieldCheck,
  CheckCircle2,
  CircleDot,
  Circle,
  ExternalLink,
  Info,
  Wallet as WalletIcon,
  KeyRound,
  Landmark,
  ArrowRight,
  Brain,
  LifeBuoy,
  History as HistoryIcon,
  HeartHandshake,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";

/* ---------------- Member callings (archetypes) ---------------- */

interface Calling {
  id: string;
  label: string;
  blurb: string;
  focus: string[]; // stage ids this calling cares about most
}

const CALLINGS: Calling[] = [
  {
    id: "escapee",
    label: "The Escapee",
    blurb: "Just left the bank or exchange. Get secured and documented first.",
    focus: ["secured", "documented"],
  },
  {
    id: "guardian",
    label: "The Guardian",
    blurb: "Protecting what you already hold and keeping the map current.",
    focus: ["secured", "documented", "tested"],
  },
  {
    id: "provider",
    label: "The Provider",
    blurb: "Making sure the next holder can take the seat without you in the room.",
    focus: ["documented", "continuous", "tested"],
  },
  {
    id: "operator",
    label: "The Operator",
    blurb: "Putting holdings to work and reaching liquidity without selling.",
    focus: ["productive", "liquid"],
  },
  {
    id: "seeker",
    label: "The Seeker",
    blurb: "Still mapping the territory. Keep the whole picture in view.",
    focus: ["secured", "documented", "continuous", "productive", "liquid", "tested"],
  },
];

/* ---- The responsibilities that transfer from a bank to you ---- */

const RESPONSIBILITIES: { icon: typeof Brain; title: string; bankDid: string; nowYours: string }[] = [
  {
    icon: Brain,
    title: "Memory & record-keeping",
    bankDid: "The bank remembered every account, balance, and beneficiary.",
    nowYours: "You hold the living map of what you own and who can reach it.",
  },
  {
    icon: KeyRound,
    title: "Access & recovery",
    bankDid: "The bank reset forgotten passwords and recovered lost access.",
    nowYours: "You own every seed, PIN, and device — and the proof you can still reach them.",
  },
  {
    icon: ShieldCheck,
    title: "Security hygiene",
    bankDid: "The bank ran fraud monitoring quietly in the background.",
    nowYours: "You review approvals and connected protocols, and catch drift early.",
  },
  {
    icon: HeartHandshake,
    title: "Legacy & succession",
    bankDid: "The bank had standard legal rails for what happens when you're gone.",
    nowYours: "You design a plan that actually works without you, and keep it real.",
  },
  {
    icon: HistoryIcon,
    title: "Knowledge that doesn't rot",
    bankDid: "The bank's systems stayed current even if you never logged in.",
    nowYours: "In self-custody, knowledge decays the moment you stop paying attention.",
  },
];

/* ---------------- Per-user local prefs / access record ---------------- */

interface AccessRecord {
  lastReached?: string; // ISO date
  reachNote?: string; // route, never the secret
}

function explainerKey(uid: string) {
  return `cob-cockpit-explainer-dismissed-v1:${uid}`;
}
function callingKey(uid: string) {
  return `cob-cockpit-calling-v1:${uid}`;
}
function accessKey(uid: string) {
  return `cob-access-continuity-v1:${uid}`;
}

function loadAccess(uid: string): Record<string, AccessRecord> {
  if (typeof window === "undefined" || !uid) return {};
  try {
    const raw = window.localStorage.getItem(accessKey(uid));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Record<string, AccessRecord>;
  } catch {
    return {};
  }
}
function saveAccess(uid: string, map: Record<string, AccessRecord>) {
  if (typeof window === "undefined" || !uid) return;
  try {
    window.localStorage.setItem(accessKey(uid), JSON.stringify(map));
  } catch {
    /* fail silently */
  }
}

/* ---------------- Small presentational helpers ---------------- */

function freshnessBadge(f: Freshness) {
  switch (f) {
    case "fresh":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
          Current
        </Badge>
      );
    case "due":
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
          Due for a check
        </Badge>
      );
    case "overdue":
      return (
        <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30">
          Overdue
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Not yet confirmed
        </Badge>
      );
  }
}

function statusIcon(status: StageStatus | undefined) {
  if (status === "done_in_cob" || status === "handled_outside") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (status === "in_progress") {
    return <CircleDot className="h-4 w-4 text-amber-500" />;
  }
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function shortAddr(addr: string) {
  if (!addr) return "";
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

const ACCESS_CADENCE_DAYS = 365;

export default function Cockpit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const uid = user?.id ?? "";

  const [hydrated, setHydrated] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, StageStatus>>({});
  const [verified, setVerified] = useState<Record<string, string>>({});
  const [access, setAccess] = useState<Record<string, AccessRecord>>({});
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [calling, setCalling] = useState<string | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(true);

  const { data: wallets, isLoading: walletsLoading } = useQuery<UserWallet[]>({
    queryKey: ["/api/wallets"],
  });

  useEffect(() => {
    setHydrated(true);
  }, []);

  // user-scoped data loads once we know who is logged in
  useEffect(() => {
    if (!uid) return;
    setStatuses(loadStageStatuses(uid));
    setVerified(loadStageVerified(uid));
    setAccess(loadAccess(uid));
    try {
      setCalling(window.localStorage.getItem(callingKey(uid)));
      setExplainerOpen(window.localStorage.getItem(explainerKey(uid)) !== "1");
    } catch {
      /* ignore */
    }
  }, [uid]);

  const updateStatus = (stageId: string, status: StageStatus) => {
    const next = { ...statuses, [stageId]: status };
    setStatuses(next);
    saveStageStatuses(uid, next);
  };

  const confirmStage = (stageId: string) => {
    const next = { ...verified, [stageId]: new Date().toISOString() };
    setVerified(next);
    saveStageVerified(uid, next);
    toast({
      title: "Marked as confirmed",
      description: "We'll show this stage as current and remind you when it's due again.",
    });
  };

  const pickCalling = (id: string) => {
    const next = calling === id ? null : id;
    setCalling(next);
    try {
      if (next) window.localStorage.setItem(callingKey(uid), next);
      else window.localStorage.removeItem(callingKey(uid));
    } catch {
      /* ignore */
    }
  };

  const dismissExplainer = () => {
    setExplainerOpen(false);
    try {
      window.localStorage.setItem(explainerKey(uid), "1");
    } catch {
      /* ignore */
    }
  };

  const confirmWalletReached = (walletId: string) => {
    const prev = access[walletId] ?? {};
    const next = { ...access, [walletId]: { ...prev, lastReached: new Date().toISOString() } };
    setAccess(next);
    saveAccess(uid, next);
    toast({ title: "Reach confirmed", description: "Logged that you can still get to this wallet today." });
  };

  const saveNote = (walletId: string) => {
    const prev = access[walletId] ?? {};
    const note = (noteDraft[walletId] ?? prev.reachNote ?? "").trim();
    const next = { ...access, [walletId]: { ...prev, reachNote: note } };
    setAccess(next);
    saveAccess(uid, next);
    toast({ title: "Note saved", description: "Stored only on this device — the route, never the secret." });
  };

  const focusSet = useMemo(() => {
    const c = CALLINGS.find((x) => x.id === calling);
    return new Set(c?.focus ?? []);
  }, [calling]);

  // Stages sorted so the chosen calling's focus rises to the top
  const orderedStages = useMemo(() => {
    if (focusSet.size === 0) return STAGES;
    return [...STAGES].sort((a, b) => {
      const af = focusSet.has(a.id) ? 0 : 1;
      const bf = focusSet.has(b.id) ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.number - b.number;
    });
  }, [focusSet]);

  /* ----------------- Needs-attention summary ----------------- */

  const notInPlace = STAGES.filter((s) => {
    const st = statuses[s.id];
    return !st || st === "not_started" || st === "in_progress";
  });

  const dueForCheck = STAGES.filter((s) => {
    const st = statuses[s.id];
    if (!isStageActive(st)) return false;
    const f = computeFreshness(verified[s.id], s.cadenceDays);
    return f === "due" || f === "overdue" || f === "never";
  });

  const walletsNeedingReach = (wallets ?? []).filter((w) => {
    const rec = access[w.id];
    const f = computeFreshness(rec?.lastReached, ACCESS_CADENCE_DAYS);
    return f === "due" || f === "overdue" || f === "never";
  });

  const allClear =
    hydrated &&
    notInPlace.length === 0 &&
    dueForCheck.length === 0 &&
    walletsNeedingReach.length === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16" data-testid="page-cockpit">
      <SeoHead
        title="Sovereignty Cockpit — State of What You Own | CryptoOwnBank"
        description="One living map of what you own and who can reach it. The bank used to carry this for you; being your own bank hands it back. The cockpit keeps it current — without holding your funds or keys."
        path="/cockpit"
      />

      {/* Header */}
      <div>
        <p
          className="text-sm font-medium tracking-wide uppercase text-[#00A4E4] mb-2"
          data-testid="eyebrow-cockpit"
        >
          Your Cockpit
        </p>
        <h1 className="text-3xl font-bold tracking-tight mb-3 flex items-center gap-2" data-testid="heading-cockpit">
          <Compass className="h-7 w-7 text-[#00A4E4]" />
          State of Your Sovereignty
        </h1>
        <p className="text-muted-foreground max-w-2xl" data-testid="text-cockpit-intro">
          The bank used to remember what you own, who could reach it, and what to do when
          something went wrong. Being your own bank hands all of that back to you. This is the
          one place that keeps the map current — <strong>the route, never the secret.</strong>{" "}
          We never hold your funds or keys.
        </p>
      </div>

      {/* Day-one explainer: what just transferred to you */}
      <Card className="border-[#00A4E4]/30 bg-[#00A4E4]/5" data-testid="card-explainer">
        <CardContent className="p-6">
          <button
            type="button"
            onClick={() => setExplainerOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 text-left"
            data-testid="button-toggle-explainer"
          >
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-[#00A4E4]" />
              <h2 className="text-lg font-bold">You just became your own banker</h2>
            </div>
            {explainerOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
          </button>

          {explainerOpen && (
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-relaxed">
                Moving from traditional finance to self-custody isn't only a change of where
                your money sits — it's a <strong>transfer of responsibilities</strong> the bank
                used to carry quietly on your behalf. Most people discover the weight of these
                only after something has already gone wrong. Here's what's now yours:
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {RESPONSIBILITIES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <div
                      key={r.title}
                      className="rounded-md border border-border bg-card p-3"
                      data-testid={`responsibility-${r.title.split(" ")[0].toLowerCase()}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className="h-4 w-4 text-[#00A4E4]" />
                        <span className="text-sm font-semibold">{r.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        <span className="font-medium text-foreground">Bank did:</span> {r.bankDid}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Now yours:</span> {r.nowYours}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-md border border-border bg-card p-4">
                <p className="text-sm">
                  <strong>Flow stays with banks. Ownership is your lane.</strong> Spending,
                  earning, borrowing, and bills can stay where they are. What moved on-chain —
                  holding, protecting, growing, reaching, passing on, and the records of it all —
                  is what this cockpit keeps visible and maintainable.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissExplainer}
                  data-testid="button-dismiss-explainer"
                >
                  Got it — don't show this expanded
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member calling */}
      <Card data-testid="card-calling">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Compass className="h-4 w-4 text-[#00A4E4]" />
            <h2 className="text-base font-bold">What brings you here?</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Pick what fits today. We'll lift the stages that matter most for you to the top —
            nothing is hidden, and you can change this anytime.
          </p>
          <div className="flex flex-wrap gap-2">
            {CALLINGS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pickCalling(c.id)}
                title={c.blurb}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  calling === c.id
                    ? "border-[#00A4E4] bg-[#00A4E4]/10 text-[#00A4E4] font-medium"
                    : "border-border hover:border-[#00A4E4]/50"
                }`}
                data-testid={`chip-calling-${c.id}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {calling && (
            <p className="text-xs text-muted-foreground mt-3" data-testid="text-calling-blurb">
              {CALLINGS.find((c) => c.id === calling)?.blurb}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Needs attention */}
      <Card data-testid="card-attention">
        <CardContent className="p-6">
          <h2 className="text-base font-bold mb-3">What needs attention</h2>
          {!hydrated ? (
            <p className="text-sm text-muted-foreground">Loading your posture…</p>
          ) : allClear ? (
            <div className="flex items-center gap-2 text-sm" data-testid="text-all-clear">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>
                Everything you've put in place is current. Your sovereignty posture is in good shape.
              </span>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border p-3" data-testid="summary-not-in-place">
                <p className="text-2xl font-bold">{notInPlace.length}</p>
                <p className="text-xs text-muted-foreground">stages not yet in place</p>
              </div>
              <div className="rounded-md border border-border p-3" data-testid="summary-due-check">
                <p className="text-2xl font-bold">{dueForCheck.length}</p>
                <p className="text-xs text-muted-foreground">in place but due for a check</p>
              </div>
              <div className="rounded-md border border-border p-3" data-testid="summary-wallet-reach">
                <p className="text-2xl font-bold">{walletsNeedingReach.length}</p>
                <p className="text-xs text-muted-foreground">wallets not confirmed reachable</p>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
            <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
            These are calm reminders, not nagging. Everything here is stored only on this device.
            We don't track, score, or report your posture.
          </p>
        </CardContent>
      </Card>

      {/* Posture board */}
      <div>
        <h2 className="text-lg font-bold mb-1">Your sovereignty posture</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The six stages wealthy families use to hold and pass holdings across decades — as a
          living board. Set where each stage stands, then confirm it stays true over time.
        </p>

        <div className="space-y-4">
          {orderedStages.map((stage) => {
            const Icon = stage.icon;
            const status = statuses[stage.id] ?? "not_started";
            const active = isStageActive(status);
            const freshness = computeFreshness(verified[stage.id], stage.cadenceDays);
            const inFocus = focusSet.has(stage.id);
            return (
              <Card
                key={stage.id}
                className={inFocus ? "border-[#00A4E4]/50 ring-1 ring-[#00A4E4]/20" : ""}
                data-testid={`card-stage-${stage.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-11 w-11 rounded-md bg-[#00A4E4]/10 text-[#00A4E4] flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          Stage {stage.number}
                        </Badge>
                        {statusIcon(status)}
                        {inFocus && (
                          <Badge className="bg-[#00A4E4]/15 text-[#00A4E4] border-[#00A4E4]/30 text-xs">
                            For you
                          </Badge>
                        )}
                        {active && freshnessBadge(freshness)}
                      </div>
                      <h3 className="text-lg font-bold" data-testid={`heading-stage-${stage.id}`}>
                        {stage.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{stage.oneLiner}</p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            Your status
                          </p>
                          <Select
                            value={status}
                            onValueChange={(v) => updateStatus(stage.id, v as StageStatus)}
                          >
                            <SelectTrigger
                              className="w-full"
                              data-testid={`select-status-${stage.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">
                                {STAGE_STATUS_LABELS.not_started}
                              </SelectItem>
                              <SelectItem value="in_progress">
                                {STAGE_STATUS_LABELS.in_progress}
                              </SelectItem>
                              <SelectItem value="done_in_cob">
                                {STAGE_STATUS_LABELS.done_in_cob}
                              </SelectItem>
                              <SelectItem value="handled_outside">
                                {STAGE_STATUS_LABELS.handled_outside}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            Keeping it true · {stage.cadenceLabel}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm" data-testid={`text-verified-${stage.id}`}>
                              {active
                                ? `Last confirmed: ${formatVerifiedDate(verified[stage.id])}`
                                : "Mark it in place above first"}
                            </span>
                          </div>
                          {active && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 mt-2 text-xs"
                              onClick={() => confirmStage(stage.id)}
                              data-testid={`button-confirm-${stage.id}`}
                            >
                              <ShieldCheck className="mr-1.5 h-3 w-3" />
                              I confirmed this today
                            </Button>
                          )}
                        </div>
                      </div>

                      {stage.cobFeatures.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Where this lives
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {stage.cobFeatures.map((f) => (
                              <Link key={f.href} href={f.href}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                  data-testid={`link-feature-${stage.id}-${f.href.replace(/\//g, "-")}`}
                                >
                                  {f.label}
                                  <ExternalLink className="ml-1.5 h-3 w-3" />
                                </Button>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-4">
          <Link href="/sovereignty/wealth-architecture">
            <Button variant="ghost" size="sm" data-testid="link-full-architecture">
              Read the full architecture, stage by stage
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Access continuity */}
      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <WalletIcon className="h-5 w-5 text-[#00A4E4]" />
          Access continuity
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          For each wallet, note <strong>how you reach it</strong> (which device, where the backup
          lives, who to call) and confirm you can still get to it. This is the map a future you —
          or a successor — needs.
        </p>

        <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 mb-4" data-testid="card-access-warning">
          <CardContent className="p-4 flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong>Route, never the secret.</strong> Never write your seed phrase, private key,
              PIN, or passwords here. Only where the wallet is and how to get to it — for example
              "Ledger in the safe, recovery sheet at mum's." Notes are stored only on this device.
            </p>
          </CardContent>
        </Card>

        {walletsLoading ? (
          <p className="text-sm text-muted-foreground">Loading your wallets…</p>
        ) : (wallets?.length ?? 0) === 0 ? (
          <Card data-testid="card-no-wallets">
            <CardContent className="p-6 text-center">
              <Landmark className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                No wallets tracked yet. Add the public addresses you want to keep a map of.
              </p>
              <Link href="/wallets">
                <Button size="sm" data-testid="button-add-wallets">
                  Add a wallet
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {(wallets ?? []).map((w) => {
              const rec = access[w.id] ?? {};
              const f = computeFreshness(rec.lastReached, ACCESS_CADENCE_DAYS);
              const draft = noteDraft[w.id] ?? rec.reachNote ?? "";
              return (
                <Card key={w.id} data-testid={`card-wallet-${w.id}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate" data-testid={`text-wallet-label-${w.id}`}>
                          {w.label || `${(w.chain || "").toUpperCase()} wallet`}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {(w.chain || "").toUpperCase()} · {shortAddr(w.address)}
                        </p>
                      </div>
                      {freshnessBadge(f)}
                    </div>

                    <p className="text-xs text-muted-foreground mb-2" data-testid={`text-reach-${w.id}`}>
                      Last confirmed reachable: {formatVerifiedDate(rec.lastReached)}
                    </p>

                    <Textarea
                      value={draft}
                      onChange={(e) =>
                        setNoteDraft((d) => ({ ...d, [w.id]: e.target.value }))
                      }
                      placeholder="How do you reach this wallet? e.g. Ledger in the safe; recovery sheet in the second location."
                      className="text-sm mb-3"
                      rows={2}
                      data-testid={`textarea-reach-note-${w.id}`}
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => saveNote(w.id)}
                        data-testid={`button-save-note-${w.id}`}
                      >
                        <Save className="mr-1.5 h-3 w-3" />
                        Save note
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => confirmWalletReached(w.id)}
                        data-testid={`button-confirm-reach-${w.id}`}
                      >
                        <ShieldCheck className="mr-1.5 h-3 w-3" />
                        I reached this today
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4 flex items-start gap-1.5">
          <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
          Want this in a printable form for a successor? Generate your{" "}
          <Link href="/sovereignty-kit" className="text-[#00A4E4] hover:underline">
            Recovery Kit
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
