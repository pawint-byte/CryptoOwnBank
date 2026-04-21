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
import { Users, UserPlus, Eye, Trash2, Mail, ShieldCheck, Clock, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Family</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Give read-only access to people you trust — your spouse, kids, or estate executor — so they can see your portfolio without ever touching it.
        </p>
      </div>

      <Tabs defaultValue="mine" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mine" data-testid="tab-family-mine">Seats I gave ({mySeats.length})</TabsTrigger>
          <TabsTrigger value="inherited" data-testid="tab-family-inherited">Accounts I can view ({inheritedSeats.length})</TabsTrigger>
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
      </Tabs>

      {inviteOpen && <InviteDialog onClose={() => setInviteOpen(false)} />}
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

  const statusBadge =
    seat.status === "active" ? <Badge className="bg-green-600 text-[10px]">Active</Badge>
    : seat.status === "invited" ? <Badge variant="secondary" className="text-[10px]">Invite pending</Badge>
    : <Badge variant="destructive" className="text-[10px]">Revoked</Badge>;

  return (
    <div className="rounded border p-3 flex items-center justify-between hover-elevate" data-testid={`row-seat-${seat.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium" data-testid={`text-seat-name-${seat.id}`}>{seat.seatName || seat.seatEmail}</span>
          {statusBadge}
          <Badge variant="outline" className="text-[10px] capitalize">{seat.role}</Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{seat.seatEmail}</div>
        {seat.acceptedAt && <div className="text-[10px] text-muted-foreground mt-0.5">Joined {new Date(seat.acceptedAt).toLocaleDateString()}{seat.lastSeenAt ? ` · last seen ${new Date(seat.lastSeenAt).toLocaleDateString()}` : ""}</div>}
      </div>
      <div className="flex items-center gap-1">
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
                <SelectItem value="proposer">Proposer — can suggest actions you must approve (coming soon)</SelectItem>
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
