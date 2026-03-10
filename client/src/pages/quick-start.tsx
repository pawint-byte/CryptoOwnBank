import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wallet,
  Users,
  CalendarClock,
  Building2,
  X,
} from "lucide-react";

type TemplateType = "portfolio" | "contacts" | "payees" | "treasury";

interface TemplateConfig {
  id: TemplateType;
  title: string;
  description: string;
  icon: typeof Wallet;
  headers: string[];
  exampleRows: string[][];
  exampleMarker: string;
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: "portfolio",
    title: "Portfolio Template",
    description: "Import wallets and manual positions in bulk",
    icon: Wallet,
    headers: ["type", "chain", "address", "label", "purpose", "asset", "quantity", "costPerUnit", "location"],
    exampleRows: [
      ["wallet", "xrpl", "rExAmPlEaDdReSs123456789", "Main XRPL Wallet", "general", "", "", "", ""],
      ["wallet", "ethereum", "0x1234567890abcdef1234567890abcdef12345678", "ETH Hot Wallet", "trading", "", "", "", ""],
      ["position", "", "", "", "", "BTC", "0.5", "45000", "Coinbase"],
    ],
    exampleMarker: "rExAmPlEaDdReSs123456789",
  },
  {
    id: "contacts",
    title: "Contacts Template",
    description: "Import your address book for quick sends",
    icon: Users,
    headers: ["name", "address", "chain", "destinationTag", "notes"],
    exampleRows: [
      ["Alice", "rExAmPlEaDdReSs123456789", "xrpl", "12345", "Business partner"],
      ["Bob", "GEXAMPLESTELLARADDRESS1234567890ABCDEFGHIJKLMNOP", "stellar", "", "Friend"],
      ["Charlie", "0x1234567890abcdef1234567890abcdef12345678", "ethereum", "", "Vendor"],
    ],
    exampleMarker: "rExAmPlEaDdReSs123456789",
  },
  {
    id: "payees",
    title: "Payee Template",
    description: "Set up payees for future recurring payments",
    icon: CalendarClock,
    headers: ["name", "address", "chain", "amount", "currency", "frequency", "memo"],
    exampleRows: [
      ["Rent - Landlord", "rExAmPlEaDdReSs123456789", "xrpl", "500", "RLUSD", "monthly", "Rent payment"],
      ["Freelancer Pay", "GEXAMPLESTELLARADDRESS1234567890ABCDEFGHIJKLMNOP", "stellar", "200", "USDC", "biweekly", "Contract work"],
      ["Savings", "rAnotherXrplAddress987654321", "xrpl", "100", "RLUSD", "weekly", "Auto-save"],
    ],
    exampleMarker: "rExAmPlEaDdReSs123456789",
  },
  {
    id: "treasury",
    title: "Business Treasury Template",
    description: "Track crypto wallets and traditional accounts together",
    icon: Building2,
    headers: ["walletLabel", "address", "chain", "purpose", "bankName", "accountType", "balance", "rate"],
    exampleRows: [
      ["Ops Wallet", "rExAmPlEaDdReSs123456789", "xrpl", "operations", "", "", "", ""],
      ["Cold Storage", "0x1234567890abcdef1234567890abcdef12345678", "ethereum", "reserve", "", "", "", ""],
      ["Business Checking", "", "", "", "First National Bank", "checking", "25000", "0.01"],
    ],
    exampleMarker: "rExAmPlEaDdReSs123456789",
  },
];

const CONTACTS_KEY = "ownbank-contacts";

interface ParsedRow {
  data: Record<string, string>;
  errors: string[];
  rowIndex: number;
}

interface PreviewState {
  templateType: TemplateType;
  rows: ParsedRow[];
  headers: string[];
}

function generateCsv(template: TemplateConfig): string {
  const lines = [template.headers.join(",")];
  for (const row of template.exampleRows) {
    lines.push(row.map(cell => {
      if (cell.includes(",") || cell.includes('"')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(","));
  }
  return lines.join("\n");
}

function downloadCsv(template: TemplateConfig) {
  const csv = generateCsv(template);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cryptoownbank-${template.id}-template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string, template: TemplateConfig): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headerLine = parseCsvLine(lines[0]);
  const normalizedHeaders = headerLine.map(h => h.toLowerCase().replace(/\s+/g, ""));

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);

    const isExample = cells.some(cell => cell.includes(template.exampleMarker));
    if (isExample) continue;

    const isEmpty = cells.every(cell => !cell);
    if (isEmpty) continue;

    const data: Record<string, string> = {};
    for (let j = 0; j < template.headers.length; j++) {
      const headerIndex = normalizedHeaders.indexOf(template.headers[j].toLowerCase().replace(/\s+/g, ""));
      data[template.headers[j]] = headerIndex >= 0 ? (cells[headerIndex] || "") : (cells[j] || "");
    }

    const errors = validateRow(template.id, data);
    rows.push({ data, errors, rowIndex: i });
  }

  return rows;
}

function validateRow(type: TemplateType, data: Record<string, string>): string[] {
  const errors: string[] = [];

  if (type === "portfolio") {
    const rowType = data["type"]?.toLowerCase();
    if (rowType === "wallet") {
      if (!data["chain"]) errors.push("Chain is required for wallets");
      if (!data["address"]) errors.push("Address is required for wallets");
    } else if (rowType === "position") {
      if (!data["asset"]) errors.push("Asset is required for positions");
      if (!data["quantity"] || isNaN(Number(data["quantity"]))) errors.push("Valid quantity is required");
      if (!data["costPerUnit"] || isNaN(Number(data["costPerUnit"]))) errors.push("Valid cost per unit is required");
    } else {
      errors.push("Type must be 'wallet' or 'position'");
    }
  }

  if (type === "contacts") {
    if (!data["name"]) errors.push("Name is required");
    if (!data["address"]) errors.push("Address is required");
    if (!data["chain"]) errors.push("Chain is required");
  }

  if (type === "payees") {
    if (!data["name"]) errors.push("Name is required");
    if (!data["address"]) errors.push("Address is required");
    if (!data["chain"]) errors.push("Chain is required");
    if (!data["amount"] || isNaN(Number(data["amount"]))) errors.push("Valid amount is required");
    if (!data["currency"]) errors.push("Currency is required");
    const validFreqs = ["weekly", "biweekly", "monthly", "quarterly"];
    if (!data["frequency"] || !validFreqs.includes(data["frequency"].toLowerCase())) {
      errors.push("Frequency must be weekly, biweekly, monthly, or quarterly");
    }
  }

  if (type === "treasury") {
    const hasWallet = data["address"] && data["chain"];
    const hasBank = data["bankName"] && data["accountType"];
    if (!hasWallet && !hasBank) {
      errors.push("Either wallet (address+chain) or bank (bankName+accountType) info required");
    }
    if (data["balance"] && isNaN(Number(data["balance"]))) {
      errors.push("Balance must be a valid number");
    }
    if (data["rate"] && isNaN(Number(data["rate"]))) {
      errors.push("Rate must be a valid number");
    }
  }

  return errors;
}

export default function QuickStart() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | "">("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const { toast } = useToast();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTemplate) return;

    const template = TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text, template);
      setPreview({ templateType: template.id, rows, headers: template.headers });
      setSubmitResult(null);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [selectedTemplate]);

  const handleConfirmImport = useCallback(async () => {
    if (!preview || preview.rows.length === 0) return;

    const validRows = preview.rows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) {
      toast({ title: "No valid rows to import", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      if (preview.templateType === "portfolio") {
        const walletRows = validRows.filter(r => r.data["type"]?.toLowerCase() === "wallet");
        const positionRows = validRows.filter(r => r.data["type"]?.toLowerCase() === "position");

        for (const row of walletRows) {
          try {
            await apiRequest("POST", "/api/wallets", {
              userId: "",
              chain: row.data["chain"].toLowerCase(),
              address: row.data["address"],
              label: row.data["label"] || row.data["address"].slice(0, 8),
            });
            success++;
          } catch (err: any) {
            failed++;
            errors.push(`Wallet ${row.data["address"].slice(0, 12)}...: ${err.message || "Failed"}`);
          }
        }

        for (const row of positionRows) {
          try {
            await apiRequest("POST", "/api/positions/manual", {
              assetSymbol: row.data["asset"].toUpperCase(),
              quantity: row.data["quantity"],
              averageCost: row.data["costPerUnit"],
              location: row.data["location"] || "Manual Import",
            });
            success++;
          } catch (err: any) {
            failed++;
            errors.push(`Position ${row.data["asset"]}: ${err.message || "Failed"}`);
          }
        }

        queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      }

      if (preview.templateType === "contacts") {
        try {
          const existing = JSON.parse(localStorage.getItem(CONTACTS_KEY) || "[]");
          const newContacts = validRows.map(r => ({
            name: r.data["name"],
            address: r.data["address"],
            chain: r.data["chain"].toLowerCase(),
            destinationTag: r.data["destinationTag"] || "",
            notes: r.data["notes"] || "",
          }));

          const existingAddrs = new Set(existing.map((c: any) => c.address));
          const toAdd = newContacts.filter(c => !existingAddrs.has(c.address));
          const merged = [...existing, ...toAdd];
          localStorage.setItem(CONTACTS_KEY, JSON.stringify(merged));
          success = toAdd.length;
          const skipped = newContacts.length - toAdd.length;
          if (skipped > 0) {
            errors.push(`${skipped} contact(s) skipped (duplicate addresses)`);
          }
        } catch (err: any) {
          failed = validRows.length;
          errors.push(`Failed to save contacts: ${err.message}`);
        }
      }

      if (preview.templateType === "payees") {
        try {
          const existing = JSON.parse(localStorage.getItem("ownbank-payees") || "[]");
          const newPayees = validRows.map(r => ({
            name: r.data["name"],
            address: r.data["address"],
            chain: r.data["chain"].toLowerCase(),
            amount: r.data["amount"],
            currency: r.data["currency"].toUpperCase(),
            frequency: r.data["frequency"].toLowerCase(),
            memo: r.data["memo"] || "",
          }));

          const existingNames = new Set(existing.map((p: any) => p.name));
          const toAdd = newPayees.filter(p => !existingNames.has(p.name));
          const merged = [...existing, ...toAdd];
          localStorage.setItem("ownbank-payees", JSON.stringify(merged));
          success = toAdd.length;
          const skipped = newPayees.length - toAdd.length;
          if (skipped > 0) {
            errors.push(`${skipped} payee(s) skipped (duplicate names)`);
          }
        } catch (err: any) {
          failed = validRows.length;
          errors.push(`Failed to save payees: ${err.message}`);
        }
      }

      if (preview.templateType === "treasury") {
        const walletRows = validRows.filter(r => r.data["address"] && r.data["chain"]);
        const bankRows = validRows.filter(r => r.data["bankName"] && r.data["accountType"]);

        for (const row of walletRows) {
          try {
            await apiRequest("POST", "/api/user-wallets", {
              userId: "",
              label: row.data["walletLabel"] || row.data["address"].slice(0, 8),
              address: row.data["address"],
              chain: row.data["chain"].toLowerCase(),
              purpose: row.data["purpose"] || "general",
            });
            success++;
          } catch (err: any) {
            failed++;
            errors.push(`Wallet ${row.data["walletLabel"] || row.data["address"].slice(0, 12)}...: ${err.message || "Failed"}`);
          }
        }

        if (bankRows.length > 0) {
          try {
            const existing = JSON.parse(localStorage.getItem("treasury-bank-accounts") || "[]");
            const newBanks = bankRows.map(r => ({
              bankName: r.data["bankName"],
              accountType: r.data["accountType"],
              balance: r.data["balance"] || "0",
              rate: r.data["rate"] || "0",
              walletLabel: r.data["walletLabel"] || "",
            }));
            const merged = [...existing, ...newBanks];
            localStorage.setItem("treasury-bank-accounts", JSON.stringify(merged));
            success += bankRows.length;
          } catch (err: any) {
            failed += bankRows.length;
            errors.push(`Failed to save bank accounts: ${err.message}`);
          }
        }

        queryClient.invalidateQueries({ queryKey: ["/api/user-wallets"] });
      }

      setSubmitResult({ success, failed, errors });

      if (success > 0) {
        toast({
          title: `Imported ${success} record${success !== 1 ? "s" : ""} successfully`,
          description: failed > 0 ? `${failed} failed` : undefined,
        });
      } else if (failed > 0) {
        toast({ title: "Import failed", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [preview, toast]);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setSubmitResult(null);
  }, []);

  const totalErrors = preview?.rows.reduce((sum, r) => sum + (r.errors.length > 0 ? 1 : 0), 0) || 0;
  const totalValid = (preview?.rows.length || 0) - totalErrors;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Quick Start</h1>
        <p className="text-muted-foreground">
          Download a template, fill it out offline, then upload to populate your account in one shot
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <Card key={template.id} data-testid={`card-template-${template.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{template.title}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{template.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {template.headers.map(h => (
                    <Badge key={h} variant="secondary" className="text-[10px]">{h}</Badge>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCsv(template)}
                  data-testid={`button-download-${template.id}`}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download CSV
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card data-testid="card-upload-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Filled Template
          </CardTitle>
          <CardDescription>
            Select the template type, then upload your filled CSV file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={selectedTemplate}
              onValueChange={(v) => {
                setSelectedTemplate(v as TemplateType);
                clearPreview();
              }}
            >
              <SelectTrigger className="sm:w-[240px]" data-testid="select-template-type">
                <SelectValue placeholder="Select template type" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                disabled={!selectedTemplate}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                data-testid="input-file-upload"
              />
              <Button
                variant="outline"
                disabled={!selectedTemplate}
                data-testid="button-upload-csv"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                Choose CSV File
              </Button>
            </div>
          </div>

          {preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-sm" data-testid="text-preview-title">
                    Preview: {preview.rows.length} row{preview.rows.length !== 1 ? "s" : ""} found
                  </h3>
                  <Badge variant="secondary" data-testid="badge-valid-count">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {totalValid} valid
                  </Badge>
                  {totalErrors > 0 && (
                    <Badge variant="destructive" data-testid="badge-error-count">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {totalErrors} with errors
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearPreview}
                  data-testid="button-clear-preview"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {preview.headers.map(h => (
                        <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                      ))}
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row, idx) => (
                      <TableRow
                        key={idx}
                        className={row.errors.length > 0 ? "bg-destructive/5" : ""}
                        data-testid={`row-preview-${idx}`}
                      >
                        <TableCell className="text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                        {preview.headers.map(h => (
                          <TableCell key={h} className="text-xs max-w-[200px] truncate">
                            {row.data[h] || "-"}
                          </TableCell>
                        ))}
                        <TableCell>
                          {row.errors.length === 0 ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="flex items-start gap-1">
                              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                              <span className="text-[10px] text-destructive leading-tight">
                                {row.errors.join("; ")}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {submitResult && (
                <Alert variant={submitResult.failed > 0 ? "destructive" : "default"} data-testid="alert-import-result">
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {submitResult.success > 0 && `${submitResult.success} record${submitResult.success !== 1 ? "s" : ""} imported successfully.`}
                        {submitResult.failed > 0 && ` ${submitResult.failed} failed.`}
                      </p>
                      {submitResult.errors.length > 0 && (
                        <ul className="text-xs space-y-0.5">
                          {submitResult.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleConfirmImport}
                  disabled={totalValid === 0 || isSubmitting}
                  data-testid="button-confirm-import"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  )}
                  {isSubmitting ? "Importing..." : `Import ${totalValid} Record${totalValid !== 1 ? "s" : ""}`}
                </Button>
                <Button
                  variant="outline"
                  onClick={clearPreview}
                  disabled={isSubmitting}
                  data-testid="button-cancel-import"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
