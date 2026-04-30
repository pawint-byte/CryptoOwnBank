import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Check, Eye, Share2, ShieldCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WhisperShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionId?: string | null;
  assetSymbol: string;
  walletAddress?: string | null;
}

interface CreatedWhisper {
  id: string;
  token: string;
  shareUrl: string;
}

export function WhisperShareDialog({
  open,
  onOpenChange,
  positionId,
  assetSymbol,
  walletAddress,
}: WhisperShareDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [senderName, setSenderName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [showAddress, setShowAddress] = useState(false);
  const [created, setCreated] = useState<CreatedWhisper | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setSenderName("");
      setRecipientName("");
      setPersonalNote("");
      setShowAddress(false);
      setCreated(null);
      setCopied(false);
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!positionId) {
        throw new Error("Missing position — please re-open the share dialog from the asset row.");
      }
      const res = await apiRequest("POST", "/api/whispers", {
        positionId,
        senderName: senderName.trim() || null,
        recipientName: recipientName.trim() || null,
        personalNote: personalNote.trim() || null,
        showAddress,
        walletAddress: showAddress ? walletAddress || null : null,
      });
      return (await res.json()) as CreatedWhisper;
    },
    onSuccess: (data) => {
      setCreated(data);
      queryClient.invalidateQueries({ queryKey: ["/api/whispers"] });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't create Whisper",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCopy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Select and copy the link manually.", variant: "destructive" });
    }
  };

  const noteRemaining = 280 - personalNote.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" data-testid="dialog-whisper-share">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            {created ? "Whisper ready to share" : `Whisper your ${assetSymbol}`}
          </DialogTitle>
          <DialogDescription>
            {created
              ? "Anyone with this link can see the snapshot — no login needed. You can revoke it anytime."
              : "Share just this one asset, no login required for the recipient."}
          </DialogDescription>
        </DialogHeader>

        {!created ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="whisper-sender">Show as <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="whisper-sender"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value.slice(0, 60))}
                placeholder="e.g. Alex, your friend Alex, A.B."
                data-testid="input-whisper-sender"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to show as <em>"A CryptoOwnBank user"</em>. Your real name is never shared automatically.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whisper-recipient">Who's this for? <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="whisper-recipient"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value.slice(0, 100))}
                placeholder="e.g. Mary, my accountant, Mom"
                data-testid="input-whisper-recipient"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whisper-note">
                Personal note <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="whisper-note"
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value.slice(0, 280))}
                placeholder="Anything you want them to read first…"
                rows={3}
                data-testid="textarea-whisper-note"
              />
              <div className="text-xs text-muted-foreground text-right">{noteRemaining} characters left</div>
            </div>

            {walletAddress && (
              <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                <Switch
                  id="whisper-show-address"
                  checked={showAddress}
                  onCheckedChange={setShowAddress}
                  data-testid="switch-whisper-show-address"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="whisper-show-address" className="cursor-pointer">
                    Also share the wallet address
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Off by default. Only flip this if the recipient needs the public address.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <p>
                Only the balance and value of <strong>{assetSymbol}</strong> is shown. Other accounts, balances,
                and personal info stay private.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Shareable link</Label>
              <div className="flex gap-2">
                <Input
                  value={created.shareUrl}
                  readOnly
                  className="font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                  data-testid="input-whisper-share-url"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  data-testid="button-copy-whisper-url"
                  title={copied ? "Copied!" : "Copy link"}
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="rounded-md bg-muted/40 p-3 text-sm flex items-start gap-2">
              <Eye className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-muted-foreground">
                You can revoke or delete this Whisper from{" "}
                <a href="/whispers" className="underline font-medium text-foreground">
                  Whispers
                </a>
                .
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!created ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-whisper-cancel">
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                data-testid="button-whisper-create"
              >
                {createMutation.isPending ? "Creating…" : "Create link"}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)} data-testid="button-whisper-done">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
