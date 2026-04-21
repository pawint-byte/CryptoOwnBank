import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type InvitePreview = {
  seatId: string;
  seatEmail: string;
  seatName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  role: string;
  status: string;
};

export default function FamilyAcceptPage() {
  const [, params] = useRoute("/family/accept/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = params?.token;

  const { data: invite, isLoading, error } = useQuery<InvitePreview>({
    queryKey: ["/api/family-seats/invite", token],
    enabled: !!token,
  });

  const { data: me } = useQuery<{ id: string; email: string } | null>({
    queryKey: ["/api/auth/user"],
  });

  const acceptMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/family-seats/accept/${token}`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-seats/me"] });
      toast({ title: "Access granted!", description: `You can now view ${invite?.ownerName || invite?.ownerEmail}'s portfolio.` });
      setLocation(`/family/view/${data.id || invite?.seatId}`);
    },
    onError: (err: any) => toast({ title: "Couldn't accept invite", description: err?.message || String(err), variant: "destructive" }),
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-600" /> Family invite</CardTitle>
          <CardDescription>Someone has invited you to view their CryptoOwnBank portfolio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : error || !invite ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>This invite link is invalid or has expired. Ask the person who invited you for a new link.</AlertDescription>
            </Alert>
          ) : invite.status === "active" ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>You've already accepted this invite. <Link href={`/family/view/${invite.seatId}`} className="underline">View portfolio →</Link></AlertDescription>
            </Alert>
          ) : invite.status === "revoked" ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>This access has been revoked by the owner.</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="rounded border p-3 bg-muted/40">
                <div className="text-xs text-muted-foreground">From</div>
                <div className="font-semibold" data-testid="text-invite-owner">{invite.ownerName || invite.ownerEmail}</div>
                <div className="text-xs text-muted-foreground mt-2">For</div>
                <div className="font-medium" data-testid="text-invite-seat-email">{invite.seatEmail}</div>
                <div className="text-xs text-muted-foreground mt-2">Access</div>
                <div className="text-sm capitalize">{invite.role} (read-only)</div>
              </div>
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Read-only means you can see balances and positions but cannot move funds, swap, or change anything. Your own account is not affected.
                </AlertDescription>
              </Alert>
              {!me ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">You need to sign in or sign up with <strong>{invite.seatEmail}</strong> to accept this invite.</p>
                  <div className="flex gap-2">
                    <Button asChild className="flex-1" data-testid="button-login-to-accept">
                      <a href={`/login?next=${encodeURIComponent(`/family/accept/${token}`)}`}>Sign in</a>
                    </Button>
                    <Button asChild variant="outline" className="flex-1" data-testid="button-signup-to-accept">
                      <a href={`/signup?email=${encodeURIComponent(invite.seatEmail)}&next=${encodeURIComponent(`/family/accept/${token}`)}`}>Sign up</a>
                    </Button>
                  </div>
                </div>
              ) : me.email?.toLowerCase() !== invite.seatEmail.toLowerCase() ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You're signed in as <strong>{me.email}</strong> but this invite is for <strong>{invite.seatEmail}</strong>. Sign out and sign in with the correct email.
                  </AlertDescription>
                </Alert>
              ) : (
                <Button className="w-full" onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending} data-testid="button-accept-invite">
                  {acceptMutation.isPending ? "Accepting..." : "Accept access"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
