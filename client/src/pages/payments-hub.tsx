import { SeoHead } from "@/components/seo-head";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Send,
  QrCode,
  FileText,
  RefreshCw,
  Globe,
  Users,
  ArrowRight,
  Shield,
  Zap,
  Receipt,
} from "lucide-react";

const PAYMENT_TOOLS = [
  {
    id: "send",
    title: "Send Money",
    description: "Send RLUSD, XRP, USDC, or XLM to any wallet worldwide. 4-second settlement, near-zero fees.",
    icon: Send,
    color: "#00A4E4",
    links: [
      { label: "Send via XRPL", path: "/ownbank/send" },
      { label: "Send via Stellar", path: "/stellar/send" },
    ],
    useCase: "Family support, paying freelancers, splitting bills, peer-to-peer transfers",
  },
  {
    id: "receive",
    title: "Get Paid",
    description: "Generate QR codes and payment links anyone can scan to pay you instantly. No app download needed for the sender.",
    icon: QrCode,
    color: "#10b981",
    links: [
      { label: "QR Payment Page", path: "/pay" },
      { label: "XRPL Send & Receive", path: "/ownbank/send" },
    ],
    useCase: "Merchants, street vendors, freelancers, service providers, market sellers",
  },
  {
    id: "invoice",
    title: "Invoice a Client",
    description: "Create professional crypto invoices with shareable links. Track payment status and send reminders.",
    icon: FileText,
    color: "#8b5cf6",
    links: [
      { label: "XRPL Invoices", path: "/ownbank/invoices" },
      { label: "Stellar Invoices", path: "/stellar/invoices" },
    ],
    useCase: "Freelancers, contractors, consultants, small businesses, agencies",
  },
  {
    id: "recurring",
    title: "Auto-Pay & Subscriptions",
    description: "Schedule recurring payments for rent, salaries, subscriptions, or regular family support. You approve each one.",
    icon: RefreshCw,
    color: "#f59e0b",
    links: [
      { label: "Recurring Payments", path: "/ownbank/recurring" },
      { label: "DCA Orders", path: "/ownbank/dca" },
    ],
    useCase: "Rent, subscriptions, salaries, allowances, regular family remittances",
  },
  {
    id: "remittance",
    title: "Send Money Home",
    description: "Cross-border remittances for a fraction of what Western Union or Wise charges. Compare and save.",
    icon: Globe,
    color: "#ef4444",
    links: [
      { label: "Remittance Calculator", path: "/stellar/remittances" },
      { label: "Send via Stellar", path: "/stellar/send" },
    ],
    useCase: "Sending money to family abroad, migrant worker remittances, cross-border support",
  },
  {
    id: "payroll",
    title: "Pay Your Team",
    description: "Batch-send payroll to multiple people in one transaction. Queue payments offline, sync when ready.",
    icon: Users,
    color: "#06b6d4",
    links: [
      { label: "Payment Queue", path: "/ownbank/payment-queue" },
      { label: "Batch via Stellar", path: "/stellar/payment-queue" },
    ],
    useCase: "Small business payroll, contractor payments, supplier payments, team bonuses",
  },
];

const TRUST_POINTS = [
  { icon: Shield, text: "Non-custodial — you sign every payment" },
  { icon: Zap, text: "4-second settlement on XRPL & Stellar" },
  { icon: Receipt, text: "Near-zero fees ($0.0001 average)" },
  { icon: Globe, text: "Works in 190+ countries, no bank needed" },
];

export default function PaymentsHub() {
  return (
    <div className="space-y-8">
      <SeoHead
        title="Crypto Payments Hub — CryptoOwnBank | Send, Receive, Invoice, Payroll Without a Bank"
        description="Send money, get paid, invoice clients, schedule recurring payments, send remittances, and run payroll — all with crypto, all non-custodial. No bank account needed. Works in 190+ countries via XRPL and Stellar. Near-zero fees, 4-second settlement."
        path="/payments"
      />

      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <Badge variant="outline" className="text-[#00A4E4] border-[#00A4E4]/30" data-testid="badge-payments-hub">
          <Zap className="h-3 w-3 mr-1" />
          Non-Custodial Payments
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-payments-hub">
          What do you need to do?
        </h1>
        <p className="text-muted-foreground">
          Everything you need to send, receive, and manage money — without a bank. Choose your task below.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PAYMENT_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card
              key={tool.id}
              className="group hover:shadow-md transition-all border-border/60 hover:border-border"
              data-testid={`card-payment-${tool.id}`}
            >
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className="p-2.5 rounded-lg shrink-0"
                    style={{ backgroundColor: `${tool.color}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: tool.color }} />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-semibold text-lg leading-tight">{tool.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground/70 italic">
                  {tool.useCase}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  {tool.links.map((link) => (
                    <Link key={link.path} href={link.path}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-between group-hover:border-border"
                        data-testid={`button-${tool.id}-${link.label.toLowerCase().replace(/\s/g, "-")}`}
                      >
                        {link.label}
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-muted/30 rounded-xl border p-6 max-w-3xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TRUST_POINTS.map((point) => {
            const TIcon = point.icon;
            return (
              <div key={point.text} className="flex flex-col items-center text-center gap-2">
                <TIcon className="h-5 w-5 text-[#00A4E4]" />
                <span className="text-xs text-muted-foreground">{point.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground max-w-2xl mx-auto space-y-2" data-testid="text-payments-disclaimer">
        <p>
          CryptoOwnBank is non-custodial. We never hold your funds, keys, or tokens. All payments are signed by you using your own wallet (Xaman, Ledger, or Stellar wallet). Transaction fees are paid to the network, not to CryptoOwnBank.
        </p>
      </div>
    </div>
  );
}
