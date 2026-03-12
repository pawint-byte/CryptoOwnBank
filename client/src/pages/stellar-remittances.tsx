import { useState } from "react";
import { SeoHead } from "@/components/seo-head";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DollarSign,
  Globe,
  ArrowRight,
  Clock,
  Zap,
  Building2,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calculator,
  MapPin,
  Briefcase,
  Heart,
  ShoppingCart,
  Anchor,
  Shield,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const STELLAR_PURPLE = "#7B61FF";

interface Corridor {
  from: string;
  to: string;
  label: string;
  fromSymbol: string;
  toSymbol: string;
  rate: number;
}

const corridors: Corridor[] = [
  { from: "USD", to: "PHP", label: "US to Philippines", fromSymbol: "$", toSymbol: "₱", rate: 56.5 },
  { from: "USD", to: "MXN", label: "US to Mexico", fromSymbol: "$", toSymbol: "$", rate: 17.2 },
  { from: "USD", to: "INR", label: "US to India", fromSymbol: "$", toSymbol: "₹", rate: 83.4 },
  { from: "EUR", to: "NGN", label: "Europe to Nigeria", fromSymbol: "€", toSymbol: "₦", rate: 1680 },
  { from: "USD", to: "KES", label: "US to Kenya", fromSymbol: "$", toSymbol: "KSh", rate: 153 },
  { from: "GBP", to: "PKR", label: "UK to Pakistan", fromSymbol: "£", toSymbol: "₨", rate: 356 },
  { from: "EUR", to: "GHS", label: "Europe to Ghana", fromSymbol: "€", toSymbol: "₵", rate: 16.2 },
  { from: "USD", to: "BRL", label: "US to Brazil", fromSymbol: "$", toSymbol: "R$", rate: 5.05 },
];

interface Provider {
  name: string;
  feePercent: number;
  fixedFee: number;
  spreadPercent: number;
  deliveryTime: string;
  icon: typeof Building2;
}

const providers: Provider[] = [
  { name: "Western Union", feePercent: 5.5, fixedFee: 8, spreadPercent: 2.5, deliveryTime: "1-3 days", icon: Building2 },
  { name: "MoneyGram", feePercent: 4.0, fixedFee: 5, spreadPercent: 2.0, deliveryTime: "1-2 days", icon: Building2 },
  { name: "Wise (TransferWise)", feePercent: 0.6, fixedFee: 2, spreadPercent: 0.5, deliveryTime: "1-2 days", icon: Globe },
  { name: "PayPal / Xoom", feePercent: 3.0, fixedFee: 5, spreadPercent: 3.5, deliveryTime: "1-3 days", icon: DollarSign },
  { name: "Stellar Network", feePercent: 0, fixedFee: 0, spreadPercent: 0.1, deliveryTime: "4 seconds", icon: Zap },
];

interface AnchorInfo {
  name: string;
  region: string;
  currencies: string[];
  description: string;
  url: string;
  type: string;
}

const anchors: AnchorInfo[] = [
  {
    name: "MoneyGram (via Stellar)",
    region: "Global",
    currencies: ["USDC"],
    description: "Cash-in and cash-out at MoneyGram locations worldwide. Convert USDC on Stellar to local cash in minutes.",
    url: "https://stellar.org/moneygram",
    type: "Cash Network",
  },
  {
    name: "Circle (USDC)",
    region: "Global",
    currencies: ["USDC"],
    description: "The issuer of USDC on Stellar. Widely accepted across exchanges and DeFi platforms globally.",
    url: "https://www.circle.com",
    type: "Stablecoin Issuer",
  },
  {
    name: "Tempo (EURCV)",
    region: "Europe",
    currencies: ["EURCV"],
    description: "European anchor providing EUR-backed stablecoin (EURCV) on Stellar for cross-border euro payments.",
    url: "https://tempo.eu.com",
    type: "Euro Anchor",
  },
  {
    name: "Cowrie",
    region: "Nigeria",
    currencies: ["NGN"],
    description: "Nigerian anchor enabling Naira on/off-ramp through Stellar for fast remittances to West Africa.",
    url: "https://www.cowrie.exchange",
    type: "Local Anchor",
  },
  {
    name: "Anclap",
    region: "Latin America",
    currencies: ["ARS", "BRL"],
    description: "Latin American anchor supporting Argentine Peso and Brazilian Real for regional transfers.",
    url: "https://anclap.com",
    type: "Regional Anchor",
  },
  {
    name: "Flutterwave",
    region: "Africa",
    currencies: ["NGN", "KES", "GHS"],
    description: "African payment infrastructure connecting Stellar to mobile money and bank accounts across the continent.",
    url: "https://flutterwave.com",
    type: "Payment Gateway",
  },
  {
    name: "ClickPesa",
    region: "East Africa",
    currencies: ["TZS", "KES"],
    description: "East African anchor connecting Stellar to Tanzanian and Kenyan banking and mobile money systems.",
    url: "https://clickpesa.com",
    type: "Local Anchor",
  },
  {
    name: "NTOKLO",
    region: "Southern Africa",
    currencies: ["ZAR"],
    description: "South African anchor providing ZAR on/off-ramp for Stellar-based cross-border payments.",
    url: "#",
    type: "Local Anchor",
  },
];

const personas = [
  {
    icon: Heart,
    title: "Families Sending Money Home",
    description: "Send money to relatives abroad without losing 7-10% to fees. Your family receives more of every dollar you send.",
    example: "Send $500/month to Philippines — save $35-50 every single transfer vs Western Union.",
  },
  {
    icon: Briefcase,
    title: "Freelancers Paid Internationally",
    description: "Get paid by clients anywhere in the world without waiting days or paying wire fees. Invoice in USD, receive in seconds.",
    example: "Receive a $3,000 invoice payment in USDC — settle in 4 seconds, convert to local currency via anchor.",
  },
  {
    icon: ShoppingCart,
    title: "Small Importers & Exporters",
    description: "Pay suppliers overseas without expensive SWIFT wires. Stellar path payments handle currency conversion automatically.",
    example: "Pay a $10,000 supplier invoice — save $500+ in wire fees and forex spreads vs traditional banking.",
  },
  {
    icon: Users,
    title: "NGOs & Aid Organizations",
    description: "Distribute funds directly to beneficiaries in developing countries with full transparency and minimal overhead.",
    example: "Distribute aid to 1,000 people — each receives funds in seconds via mobile wallet, not weeks via banking.",
  },
];

const stellarSteps = [
  {
    step: 1,
    title: "Get USDC on Stellar",
    description: "Buy USDC from any major exchange (Coinbase, Kraken, etc.) and withdraw to your Stellar wallet address. Or use a Stellar anchor to deposit local currency.",
  },
  {
    step: 2,
    title: "Choose Your Recipient's Corridor",
    description: "Identify how your recipient wants to receive funds — mobile money, bank deposit, or cash pickup at a MoneyGram location.",
  },
  {
    step: 3,
    title: "Send via Stellar",
    description: "Use your Stellar wallet (Lobstr, StellarTerm, StellarX) to send USDC. Stellar's path payment feature automatically finds the best conversion route.",
    link: "/stellar/send",
    linkLabel: "Open Stellar Send Tool",
  },
  {
    step: 4,
    title: "Recipient Cashes Out",
    description: "Your recipient uses a local Stellar anchor to convert to their local currency — via bank transfer, mobile money, or MoneyGram cash pickup.",
  },
];

function formatMoney(value: number, decimals: number = 2): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function StellarRemittances() {
  const [amount, setAmount] = useState("500");
  const [selectedCorridor, setSelectedCorridor] = useState("USD-PHP");
  const [anchorsOpen, setAnchorsOpen] = useState(true);
  const [stepsOpen, setStepsOpen] = useState(true);

  const corridor = corridors.find(
    (c) => `${c.from}-${c.to}` === selectedCorridor
  ) || corridors[0];

  const numAmount = parseFloat(amount) || 0;

  const comparisons = providers.map((p) => {
    const totalFee = p.fixedFee + numAmount * (p.feePercent / 100);
    const spreadCost = numAmount * (p.spreadPercent / 100);
    const totalCost = totalFee + spreadCost;
    const amountReceived = (numAmount - totalCost) * corridor.rate;
    return { ...p, totalFee, spreadCost, totalCost, amountReceived };
  });

  const stellarComp = comparisons.find((c) => c.name === "Stellar Network");
  const worstComp = comparisons.reduce((a, b) => (a.totalCost > b.totalCost ? a : b));

  return (
    <div className="space-y-6">
      <SeoHead
        title="Stellar Remittance Calculator — CryptoOwnBank | Compare Transfer Fees"
        description="Compare remittance fees across providers. See how Stellar saves money on cross-border transfers vs Western Union, Wise, and PayPal."
        path="/stellar/remittances"
      />
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-remittances-title">
          Stellar Remittance Calculator
        </h1>
        <p className="text-muted-foreground">
          Compare remittance fees across providers and discover how Stellar can save you money
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">
            <Zap className="h-4 w-4 inline mr-2" style={{ color: STELLAR_PURPLE }} />
            Why Stellar for Remittances?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-muted-foreground" data-testid="text-old-remittance-heading">Traditional Remittance</h4>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li data-testid="text-old-remit-1">Fees of 5-10% per transfer (Western Union, MoneyGram)</li>
                <li data-testid="text-old-remit-2">Hidden FX spreads add another 2-4% cost</li>
                <li data-testid="text-old-remit-3">Takes 1-5 business days to arrive</li>
                <li data-testid="text-old-remit-4">Requires physical location or complex online forms</li>
              </ul>
            </div>
            <div className="rounded-md border p-4 space-y-2" style={{ borderColor: `${STELLAR_PURPLE}30`, backgroundColor: `${STELLAR_PURPLE}08` }}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4" style={{ color: STELLAR_PURPLE }} />
                <h4 className="text-sm font-semibold" data-testid="text-new-remittance-heading">Stellar Path Payments</h4>
              </div>
              <ul className="text-sm space-y-1.5">
                <li data-testid="text-new-remit-1">Near-zero transaction fees (~$0.00001)</li>
                <li data-testid="text-new-remit-2">Send USD, recipient gets PHP — auto-conversion</li>
                <li data-testid="text-new-remit-3">Settlement in 4 seconds, 24/7/365</li>
                <li data-testid="text-new-remit-4">Works from any smartphone with a Stellar wallet</li>
              </ul>
            </div>
          </div>

          <div className="rounded-md bg-muted/30 border border-muted p-4 space-y-2">
            <h4 className="text-sm font-semibold" data-testid="text-anchor-explainer-heading">
              <Anchor className="h-4 w-4 inline mr-1.5" style={{ color: STELLAR_PURPLE }} />
              What Are Stellar Anchors?
            </h4>
            <p className="text-sm text-muted-foreground">
              Think of anchors like <strong>local money changers that connect crypto to cash</strong>. 
              They are regulated businesses in each country that accept deposits in local currency and issue 
              digital tokens on Stellar (like USDC, EURCV, or local currency tokens). When you want to cash out, 
              a local anchor converts your Stellar tokens back to local money — via bank transfer, mobile money, 
              or even cash pickup at places like MoneyGram.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" style={{ color: STELLAR_PURPLE }} />
            Fee Comparison Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Amount to Send</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9"
                  placeholder="500"
                  min="0"
                  step="any"
                  data-testid="input-remittance-amount"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Corridor</label>
              <Select value={selectedCorridor} onValueChange={setSelectedCorridor}>
                <SelectTrigger data-testid="select-corridor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {corridors.map((c) => (
                    <SelectItem key={`${c.from}-${c.to}`} value={`${c.from}-${c.to}`} data-testid={`select-corridor-${c.from}-${c.to}`}>
                      {c.from} {"\u2192"} {c.to} ({c.label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {numAmount > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                {comparisons.map((comp, i) => {
                  const isStellar = comp.name === "Stellar Network";
                  const savings = worstComp.totalCost - comp.totalCost;
                  return (
                    <div
                      key={comp.name}
                      className={`rounded-md border p-4 ${isStellar ? "border-2" : ""}`}
                      style={isStellar ? { borderColor: STELLAR_PURPLE, backgroundColor: `${STELLAR_PURPLE}08` } : undefined}
                      data-testid={`card-provider-${i}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <comp.icon className="h-5 w-5 shrink-0" style={isStellar ? { color: STELLAR_PURPLE } : undefined} />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold" data-testid={`text-provider-name-${i}`}>{comp.name}</span>
                              {isStellar && (
                                <Badge variant="secondary" className="text-[10px]" data-testid="badge-best-value">
                                  Best Value
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3" />
                              {comp.deliveryTime}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 flex-wrap">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total Cost</p>
                            <p className="text-sm font-semibold" data-testid={`text-total-cost-${i}`}>
                              {corridor.fromSymbol}{formatMoney(comp.totalCost)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Recipient Gets</p>
                            <p className="text-sm font-semibold" data-testid={`text-amount-received-${i}`}>
                              {corridor.toSymbol}{formatMoney(comp.amountReceived, 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {isStellar && savings > 1 && (
                        <p className="text-xs mt-2" style={{ color: STELLAR_PURPLE }} data-testid="text-savings">
                          You save {corridor.fromSymbol}{formatMoney(savings)} compared to the most expensive provider
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {stellarComp && worstComp && numAmount > 0 && (
                <Alert style={{ borderColor: `${STELLAR_PURPLE}40`, backgroundColor: `${STELLAR_PURPLE}08` }}>
                  <CheckCircle2 className="h-4 w-4" style={{ color: STELLAR_PURPLE }} />
                  <AlertTitle data-testid="text-summary-heading">Potential Savings with Stellar</AlertTitle>
                  <AlertDescription>
                    <span data-testid="text-summary-detail">
                      On a {corridor.fromSymbol}{formatMoney(numAmount)} transfer from {corridor.from} to {corridor.to}, 
                      Stellar saves you up to <strong>{corridor.fromSymbol}{formatMoney(worstComp.totalCost - stellarComp.totalCost)}</strong> in 
                      fees — and delivers in <strong>4 seconds</strong> instead of days.
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Collapsible open={stepsOpen} onOpenChange={setStepsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">
                <MapPin className="h-4 w-4 inline mr-2" style={{ color: STELLAR_PURPLE }} />
                How to Send a Stellar Remittance (Step by Step)
              </CardTitle>
              {stepsOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stellarSteps.map((s) => (
                  <div key={s.step} className="rounded-md border p-4 space-y-2" data-testid={`card-step-${s.step}`}>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: STELLAR_PURPLE }}
                      >
                        {s.step}
                      </div>
                      <h4 className="text-sm font-semibold" data-testid={`text-step-title-${s.step}`}>{s.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                    {"link" in s && s.link && (
                      <Link href={s.link} data-testid={`link-step-action-${s.step}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#7B61FF]/40 text-[#7B61FF] hover:bg-[#7B61FF]/10"
                        >
                          {s.linkLabel}
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              <Alert className="border-amber-500/40 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle data-testid="text-important-note-heading">Important Note</AlertTitle>
                <AlertDescription className="text-sm">
                  Always verify the anchor you're using is listed on the 
                  <a
                    href="https://stellar.org/ecosystem/anchors"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline ml-1"
                    style={{ color: STELLAR_PURPLE }}
                    data-testid="link-stellar-anchors"
                  >
                    Stellar Anchor Directory
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  . Use only anchors regulated in their jurisdictions.
                </AlertDescription>
              </Alert>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={anchorsOpen} onOpenChange={setAnchorsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">
                <Anchor className="h-4 w-4 inline mr-2" style={{ color: STELLAR_PURPLE }} />
                Stellar Anchor Directory
              </CardTitle>
              {anchorsOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <p className="text-sm text-muted-foreground mb-4">
                Stellar anchors are regulated businesses that bridge digital assets on Stellar with traditional financial systems. 
                They handle the "last mile" — converting Stellar tokens into local currency your recipient can spend.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {anchors.map((anchor, i) => (
                  <div key={anchor.name} className="rounded-md border p-4 space-y-2" data-testid={`card-anchor-${i}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold" data-testid={`text-anchor-name-${i}`}>{anchor.name}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{anchor.region}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{anchor.type}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{anchor.description}</p>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {anchor.currencies.map((cur) => (
                          <Badge key={cur} variant="outline" className="text-[10px]" data-testid={`badge-currency-${anchor.name}-${cur}`}>
                            {cur}
                          </Badge>
                        ))}
                      </div>
                      {anchor.url !== "#" && (
                        <a
                          href={anchor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs inline-flex items-center gap-1 hover:underline"
                          style={{ color: STELLAR_PURPLE }}
                          data-testid={`link-anchor-${i}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Visit
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Users className="h-4 w-4 inline mr-2" style={{ color: STELLAR_PURPLE }} />
            Who Is This For?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personas.map((persona, i) => (
              <div key={persona.title} className="rounded-md border p-4 space-y-3" data-testid={`card-persona-${i}`}>
                <div className="flex items-center gap-2">
                  <persona.icon className="h-5 w-5 shrink-0" style={{ color: STELLAR_PURPLE }} />
                  <h4 className="text-sm font-semibold" data-testid={`text-persona-title-${i}`}>{persona.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground">{persona.description}</p>
                <div className="rounded-md bg-muted/30 border border-muted p-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Example: </span>
                    {persona.example}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5" style={{ color: STELLAR_PURPLE }} />
              <div>
                <p className="text-sm font-semibold" data-testid="text-cta-heading">Ready to send your first Stellar remittance?</p>
                <p className="text-xs text-muted-foreground">
                  Download a Stellar wallet (Lobstr, StellarTerm) and start sending today.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a href="https://lobstr.co" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" data-testid="button-lobstr">
                  Lobstr Wallet
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </a>
              <a href="https://stellarterm.com" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" data-testid="button-stellarterm">
                  StellarTerm
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </a>
              <a href="https://stellar.org" target="_blank" rel="noopener noreferrer">
                <Button style={{ backgroundColor: STELLAR_PURPLE, borderColor: STELLAR_PURPLE, color: "white" }} data-testid="button-learn-stellar">
                  Learn More
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}