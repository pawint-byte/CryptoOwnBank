import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bitcoin, Zap, ExternalLink, Copy, Check, AlertCircle, QrCode } from "lucide-react";

const LN_ADDR_KEY = "cob.lightning_address";
const BOLT11_RE = /^ln(bc|tb)[0-9]{0,10}[munp]?[a-z0-9]+$/i;
const LN_ADDR_RE = /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

function isLnAddress(s: string) {
  return LN_ADDR_RE.test(s.trim());
}
function isBolt11(s: string) {
  const stripped = s.trim().toLowerCase().replace(/^lightning:/, "");
  return BOLT11_RE.test(stripped);
}

function buildLightningDeepLink(target: string): string {
  const t = target.trim().replace(/^lightning:/i, "");
  return `lightning:${t}`;
}

function QrImage({ value, size = 220 }: { value: string; size?: number }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(value)}`;
  return <img src={src} width={size} height={size} alt="QR" className="rounded-md bg-white p-2" data-testid="img-qr" />;
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-testid="button-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
    >
      {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export default function BitcoinLightning() {
  const { toast } = useToast();
  const [savedLnAddress, setSavedLnAddress] = useState<string>("");
  const [draftLnAddress, setDraftLnAddress] = useState<string>("");
  const [validating, setValidating] = useState(false);
  const [addressMeta, setAddressMeta] = useState<{ minSats: number; maxSats: number; description?: string } | null>(null);

  const [sendInput, setSendInput] = useState("");
  const [sendAmountSats, setSendAmountSats] = useState<string>("");
  const [sendComment, setSendComment] = useState<string>("");
  const [generatedInvoice, setGeneratedInvoice] = useState<string>("");
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const [receiveAmountSats, setReceiveAmountSats] = useState<string>("");
  const [receivePayLink, setReceivePayLink] = useState<string>("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LN_ADDR_KEY);
      if (stored) setSavedLnAddress(stored);
    } catch {}
  }, []);

  async function saveLnAddress() {
    const candidate = draftLnAddress.trim().toLowerCase();
    if (!isLnAddress(candidate)) {
      toast({ title: "Not a valid Lightning Address", description: "Format must be name@domain.tld", variant: "destructive" });
      return;
    }
    setValidating(true);
    try {
      const r = await apiRequest("POST", "/api/lightning/validate-address", { address: candidate });
      const data = await r.json();
      if (!data.ok) {
        toast({ title: "Could not verify Lightning Address", description: data.reason || "Unknown error", variant: "destructive", duration: 12000 });
        return;
      }
      try { localStorage.setItem(LN_ADDR_KEY, candidate); } catch {}
      setSavedLnAddress(candidate);
      setAddressMeta({ minSats: data.minSendableSats, maxSats: data.maxSendableSats, description: data.metadataDescription });
      setDraftLnAddress("");
      toast({ title: "Lightning Address saved", description: `Anyone can pay you at ${candidate} (${data.minSendableSats}–${data.maxSendableSats} sats).` });
    } catch (err: any) {
      toast({ title: "Validation failed", description: err?.message || "Server error", variant: "destructive" });
    } finally {
      setValidating(false);
    }
  }

  function clearLnAddress() {
    try { localStorage.removeItem(LN_ADDR_KEY); } catch {}
    setSavedLnAddress("");
    setAddressMeta(null);
    toast({ title: "Lightning Address cleared" });
  }

  async function handleSendOpenWallet() {
    const raw = sendInput.trim();
    if (!raw) {
      toast({ title: "Paste an invoice or address", description: "BOLT11 invoice (lnbc…) or Lightning Address (name@domain).", variant: "destructive" });
      return;
    }

    if (isBolt11(raw)) {
      const link = buildLightningDeepLink(raw);
      window.location.href = link;
      toast({ title: "Opening your Lightning wallet…", description: "Approve the payment there. Your wallet handles the actual transfer." });
      return;
    }

    if (isLnAddress(raw)) {
      const sats = parseInt(sendAmountSats, 10);
      if (!Number.isFinite(sats) || sats <= 0) {
        toast({ title: "Amount required for Lightning Address", description: "Enter how many sats to send.", variant: "destructive" });
        return;
      }
      setGeneratingInvoice(true);
      try {
        const r = await apiRequest("POST", "/api/lightning/fetch-invoice", { address: raw, amountSats: sats, comment: sendComment || undefined });
        const data = await r.json();
        if (!data.ok) {
          toast({ title: "Couldn't get invoice", description: data.reason, variant: "destructive", duration: 12000 });
          return;
        }
        setGeneratedInvoice(data.bolt11);
        const link = buildLightningDeepLink(data.bolt11);
        window.location.href = link;
        toast({ title: "Opening your Lightning wallet…", description: `Approve the ${sats}-sat payment to ${raw}.` });
      } catch (err: any) {
        toast({ title: "Server error", description: err?.message || "Could not fetch invoice", variant: "destructive" });
      } finally {
        setGeneratingInvoice(false);
      }
      return;
    }

    toast({ title: "Couldn't parse that", description: "Expected a BOLT11 invoice (starts with lnbc…) or a Lightning Address (name@domain.tld).", variant: "destructive" });
  }

  const receiveDeepLink = useMemo(() => {
    if (!savedLnAddress) return "";
    const sats = parseInt(receiveAmountSats, 10);
    if (Number.isFinite(sats) && sats > 0) {
      return `lightning:${savedLnAddress}?amount=${sats}`;
    }
    return `lightning:${savedLnAddress}`;
  }, [savedLnAddress, receiveAmountSats]);

  useEffect(() => { setReceivePayLink(receiveDeepLink); }, [receiveDeepLink]);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6" data-testid="page-bitcoin-lightning">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-orange-500/10 p-2.5">
          <Bitcoin className="w-6 h-6 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bitcoin & Lightning</h1>
          <p className="text-sm text-muted-foreground">Send and receive BTC over the Lightning Network — non-custodial, your wallet signs every payment.</p>
        </div>
      </div>

      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <p className="font-medium mb-1">CryptoOwnBank never holds your Lightning funds.</p>
            <p className="text-muted-foreground">
              We open a payment in your Lightning wallet (Phoenix, Muun, Wallet of Satoshi, Breez, Zeus, etc.). You approve every payment there. We never see or hold a key.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send" data-testid="tab-send">Send</TabsTrigger>
          <TabsTrigger value="receive" data-testid="tab-receive">Receive</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-yellow-500" /> Pay over Lightning
              </CardTitle>
              <CardDescription>Paste a BOLT11 invoice or a Lightning Address. We open it in your Lightning wallet to sign.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="send-input">Invoice or Lightning Address</Label>
                <Textarea
                  id="send-input"
                  data-testid="input-send-target"
                  placeholder="lnbc1500n1p…  or  alice@walletofsatoshi.com"
                  value={sendInput}
                  onChange={(e) => setSendInput(e.target.value)}
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>

              {isLnAddress(sendInput.trim()) && (
                <>
                  <div>
                    <Label htmlFor="send-amount">Amount (sats)</Label>
                    <Input
                      id="send-amount"
                      data-testid="input-send-amount"
                      type="number"
                      min={1}
                      placeholder="e.g. 1000"
                      value={sendAmountSats}
                      onChange={(e) => setSendAmountSats(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="send-comment">Comment (optional)</Label>
                    <Input
                      id="send-comment"
                      data-testid="input-send-comment"
                      placeholder="Coffee tip"
                      value={sendComment}
                      onChange={(e) => setSendComment(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                </>
              )}

              <Button
                onClick={handleSendOpenWallet}
                disabled={generatingInvoice || !sendInput.trim()}
                className="w-full"
                data-testid="button-open-wallet"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {generatingInvoice ? "Fetching invoice…" : "Open in Lightning wallet"}
              </Button>

              {generatedInvoice && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>If your wallet didn't open, scan or copy:</Label>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-md bg-muted/30">
                    <QrImage value={generatedInvoice} />
                    <CopyButton value={generatedInvoice} label="Copy invoice" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receive" className="space-y-4 mt-4">
          {!savedLnAddress ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add your Lightning Address</CardTitle>
                <CardDescription>
                  Get this from your Lightning wallet (Wallet of Satoshi, Phoenix, Alby, etc.). Format: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">name@domain.tld</code>.
                  We verify it works, then anyone can pay you with one tap.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="ln-addr">Lightning Address</Label>
                  <Input
                    id="ln-addr"
                    data-testid="input-ln-address"
                    placeholder="you@walletofsatoshi.com"
                    value={draftLnAddress}
                    onChange={(e) => setDraftLnAddress(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                <Button onClick={saveLnAddress} disabled={validating || !draftLnAddress.trim()} data-testid="button-save-ln">
                  {validating ? "Verifying…" : "Verify & save"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-yellow-500" /> Your Lightning Address
                    </CardTitle>
                    <CardDescription>Share this with anyone — they pay you, you keep custody.</CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0">Verified</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40">
                  <code className="font-mono text-sm flex-1 break-all" data-testid="text-ln-address">{savedLnAddress}</code>
                  <CopyButton value={savedLnAddress} />
                </div>

                {addressMeta && (
                  <p className="text-xs text-muted-foreground">
                    Accepts {addressMeta.minSats.toLocaleString()}–{addressMeta.maxSats.toLocaleString()} sats per payment.
                    {addressMeta.description ? ` "${addressMeta.description}"` : ""}
                  </p>
                )}

                <div>
                  <Label htmlFor="receive-amount">Request a specific amount (sats, optional)</Label>
                  <Input
                    id="receive-amount"
                    data-testid="input-receive-amount"
                    type="number"
                    min={1}
                    placeholder="leave blank for any amount"
                    value={receiveAmountSats}
                    onChange={(e) => setReceiveAmountSats(e.target.value)}
                  />
                </div>

                <div className="flex flex-col items-center gap-2 p-3 rounded-md bg-muted/30">
                  <QrImage value={receivePayLink} />
                  <p className="text-xs text-muted-foreground text-center">Scan with any Lightning wallet</p>
                  <CopyButton value={receivePayLink} label="Copy payment link" />
                </div>

                <Button variant="ghost" size="sm" onClick={clearLnAddress} data-testid="button-clear-ln" className="text-muted-foreground">
                  Use a different address
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">Need a Lightning wallet?</CardTitle>
          <CardDescription className="text-xs">All non-custodial or self-custodial. CryptoOwnBank doesn't endorse — pick what fits you.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• <strong>Phoenix</strong> — self-custodial channels, beginner-friendly. <a href="https://phoenix.acinq.co" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">phoenix.acinq.co</a></li>
            <li>• <strong>Muun</strong> — on-chain + Lightning hybrid. <a href="https://muun.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">muun.com</a></li>
            <li>• <strong>Wallet of Satoshi</strong> — easiest, custodial. <a href="https://walletofsatoshi.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">walletofsatoshi.com</a></li>
            <li>• <strong>Breez</strong> — self-custodial w/ POS features. <a href="https://breez.technology" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">breez.technology</a></li>
            <li>• <strong>Zeus</strong> — power users, connects to your own node. <a href="https://zeusln.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">zeusln.app</a></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
