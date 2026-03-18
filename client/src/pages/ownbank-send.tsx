import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { InlineXrplConnect } from "@/components/inline-xrpl-connect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useXrplStore } from "@/lib/xrpl-store";
import { WalletPicker } from "@/components/wallet-picker";
import {
  getBalances,
  getAccountTrustlines,
  getAccountTransactions,
  type XrplTrustline,
  type XrplTransaction,
} from "@/lib/xrpl-client";
import { signPayment } from "@/lib/xumm-connector";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import {
  Send,
  ArrowDownToLine,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  AlertTriangle,
  HelpCircle,
  Wallet,
  BookUser,
  Plus,
  Trash2,
  ArrowUpDown,
  Shield,
  Clock,
  Zap,
  Building2,
} from "lucide-react";

const CONTACTS_KEY = "ownbank-contacts";

interface Contact {
  name: string;
  address: string;
  tag?: string;
}

function loadContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveContacts(contacts: Contact[]) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}

import { RLUSD } from "@/lib/constants";
const RLUSD_CURRENCY = RLUSD.currency;
const RLUSD_ISSUER = RLUSD.issuer;

export default function OwnBankSend() {
  const { toast } = useToast();
  const {
    isConnected,
    walletAddress,
    walletType,
    xrpBalance,
    rlusdBalance,
    updateBalances,
    connect,
  } = useXrplStore();
  const [educationOpen, setEducationOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("send");

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("XRP");
  const [destinationTag, setDestinationTag] = useState("");
  const [memo, setMemo] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [trustlines, setTrustlines] = useState<XrplTrustline[]>([]);
  const [loadingTrustlines, setLoadingTrustlines] = useState(false);
  const [recentTxs, setRecentTxs] = useState<XrplTransaction[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>(loadContacts);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactAddress, setNewContactAddress] = useState("");
  const [newContactTag, setNewContactTag] = useState("");

  const [copied, setCopied] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const fetchData = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingTrustlines(true);
    setLoadingTxs(true);
    setLoadingBalances(true);
    try {
      const [tl, txs, balances] = await Promise.all([
        getAccountTrustlines(walletAddress),
        getAccountTransactions(walletAddress, 30),
        getBalances(walletAddress),
      ]);
      setTrustlines(tl);
      const paymentTxs = txs.filter(
        (tx) => tx.type === "Payment"
      );
      setRecentTxs(paymentTxs);
      updateBalances(balances.xrp, balances.rlusd);
    } catch {
      toast({
        title: "Failed to load data",
        description: "Could not fetch account data from XRPL.",
        variant: "destructive",
      });
    } finally {
      setLoadingTrustlines(false);
      setLoadingTxs(false);
      setLoadingBalances(false);
    }
  }, [walletAddress, updateBalances, toast]);

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchData();
    }
  }, [isConnected, walletAddress, fetchData]);

  const availableCurrencies = [
    { code: "XRP", label: "XRP", balance: xrpBalance },
    ...trustlines
      .filter((tl) => parseFloat(tl.balance) > 0 || tl.currency === "RLUSD")
      .map((tl) => ({
        code: tl.currency,
        label: tl.currency,
        balance: parseFloat(tl.balance),
        issuer: tl.issuer,
      })),
  ];

  const selectedCurrencyInfo = availableCurrencies.find(
    (c) => c.code === currency
  );
  const currentBalance = selectedCurrencyInfo?.balance ?? 0;

  function handleReviewSend() {
    if (!recipient.trim()) {
      toast({ title: "Missing Recipient", description: "Enter a destination address.", variant: "destructive" });
      return;
    }
    if (!recipient.startsWith("r") || recipient.length < 25) {
      toast({ title: "Invalid Address", description: "XRPL addresses start with 'r' and are 25-35 characters.", variant: "destructive" });
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Enter a valid amount to send.", variant: "destructive" });
      return;
    }
    if (numAmount > currentBalance) {
      toast({ title: "Insufficient Balance", description: `You only have ${currentBalance} ${currency} available.`, variant: "destructive" });
      return;
    }
    if (currency === "XRP" && numAmount > xrpBalance - 10) {
      toast({ title: "Reserve Required", description: "You must keep at least 10 XRP as the XRPL account reserve.", variant: "destructive" });
      return;
    }
    setShowConfirm(true);
  }

  async function handleConfirmSend() {
    if (!walletAddress) return;
    setIsSending(true);
    try {
      const numAmount = parseFloat(amount);
      let amountField: string | { currency: string; value: string; issuer: string };

      if (currency === "XRP") {
        amountField = (numAmount * 1_000_000).toString();
      } else {
        const tl = trustlines.find((t) => t.currency === currency);
        amountField = {
          currency: currency === "RLUSD" ? RLUSD_CURRENCY : currency,
          value: numAmount.toString(),
          issuer: tl?.issuer || RLUSD_ISSUER,
        };
      }

      const paymentOptions: { destinationTag?: number; memos?: Array<{ MemoType?: string; MemoData?: string }> } = {};
      if (destinationTag.trim()) {
        const tagNum = parseInt(destinationTag.trim(), 10);
        if (!isNaN(tagNum) && tagNum >= 0) {
          paymentOptions.destinationTag = tagNum;
        }
      }
      if (memo.trim()) {
        paymentOptions.memos = [{ MemoType: "text/plain", MemoData: memo.trim() }];
      }
      const result = await signPayment(recipient, amountField, paymentOptions);

      if (result.success) {
        toast({
          title: "Payment Sent",
          description: `Sent ${amount} ${currency} to ${truncateAddress(recipient)}.`,
        });
        try {
          await apiRequest("POST", "/api/send/disposal-notification", {
            chain: "XRPL",
            assetSymbol: currency,
            quantity: amount,
            walletAddress,
            recipient: recipient.trim(),
            memo: memo.trim() || undefined,
          });
        } catch (disposalErr) {
          console.warn("[send-disposal] Failed to record disposal:", disposalErr);
        }
        setShowConfirm(false);
        setRecipient("");
        setAmount("");
        setDestinationTag("");
        setMemo("");
        setTimeout(() => fetchData(), 3000);
      } else {
        toast({
          title: "Payment Failed",
          description: result.error || "Transaction was not completed.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }

  function handleCopyAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast({ title: "Address Copied" });
    setTimeout(() => setCopied(false), 2000);
  }

  function handleAddContact() {
    if (!newContactName.trim() || !newContactAddress.trim()) {
      toast({ title: "Missing Info", description: "Enter a name and address.", variant: "destructive" });
      return;
    }
    const updated = [
      ...contacts,
      { name: newContactName.trim(), address: newContactAddress.trim(), tag: newContactTag.trim() || undefined },
    ];
    setContacts(updated);
    saveContacts(updated);
    setNewContactName("");
    setNewContactAddress("");
    setNewContactTag("");
    setShowAddContact(false);
    toast({ title: "Contact Saved" });
  }

  function handleRemoveContact(index: number) {
    const updated = contacts.filter((_, i) => i !== index);
    setContacts(updated);
    saveContacts(updated);
  }

  function handleSelectContact(contact: Contact) {
    setRecipient(contact.address);
    if (contact.tag) setDestinationTag(contact.tag);
    setActiveTab("send");
  }

  function handleSaveRecipientAsContact() {
    if (!recipient.trim()) return;
    setNewContactAddress(recipient);
    setNewContactTag(destinationTag);
    setShowAddContact(true);
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-send-title">
            Send & Receive
          </h1>
          <p className="text-muted-foreground">
            Send and receive XRPL tokens instantly
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Send className="h-12 w-12 text-muted-foreground" />
            <InlineXrplConnect />
          </CardContent>
        </Card>

        <XrplDisclaimer />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-send-title">
            Send & Receive
          </h1>
          <p className="text-muted-foreground">
            Send and receive XRPL tokens instantly
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <WalletPicker
            value={walletAddress!}
            onChange={(addr) => connect(addr, walletType || "xumm")}
            label="Active Wallet"
          />
          <Badge variant="outline" data-testid="badge-send-wallet">
            <Wallet className="h-3 w-3 mr-1" />
            {truncateAddress(walletAddress!)}
          </Badge>
        </div>
      </div>

      <Collapsible open={educationOpen} onOpenChange={setEducationOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">
                <Zap className="h-4 w-4 inline mr-2 text-[#00A4E4]" />
                Learn: Sending Crypto vs. Wire Transfers
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
                    <h4 className="text-sm font-semibold text-muted-foreground">Old Way: Wire Transfer</h4>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li data-testid="text-old-way-1">Go to bank or fill out online wire form</li>
                    <li data-testid="text-old-way-2">Pay $25-50 fee per transfer</li>
                    <li data-testid="text-old-way-3">Wait 1-5 business days for settlement</li>
                    <li data-testid="text-old-way-4">Only works during banking hours</li>
                  </ul>
                </div>
                <div className="rounded-md border border-[#00A4E4]/30 bg-[#00A4E4]/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-[#00A4E4]" />
                    <h4 className="text-sm font-semibold" data-testid="text-new-way-heading">New Way: XRPL Payment</h4>
                  </div>
                  <ul className="text-sm space-y-1.5">
                    <li data-testid="text-new-way-1">Enter address and sign with your wallet</li>
                    <li data-testid="text-new-way-2">Costs ~$0.000001 (fraction of a penny)</li>
                    <li data-testid="text-new-way-3">Delivered in 4 seconds</li>
                    <li data-testid="text-new-way-4">Works 24/7/365, no holidays</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-md bg-muted/30 border border-muted p-4 space-y-2">
                <h4 className="text-sm font-semibold" data-testid="text-sending-explained">Sending Crypto Explained</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>
                    <span className="font-medium text-foreground">XRPL Address</span> (starts with &apos;r&apos;) — like a bank account number, it identifies where to send funds.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Destination Tag</span> — like a memo/reference number. Some exchanges require it to credit your account.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Finality</span> — unlike bank transfers, crypto payments are final. Always double-check the address before signing.
                  </li>
                </ul>
              </div>

              <Alert className="border-amber-500/40 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle data-testid="text-safety-tips-heading">Safety Tips</AlertTitle>
                <AlertDescription>
                  <ul className="text-sm space-y-1 mt-1">
                    <li data-testid="text-safety-1">Always verify the recipient address carefully</li>
                    <li data-testid="text-safety-2">Send a small test amount first for new recipients</li>
                    <li data-testid="text-safety-3">Destination tags are required for most exchanges — without it, funds may be lost</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <a
                href="https://xrpl.org/payment.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#00A4E4] hover:underline inline-flex items-center gap-1"
                data-testid="link-xrpl-payment-docs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Learn more at XRPL.org
              </a>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="send" data-testid="tab-send">
            <Send className="h-4 w-4 mr-1.5" />
            Send
          </TabsTrigger>
          <TabsTrigger value="receive" data-testid="tab-receive">
            <ArrowDownToLine className="h-4 w-4 mr-1.5" />
            Receive
          </TabsTrigger>
          <TabsTrigger value="contacts" data-testid="tab-contacts">
            <BookUser className="h-4 w-4 mr-1.5" />
            Contacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send Tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Recipient Address</label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="rXXXXXXXX..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    data-testid="input-recipient"
                  />
                  {contacts.length > 0 && (
                    <Select onValueChange={(val) => {
                      const contact = contacts.find((c) => c.address === val);
                      if (contact) handleSelectContact(contact);
                    }}>
                      <SelectTrigger className="w-auto shrink-0" data-testid="select-contact-quick">
                        <BookUser className="h-4 w-4" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((c, i) => (
                          <SelectItem key={i} value={c.address} data-testid={`select-contact-${i}`}>
                            {c.name} ({truncateAddress(c.address)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
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
                    data-testid="input-amount"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: {currentBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {currency}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="text-sm font-medium">Currency</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[220px] text-xs">You can send any token you have a trustline for. XRP is always available.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {loadingTrustlines ? (
                    <Skeleton className="h-9 w-full" />
                  ) : (
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger data-testid="select-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCurrencies.map((c) => (
                          <SelectItem key={c.code} value={c.code} data-testid={`select-currency-${c.code}`}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="text-sm font-medium">Destination Tag</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[240px] text-xs">Required for exchanges like Binance, Coinbase, Uphold. If sending to a personal wallet, you can leave this blank.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="number"
                    placeholder="Optional (required for exchanges)"
                    value={destinationTag}
                    onChange={(e) => setDestinationTag(e.target.value)}
                    data-testid="input-destination-tag"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Memo (optional)</label>
                  <Input
                    placeholder="e.g. Payment for services"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    data-testid="input-memo"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                {recipient.trim() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveRecipientAsContact}
                    data-testid="button-save-contact"
                  >
                    <BookUser className="h-4 w-4 mr-1.5" />
                    Save as Contact
                  </Button>
                )}
                <div className="ml-auto">
                  <Button
                    onClick={handleReviewSend}
                    className="bg-[#00A4E4] text-white border-[#00A4E4]"
                    data-testid="button-review-send"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Review Payment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {recentTxs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  <Clock className="h-4 w-4 inline mr-2 text-muted-foreground" />
                  Recent Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTxs ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentTxs.slice(0, 10).map((tx) => {
                      const isSent = tx.source === walletAddress;
                      return (
                        <div
                          key={tx.hash}
                          className="flex items-center justify-between gap-3 rounded-md border p-3"
                          data-testid={`row-tx-${tx.hash.slice(0, 8)}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${isSent ? "bg-red-500/10" : "bg-green-500/10"}`}>
                              {isSent ? (
                                <Send className="h-3.5 w-3.5 text-red-500" />
                              ) : (
                                <ArrowDownToLine className="h-3.5 w-3.5 text-green-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {isSent ? "Sent to " : "Received from "}
                                {truncateAddress(isSent ? tx.destination : tx.source)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {tx.date ? new Date(tx.date).toLocaleDateString() : "Unknown date"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-mono font-medium ${isSent ? "text-red-500" : "text-green-500"}`}>
                              {isSent ? "-" : "+"}{tx.amount} {tx.currency}
                            </p>
                            <Badge variant={tx.status === "Success" ? "secondary" : "destructive"} className="text-xs" data-testid={`badge-tx-status-${tx.hash.slice(0, 8)}`}>
                              {tx.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="receive" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your XRPL Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-4 rounded-lg border bg-white dark:bg-black" data-testid="qr-code-container">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(walletAddress!)}`}
                        alt="XRPL Address QR Code"
                        className="w-48 h-48"
                        data-testid="img-qr-code"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[240px] text-xs">Share this with the sender. They can scan it with any XRPL wallet to send funds directly to you.</p>
                  </TooltipContent>
                </Tooltip>

                <div className="flex items-center gap-2 w-full max-w-md">
                  <Input
                    value={walletAddress!}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-receive-address"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyAddress}
                    data-testid="button-copy-address"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  Share this address to receive XRP or any XRPL token. The sender must have a trustline for non-XRP tokens.
                </p>
              </div>
            </CardContent>
          </Card>

          {recentTxs.filter((tx) => tx.destination === walletAddress).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  <ArrowDownToLine className="h-4 w-4 inline mr-2 text-green-500" />
                  Recently Received
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentTxs
                    .filter((tx) => tx.destination === walletAddress)
                    .slice(0, 5)
                    .map((tx) => (
                      <div
                        key={tx.hash}
                        className="flex items-center justify-between gap-3 rounded-md border p-3"
                        data-testid={`row-received-${tx.hash.slice(0, 8)}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            From {truncateAddress(tx.source)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.date ? new Date(tx.date).toLocaleDateString() : "Unknown date"}
                          </p>
                        </div>
                        <span className="text-sm font-mono font-medium text-green-500 shrink-0">
                          +{tx.amount} {tx.currency}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">
                <BookUser className="h-4 w-4 inline mr-2 text-muted-foreground" />
                Address Book
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddContact(true)}
                data-testid="button-add-contact"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Contact
              </Button>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <BookUser className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center">
                    No saved contacts yet. Add frequently used addresses for quick access.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-3 rounded-md border p-3"
                      data-testid={`row-contact-${index}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium" data-testid={`text-contact-name-${index}`}>
                          {contact.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {contact.address}
                        </p>
                        {contact.tag && (
                          <p className="text-xs text-muted-foreground">
                            Tag: {contact.tag}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSelectContact(contact)}
                          data-testid={`button-use-contact-${index}`}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveContact(index)}
                          data-testid={`button-remove-contact-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <XrplDisclaimer />

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-confirm-title">Confirm Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border p-4 space-y-3">
              <h4 className="text-sm font-semibold">Payment Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-mono text-xs" data-testid="text-confirm-recipient">
                    {truncateAddress(recipient)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium" data-testid="text-confirm-amount">
                    {amount} {currency}
                  </span>
                </div>
                {destinationTag && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Destination Tag</span>
                    <span className="font-medium" data-testid="text-confirm-tag">{destinationTag}</span>
                  </div>
                )}
                {memo && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Memo</span>
                    <span className="font-medium" data-testid="text-confirm-memo">{memo}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span className="text-xs text-muted-foreground">~0.00001 XRP</span>
                </div>
              </div>
            </div>

            <Alert className="border-amber-500/40 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-xs">
                Crypto payments are irreversible. Please verify all details before confirming.
              </AlertDescription>
            </Alert>

            <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                {walletType === "xumm" ? (
                  <>Your Xaman wallet will prompt you to sign this payment. The transaction is executed directly on the XRPL.</>
                ) : (
                  <>Confirm the payment on your Ledger device.</>
                )}
              </p>
              <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-1">
                Non-custodial. We never hold your funds or see your keys.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={isSending}
                data-testid="button-cancel-send"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSend}
                className="bg-[#00A4E4] text-white border-[#00A4E4]"
                disabled={isSending}
                data-testid="button-confirm-send"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Sign & Send
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-add-contact-title">Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input
                placeholder="e.g. John's Wallet"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                data-testid="input-contact-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">XRPL Address</label>
              <Input
                placeholder="rXXXXXXXX..."
                value={newContactAddress}
                onChange={(e) => setNewContactAddress(e.target.value)}
                data-testid="input-contact-address"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Destination Tag (optional)</label>
              <Input
                type="number"
                placeholder="e.g. 12345"
                value={newContactTag}
                onChange={(e) => setNewContactTag(e.target.value)}
                data-testid="input-contact-tag"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAddContact(false)}
                data-testid="button-cancel-contact"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddContact}
                className="bg-[#00A4E4] text-white border-[#00A4E4]"
                data-testid="button-save-new-contact"
              >
                <BookUser className="h-4 w-4 mr-2" />
                Save Contact
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}