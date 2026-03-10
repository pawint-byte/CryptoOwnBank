import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserWallet, UserSettings } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  ArrowRight,
  ArrowLeftRight,
  Clock,
  Ban,
  Printer,
  Building2,
} from "lucide-react";
import { useXrplStore } from "@/lib/xrpl-store";
import { useToast } from "@/hooks/use-toast";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";

interface BusinessBrand {
  businessName?: string;
  businessLogo?: string;
  businessTagline?: string;
  businessEmail?: string;
  businessWebsite?: string;
  businessPhone?: string;
}

interface Invoice {
  id: string;
  recipientName: string;
  description: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  walletAddress: string;
  destinationTag: string;
  status: "pending" | "paid" | "expired";
  createdAt: string;
  brand?: BusinessBrand;
}

const STORAGE_KEY = "ownbank-invoices";

const CURRENCIES = [
  { value: "XRP", label: "XRP" },
  { value: "RLUSD", label: "RLUSD" },
  { value: "USD", label: "USD (IOU)" },
];

function generateInvoiceId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${timestamp}-${random}`;
}

function loadInvoices(): Invoice[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveInvoices(invoices: Invoice[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

function generatePayLink(invoice: Invoice): string {
  const base = `${window.location.origin}/pay`;
  const params = new URLSearchParams();
  params.set("to", invoice.walletAddress);
  params.set("amount", invoice.amount.toString());
  params.set("currency", invoice.currency);
  if (invoice.description) params.set("memo", invoice.description);
  if (invoice.destinationTag) params.set("tag", invoice.destinationTag);
  if (invoice.brand?.businessName) params.set("from", invoice.brand.businessName);
  if (invoice.brand?.businessLogo) params.set("logo", invoice.brand.businessLogo);
  if (invoice.id) params.set("ref", invoice.id);
  return `${base}?${params.toString()}`;
}

function generateQrDataUrl(text: string): string {
  const size = 200;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";

  const lines: string[] = [];
  for (let i = 0; i < text.length; i += 30) {
    lines.push(text.substring(i, i + 30));
  }

  const startY = size / 2 - (lines.length * 12) / 2;
  lines.forEach((line, idx) => {
    ctx.fillText(line, size / 2, startY + idx * 12);
  });

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, size - 20, size - 20);

  const qrLabel = "QR: Scan to Pay";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(qrLabel, size / 2, 30);

  return canvas.toDataURL();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OwnBankInvoices() {
  const { toast } = useToast();
  const { walletAddress, isConnected } = useXrplStore();

  const { data: savedWallets = [] } = useQuery<UserWallet[]>({
    queryKey: ["/api/user-wallets"],
  });

  const { data: userSettings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const receivingWallets = savedWallets.filter((w) => w.purpose === "receiving" || w.purpose === "general");
  const defaultReceivingAddress = receivingWallets.length > 0 ? receivingWallets[0].address : (walletAddress || "");
  const defaultTag = receivingWallets.length > 0 ? (receivingWallets[0].destinationTag || "") : "";

  const invoicePrintRef = useRef<HTMLDivElement>(null);
  const [invoices, setInvoices] = useState<Invoice[]>(loadInvoices);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [recipientName, setRecipientName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("XRP");
  const [dueDate, setDueDate] = useState("");
  const [invoiceWallet, setInvoiceWallet] = useState(defaultReceivingAddress);
  const [destinationTag, setDestinationTag] = useState(defaultTag);

  function resetForm() {
    setRecipientName("");
    setDescription("");
    setAmount("");
    setCurrency("XRP");
    setDueDate("");
    setInvoiceWallet(defaultReceivingAddress);
    setDestinationTag(defaultTag);
  }

  function handleCreateInvoice() {
    if (!recipientName.trim()) {
      toast({ title: "Missing Recipient", description: "Please enter a recipient name.", variant: "destructive" });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }
    if (!invoiceWallet.trim()) {
      toast({ title: "Missing Wallet", description: "Please enter your wallet address.", variant: "destructive" });
      return;
    }

    const brand: BusinessBrand = {};
    if (userSettings) {
      const s = userSettings as any;
      if (s.businessName) brand.businessName = s.businessName;
      if (s.businessLogo) brand.businessLogo = s.businessLogo;
      if (s.businessTagline) brand.businessTagline = s.businessTagline;
      if (s.businessEmail) brand.businessEmail = s.businessEmail;
      if (s.businessWebsite) brand.businessWebsite = s.businessWebsite;
      if (s.businessPhone) brand.businessPhone = s.businessPhone;
    }

    const invoice: Invoice = {
      id: generateInvoiceId(),
      recipientName: recipientName.trim(),
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      dueDate: dueDate || null,
      walletAddress: invoiceWallet.trim(),
      destinationTag: destinationTag.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
      brand: Object.keys(brand).length > 0 ? brand : undefined,
    };

    const updated = [invoice, ...invoices];
    setInvoices(updated);
    saveInvoices(updated);
    setCreateModalOpen(false);
    resetForm();

    toast({ title: "Invoice Created", description: `Invoice ${invoice.id} has been created.` });
  }

  function handleDeleteInvoice(id: string) {
    const updated = invoices.filter((inv) => inv.id !== id);
    setInvoices(updated);
    saveInvoices(updated);
    toast({ title: "Invoice Deleted", description: "Invoice has been removed." });
  }

  function handleCopyLink(invoice: Invoice) {
    const link = generatePayLink(invoice);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(invoice.id);
      toast({ title: "Link Copied", description: "Payment link copied to clipboard." });
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function handleViewInvoice(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setViewModalOpen(true);
  }

  const statusCounts = useMemo(() => {
    const counts = { pending: 0, paid: 0, expired: 0 };
    invoices.forEach((inv) => { counts[inv.status]++; });
    return counts;
  }, [invoices]);

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-invoices-title">Invoices</h1>
          <p className="text-muted-foreground">Create and manage payment invoices on XRPL</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Connect your wallet from the OwnBank Dashboard to create invoices.
            </p>
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
          <h1 className="text-2xl font-bold" data-testid="text-invoices-title">Invoices</h1>
          <p className="text-muted-foreground">Create and manage payment invoices on XRPL</p>
        </div>
        <Button
          onClick={() => { resetForm(); setCreateModalOpen(true); }}
          className="bg-[#00A4E4] text-white border-[#00A4E4]"
          data-testid="button-create-invoice"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-pending-count">{statusCounts.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Check className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-paid-count">{statusCounts.paid}</p>
              <p className="text-xs text-muted-foreground">Paid</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Ban className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-expired-count">{statusCounts.expired}</p>
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
              No invoices yet. Create your first invoice to get started.
            </p>
            <Button
              variant="outline"
              onClick={() => { resetForm(); setCreateModalOpen(true); }}
              data-testid="button-create-first-invoice"
            >
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
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell className="font-mono text-xs" data-testid={`text-invoice-id-${invoice.id}`}>
                        {invoice.id}
                      </TableCell>
                      <TableCell data-testid={`text-invoice-recipient-${invoice.id}`}>
                        {invoice.recipientName}
                      </TableCell>
                      <TableCell data-testid={`text-invoice-amount-${invoice.id}`}>
                        {invoice.amount} {invoice.currency}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={invoice.status === "paid" ? "default" : invoice.status === "pending" ? "secondary" : "outline"}
                          data-testid={`badge-invoice-status-${invoice.id}`}
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(invoice.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleViewInvoice(invoice)}
                            data-testid={`button-view-invoice-${invoice.id}`}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleCopyLink(invoice)}
                            data-testid={`button-copy-link-${invoice.id}`}
                          >
                            {copiedId === invoice.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            data-testid={`button-delete-invoice-${invoice.id}`}
                          >
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
            <ArrowLeftRight className="h-5 w-5 text-[#00A4E4]" />
            Old Way vs New Way
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border p-4 space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">Old Way</p>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Ban className="h-4 w-4 shrink-0 mt-0.5" />
                  Send wallet address via email or chat
                </li>
                <li className="flex items-start gap-2">
                  <Ban className="h-4 w-4 shrink-0 mt-0.5" />
                  Hope the recipient sends the right amount
                </li>
                <li className="flex items-start gap-2">
                  <Ban className="h-4 w-4 shrink-0 mt-0.5" />
                  No record of what the payment was for
                </li>
                <li className="flex items-start gap-2">
                  <Ban className="h-4 w-4 shrink-0 mt-0.5" />
                  Manually track who paid and who didn't
                </li>
              </ul>
            </div>
            <div className="rounded-md border border-[#00A4E4]/30 bg-[#00A4E4]/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-[#00A4E4]">New Way with CryptoOwnBank</p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                  Generate a shareable payment link with amount prefilled
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                  QR code for instant mobile payments
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                  Invoice memo tracks purpose of each payment
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                  Invoice history with status tracking
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <XrplDisclaimer />

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-create-invoice-title">Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Recipient Name</label>
              <Input
                placeholder="Client or business name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                data-testid="input-recipient-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description / Memo</label>
              <Textarea
                placeholder="What is this invoice for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                data-testid="input-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  data-testid="input-amount"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Currency</label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger data-testid="select-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value} data-testid={`option-currency-${c.value}`}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Due Date (optional)</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                data-testid="input-due-date"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Your Wallet Address</label>
              {savedWallets.length > 0 && (
                <Select
                  value=""
                  onValueChange={(walletId) => {
                    const w = savedWallets.find((sw) => sw.id === walletId);
                    if (w) {
                      setInvoiceWallet(w.address);
                      setDestinationTag(w.destinationTag || "");
                    }
                  }}
                >
                  <SelectTrigger className="mb-2" data-testid="select-saved-wallet">
                    <SelectValue placeholder="Pick from saved wallets..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedWallets.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.label} — {w.address.slice(0, 8)}...{w.address.slice(-4)} ({w.chain})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                placeholder="rXXXXXXXXXXXXXXXXXXXXXXXX"
                value={invoiceWallet}
                onChange={(e) => setInvoiceWallet(e.target.value)}
                data-testid="input-wallet-address"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Destination Tag (optional)</label>
              <Input
                placeholder="e.g. 12345"
                value={destinationTag}
                onChange={(e) => setDestinationTag(e.target.value)}
                data-testid="input-destination-tag"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button
              onClick={handleCreateInvoice}
              className="bg-[#00A4E4] text-white border-[#00A4E4]"
              data-testid="button-submit-invoice"
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-view-invoice-title">Invoice Preview</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div ref={invoicePrintRef} className="bg-white dark:bg-slate-950 rounded-lg border p-6 space-y-5 print:border-none print:shadow-none" data-testid="invoice-preview-doc">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {selectedInvoice.brand?.businessLogo ? (
                      <img
                        src={selectedInvoice.brand.businessLogo}
                        alt="Logo"
                        className="h-10 w-10 rounded-lg object-contain border bg-white"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-[#00A4E4]/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-[#00A4E4]" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-sm" data-testid="text-invoice-brand-name">
                        {selectedInvoice.brand?.businessName || "CryptoOwnBank"}
                      </p>
                      {selectedInvoice.brand?.businessTagline && (
                        <p className="text-[11px] text-muted-foreground">{selectedInvoice.brand.businessTagline}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tracking-tight text-[#00A4E4]">INVOICE</p>
                    <p className="text-[11px] font-mono text-muted-foreground" data-testid="text-invoice-ref">{selectedInvoice.id}</p>
                  </div>
                </div>

                {(selectedInvoice.brand?.businessEmail || selectedInvoice.brand?.businessPhone || selectedInvoice.brand?.businessWebsite) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    {selectedInvoice.brand.businessEmail && <span>{selectedInvoice.brand.businessEmail}</span>}
                    {selectedInvoice.brand.businessPhone && <span>{selectedInvoice.brand.businessPhone}</span>}
                    {selectedInvoice.brand.businessWebsite && <span>{selectedInvoice.brand.businessWebsite}</span>}
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Bill To</p>
                    <p className="text-sm font-medium" data-testid="text-view-recipient">{selectedInvoice.recipientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Invoice Date</p>
                    <p className="text-sm">{formatDate(selectedInvoice.createdAt)}</p>
                    {selectedInvoice.dueDate && (
                      <>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 mt-2">Due Date</p>
                        <p className="text-sm" data-testid="text-view-due">{formatDate(selectedInvoice.dueDate)}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                        <th className="text-right py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="py-3 px-3" data-testid="text-view-memo">
                          {selectedInvoice.description || "Payment"}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold whitespace-nowrap" data-testid="text-view-amount">
                          {selectedInvoice.amount} {selectedInvoice.currency}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/30">
                        <td className="py-3 px-3 font-semibold text-right">Total Due</td>
                        <td className="py-3 px-3 text-right font-bold text-base" data-testid="text-view-total">
                          {selectedInvoice.amount} {selectedInvoice.currency}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Payment Details</p>
                  <div className="grid gap-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 h-5">{selectedInvoice.currency === "XRP" || selectedInvoice.currency === "RLUSD" ? "XRPL" : "Stellar"}</Badge>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground">Pay to</span>
                      <code className="font-mono text-[11px] break-all text-right max-w-[220px]" data-testid="text-view-wallet">{selectedInvoice.walletAddress}</code>
                    </div>
                    {selectedInvoice.destinationTag && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Destination Tag</span>
                        <code className="font-mono font-bold" data-testid="text-view-tag">{selectedInvoice.destinationTag}</code>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center pt-1">
                  <div className="p-2 rounded-lg border bg-white">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(generatePayLink(selectedInvoice))}`}
                      alt="Payment QR Code"
                      className="w-[140px] h-[140px]"
                      data-testid="img-invoice-qr"
                    />
                  </div>
                </div>
                <p className="text-center text-[10px] text-muted-foreground">Scan to pay or use the link below</p>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t">
                  <Badge
                    variant={selectedInvoice.status === "paid" ? "default" : "secondary"}
                    className="text-[10px]"
                    data-testid="badge-view-status"
                  >
                    {selectedInvoice.status.toUpperCase()}
                  </Badge>
                  <span>Powered by CryptoOwnBank</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap print:hidden">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleCopyLink(selectedInvoice)}
                  data-testid="button-copy-invoice-link"
                >
                  {copiedId === selectedInvoice.id ? (
                    <><Check className="h-4 w-4 mr-2 text-green-500" /> Copied</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-2" /> Copy Link</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(generatePayLink(selectedInvoice), "_blank")}
                  data-testid="button-open-pay-page"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Pay Page
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  data-testid="button-print-invoice"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print / PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
