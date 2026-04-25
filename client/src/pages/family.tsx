import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, UserPlus, Eye, Trash2, Mail, ShieldCheck, Clock, ExternalLink, Inbox, Check, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type FamilyProposal = {
  id: string;
  seatId: string;
  proposedByName: string;
  actionType: string;
  actionLabel: string;
  payload: any;
  humanSummary: string;
  proposerNote: string | null;
  ownerDecisionNote: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn" | "expired";
  expiresAt: string | null;
  decidedAt: string | null;
  createdAt: string;
};

type FamilySeat = {
  id: string;
  ownerUserId: string;
  seatEmail: string;
  seatName: string | null;
  role: "viewer" | "proposer";
  status: "invited" | "active" | "revoked";
  invitedAt: string | null;
  acceptedAt: string | null;
  lastSeenAt: string | null;
};

type InheritedSeat = FamilySeat & {
  ownerName: string | null;
  ownerEmail: string | null;
};

export default function FamilyPage() {
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: mySeats = [], isLoading: loadingMine } = useQuery<FamilySeat[]>({
    queryKey: ["/api/family-seats"],
  });

  const { data: inheritedSeats = [], isLoading: loadingInherited } = useQuery<InheritedSeat[]>({
    queryKey: ["/api/family-seats/me"],
  });

  const { data: pendingRequests = [] } = useQuery<FamilyProposal[]>({
    queryKey: ["/api/family-proposals/pending"],
    queryFn: async () => {
      const r = await fetch("/api/family-proposals/pending?status=pending", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const { data: myRequests = [] } = useQuery<FamilyProposal[]>({
    queryKey: ["/api/family-proposals/mine"],
  });

  const initialTab = (() => {
    if (typeof window === "undefined") return "mine";
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "requests" || t === "inherited" || t === "mine" || t === "myrequests") return t;
    return pendingRequests.length > 0 ? "requests" : "mine";
  })();

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Family</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Give read-only access to people you trust — your spouse, kids, or estate executor — so they can see your portfolio without ever touching it.
        </p>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="mine" data-testid="tab-family-mine">Seats I gave ({mySeats.length})</TabsTrigger>
          <TabsTrigger value="inherited" data-testid="tab-family-inherited">Accounts I can view ({inheritedSeats.length})</TabsTrigger>
          <TabsTrigger value="requests" data-testid="tab-family-requests">
            Requests {pendingRequests.length > 0 && <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-blue-600">{pendingRequests.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="myrequests" data-testid="tab-family-myrequests">My requests ({myRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>People with access to your account</CardTitle>
                <CardDescription>They can see your wallets, balances, and positions. They cannot send funds, swap, or change settings.</CardDescription>
              </div>
              <Button onClick={() => setInviteOpen(true)} data-testid="button-invite-family">
                <UserPlus className="h-4 w-4 mr-1" /> Invite
              </Button>
            </CardHeader>
            <CardContent>
              {loadingMine ? (
                <div className="text-sm text-muted-foreground py-6 text-center">Loading...</div>
              ) : mySeats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No one has access yet</p>
                  <p className="text-sm">Invite a family member or trusted person to view your portfolio read-only.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mySeats.map(s => <SeatRow key={s.id} seat={s} />)}
                </div>
              )}
            </CardContent>
          </Card>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Read-only is read-only.</strong> Family members you invite never see your seed phrases, never get private keys, and cannot move any funds. They can only see what you see on your dashboard. Revoke access anytime — it takes effect immediately.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="inherited" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accounts shared with you</CardTitle>
              <CardDescription>People who gave you read-only access to their portfolio.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInherited ? (
                <div className="text-sm text-muted-foreground py-6 text-center">Loading...</div>
              ) : inheritedSeats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No shared accounts</p>
                  <p className="text-sm">When a family member invites you, the account will show up here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inheritedSeats.map(s => (
                    <div key={s.id} className="rounded border p-3 flex items-center justify-between hover-elevate" data-testid={`row-inherited-${s.id}`}>
                      <div>
                        <div className="font-medium">{s.ownerName || s.ownerEmail || "Owner"}</div>
                        <div className="text-xs text-muted-foreground">{s.ownerEmail}</div>
                        <Badge variant="outline" className="text-[10px] mt-1 capitalize">{s.role}</Badge>
                      </div>
                      <Link href={`/family/view/${s.id}`}>
                        <Button size="sm" data-testid={`button-view-inherited-${s.id}`}>
                          <Eye className="h-4 w-4 mr-1" /> View portfolio
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5" /> Pending requests from family</CardTitle>
              <CardDescription>People with Proposer access can ask you to do things. Nothing happens until you approve.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nothing waiting on you</p>
                  <p className="text-sm">Requests from family members will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingRequests.map(p => <OwnerRequestRow key={p.id} proposal={p} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="myrequests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Requests you sent</CardTitle>
              <CardDescription>Requests you've sent to people whose accounts you have access to.</CardDescription>
            </CardHeader>
            <CardContent>
              {myRequests.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">You haven't sent any requests yet.</div>
              ) : (
                <div className="space-y-2">
                  {myRequests.map(p => <ProposerRequestRow key={p.id} proposal={p} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {inviteOpen && <InviteDialog onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

function statusBadgeFor(status: string) {
  if (status === "approved") return <Badge className="bg-green-600 text-[10px]">Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="text-[10px]">Declined</Badge>;
  if (status === "withdrawn") return <Badge variant="secondary" className="text-[10px]">Withdrawn</Badge>;
  if (status === "expired") return <Badge variant="secondary" className="text-[10px]">Expired</Badge>;
  return <Badge className="bg-blue-600 text-[10px]">Pending</Badge>;
}

function OwnerRequestRow({ proposal }: { proposal: FamilyProposal }) {
  const { toast } = useToast();
  const [decideOpen, setDecideOpen] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const decide = useMutation({
    mutationFn: async (kind: "approve" | "reject") => apiRequest("POST", `/api/family-proposals/${proposal.id}/${kind}`, { note: note || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-proposals/pending"] });
      toast({ title: decideOpen === "approve" ? "Approved" : "Declined", description: "We let them know by email." });
      setDecideOpen(null); setNote("");
    },
    onError: (e: any) => toast({ title: "Couldn't save", description: e?.message || String(e), variant: "destructive" }),
  });

  return (
    <div className="rounded border p-3" data-testid={`row-request-${proposal.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{proposal.proposedByName}</span>
            <Badge variant="outline" className="text-[10px] capitalize">{proposal.actionType}</Badge>
          </div>
          <div className="text-sm mt-1" data-testid={`text-request-summary-${proposal.id}`}>{proposal.humanSummary}</div>
          {proposal.proposerNote && <div className="text-xs text-muted-foreground mt-1 italic">"{proposal.proposerNote}"</div>}
          <div className="text-[10px] text-muted-foreground mt-1">
            Sent {new Date(proposal.createdAt).toLocaleString()}
            {proposal.expiresAt && ` · expires ${new Date(proposal.expiresAt).toLocaleDateString()}`}
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button size="sm" onClick={() => setDecideOpen("approve")} data-testid={`button-approve-${proposal.id}`}>
            <Check className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDecideOpen("reject")} data-testid={`button-reject-${proposal.id}`}>
            <X className="h-4 w-4 mr-1" /> Decline
          </Button>
        </div>
      </div>
      {decideOpen && (
        <Dialog open onOpenChange={(o) => { if (!o) { setDecideOpen(null); setNote(""); } }}>
          <DialogContent data-testid="dialog-decide-request">
            <DialogHeader>
              <DialogTitle>{decideOpen === "approve" ? "Approve" : "Decline"} request from {proposal.proposedByName}</DialogTitle>
              <DialogDescription>{proposal.humanSummary}</DialogDescription>
            </DialogHeader>
            {decideOpen === "approve" && (
              <Alert>
                <AlertDescription className="text-xs">
                  Approving sends an email to {proposal.proposedByName} and marks this approved. <strong>You still need to execute the action yourself</strong> from the relevant page (Send, DCA, Swap…) — your wallet signs every move.
                </AlertDescription>
              </Alert>
            )}
            <div>
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder={decideOpen === "approve" ? "Sent! Will execute today." : "Maybe next month."} rows={2} maxLength={1000} data-testid="textarea-decision-note" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDecideOpen(null); setNote(""); }}>Cancel</Button>
              <Button onClick={() => decide.mutate(decideOpen)} disabled={decide.isPending} variant={decideOpen === "approve" ? "default" : "destructive"} data-testid="button-confirm-decision">
                {decide.isPending ? "Saving..." : decideOpen === "approve" ? "Approve request" : "Decline request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ProposerRequestRow({ proposal }: { proposal: FamilyProposal }) {
  const { toast } = useToast();
  const withdraw = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/family-proposals/${proposal.id}/withdraw`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-proposals/mine"] });
      toast({ title: "Request withdrawn" });
    },
  });
  return (
    <div className="rounded border p-3" data-testid={`row-myrequest-${proposal.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {statusBadgeFor(proposal.status)}
            <Badge variant="outline" className="text-[10px] capitalize">{proposal.actionType}</Badge>
          </div>
          <div className="text-sm mt-1">{proposal.humanSummary}</div>
          {proposal.proposerNote && <div className="text-xs text-muted-foreground mt-1 italic">Your note: "{proposal.proposerNote}"</div>}
          {proposal.ownerDecisionNote && <div className="text-xs text-muted-foreground mt-1">Reply: "{proposal.ownerDecisionNote}"</div>}
          <div className="text-[10px] text-muted-foreground mt-1">
            Sent {new Date(proposal.createdAt).toLocaleString()}
            {proposal.decidedAt && ` · decided ${new Date(proposal.decidedAt).toLocaleString()}`}
          </div>
        </div>
        {proposal.status === "pending" && (
          <Button size="sm" variant="ghost" onClick={() => withdraw.mutate()} disabled={withdraw.isPending} data-testid={`button-withdraw-${proposal.id}`}>
            Withdraw
          </Button>
        )}
      </div>
    </div>
  );
}

function SeatRow({ seat }: { seat: FamilySeat }) {
  const { toast } = useToast();
  const revokeMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/family-seats/${seat.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-seats"] });
      toast({ title: "Access revoked" });
    },
  });
  const resendMutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/family-seats/${seat.id}`, { resendInvite: true }),
    onSuccess: () => toast({ title: "Invite resent" }),
  });
  const roleMutation = useMutation({
    mutationFn: async (newRole: "viewer" | "proposer") =>
      apiRequest("PATCH", `/api/family-seats/${seat.id}`, { role: newRole }),
    onSuccess: (_data, newRole) => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-seats"] });
      toast({
        title: `Role changed to ${newRole}`,
        description: newRole === "proposer"
          ? "They can now suggest actions you must approve. They just need to refresh their Family page."
          : "They are now read-only. Any pending requests they sent stay until you decide on them.",
      });
    },
    onError: (err: any) => toast({ title: "Could not change role", description: err?.message || String(err), variant: "destructive" }),
  });

  const statusBadge =
    seat.status === "active" ? <Badge className="bg-green-600 text-[10px]">Active</Badge>
    : seat.status === "invited" ? <Badge variant="secondary" className="text-[10px]">Invite pending</Badge>
    : <Badge variant="destructive" className="text-[10px]">Revoked</Badge>;

  return (
    <div className="rounded border p-3 flex items-center justify-between gap-2 hover-elevate" data-testid={`row-seat-${seat.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium" data-testid={`text-seat-name-${seat.id}`}>{seat.seatName || seat.seatEmail}</span>
          {statusBadge}
          <Badge variant="outline" className="text-[10px] capitalize">{seat.role}</Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{seat.seatEmail}</div>
        {seat.acceptedAt && <div className="text-[10px] text-muted-foreground mt-0.5">Joined {new Date(seat.acceptedAt).toLocaleDateString()}{seat.lastSeenAt ? ` · last seen ${new Date(seat.lastSeenAt).toLocaleDateString()}` : ""}</div>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {seat.status !== "revoked" && (
          <Select
            value={seat.role}
            onValueChange={(v) => roleMutation.mutate(v as "viewer" | "proposer")}
            disabled={roleMutation.isPending}
          >
            <SelectTrigger className="h-8 w-[110px] text-xs" data-testid={`select-role-${seat.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="proposer">Proposer</SelectItem>
            </SelectContent>
          </Select>
        )}
        {seat.status === "invited" && (
          <Button size="sm" variant="outline" onClick={() => resendMutation.mutate()} disabled={resendMutation.isPending} data-testid={`button-resend-${seat.id}`}>
            <Mail className="h-3.5 w-3.5 mr-1" /> Resend
          </Button>
        )}
        {seat.status !== "revoked" && (
          <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Revoke ${seat.seatName || seat.seatEmail}'s access?`)) revokeMutation.mutate(); }} disabled={revokeMutation.isPending} data-testid={`button-revoke-${seat.id}`}>
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
          </Button>
        )}
      </div>
    </div>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [seatEmail, setSeatEmail] = useState("");
  const [seatName, setSeatName] = useState("");
  const [role, setRole] = useState<"viewer" | "proposer">("viewer");

  const inviteMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/family-seats", { seatEmail: seatEmail.trim().toLowerCase(), seatName: seatName.trim() || null, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-seats"] });
      toast({ title: "Invite sent", description: `${seatEmail} will receive an email with a link to accept.` });
      onClose();
    },
    onError: (err: any) => toast({ title: "Invite failed", description: err?.message || String(err), variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent data-testid="dialog-invite-family">
        <DialogHeader>
          <DialogTitle>Invite a family member</DialogTitle>
          <DialogDescription>They'll receive an email with a secure link. After they sign up or log in with this email, they'll see your portfolio in read-only mode.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Their email *</Label>
            <Input type="email" value={seatEmail} onChange={(e) => setSeatEmail(e.target.value)} placeholder="kid@example.com" data-testid="input-seat-email" />
          </div>
          <div>
            <Label>Their name</Label>
            <Input value={seatName} onChange={(e) => setSeatName(e.target.value)} placeholder="e.g., Sarah (daughter)" data-testid="input-seat-name" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "viewer" | "proposer")}>
              <SelectTrigger data-testid="select-seat-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer — read-only (recommended)</SelectItem>
                <SelectItem value="proposer">Proposer — can suggest actions you must approve</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-invite">Cancel</Button>
          <Button onClick={() => inviteMutation.mutate()} disabled={!seatEmail.includes("@") || inviteMutation.isPending} data-testid="button-send-invite">
            {inviteMutation.isPending ? "Sending..." : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
