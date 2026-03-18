import { useState, useMemo } from "react";
import { InlineStellarConnect } from "@/components/inline-stellar-connect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Plus,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Trash2,
  ArrowLeftRight,
  Clock,
  Ban,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SeoHead } from "@/components/seo-head";
import { useStellarStore } from "@/lib/stellar-store";
import { StellarWalletPicker } from "@/components/stellar-wallet-picker";

const STELLAR_PURPLE = "#7B61FF";

interface StellarInvoice {
  id: string;
  recipientName: string;
  description: string;
  amount: number;
  currency: string;
  currencyIssuer: string | null;
  dueDate: string | null;
  walletAddress: string;
  memo: string;
  status: "pending" | "paid" | "expired";
  createdAt: string;
}

const STORAGE_KEY = "stellar-invoices";

const CURRENCIES = [
  { value: "XLM", label: "XLM (Stellar Lumens)", issuer: null },
  { value: "USDC", label: "USDC (Circle)", issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" },
  { value: "EURC", label: "EURC (Circle)", issuer: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y36DAVIZA67UEAX7CTAZ5STE" },
];

function generateInvoiceId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SINV-${ts}-${rand}`;
}

function loadInvoices(): StellarInvoice[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveInvoices(invoices: StellarInvoice[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

function generatePayLink(invoice: StellarInvoice): string {
  let uri = `web+stellar:pay?destination=${invoice.walletAddress}&amount=${invoice.amount}`;
  const currInfo = CURRENCIES.find((c) => c.value === invoice.currency);
  if (currInfo && currInfo.issuer) {
    uri += `&asset_code=${invoice.currency}&asset_issuer=${currInfo.issuer}`;
  }
  if (invoice.memo.trim()) {
    uri += `&memo=${encodeURIComponent(invoice.memo)}&memo_type=MEMO_TEXT`;
  }
  return uri;
}

function generateWebPayLink(invoice: StellarInvoice): string {
  return generatePayLink(invoice);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StellarInvoices() {
  const { toast } = useToast();
  const { stellarAddress, isConnected } = useStellarStore();

  const [invoices, setInvoices] = useState<StellarInvoice[]>(loadInvoices);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<StellarInvoice | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [recipientName, setRecipientName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("XLM");
  const [dueDate, setDueDate] = useState("");
  const [invoiceWallet, setInvoiceWallet] = useState(stellarAddress || "");
  const [memo, setMemo] = useState("");

  function resetForm() {
    setRecipientName("");
    setDescription("");
    setAmount("");
    setCurrency("XLM");
    setDueDate("");
    setInvoiceWallet(stellarAddress || "");
    setMemo("");
  }

  function handleCreate() {
    if (!recipientName.trim()) {
      toast({ title: "Missing Recipient", variant: "destructive" });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Invalid Amount", variant: "destructive" });
      return;
    }
    if (!invoiceWallet.trim() || !invoiceWallet.startsWith("G") || invoiceWallet.length !== 56) {
      toast({ title: "Invalid Wallet", description: "Enter a valid Stellar address.", variant: "destructive" });
      return;
    }

    const invoice: StellarInvoice = {
      id: generateInvoiceId(),
      recipientName: recipientName.trim(),
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      currencyIssuer: CURRENCIES.find((c) => c.value === currency)?.issuer || null,
      dueDate: dueDate || null,
      walletAddress: invoiceWallet.trim(),
      memo: memo.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const updated = [invoice, ...invoices];
    setInvoices(updated);
    saveInvoices(updated);
    setCreateOpen(false);
    resetForm();
    toast({ title: "Invoice Created", description: `Invoice ${invoice.id} created.` });
  }

  function handleDelete(id: string) {
    const updated = invoices.filter((inv) => inv.id !== id);
    setInvoices(updated);
    saveInvoices(updated);
    toast({ title: "Invoice Deleted" });
  }

  function handleCopyLink(invoice: StellarInvoice) {
    const link = generateWebPayLink(invoice);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(invoice.id);
      toast({ title: "Payment URI Copied", description: "Share this Stellar payment URI with the payer. They can open it in any Stellar wallet." });
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const statusCounts = useMemo(() => {
    const counts = { pending: 0, paid: 0, expired: 0 };
    invoices.forEach((inv) => { counts[inv.status]++; });
    return counts;
  }, [invoices]);

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <SeoHead title="Stellar Invoices — CryptoOwnBank" description="Create payment invoices on the Stellar network." path="/stellar/invoices" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-stellar-invoices-title">Stellar Invoices</h1>
          <p className="text-muted-foreground">Create and manage payment invoices on Stellar</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <InlineStellarConnect />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SeoHead title="Stellar Invoices — CryptoOwnBank" description="Create payment invoices on the Stellar network." path="/stellar/invoices" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-stellar-invoices-title">Stellar Invoices</h1>
          <p className="text-muted-foreground">Create and manage payment invoices on Stellar</p>
        </div>
        <Button
          onClick={() => { resetForm(); setCreateOpen(true); }}
          style={{ backgroundColor: STELLAR_PURPLE, borderColor: STELLAR_PURPLE }}
          className="text-white"
          data-testid="button-create-stellar-invoice"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      <StellarWalletPicker label="Active Wallet" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-stellar-pending-count">{statusCounts.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Check className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-stellar-paid-count">{statusCounts.paid}</p>
              <p className="text-xs text-muted-foreground">Paid</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Ban className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-stellar-expired-count">{statusCounts.expired}</p>
              <p className="text-xs text-muted-foreground">Expired</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              No invoices yet. Create your first Stellar invoice to get started.
            </p>
            <Button variant="outline" onClick={() => { resetForm(); setCreateOpen(true); }} data-testid="button-create-first-stellar-invoice">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`row-stellar-invoice-${invoice.id}`}>
                      <TableCell className="font-mono text-xs">{invoice.id}</TableCell>
                      <TableCell>{invoice.recipientName}</TableCell>
                      <TableCell>{invoice.amount} {invoice.currency}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === "paid" ? "default" : invoice.status === "pending" ? "secondary" : "outline"}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(invoice.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setSelected(invoice); setViewOpen(true); }} data-testid={`button-view-stellar-invoice-${invoice.id}`}>
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleCopyLink(invoice)} data-testid={`button-copy-stellar-link-${invoice.id}`}>
                            {copiedId === invoice.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(invoice.id)} data-testid={`button-delete-stellar-invoice-${invoice.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" style={{ color: STELLAR_PURPLE }} />
            Old Way vs New Way
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border p-4 space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">Old Way</p>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2"><Ban className="h-4 w-4 shrink-0 mt-0.5" />Share wallet address via text or email</li>
                <li className="flex items-start gap-2"><Ban className="h-4 w-4 shrink-0 mt-0.5" />Hope the payer sends the right amount</li>
                <li className="flex items-start gap-2"><Ban className="h-4 w-4 shrink-0 mt-0.5" />No record of what the payment was for</li>
              </ul>
            </div>
            <div className="rounded-md border p-4 space-y-3" style={{ borderColor: `${STELLAR_PURPLE}30`, backgroundColor: `${STELLAR_PURPLE}08` }}>
              <p className="text-sm font-semibold" style={{ color: STELLAR_PURPLE }}>New Way with CryptoOwnBank</p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />Shareable payment link with amount prefilled</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />QR code for instant mobile payments</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />Invoice memo and history tracking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-create-stellar-invoice-title">Create Stellar Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Recipient Name</label>
              <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Who is this invoice for?" data-testid="input-stellar-invoice-recipient" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this payment for?" rows={2} data-testid="input-stellar-invoice-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Amount</label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" step="any" min="0" data-testid="input-stellar-invoice-amount" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Currency</label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger data-testid="select-stellar-invoice-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Your Stellar Address (receive payments here)</label>
              <Input value={invoiceWallet} onChange={(e) => setInvoiceWallet(e.target.value)} placeholder="GXXXXXXXXX..." data-testid="input-stellar-invoice-wallet" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Memo (optional)</label>
              <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Reference or note" data-testid="input-stellar-invoice-memo" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Due Date (optional)</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="input-stellar-invoice-due" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} style={{ backgroundColor: STELLAR_PURPLE, borderColor: STELLAR_PURPLE }} className="text-white" data-testid="button-confirm-create-stellar-invoice">
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" style={{ color: STELLAR_PURPLE }} />
              Invoice Details
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoice ID</span>
                  <span className="font-mono">{selected.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recipient</span>
                  <span>{selected.recipientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">{selected.amount} {selected.currency}</span>
                </div>
                {selected.description && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Description</span>
                    <span>{selected.description}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pay to</span>
                  <span className="font-mono text-xs">{selected.walletAddress.slice(0, 8)}...{selected.walletAddress.slice(-6)}</span>
                </div>
              </div>

              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatePayLink(selected))}`}
                  alt="Payment QR Code"
                  className="rounded-md border"
                  width={200}
                  height={200}
                  data-testid="img-stellar-invoice-qr"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleCopyLink(selected)}
                  data-testid="button-copy-stellar-invoice-link"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Payment URI
                </Button>
                <a href={generatePayLink(selected)} className="flex-1">
                  <Button variant="outline" className="w-full" data-testid="button-open-stellar-pay">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Wallet
                  </Button>
                </a>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Share this link or QR code with the payer. They can scan or click to open the payment in their Stellar wallet.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
