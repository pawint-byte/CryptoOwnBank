import { useState } from "react";
import { SeoHead } from "@/components/seo-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  HelpCircle,
  Zap,
  Building2,
  Clock,
  DollarSign,
  Globe,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  QrCode,
  Info,
  Shield,
} from "lucide-react";

const STELLAR_CURRENCIES = [
  { code: "XLM", label: "XLM (Stellar Lumens)", issuer: null },
  { code: "USDC", label: "USDC (Circle)", issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" },
  { code: "EURCV", label: "EURCV (Societe Generale)", issuer: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y36DAVIZA67UEAX7CTAZ5STE" },
];

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function StellarSend() {
  const { toast } = useToast();

  const [educationOpen, setEducationOpen] = useState(true);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("XLM");
  const [memo, setMemo] = useState("");
  const [memoType, setMemoType] = useState("text");
  const [showTxDetails, setShowTxDetails] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function handleCopy(value: string, label: string) {
    navigator.clipboard.writeText(value);
    setCopied(label);
    toast({ title: `${label} copied` });
    setTimeout(() => setCopied(null), 2000);
  }

  function handleGenerateTransaction() {
    if (!recipient.trim()) {
      toast({ title: "Missing Recipient", description: "Enter a Stellar destination address.", variant: "destructive" });
      return;
    }
    if (!recipient.startsWith("G") || recipient.length !== 56) {
      toast({ title: "Invalid Address", description: "Stellar addresses start with 'G' and are 56 characters long.", variant: "destructive" });
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Enter a valid amount to send.", variant: "destructive" });
      return;
    }
    setShowTxDetails(true);
  }

  function buildStellarUri(): string {
    const selectedCurrency = STELLAR_CURRENCIES.find(c => c.code === currency);
    let uri = `web+stellar:pay?destination=${recipient}&amount=${amount}`;
    if (selectedCurrency && selectedCurrency.issuer) {
      uri += `&asset_code=${currency}&asset_issuer=${selectedCurrency.issuer}`;
    }
    if (memo.trim()) {
      uri += `&memo=${encodeURIComponent(memo)}&memo_type=MEMO_${memoType.toUpperCase()}`;
    }
    return uri;
  }

  const txParams = [
    { label: "Destination", value: recipient },
    { label: "Amount", value: `${amount} ${currency}` },
    ...(memo.trim() ? [{ label: `Memo (${memoType})`, value: memo }] : []),
  ];

  return (
    <div className="space-y-6">
      <SeoHead
        title="Stellar Send — CryptoOwnBank | Send Payments via Stellar Network"
        description="Send payments via Stellar network with automatic currency conversion. Fast, low-cost cross-border transfers using XLM, USDC, and more."
        path="/stellar/send"
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-stellar-send-title">
            Stellar Send
          </h1>
          <p className="text-muted-foreground">
            Send payments via Stellar &mdash; fast, low-cost, with automatic currency conversion
          </p>
        </div>
        <Badge variant="outline" data-testid="badge-stellar-network">
          <Globe className="h-3 w-3 mr-1" />
          Stellar Network
        </Badge>
      </div>

      <Collapsible open={educationOpen} onOpenChange={setEducationOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">
                <Sparkles className="h-4 w-4 inline mr-2 text-[#7B61FF]" />
                Why Stellar? Path Payments Explained
              </CardTitle>
              {educationOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md border p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-muted-foreground" data-testid="text-old-way-heading">Traditional Remittance</h4>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li data-testid="text-trad-fee">Western Union / MoneyGram: 5-7% fees</li>
                    <li data-testid="text-trad-time">Delivery: 1-3 business days</li>
                    <li data-testid="text-trad-hours">Limited hours, closed on holidays</li>
                    <li data-testid="text-trad-rate">Hidden exchange rate markups</li>
                  </ul>
                </div>
                <div className="rounded-md border border-[#7B61FF]/30 bg-[#7B61FF]/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-[#7B61FF]" />
                    <h4 className="text-sm font-semibold" data-testid="text-stellar-way-heading">Stellar Path Payment</h4>
                  </div>
                  <ul className="text-sm space-y-1.5">
                    <li data-testid="text-stellar-fee">Near-zero fees (~0.00001 XLM per tx)</li>
                    <li data-testid="text-stellar-time">Settlement in ~4 seconds</li>
                    <li data-testid="text-stellar-always">Works 24/7/365, worldwide</li>
                    <li data-testid="text-stellar-convert">Auto-currency conversion via path payments</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-md bg-[#7B61FF]/5 border border-[#7B61FF]/20 p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2" data-testid="text-path-payments-heading">
                  <ArrowRight className="h-4 w-4 text-[#7B61FF]" />
                  What Are Path Payments?
                </h4>
                <p className="text-sm text-muted-foreground">
                  Path payments are Stellar's killer feature for remittances. You send USD, and the recipient gets PHP (Philippine Pesos) &mdash; Stellar's decentralized exchange finds the best conversion route automatically. No intermediary bank needed.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">You send: USD</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline">Stellar DEX</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline">They get: PHP</Badge>
                </div>
              </div>

              <div className="rounded-md bg-muted/30 border border-muted p-4 space-y-2">
                <h4 className="text-sm font-semibold" data-testid="text-stellar-basics">Stellar Basics</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>
                    <span className="font-medium text-foreground">Stellar Address</span> (starts with &apos;G&apos;) &mdash; a 56-character public key identifying your Stellar account.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Memo</span> &mdash; like a reference number. Exchanges require a memo to credit your account correctly.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Trustlines</span> &mdash; you must explicitly trust an asset issuer before receiving tokens like USDC or EURCV.
                  </li>
                </ul>
              </div>

              <a
                href="https://developers.stellar.org/docs/learn/fundamentals/transactions/list-of-operations#path-payment-strict-send"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#7B61FF] hover:underline inline-flex items-center gap-1"
                data-testid="link-stellar-docs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Learn more at Stellar Docs
              </a>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send via Stellar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Recipient Address</label>
                <Input
                  placeholder="GXXXXXXXXX..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  data-testid="input-stellar-recipient"
                />
                <p className="text-xs text-muted-foreground mt-1">Stellar public key (starts with G, 56 characters)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Amount</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="any"
                    min="0"
                    data-testid="input-stellar-amount"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="text-sm font-medium">Currency</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[240px] text-xs">Select the asset to send. Recipient must have a trustline for non-XLM assets.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger data-testid="select-stellar-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STELLAR_CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code} data-testid={`select-stellar-currency-${c.code}`}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="text-sm font-medium">Memo</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[240px] text-xs">Required by exchanges to identify your deposit. Personal wallets usually don't need one.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    placeholder="Optional (required for exchanges)"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    data-testid="input-stellar-memo"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Memo Type</label>
                  <Select value={memoType} onValueChange={setMemoType}>
                    <SelectTrigger data-testid="select-stellar-memo-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text" data-testid="select-memo-type-text">Text</SelectItem>
                      <SelectItem value="id" data-testid="select-memo-type-id">ID (numeric)</SelectItem>
                      <SelectItem value="hash" data-testid="select-memo-type-hash">Hash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleGenerateTransaction}
                  className="bg-[#7B61FF] text-white border-[#7B61FF]"
                  data-testid="button-generate-stellar-tx"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Generate Transaction
                </Button>
              </div>
            </CardContent>
          </Card>

          <Alert className="border-amber-500/40 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle data-testid="text-stellar-safety-heading">Before You Send</AlertTitle>
            <AlertDescription>
              <ul className="text-sm space-y-1 mt-1">
                <li data-testid="text-stellar-safety-1">Verify the recipient address carefully &mdash; Stellar transactions are irreversible</li>
                <li data-testid="text-stellar-safety-2">Ensure the recipient has a trustline for non-XLM assets (USDC, EURCV)</li>
                <li data-testid="text-stellar-safety-3">Include the correct memo when sending to exchanges</li>
                <li data-testid="text-stellar-safety-4">Send a small test amount first for new recipients</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-[#7B61FF]" />
                How to Execute
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Since CryptoOwnBank is non-custodial, we generate the transaction details for you. Execute it using your preferred Stellar wallet:
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 mt-0.5">1</Badge>
                  <p className="text-sm text-muted-foreground">Fill in the send form with recipient and amount</p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 mt-0.5">2</Badge>
                  <p className="text-sm text-muted-foreground">Click "Generate Transaction" to create parameters</p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 mt-0.5">3</Badge>
                  <p className="text-sm text-muted-foreground">Copy parameters or use the deep link to open in your wallet app</p>
                </div>
              </div>
              <div className="rounded-md border p-3 space-y-2 mt-3">
                <p className="text-xs font-semibold">Supported Wallet Apps</p>
                <div className="flex flex-wrap gap-1.5">
                  <a href="https://lobstr.co" target="_blank" rel="noopener noreferrer" data-testid="link-lobstr">
                    <Badge variant="outline">LOBSTR</Badge>
                  </a>
                  <a href="https://stellarterm.com" target="_blank" rel="noopener noreferrer" data-testid="link-stellarterm">
                    <Badge variant="outline">StellarTerm</Badge>
                  </a>
                  <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" data-testid="link-freighter">
                    <Badge variant="outline">Freighter</Badge>
                  </a>
                  <a href="https://solar.org" target="_blank" rel="noopener noreferrer" data-testid="link-solar">
                    <Badge variant="outline">Solar</Badge>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#7B61FF]" />
                Why Stellar for This?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <DollarSign className="h-4 w-4 text-[#7B61FF] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Near-Zero Fees</p>
                    <p className="text-muted-foreground">~0.00001 XLM per operation (~$0.000001). Send $1,000 for less than a penny.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-[#7B61FF] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">4-Second Finality</p>
                    <p className="text-muted-foreground">Transactions confirm in ~4 seconds. No waiting days for settlement.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 text-[#7B61FF] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Auto Currency Conversion</p>
                    <p className="text-muted-foreground">Path payments convert currencies atomically. Send USDC, recipient gets their local currency.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 text-[#7B61FF] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Regulated Stablecoins</p>
                    <p className="text-muted-foreground">USDC (Circle) and EURCV (SocGen) are fully backed, audited stablecoins on Stellar.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fee Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2 py-1.5 border-b">
                  <span className="text-muted-foreground">Western Union</span>
                  <span className="font-medium">5-7% + markup</span>
                </div>
                <div className="flex items-center justify-between gap-2 py-1.5 border-b">
                  <span className="text-muted-foreground">Wire Transfer</span>
                  <span className="font-medium">$25-50 flat</span>
                </div>
                <div className="flex items-center justify-between gap-2 py-1.5 border-b">
                  <span className="text-muted-foreground">PayPal (intl)</span>
                  <span className="font-medium">3-4% + FX</span>
                </div>
                <div className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-[#7B61FF] font-medium">Stellar</span>
                  <span className="font-medium text-[#7B61FF]">~$0.000001</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showTxDetails} onOpenChange={setShowTxDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[#7B61FF]" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy these parameters into your Stellar wallet app, or use the deep link below to open directly.
            </p>
            <div className="space-y-3">
              {txParams.map((param) => (
                <div key={param.label} className="flex items-start justify-between gap-2 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{param.label}</p>
                    <p className="text-sm font-mono break-all" data-testid={`text-tx-${param.label.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                      {param.value}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleCopy(param.value, param.label)}
                    data-testid={`button-copy-${param.label.toLowerCase().replace(/[^a-z]/g, "-")}`}
                  >
                    {copied === param.label ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-[#7B61FF]/20 bg-[#7B61FF]/5 p-3 space-y-2">
              <p className="text-xs font-semibold">Stellar URI (for compatible wallets)</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono break-all flex-1 text-muted-foreground" data-testid="text-stellar-uri">
                  {buildStellarUri()}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleCopy(buildStellarUri(), "URI")}
                  data-testid="button-copy-uri"
                >
                  {copied === "URI" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Open this URI in a Stellar-compatible wallet (LOBSTR, StellarTerm, Freighter, or Solar) to pre-fill and sign the transaction securely.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTxDetails(false)}
              data-testid="button-close-tx-details"
            >
              Close
            </Button>
            <Button
              className="bg-[#7B61FF] text-white border-[#7B61FF]"
              onClick={() => {
                window.open(buildStellarUri(), "_blank");
              }}
              data-testid="button-open-wallet"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
