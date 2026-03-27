import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { InlineStellarConnect } from "@/components/inline-stellar-connect";
import { SeoHead } from "@/components/seo-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useUserData } from "@/hooks/use-user-data";
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
  ArrowDownToLine,
  Users,
  Plus,
  Trash2,
  Star,
  Plug,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useStellarStore, type StellarBalance } from "@/lib/stellar-store";
import { StellarWalletPicker } from "@/components/stellar-wallet-picker";
import {
  isFreighterInstalled,
  connectFreighter,
  buildAndSignPayment,
} from "@/lib/freighter-connector";

import { CHAIN_COLORS } from "@/lib/constants";
const STELLAR_PURPLE = CHAIN_COLORS.stellar;

const DEFAULT_CURRENCIES = [
  { code: "XLM", label: "XLM (Stellar Lumens)", issuer: null },
  { code: "USDC", label: "USDC (Circle)", issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" },
  { code: "EURC", label: "EURC (Circle)", issuer: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y36DAVIZA67UEAX7CTAZ5STE" },
];

interface CurrencyOption {
  value: string;
  code: string;
  label: string;
  issuer: string | null;
}

function makeCurrencyValue(code: string, issuer: string | null): string {
  return issuer ? `${code}:${issuer}` : code;
}

function deriveCurrenciesFromBalances(balances: StellarBalance[]): CurrencyOption[] {
  if (!balances.length) return DEFAULT_CURRENCIES.map((dc) => ({
    value: makeCurrencyValue(dc.code, dc.issuer),
    code: dc.code,
    label: dc.label,
    issuer: dc.issuer,
  }));
  const fromWallet: CurrencyOption[] = balances.map((b) => ({
    value: makeCurrencyValue(b.asset_code, b.asset_issuer),
    code: b.asset_code,
    label: b.asset_type === "native" ? "XLM (Stellar Lumens)" : b.asset_code,
    issuer: b.asset_issuer,
  }));
  DEFAULT_CURRENCIES.forEach((dc) => {
    const val = makeCurrencyValue(dc.code, dc.issuer);
    if (!fromWallet.find((w) => w.value === val)) {
      fromWallet.push({ value: val, code: dc.code, label: dc.label, issuer: dc.issuer });
    }
  });
  return fromWallet;
}

interface StellarContact {
  name: string;
  address: string;
  memo?: string;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function StellarSend() {
  const { toast } = useToast();
  const { stellarAddress, isConnected, balances, recentRecipients, addRecentRecipient } = useStellarStore();
  const STELLAR_CURRENCIES = deriveCurrenciesFromBalances(balances);

  const [activeTab, setActiveTab] = useState("send");
  const [educationOpen, setEducationOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [currencyValue, setCurrencyValue] = useState("XLM");
  const selectedCurrency = STELLAR_CURRENCIES.find((c) => c.value === currencyValue) || STELLAR_CURRENCIES[0];
  const currency = selectedCurrency.code;
  const [memo, setMemo] = useState("");
  const [memoType, setMemoType] = useState("text");
  const [showTxDetails, setShowTxDetails] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [freighterAvailable, setFreighterAvailable] = useState(false);
  const [freighterAddress, setFreighterAddress] = useState<string | null>(null);
  const [freighterConnecting, setFreighterConnecting] = useState(false);
  const [signingInProgress, setSigningInProgress] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<{ txHash: string } | null>(null);

  useEffect(() => {
    isFreighterInstalled().then(setFreighterAvailable);
  }, []);

  const handleConnectFreighter = async () => {
    setFreighterConnecting(true);
    try {
      const result = await connectFreighter();
      if (result.error) {
        toast({ title: "Freighter Connection Failed", description: result.error, variant: "destructive" });
      } else if (result.address) {
        setFreighterAddress(result.address);
        toast({ title: "Freighter Connected", description: `Address: ${result.address.slice(0, 8)}...${result.address.slice(-4)}` });
      }
    } catch {
      toast({ title: "Freighter error", variant: "destructive" });
    } finally {
      setFreighterConnecting(false);
    }
  };

  const handleFreighterSend = async () => {
    const connectResult = await connectFreighter();
    if (!connectResult.address) {
      toast({ title: "Connect Freighter first", description: connectResult.error, variant: "destructive" });
      return;
    }
    const sourceAddr = connectResult.address;
    setFreighterAddress(sourceAddr);
    if (!recipient.trim() || !recipient.startsWith("G") || recipient.length !== 56) {
      toast({ title: "Invalid recipient address", variant: "destructive" });
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }

    setSigningInProgress(true);
    try {
      const result = await buildAndSignPayment({
        sourceAddress: sourceAddr,
        destination: recipient.trim(),
        asset: {
          code: selectedCurrency.code,
          issuer: selectedCurrency.issuer,
          type: selectedCurrency.issuer ? "credit_alphanum4" : "native",
        },
        amount: numAmount.toFixed(7),
        memo: memo.trim() || undefined,
        memoType,
      });

      if (result.success) {
        setSendSuccess({ txHash: result.txHash! });
        addRecentRecipient(recipient.trim());
        try {
          await apiRequest("POST", "/api/send/disposal-notification", {
            chain: "Stellar",
            assetSymbol: currency,
            quantity: amount,
            walletAddress: sourceAddr,
            recipient: recipient.trim(),
            memo: memo.trim() || undefined,
          });
        } catch {}
        toast({ title: "Payment Sent", description: `${amount} ${currency} sent successfully on Stellar` });
      } else {
        toast({ title: "Payment Failed", description: result.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Send Error", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSigningInProgress(false);
    }
  };

  const [receiveAmount, setReceiveAmount] = useState("");
  const [receiveCurrencyValue, setReceiveCurrencyValue] = useState("XLM");
  const [receiveMemo, setReceiveMemo] = useState("");

  const { data: contacts, save: saveContacts } = useUserData<StellarContact[]>("stellar_contacts", []);
  const [newContactName, setNewContactName] = useState("");
  const [newContactAddress, setNewContactAddress] = useState("");
  const [newContactMemo, setNewContactMemo] = useState("");
  const [addContactOpen, setAddContactOpen] = useState(false);

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
    addRecentRecipient(recipient.trim());
    setShowTxDetails(true);
  }

  function buildStellarUri(): string {
    let uri = `web+stellar:pay?destination=${recipient}&amount=${amount}`;
    if (selectedCurrency.issuer) {
      uri += `&asset_code=${currency}&asset_issuer=${selectedCurrency.issuer}`;
    }
    if (memo.trim()) {
      uri += `&memo=${encodeURIComponent(memo)}&memo_type=MEMO_${memoType.toUpperCase()}`;
    }
    return uri;
  }

  function buildReceiveUri(): string {
    if (!stellarAddress) return "";
    const receiveSelected = STELLAR_CURRENCIES.find(c => c.value === receiveCurrencyValue) || STELLAR_CURRENCIES[0];
    let uri = `web+stellar:pay?destination=${stellarAddress}`;
    if (receiveAmount) {
      uri += `&amount=${receiveAmount}`;
    }
    if (receiveSelected.issuer) {
      uri += `&asset_code=${receiveSelected.code}&asset_issuer=${receiveSelected.issuer}`;
    }
    if (receiveMemo.trim()) {
      uri += `&memo=${encodeURIComponent(receiveMemo)}&memo_type=MEMO_TEXT`;
    }
    return uri;
  }

  function handleAddContact() {
    if (!newContactName.trim() || !newContactAddress.trim()) {
      toast({ title: "Missing Fields", variant: "destructive" });
      return;
    }
    if (!newContactAddress.startsWith("G") || newContactAddress.length !== 56) {
      toast({ title: "Invalid Address", description: "Stellar addresses start with 'G' and are 56 characters.", variant: "destructive" });
      return;
    }
    const updated = [...contacts, { name: newContactName.trim(), address: newContactAddress.trim(), memo: newContactMemo.trim() || undefined }];
    saveContacts(updated);
    setNewContactName("");
    setNewContactAddress("");
    setNewContactMemo("");
    setAddContactOpen(false);
    toast({ title: "Contact Added" });
  }

  function handleDeleteContact(idx: number) {
    const updated = contacts.filter((_, i) => i !== idx);
    saveContacts(updated);
    toast({ title: "Contact Removed" });
  }

  function handleUseContact(contact: StellarContact) {
    setRecipient(contact.address);
    if (contact.memo) setMemo(contact.memo);
    setActiveTab("send");
    toast({ title: `Sending to ${contact.name}` });
  }

  const txParams = [
    { label: "Destination", value: recipient },
    { label: "Amount", value: `${amount} ${currency}` },
    ...(memo.trim() ? [{ label: `Memo (${memoType})`, value: memo }] : []),
  ];

  const receiveQrUrl = stellarAddress
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(buildReceiveUri())}`
    : "";

  return (
    <div className="space-y-6">
      <SeoHead
        title="Send Money Without a Bank — CryptoOwnBank | Stellar Payments in Seconds"
        description="Send money to anyone worldwide without a bank account. Wallet-to-wallet Stellar payments in seconds for near-zero fees. USDC, XLM, and stablecoin transfers. Perfect for remittances, freelancer payments, and family support across borders."
        path="/stellar/send"
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-stellar-send-title">
            Stellar Send & Receive
          </h1>
          <p className="text-muted-foreground">
            Send, receive, and manage contacts on the Stellar network
          </p>
        </div>
        <Badge variant="outline" data-testid="badge-stellar-network">
          <Globe className="h-3 w-3 mr-1" />
          Stellar Network
        </Badge>
      </div>

      <StellarWalletPicker label="Active Wallet" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="send" data-testid="tab-stellar-send">
            <Send className="h-4 w-4 mr-1.5" />
            Send
          </TabsTrigger>
          <TabsTrigger value="receive" data-testid="tab-stellar-receive">
            <ArrowDownToLine className="h-4 w-4 mr-1.5" />
            Receive
          </TabsTrigger>
          <TabsTrigger value="contacts" data-testid="tab-stellar-contacts">
            <Users className="h-4 w-4 mr-1.5" />
            Contacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-4 space-y-6">
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
                    {recentRecipients.length > 0 && !recipient && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Recent Recipients</p>
                        <div className="flex flex-wrap gap-1">
                          {recentRecipients.slice(0, 5).map((addr) => (
                            <Button
                              key={addr}
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs font-mono px-2"
                              onClick={() => setRecipient(addr)}
                              data-testid={`button-recent-${addr.slice(0, 8)}`}
                            >
                              {truncateAddress(addr)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
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
                      <Select value={currencyValue} onValueChange={setCurrencyValue}>
                        <SelectTrigger data-testid="select-stellar-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STELLAR_CURRENCIES.map((c) => (
                            <SelectItem key={c.value} value={c.value} data-testid={`select-stellar-currency-${c.code}`}>
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

                  <div className="pt-2 space-y-2">
                    {(freighterAvailable || freighterAddress) && (
                      <>
                        {freighterAddress ? (
                          <Button
                            className="w-full bg-[#7B61FF] text-white border-[#7B61FF]"
                            onClick={handleFreighterSend}
                            disabled={signingInProgress}
                            data-testid="button-freighter-send"
                          >
                            {signingInProgress ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Signing in Freighter...
                              </>
                            ) : (
                              <>
                                <Plug className="h-4 w-4 mr-2" />
                                Sign & Send with Freighter
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            className="w-full bg-[#7B61FF] text-white border-[#7B61FF]"
                            onClick={handleConnectFreighter}
                            disabled={freighterConnecting}
                            data-testid="button-connect-freighter-send"
                          >
                            {freighterConnecting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <Plug className="h-4 w-4 mr-2" />
                                Connect Freighter to Send
                              </>
                            )}
                          </Button>
                        )}
                        {freighterAddress && (
                          <p className="text-[11px] text-center text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Freighter connected — payment will be signed and sent in-browser
                          </p>
                        )}
                      </>
                    )}
                    <Button
                      onClick={handleGenerateTransaction}
                      variant={freighterAddress ? "outline" : "default"}
                      className={freighterAddress ? "w-full" : "w-full bg-[#7B61FF] text-white border-[#7B61FF]"}
                      data-testid="button-generate-stellar-tx"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {freighterAddress ? "Or: Manual / External Wallet" : "Generate Transaction"}
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
                    <li data-testid="text-stellar-safety-2">Ensure the recipient has a trustline for non-XLM assets (USDC, EURC)</li>
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
        </TabsContent>

        <TabsContent value="receive" className="mt-4 space-y-6">
          {!isConnected ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <ArrowDownToLine className="h-12 w-12 text-muted-foreground" />
                <InlineStellarConnect />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base" data-testid="text-receive-heading">Receive Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Your Stellar Address</label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={stellarAddress || ""}
                        readOnly
                        className="font-mono text-xs"
                        data-testid="input-receive-address"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopy(stellarAddress!, "Address")}
                        data-testid="button-copy-receive-address"
                      >
                        {copied === "Address" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Amount (optional)</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={receiveAmount}
                        onChange={(e) => setReceiveAmount(e.target.value)}
                        step="any"
                        min="0"
                        data-testid="input-receive-amount"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Currency</label>
                      <Select value={receiveCurrencyValue} onValueChange={setReceiveCurrencyValue}>
                        <SelectTrigger data-testid="select-receive-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STELLAR_CURRENCIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Memo (optional)</label>
                    <Input
                      placeholder="Reference or note for the sender"
                      value={receiveMemo}
                      onChange={(e) => setReceiveMemo(e.target.value)}
                      data-testid="input-receive-memo"
                    />
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleCopy(buildReceiveUri(), "Payment URI")}
                    data-testid="button-copy-receive-uri"
                  >
                    {copied === "Payment URI" ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                    Copy Payment URI
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <QrCode className="h-4 w-4" style={{ color: STELLAR_PURPLE }} />
                    Payment QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  {receiveQrUrl && (
                    <img
                      src={receiveQrUrl}
                      alt="Receive QR Code"
                      className="rounded-md border"
                      width={200}
                      height={200}
                      data-testid="img-receive-qr"
                    />
                  )}
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    Share this QR code with the sender. They can scan it with any Stellar wallet app to pre-fill the payment details.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(stellarAddress!, "Address")} data-testid="button-share-address">
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy Address
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" data-testid="text-contacts-heading">Stellar Contacts</h2>
            <Button
              variant="outline"
              onClick={() => setAddContactOpen(true)}
              data-testid="button-add-stellar-contact"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Contact
            </Button>
          </div>

          {contacts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <Users className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground text-center max-w-md">
                  No contacts yet. Save frequently used Stellar addresses for quick sending.
                </p>
                <Button variant="outline" onClick={() => setAddContactOpen(true)} data-testid="button-add-first-contact">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Contact
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact, idx) => (
                <Card key={idx} data-testid={`card-stellar-contact-${idx}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: STELLAR_PURPLE }}>
                          {contact.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{contact.name}</p>
                          <p className="text-xs font-mono text-muted-foreground truncate">{truncateAddress(contact.address)}</p>
                          {contact.memo && <p className="text-xs text-muted-foreground">Memo: {contact.memo}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => handleUseContact(contact)} data-testid={`button-use-contact-${idx}`}>
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Send
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(contact.address, contact.name)} data-testid={`button-copy-contact-${idx}`}>
                          {copied === contact.name ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteContact(idx)} data-testid={`button-delete-contact-${idx}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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

            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(buildStellarUri())}`}
                alt="Transaction QR"
                className="rounded-md border"
                width={200}
                height={200}
                data-testid="img-tx-qr"
              />
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
          <div className="space-y-2">
            <p className="text-xs font-semibold">Open with a specific wallet:</p>
            <div className="flex flex-wrap gap-2">
              <a href={buildStellarUri()} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="button-open-uri">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Stellar URI
                </Button>
              </a>
              <a href={`https://lobstr.co/trade/native/offer?amount=${amount}&destination=${recipient}${memo ? `&memo=${encodeURIComponent(memo)}` : ""}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="button-open-lobstr">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  LOBSTR
                </Button>
              </a>
              <a href="https://freighter.app" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="button-open-freighter">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Freighter
                </Button>
              </a>
              <a href={`https://stellarterm.com/#payment?destination=${recipient}&amount=${amount}&asset=${currency === "XLM" ? "native" : currency}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="button-open-stellarterm">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  StellarTerm
                </Button>
              </a>
              <a href={`https://www.stellarx.com/send?destination=${recipient}&amount=${amount}&asset=${currency === "XLM" ? "native" : currency}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="button-open-stellarx">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  StellarX
                </Button>
              </a>
            </div>
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setShowTxDetails(false)}
              data-testid="button-close-tx-details"
            >
              Close
            </Button>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={async () => {
                try {
                  await apiRequest("POST", "/api/send/disposal-notification", {
                    chain: "Stellar",
                    assetSymbol: currency,
                    quantity: amount,
                    walletAddress: stellarAddress,
                    recipient: recipient.trim(),
                    memo: memo.trim() || undefined,
                  });
                  toast({ title: "Disposal Recorded", description: `${amount} ${currency} recorded for tax tracking.` });
                } catch (err) {
                  console.warn("[stellar-disposal] Failed:", err);
                  toast({ title: "Could not record disposal", description: "You can record it manually later.", variant: "destructive" });
                }
                setShowTxDetails(false);
                setRecipient("");
                setAmount("");
                setMemo("");
              }}
              data-testid="button-confirm-sent"
            >
              <Check className="h-4 w-4 mr-2" />
              I Sent It — Record Disposal
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

      <Dialog open={!!sendSuccess} onOpenChange={(open) => { if (!open) setSendSuccess(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Confirmed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-sm font-medium">Payment sent successfully on Stellar</p>
            </div>
            <div className="rounded-md border p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono font-medium">{amount} {currency}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">To</span>
                <span className="font-mono text-xs">{recipient ? truncateAddress(recipient) : ""}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Tx Hash</span>
                <a
                  href={`https://stellar.expert/explorer/public/tx/${sendSuccess?.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7B61FF] hover:underline font-mono text-xs flex items-center gap-1"
                  data-testid="link-stellar-send-tx"
                >
                  {sendSuccess?.txHash?.slice(0, 12)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setSendSuccess(null); setRecipient(""); setAmount(""); setMemo(""); }} data-testid="button-done-stellar-send">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Stellar Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input value={newContactName} onChange={(e) => setNewContactName(e.target.value)} placeholder="Contact name" data-testid="input-contact-name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Stellar Address</label>
              <Input value={newContactAddress} onChange={(e) => setNewContactAddress(e.target.value)} placeholder="GXXXXXXXXX..." data-testid="input-contact-address" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Default Memo (optional)</label>
              <Input value={newContactMemo} onChange={(e) => setNewContactMemo(e.target.value)} placeholder="Memo for this contact" data-testid="input-contact-memo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddContactOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddContact}
              style={{ backgroundColor: STELLAR_PURPLE }}
              className="text-white"
              data-testid="button-confirm-add-contact"
            >
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
