import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { SeoHead } from "@/components/seo-head";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Wallet,
  ArrowLeft,
  ChevronUp,
  Lock,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

type RoadmapStatus =
  | "idea"
  | "gathering"
  | "strong"
  | "under_review"
  | "planned"
  | "in_progress"
  | "shipped"
  | "not_pursuing";

interface RoadmapItemDTO {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  status: RoadmapStatus;
  teamResponse: string | null;
  teamResponseAt: string | null;
  sortOrder: number;
  voteCount: number;
  userVoted: boolean;
}

interface ViewerInfo {
  isAuthed: boolean;
  canVote: boolean;
  reason: string | null;
  activeVotes: number;
  maxVotes: number;
}

interface RoadmapResponse {
  items: RoadmapItemDTO[];
  viewer: ViewerInfo;
}

const STATUS_META: Record<RoadmapStatus, { label: string; badge: string; color: string; description: string }> = {
  idea: {
    label: "Idea",
    badge: "Idea",
    color: "bg-slate-500 text-white",
    description: "Just added. Early signal.",
  },
  gathering: {
    label: "Gathering Support",
    badge: "Gathering",
    color: "bg-blue-500 text-white",
    description: "People are voting it up.",
  },
  strong: {
    label: "Strong Demand",
    badge: "Strong demand",
    color: "bg-indigo-600 text-white",
    description: "Lots of voices behind this.",
  },
  under_review: {
    label: "Under Review",
    badge: "Under review",
    color: "bg-amber-500 text-white",
    description: "Team is looking at it now.",
  },
  planned: {
    label: "Planned",
    badge: "Planned",
    color: "bg-violet-600 text-white",
    description: "We've committed to building it.",
  },
  in_progress: {
    label: "In Progress",
    badge: "In progress",
    color: "bg-orange-500 text-white",
    description: "Hands on the keyboard.",
  },
  shipped: {
    label: "Shipped",
    badge: "Shipped",
    color: "bg-emerald-600 text-white",
    description: "Live and available now.",
  },
  not_pursuing: {
    label: "Not Pursuing",
    badge: "Not pursuing",
    color: "bg-rose-500 text-white",
    description: "We've decided not to build it. Reason given.",
  },
};

const STATUS_ORDER: RoadmapStatus[] = [
  "in_progress",
  "planned",
  "under_review",
  "strong",
  "gathering",
  "idea",
  "shipped",
  "not_pursuing",
];

const ALL_STATUSES: RoadmapStatus[] = [
  "idea",
  "gathering",
  "strong",
  "under_review",
  "planned",
  "in_progress",
  "shipped",
  "not_pursuing",
];

function gateMessage(reason: string | null): string | null {
  switch (reason) {
    case "not_authed":
      return "Sign in with a verified email to vote on what we build next.";
    case "email_not_verified":
      return "Please verify your email address before you can vote. Check your inbox for the verification link.";
    case "account_too_new":
      return "Your account needs to be at least 7 days old before you can vote. We do this to keep votes fair.";
    case "vote_cap_reached":
      return "You've used all 10 of your active votes. Remove a vote from another item to free up a slot.";
    default:
      return null;
  }
}

export default function Roadmap() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [voteDialogItem, setVoteDialogItem] = useState<RoadmapItemDTO | null>(null);
  const [comment, setComment] = useState("");
  const [responseDialogItem, setResponseDialogItem] = useState<RoadmapItemDTO | null>(null);
  const [responseDraft, setResponseDraft] = useState("");

  const { data, isLoading } = useQuery<RoadmapResponse>({
    queryKey: ["/api/roadmap"],
  });

  const voteMutation = useMutation({
    mutationFn: async ({ itemId, comment }: { itemId: number; comment?: string }) => {
      const res = await apiRequest("POST", `/api/roadmap/${itemId}/vote`, comment ? { comment } : {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap"] });
      toast({ title: "Vote recorded", description: "Thanks for telling us what matters." });
      setVoteDialogItem(null);
      setComment("");
    },
    onError: (err: any) => {
      toast({ title: "Couldn't record vote", description: err.message ?? "Please try again.", variant: "destructive" });
    },
  });

  const unvoteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await apiRequest("DELETE", `/api/roadmap/${itemId}/vote`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap"] });
      toast({ title: "Vote removed", description: "Your slot is open again." });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't remove vote", description: err.message ?? "Please try again.", variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: number; status: RoadmapStatus }) => {
      const res = await apiRequest("PATCH", `/api/admin/roadmap/${itemId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap"] });
      toast({ title: "Status updated" });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't update status", description: err.message ?? "Please try again.", variant: "destructive" });
    },
  });

  const responseMutation = useMutation({
    mutationFn: async ({ itemId, response }: { itemId: number; response: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/roadmap/${itemId}/response`, { response });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap"] });
      toast({ title: "Team response posted" });
      setResponseDialogItem(null);
      setResponseDraft("");
    },
    onError: (err: any) => {
      toast({ title: "Couldn't post response", description: err.message ?? "Please try again.", variant: "destructive" });
    },
  });

  const items = data?.items ?? [];
  const viewer = data?.viewer;
  const isAdmin = !!user?.isAdmin;
  const gate = viewer ? gateMessage(viewer.reason) : null;

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: items
      .filter((it) => it.status === status)
      .sort((a, b) => b.voteCount - a.voteCount || a.sortOrder - b.sortOrder),
  })).filter((g) => g.items.length > 0);

  function handleVoteClick(item: RoadmapItemDTO) {
    if (item.userVoted) {
      unvoteMutation.mutate(item.id);
      return;
    }
    if (!viewer?.isAuthed) {
      toast({
        title: "Sign in to vote",
        description: "Create an account or sign in with a verified email to vote.",
      });
      return;
    }
    if (!viewer.canVote) {
      toast({
        title: "You can't vote yet",
        description: gateMessage(viewer.reason) ?? "Please check the message at the top of the page.",
        variant: "destructive",
      });
      return;
    }
    setVoteDialogItem(item);
    setComment("");
  }

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Roadmap — What Should We Build Next? | CryptoOwnBank"
        description="Member-voted roadmap. You vote, we listen, and we give a real public answer within 30 days. One verified account, one vote, ten active picks at a time."
        path="/roadmap"
      />

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2" data-testid="link-home">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="font-bold">CryptoOwnBank</span>
          </a>
          <div className="flex items-center gap-3">
            <a href="/principles" className="text-sm hover:underline" data-testid="link-principles-header">
              Our Principles
            </a>
            <ThemeToggle />
            <a href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero / intro */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" data-testid="heading-roadmap">
            What Should We Build Next?
          </h1>
          <div className="space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>
              We don't decide alone. We decide with you. You tell us what matters most for your family,
              your village, your daily life — and we tell you back, in plain words, what we can do and when.
            </p>
            <div>
              <p className="font-semibold text-foreground mb-2">How it works:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Everything here is in plain English, no tech talk.</li>
                <li>You vote with one account. No big companies, no bots, no paid tier gets extra say. Everyone is equal.</li>
                <li>You can support up to 10 ideas at a time, so you have to choose what matters most.</li>
                <li>When something gets enough support, the team gives a real public answer within 30 days — yes, no, or "here's why not yet."</li>
              </ul>
            </div>
            <p>
              <span className="font-semibold text-foreground">What you won't see on this list:</span> security
              fixes, work the law requires us to do, or behind-the-scenes plumbing. Those just get done.
              Everything else — every feature, every language, every new path to reach more families — that's
              where your voice comes in.
            </p>
            <p>
              <span className="font-semibold text-foreground">Some things won't be possible:</span> if an idea
              conflicts with our Principles (we never custody your money, we never score your coins, we never
              decide who you can send to), we'll tell you so plainly. We won't quietly disappear it.
            </p>
            <p>
              Scroll down to see what's already on the list. Vote for what would help you or your family the
              most. Or propose something we haven't thought of yet.
            </p>
          </div>
        </section>

        {/* Gate / vote-status banner */}
        {viewer && (
          <section className="mb-8" data-testid="section-vote-status">
            {gate ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm" data-testid="text-gate-message">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <p className="text-foreground">{gate}</p>
                </div>
              </div>
            ) : viewer.isAuthed ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm flex items-center gap-2" data-testid="text-vote-budget">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-foreground">
                  You're using <strong>{viewer.activeVotes}</strong> of <strong>{viewer.maxVotes}</strong> active
                  votes. Pick what matters most to your family.
                </span>
              </div>
            ) : null}
          </section>
        )}

        {/* Status legend */}
        <section className="mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Status Ladder
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ALL_STATUSES.map((s) => (
              <div key={s} className="flex flex-col gap-1 rounded-md border bg-card p-2" data-testid={`legend-${s}`}>
                <Badge className={`${STATUS_META[s].color} w-fit text-xs`}>{STATUS_META[s].badge}</Badge>
                <span className="text-xs text-muted-foreground">{STATUS_META[s].description}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Items list */}
        <section className="space-y-10">
          {isLoading && (
            <div className="text-center text-muted-foreground py-12" data-testid="text-loading">
              Loading roadmap…
            </div>
          )}

          {!isLoading && grouped.length === 0 && (
            <div className="text-center text-muted-foreground py-12" data-testid="text-empty">
              No items yet.
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.status} data-testid={`group-${group.status}`}>
              <div className="flex items-center gap-3 mb-4">
                <Badge className={`${STATUS_META[group.status].color}`}>{STATUS_META[group.status].badge}</Badge>
                <span className="text-sm text-muted-foreground">{STATUS_META[group.status].description}</span>
              </div>
              <div className="space-y-4">
                {group.items.map((item) => {
                  const votingClosed = item.status === "shipped" || item.status === "not_pursuing";
                  return (
                    <Card key={item.id} className="hover-elevate" data-testid={`card-item-${item.id}`}>
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          {/* Vote button */}
                          <div className="md:w-24 flex md:flex-col items-center gap-2">
                            <Button
                              variant={item.userVoted ? "default" : "outline"}
                              size="sm"
                              className="w-20 flex flex-col h-auto py-2"
                              disabled={voteMutation.isPending || unvoteMutation.isPending || votingClosed}
                              onClick={() => handleVoteClick(item)}
                              data-testid={`button-vote-${item.id}`}
                            >
                              {item.userVoted ? (
                                <CheckCircle2 className="h-4 w-4 mb-1" />
                              ) : (
                                <ChevronUp className="h-4 w-4 mb-1" />
                              )}
                              <span className="text-lg font-bold leading-none" data-testid={`text-votes-${item.id}`}>
                                {item.voteCount}
                              </span>
                              <span className="text-[10px] uppercase tracking-wide opacity-70">
                                {item.userVoted ? "voted" : "vote"}
                              </span>
                            </Button>
                          </div>

                          {/* Body */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs capitalize" data-testid={`badge-category-${item.id}`}>
                                {item.category}
                              </Badge>
                              <Badge className={`${STATUS_META[item.status].color} text-xs`} data-testid={`badge-status-${item.id}`}>
                                {STATUS_META[item.status].badge}
                              </Badge>
                            </div>
                            <h3 className="text-lg font-semibold mb-1" data-testid={`text-title-${item.id}`}>
                              {item.title}
                            </h3>
                            <p className="text-sm text-muted-foreground" data-testid={`text-description-${item.id}`}>
                              {item.description}
                            </p>

                            {item.teamResponse && (
                              <div
                                className="mt-4 rounded-md border-l-4 border-primary bg-muted/40 p-3"
                                data-testid={`block-response-${item.id}`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                                    Team Response
                                  </span>
                                  {item.teamResponseAt && (
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(item.teamResponseAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm whitespace-pre-wrap" data-testid={`text-response-${item.id}`}>
                                  {item.teamResponse}
                                </p>
                              </div>
                            )}

                            {/* Admin controls */}
                            {isAdmin && (
                              <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t" data-testid={`admin-controls-${item.id}`}>
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Admin:
                                </span>
                                <Select
                                  value={item.status}
                                  onValueChange={(v) =>
                                    statusMutation.mutate({ itemId: item.id, status: v as RoadmapStatus })
                                  }
                                >
                                  <SelectTrigger className="h-8 w-44" data-testid={`select-status-${item.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ALL_STATUSES.map((s) => (
                                      <SelectItem key={s} value={s}>
                                        {STATUS_META[s].label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => {
                                    setResponseDialogItem(item);
                                    setResponseDraft(item.teamResponse ?? "");
                                  }}
                                  data-testid={`button-post-response-${item.id}`}
                                >
                                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                  {item.teamResponse ? "Edit response" : "Post response"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-16 text-center text-sm text-muted-foreground">
          Want to suggest something not on this list? Email <a className="underline" href="mailto:hello@cryptoownbank.com">hello@cryptoownbank.com</a>.
        </section>
      </main>

      {/* Vote dialog (optional comment) */}
      <Dialog open={!!voteDialogItem} onOpenChange={(o) => !o && setVoteDialogItem(null)}>
        <DialogContent data-testid="dialog-vote">
          <DialogHeader>
            <DialogTitle>Vote: {voteDialogItem?.title}</DialogTitle>
            <DialogDescription>
              Add a short note about why this matters to you (optional). 500 characters max.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Why does this matter for you or your family?"
            rows={4}
            data-testid="textarea-vote-comment"
          />
          <p className="text-xs text-muted-foreground text-right">{comment.length}/500</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVoteDialogItem(null)}
              data-testid="button-vote-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                voteDialogItem &&
                voteMutation.mutate({ itemId: voteDialogItem.id, comment: comment.trim() || undefined })
              }
              disabled={voteMutation.isPending}
              data-testid="button-vote-confirm"
            >
              {voteMutation.isPending ? "Recording…" : "Confirm vote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin response dialog */}
      <Dialog open={!!responseDialogItem} onOpenChange={(o) => !o && setResponseDialogItem(null)}>
        <DialogContent data-testid="dialog-response">
          <DialogHeader>
            <DialogTitle>Team Response</DialogTitle>
            <DialogDescription>
              Speak plainly. This will be visible publicly to everyone reading the roadmap.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={responseDraft}
            onChange={(e) => setResponseDraft(e.target.value.slice(0, 4000))}
            placeholder="What's the team's honest answer on this idea?"
            rows={8}
            data-testid="textarea-response"
          />
          <p className="text-xs text-muted-foreground text-right">{responseDraft.length}/4000</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResponseDialogItem(null)}
              data-testid="button-response-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                responseDialogItem &&
                responseDraft.trim() &&
                responseMutation.mutate({ itemId: responseDialogItem.id, response: responseDraft.trim() })
              }
              disabled={responseMutation.isPending || !responseDraft.trim()}
              data-testid="button-response-confirm"
            >
              {responseMutation.isPending ? "Posting…" : "Post response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
