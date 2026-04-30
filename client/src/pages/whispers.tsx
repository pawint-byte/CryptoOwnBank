import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sparkles, Eye, Copy, Check, Lock, Trash2, ExternalLink, Share2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface WhisperRow {
  id: string;
  token: string;
  shareUrl: string;
  assetSymbol: string;
  recipientName: string | null;
  personalNote: string | null;
  showAddress: boolean;
  walletAddress: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WhispersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: whispers = [], isLoading } = useQuery<WhisperRow[]>({
    queryKey: ["/api/whispers"],
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/whispers/${id}/revoke`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whispers"] });
      toast({ title: "Whisper revoked", description: "The link no longer works." });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't revoke", description: err?.message || "Try again.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/whispers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whispers"] });
      toast({ title: "Whisper deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't delete", description: err?.message || "Try again.", variant: "destructive" });
    },
  });

  const handleCopy = async (w: WhisperRow) => {
    try {
      await navigator.clipboard.writeText(w.shareUrl);
      setCopiedId(w.id);
      setTimeout(() => setCopiedId((c) => (c === w.id ? null : c)), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const active = whispers.filter((w) => !w.revokedAt);
  const revoked = whispers.filter((w) => w.revokedAt);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
            <Sparkles className="w-7 h-7 text-primary" />
            Whispers
          </h1>
          <p className="text-muted-foreground mt-1">
            One-asset, no-login share links. Revocable, granular, never the whole portfolio.
          </p>
        </div>
        <Link href="/portfolio">
          <Button variant="outline" data-testid="link-back-portfolio">
            Go to portfolio
          </Button>
        </Link>
      </div>

      <Separator className="my-6" />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : whispers.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Share2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-xl font-semibold mb-1" data-testid="text-empty-title">No Whispers yet</h2>
            <p className="text-muted-foreground mb-5 max-w-md mx-auto">
              Open your portfolio and tap the share icon on any crypto holding to create a no-login link
              for one specific asset.
            </p>
            <Link href="/portfolio">
              <Button data-testid="link-go-portfolio">Open portfolio</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Active ({active.length})
              </h2>
              <div className="space-y-3">
                {active.map((w) => (
                  <WhisperCard
                    key={w.id}
                    w={w}
                    copied={copiedId === w.id}
                    onCopy={() => handleCopy(w)}
                    onRevoke={() => revokeMutation.mutate(w.id)}
                    onDelete={() => deleteMutation.mutate(w.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {revoked.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Revoked ({revoked.length})
              </h2>
              <div className="space-y-3">
                {revoked.map((w) => (
                  <WhisperCard
                    key={w.id}
                    w={w}
                    copied={copiedId === w.id}
                    onCopy={() => handleCopy(w)}
                    onRevoke={() => revokeMutation.mutate(w.id)}
                    onDelete={() => deleteMutation.mutate(w.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WhisperCard({
  w,
  copied,
  onCopy,
  onRevoke,
  onDelete,
}: {
  w: WhisperRow;
  copied: boolean;
  onCopy: () => void;
  onRevoke: () => void;
  onDelete: () => void;
}) {
  const isRevoked = !!w.revokedAt;
  return (
    <Card className={isRevoked ? "opacity-70" : ""} data-testid={`card-whisper-${w.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
              <span data-testid={`text-symbol-${w.id}`}>{w.assetSymbol}</span>
              {w.recipientName && (
                <Badge variant="secondary" className="font-normal" data-testid={`badge-recipient-${w.id}`}>
                  for {w.recipientName}
                </Badge>
              )}
              {isRevoked ? (
                <Badge variant="outline" className="gap-1">
                  <Lock className="w-3 h-3" /> Revoked
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-600/30">
                  Live
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Created {formatDate(w.createdAt)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {w.personalNote && (
          <p className="text-sm text-muted-foreground italic line-clamp-2" data-testid={`text-note-${w.id}`}>
            "{w.personalNote}"
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" data-testid={`text-views-${w.id}`}>
            <Eye className="w-3.5 h-3.5" />
            {w.viewCount} {w.viewCount === 1 ? "view" : "views"}
          </span>
          {w.lastViewedAt && (
            <span>Last viewed {formatDate(w.lastViewedAt)}</span>
          )}
          {w.showAddress && <Badge variant="outline" className="font-normal">Address shared</Badge>}
        </div>

        {!isRevoked && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onCopy}
              data-testid={`button-copy-${w.id}`}
            >
              {copied ? <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button variant="outline" size="sm" asChild data-testid={`button-open-${w.id}`}>
              <a href={`/v/${w.token}`} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Open
              </a>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid={`button-revoke-${w.id}`}>
                  <Lock className="w-4 h-4 mr-1.5" />
                  Revoke
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revoke this Whisper?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Anyone with the link will see a "turned off" message. You can delete it later if you'd like.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid={`button-revoke-cancel-${w.id}`}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onRevoke} data-testid={`button-revoke-confirm-${w.id}`}>
                    Revoke link
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {isRevoked && (
          <div className="flex flex-wrap gap-2 pt-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid={`button-delete-${w.id}`}>
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this Whisper?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The view count and history will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid={`button-delete-cancel-${w.id}`}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} data-testid={`button-delete-confirm-${w.id}`}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
