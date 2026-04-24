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
const BTC_ONCHAIN_KEY = "cob.btc_onchain_address";
const BOLT11_RE = /^ln(bc|tb)[0-9]{0,10}[munp]?[a-z0-9]+$/i;
const LN_ADDR_RE = /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const BTC_BECH32_RE = /^bc1[ac-hj-np-z02-9]{8,87}$/i;
const BTC_BASE58_RE = /^[13][1-9A-HJ-NP-Za-km-z]{25,39}$/;

function isLnAddress(s: string) {
  return LN_ADDR_RE.test(s.trim());
}
function isBolt11(s: string) {
  const stripped = s.trim().toLowerCase().replace(/^lightning:/, "");
  return BOLT11_RE.test(stripped);
}
function isBtcOnchain(s: string) {
  const stripped = s.trim().replace(/^bitcoin:/i, "").split("?")[0];
  return BTC_BECH32_RE.test(stripped) || BTC_BASE58_RE.test(stripped);
}
function btcAddressKind(s: string): string {
  const stripped = s.trim().replace(/^bitcoin:/i, "").split("?")[0].toLowerCase();
  if (stripped.startsWith("bc1p")) return "Taproot (bc1p…)";
  if (stripped.startsWith("bc1q")) return "Native SegWit (bc1q…)";
  if (stripped.startsWith("3")) return "P2SH (3…)";
  if (stripped.startsWith("1")) return "Legacy (1…)";
  return "Bitcoin address";
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

  const [pastedInvoice, setPastedInvoice] = useState<string>("");
  const [acceptedInvoice, setAcceptedInvoice] = useState<string>("");
  const [invoiceError, setInvoiceError] = useState<string>("");

  const [savedBtcAddress, setSavedBtcAddress] = useState<string>("");
  const [draftBtcAddress, setDraftBtcAddress] = useState<string>("");
  const [btcRequestAmount, setBtcRequestAmount] = useState<string>("");
  const [btcRequestLabel, setBtcRequestLabel] = useState<string>("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LN_ADDR_KEY);
      if (stored) setSavedLnAddress(stored);
      const storedBtc = localStorage.getItem(BTC_ONCHAIN_KEY);
      if (storedBtc) setSavedBtcAddress(storedBtc);
    } catch {}
  }, []);

  function saveBtcAddress() {
    const candidate = draftBtcAddress.trim().replace(/^bitcoin:/i, "").split("?")[0];
    if (!isBtcOnchain(candidate)) {
      toast({ title: "Not a valid Bitcoin address", description: "Should start with bc1, 3, or 1 and be 26–90 characters.", variant: "destructive" });
      return;
    }
    try { localStorage.setItem(BTC_ONCHAIN_KEY, candidate); } catch {}
    setSavedBtcAddress(candidate);
    setDraftBtcAddress("");
    toast({ title: "Bitcoin address saved", description: `Anyone can send BTC to ${btcAddressKind(candidate)} ${candidate.slice(0, 10)}…` });
  }

  function clearBtcAddress() {
    try { localStorage.removeItem(BTC_ONCHAIN_KEY); } catch {}
    setSavedBtcAddress("");
    setBtcRequestAmount("");
    setBtcRequestLabel("");
    toast({ title: "Bitcoin address cleared" });
  }

  const btcReceiveUri = useMemo(() => {
    if (!savedBtcAddress) return "";
    const params = new URLSearchParams();
    const amt = parseFloat(btcRequestAmount);
    if (Number.isFinite(amt) && amt > 0) params.set("amount", amt.toString());
    if (btcRequestLabel.trim()) params.set("label", btcRequestLabel.trim());
    const qs = params.toString();
    return qs ? `bitcoin:${savedBtcAddress}?${qs}` : `bitcoin:${savedBtcAddress}`;
  }, [savedBtcAddress, btcRequestAmount, btcRequestLabel]);

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
          <p className="text-sm text-muted-foreground">Send and receive BTC on-chain or over Lightning — non-custodial, your wallet signs every payment.</p>
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="send" data-testid="tab-send">Send</TabsTrigger>
          <TabsTrigger value="receive" data-testid="tab-receive">Receive ⚡</TabsTrigger>
          <TabsTrigger value="receive-onchain" data-testid="tab-receive-onchain">Receive BTC</TabsTrigger>
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

                <div className="pt-4 mt-2 border-t space-y-2">
                  <div>
                    <p className="text-sm font-medium">Using Phoenix, Muun, or any wallet that doesn't give a Lightning Address?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Open your wallet, tap <strong>Receive</strong>, copy the BOLT11 invoice it generates (starts with <code className="text-[10px] bg-muted px-1 rounded">lnbc…</code>), and paste it below. We'll show a QR + copy link you can share. Each invoice is single-use and expires after about an hour.
                    </p>
                  </div>
                  <Label htmlFor="paste-invoice">BOLT11 invoice (single-use)</Label>
                  <Textarea
                    id="paste-invoice"
                    data-testid="input-paste-invoice"
                    placeholder="lnbc1p57kagl..."
                    value={pastedInvoice}
                    onChange={(e) => { setPastedInvoice(e.target.value); setInvoiceError(""); }}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    rows={3}
                    className="font-mono text-xs"
                  />
                  {invoiceError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {invoiceError}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const stripped = pastedInvoice.trim().toLowerCase().replace(/^lightning:/, "");
                      if (!stripped) {
                        setInvoiceError("Paste a BOLT11 invoice first.");
                        return;
                      }
                      if (!isBolt11(stripped)) {
                        setInvoiceError("That doesn't look like a BOLT11 invoice. It should start with lnbc and be a long string of letters/numbers.");
                        return;
                      }
                      setAcceptedInvoice(stripped);
                      setInvoiceError("");
                    }}
                    disabled={!pastedInvoice.trim()}
                    data-testid="button-show-invoice-qr"
                  >
                    Show QR &amp; copy link
                  </Button>

                  {acceptedInvoice && (
                    <div className="flex flex-col items-center gap-2 p-3 rounded-md bg-muted/30 mt-3">
                      <QrImage value={acceptedInvoice} />
                      <p className="text-[11px] text-muted-foreground text-center">
                        Single-use invoice — expires in ~1 hour. Generate a fresh one in Phoenix for the next payment.
                      </p>
                      <CopyButton value={acceptedInvoice} label="Copy invoice" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setAcceptedInvoice(""); setPastedInvoice(""); }}
                        data-testid="button-clear-invoice"
                        className="text-muted-foreground"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
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

        <TabsContent value="receive-onchain" className="space-y-4 mt-4">
          {!savedBtcAddress ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bitcoin className="w-5 h-5 text-orange-500" /> Add your Bitcoin address
                </CardTitle>
                <CardDescription>
                  Just like an XRP address — static, reusable, anyone can send to it. Get this from your wallet's <strong>Receive → Bitcoin</strong> screen (in Phoenix, tap Receive then switch from Lightning to Bitcoin). Format: starts with <code className="text-xs bg-muted px-1.5 py-0.5 rounded">bc1</code>, <code className="text-xs bg-muted px-1.5 py-0.5 rounded">3</code>, or <code className="text-xs bg-muted px-1.5 py-0.5 rounded">1</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="btc-addr">Bitcoin address</Label>
                  <Textarea
                    id="btc-addr"
                    data-testid="input-btc-address"
                    placeholder="bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"
                    value={draftBtcAddress}
                    onChange={(e) => setDraftBtcAddress(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    rows={2}
                    className="font-mono text-xs"
                  />
                </div>
                <Button onClick={saveBtcAddress} disabled={!draftBtcAddress.trim()} data-testid="button-save-btc">
                  Save Bitcoin address
                </Button>
                <p className="text-xs text-muted-foreground pt-2">
                  Note: on-chain Bitcoin payments take ~10–60 minutes to confirm and cost network fees ($1–$50 depending on traffic). For instant, near-free small payments, use the Lightning tab instead.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bitcoin className="w-5 h-5 text-orange-500" /> Your Bitcoin address
                    </CardTitle>
                    <CardDescription>{btcAddressKind(savedBtcAddress)} — share with anyone, they send BTC, it lands in your wallet.</CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0">Saved</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40">
                  <code className="font-mono text-xs flex-1 break-all" data-testid="text-btc-address">{savedBtcAddress}</code>
                  <CopyButton value={savedBtcAddress} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="btc-amount">Request amount (BTC, optional)</Label>
                    <Input
                      id="btc-amount"
                      data-testid="input-btc-amount"
                      type="number"
                      step="0.00000001"
                      min={0}
                      placeholder="0.001"
                      value={btcRequestAmount}
                      onChange={(e) => setBtcRequestAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="btc-label">Label (optional)</Label>
                    <Input
                      id="btc-label"
                      data-testid="input-btc-label"
                      placeholder="Invoice #123"
                      value={btcRequestLabel}
                      onChange={(e) => setBtcRequestLabel(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 p-3 rounded-md bg-muted/30">
                  <QrImage value={btcReceiveUri} />
                  <p className="text-xs text-muted-foreground text-center">Scan with any Bitcoin wallet, or copy below</p>
                  <CopyButton value={btcReceiveUri} label="Copy payment link" />
                  <CopyButton value={savedBtcAddress} label="Copy address only" />
                </div>

                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                  <p>• Confirmations take ~10 minutes per block. 1 confirmation is usually enough for small amounts; wait 3–6 for larger ones.</p>
                  <p>• You'll see incoming payments in your Phoenix wallet, not here. We don't custody anything — we just save the address for sharing.</p>
                </div>

                <Button variant="ghost" size="sm" onClick={clearBtcAddress} data-testid="button-clear-btc" className="text-muted-foreground">
                  Use a different address
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">Wallet compatibility</CardTitle>
          <CardDescription className="text-xs">All non-custodial or self-custodial. CryptoOwnBank doesn't endorse — pick what fits you. Every wallet works with at least one of our receive methods.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left py-2 pr-2 font-medium">Wallet</th>
                  <th className="text-center py-2 px-1 font-medium">⚡ LN Address<br/><span className="text-[10px] font-normal">(reusable)</span></th>
                  <th className="text-center py-2 px-1 font-medium">⚡ Paste invoice<br/><span className="text-[10px] font-normal">(one-time)</span></th>
                  <th className="text-center py-2 px-1 font-medium">₿ On-chain<br/><span className="text-[10px] font-normal">(reusable)</span></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b">
                  <td className="py-2 pr-2"><a href="https://phoenix.acinq.co" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Phoenix</a><div className="text-[10px] text-muted-foreground">self-custodial channels</div></td>
                  <td className="text-center px-1 text-muted-foreground">—</td>
                  <td className="text-center px-1 text-green-600">✓</td>
                  <td className="text-center px-1 text-green-600">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-2"><a href="https://muun.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Muun</a><div className="text-[10px] text-muted-foreground">on-chain + Lightning hybrid</div></td>
                  <td className="text-center px-1 text-muted-foreground">—</td>
                  <td className="text-center px-1 text-green-600">✓</td>
                  <td className="text-center px-1 text-green-600">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-2"><a href="https://walletofsatoshi.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Wallet of Satoshi</a><div className="text-[10px] text-muted-foreground">easiest, custodial</div></td>
                  <td className="text-center px-1 text-green-600">✓</td>
                  <td className="text-center px-1 text-green-600">✓</td>
                  <td className="text-center px-1 text-green-600">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-2"><a href="https://breez.technology" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Breez</a><div className="text-[10px] text-muted-foreground">self-custodial, POS features</div></td>
                  <td className="text-center px-1 text-green-600">✓</td>
                  <td className="text-center px-1 text-green-600">✓</td>
                  <td className="text-center px-1 text-green-600">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-2"><a href="https://zeusln.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Zeus</a><div className="text-[10px] text-muted-foreground">connects to your own node</div></td>
                  <td className="text-center px-1 text-yellow-600" title="Only if your node runs an LNURL service">~</td>
                  <td className="text-center px-1 text-green-600">✓</td>
                  <td className="text-center px-1 text-green-600">✓</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2"><a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Alby</a><div className="text-[10px] text-muted-foreground">bridge → Phoenix via NWC</div></td>
                  <td className="text-center px-1 text-green-600">✓</td>
                  <td className="text-center px-1 text-muted-foreground">—</td>
                  <td className="text-center px-1 text-muted-foreground">—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Reading this:</strong> ✓ = works out of the box. ~ = works in some setups. — = wallet doesn't expose this option (use a different method from the same row). Phoenix and Muun are the most common case — they don't issue a Lightning Address, so use the "paste invoice" option on the Receive ⚡ tab, or save the on-chain address on the Receive BTC tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
