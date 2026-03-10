import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Landmark,
  Zap,
  Globe,
  TrendingUp,
  Shield,
  Coins,
  Users,
  Store,
  CreditCard,
  Wallet,
  ArrowLeftRight,
  Clock,
  DollarSign,
  Send,
  Lock,
  FileText,
} from "lucide-react";

const comparisonRows = [
  {
    category: "Target Market",
    xrp: "Institutional finance, banks, large-value transfers",
    xlm: "Retail users, remittances, micropayments",
  },
  {
    category: "Transaction Speed",
    xrp: "3-5 seconds",
    xlm: "3-5 seconds",
  },
  {
    category: "Transaction Fee",
    xrp: "~0.00001 XRP (~$0.00003)",
    xlm: "~0.00001 XLM (~$0.000004)",
  },
  {
    category: "Consensus",
    xrp: "Federated Byzantine Agreement (UNL validators)",
    xlm: "Stellar Consensus Protocol (SCP, quorum slices)",
  },
  {
    category: "Smart Contracts",
    xrp: "Hooks (native, lightweight) + EVM sidechain",
    xlm: "Soroban (Rust-based, full smart contracts)",
  },
  {
    category: "Built-in DEX",
    xrp: "Native order book DEX with deep liquidity",
    xlm: "Native order book DEX with path payments",
  },
  {
    category: "Stablecoins",
    xrp: "RLUSD (Ripple, regulated, USD-pegged)",
    xlm: "USDC (Circle), EURCV (Monerium), multiple anchored fiats",
  },
  {
    category: "Yield Opportunities",
    xrp: "Soil Protocol vaults (5-8% fixed APR on RLUSD)",
    xlm: "Aqua / Ultra Stellar liquidity rewards, anchor yield",
  },
  {
    category: "Anchor / On-ramp System",
    xrp: "Exchange-based (Uphold, Bitstamp, Gatehub)",
    xlm: "Native anchor protocol (SEP-24/31) — MoneyGram, Tempo, Cowrie",
  },
  {
    category: "Primary Strengths",
    xrp: "Institutional adoption, deep liquidity, regulatory clarity",
    xlm: "Financial inclusion, cross-border retail payments, anchor network",
  },
];

const decisionTree = [
  {
    goal: "Save & earn yield",
    chain: "XRP",
    icon: Landmark,
    color: "text-[#00A4E4]",
    bgColor: "bg-[#00A4E4]/5 border-[#00A4E4]/20",
    explanation: "RLUSD + Soil Protocol vaults offer 5-8% fixed APR with principal protection. Institutional-grade, regulated stablecoin yield.",
    link: "/rwa-yields",
    linkLabel: "Explore RWA Yields",
  },
  {
    goal: "Send remittances",
    chain: "XLM",
    icon: Send,
    color: "text-[#7B61FF]",
    bgColor: "bg-[#7B61FF]/5 border-[#7B61FF]/20",
    explanation: "Stellar's path payments auto-convert currencies. Send USD, recipient gets PHP — the network finds the best route automatically. Native anchor network connects to local cash-out points globally.",
    link: "/stellar/remittances",
    linkLabel: "Remittance Calculator",
  },
  {
    goal: "Trade tokens on a DEX",
    chain: "XRP",
    icon: TrendingUp,
    color: "text-[#00A4E4]",
    bgColor: "bg-[#00A4E4]/5 border-[#00A4E4]/20",
    explanation: "XRPL's native DEX has deep liquidity and well-established trading pairs. AMM pools are being added for even more options.",
    link: "/ownbank/dex",
    linkLabel: "Open DEX Trading",
  },
  {
    goal: "Accept business payments (large B2B)",
    chain: "XRP",
    icon: Landmark,
    color: "text-[#00A4E4]",
    bgColor: "bg-[#00A4E4]/5 border-[#00A4E4]/20",
    explanation: "RLUSD on XRPL is ideal for large B2B invoices — regulatory compliance, deep liquidity for large orders, and instant settlement.",
    link: "/ownbank/send",
    linkLabel: "Send & Receive",
  },
  {
    goal: "Accept retail / POS payments",
    chain: "XLM",
    icon: Store,
    color: "text-[#7B61FF]",
    bgColor: "bg-[#7B61FF]/5 border-[#7B61FF]/20",
    explanation: "Stellar's ultra-low fees (fractions of a penny) make it perfect for small retail transactions. USDC on Stellar is widely supported with MoneyGram cash-out.",
    link: "/stellar/send",
    linkLabel: "Stellar Send",
  },
  {
    goal: "Hold stablecoins",
    chain: "Both",
    icon: Coins,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/5 border-emerald-500/20",
    explanation: "RLUSD on XRP for savings & yield. USDC/EURCV on Stellar for spending & cross-border payments. Different stablecoins, different strengths.",
    link: "/stablecoins",
    linkLabel: "Stablecoin Dashboard",
  },
  {
    goal: "Build DeFi applications",
    chain: "XLM",
    icon: FileText,
    color: "text-[#7B61FF]",
    bgColor: "bg-[#7B61FF]/5 border-[#7B61FF]/20",
    explanation: "Soroban smart contracts (Rust-based) give Stellar full programmability. XRPL has Hooks for simpler on-ledger logic and an EVM sidechain for complex dApps.",
    link: null,
    linkLabel: null,
  },
  {
    goal: "Serve unbanked / underbanked users",
    chain: "XLM",
    icon: Users,
    color: "text-[#7B61FF]",
    bgColor: "bg-[#7B61FF]/5 border-[#7B61FF]/20",
    explanation: "Stellar was built for financial inclusion. Its anchor network connects digital assets to local currencies and cash-out points in developing economies.",
    link: "/stellar/remittances",
    linkLabel: "Remittance Tools",
  },
];

const chainProfiles = [
  {
    name: "XRP Ledger",
    tagline: "The Institutional Savings & Trading Chain",
    color: "#00A4E4",
    icon: Shield,
    strengths: [
      "Regulated stablecoin (RLUSD) with 5-8% fixed yield",
      "Deep DEX liquidity for large trades",
      "Institutional-grade compliance and regulatory clarity",
      "Principal protection via Soil Protocol vaults",
      "XLS-66 native lending coming soon",
      "Cold wallet security (Ledger, ELLIPAL, Xaman)",
    ],
    bestFor: "Saving, earning yield, trading, large B2B payments, long-term holding",
  },
  {
    name: "Stellar (XLM)",
    tagline: "The Retail Payments & Remittance Chain",
    color: "#7B61FF",
    icon: Globe,
    strengths: [
      "Path payments — auto-convert currencies on send",
      "Native anchor network for global cash-in/cash-out",
      "Ultra-low fees ideal for micropayments",
      "MoneyGram integration for USD cash-out",
      "USDC & EURCV for multi-currency stablecoins",
      "Soroban smart contracts for DeFi innovation",
    ],
    bestFor: "Remittances, retail payments, cross-border transfers, financial inclusion, DeFi development",
  },
];

export default function ChainGuide() {
  const [comparisonOpen, setComparisonOpen] = useState(true);
  const [decisionOpen, setDecisionOpen] = useState(true);
  const [profilesOpen, setProfilesOpen] = useState(true);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-chain-guide-title">
          XRP vs XLM: When to Use Which
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="text-chain-guide-subtitle">
          Both chains are fast, cheap, and non-custodial — but they serve different purposes.
          CryptoOwnBank helps you leverage the best of both.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium" data-testid="text-chain-guide-tldr-title">The Short Version</p>
              <p className="text-sm text-muted-foreground mt-0.5" data-testid="text-chain-guide-tldr">
                <strong>XRP</strong> is the institutional/savings chain — use it for yield (RLUSD + Soil vaults), DEX trading, and large B2B payments.{" "}
                <strong>XLM</strong> is the retail/remittance chain — use it for cross-border transfers, path payments, and connecting to local currencies via anchors.{" "}
                <strong>CryptoOwnBank</strong> is the unified platform where you manage both from one dashboard.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Collapsible open={profilesOpen} onOpenChange={setProfilesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">
                <Globe className="h-4 w-4 inline mr-2" />
                Chain Profiles
              </CardTitle>
              {profilesOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chainProfiles.map((chain) => (
                  <div
                    key={chain.name}
                    className="rounded-md border p-4 space-y-3"
                    data-testid={`card-chain-profile-${chain.name.toLowerCase().replace(/[^a-z]/g, "")}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${chain.color}15` }}
                      >
                        <chain.icon className="h-4 w-4" style={{ color: chain.color }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: chain.color }}>
                          {chain.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{chain.tagline}</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {chain.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: chain.color }} />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="rounded-md bg-muted/30 border border-muted p-2.5">
                      <p className="text-xs">
                        <span className="font-medium text-foreground">Best for:</span>{" "}
                        <span className="text-muted-foreground">{chain.bestFor}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={comparisonOpen} onOpenChange={setComparisonOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">
                <ArrowLeftRight className="h-4 w-4 inline mr-2" />
                Side-by-Side Comparison
              </CardTitle>
              {comparisonOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 overflow-x-auto">
              <Table data-testid="table-chain-comparison">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Category</TableHead>
                    <TableHead className="min-w-[200px]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#00A4E4]" />
                        XRP Ledger
                      </span>
                    </TableHead>
                    <TableHead className="min-w-[200px]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#7B61FF]" />
                        Stellar (XLM)
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonRows.map((row) => (
                    <TableRow key={row.category} data-testid={`row-comparison-${row.category.toLowerCase().replace(/\s+/g, "-")}`}>
                      <TableCell className="font-medium text-sm">{row.category}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.xrp}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.xlm}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={decisionOpen} onOpenChange={setDecisionOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">
                <ArrowRight className="h-4 w-4 inline mr-2" />
                Decision Tree: If You Want To...
              </CardTitle>
              {decisionOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              {decisionTree.map((item, index) => (
                <div
                  key={index}
                  className={`rounded-md border p-4 ${item.bgColor}`}
                  data-testid={`card-decision-${index}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex items-center gap-3 shrink-0">
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{item.goal}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge
                          variant="outline"
                          className={item.chain === "Both" ? "border-emerald-500/40" : ""}
                          data-testid={`badge-decision-chain-${index}`}
                        >
                          {item.chain === "Both" ? "Both Chains" : `Use ${item.chain}`}
                        </Badge>
                      </div>
                    </div>
                    <div className="sm:ml-8 space-y-2 flex-1">
                      <p className="text-sm text-muted-foreground">{item.explanation}</p>
                      {item.link && (
                        <Link href={item.link} data-testid={`link-decision-${index}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`${
                              item.chain === "XRP"
                                ? "border-[#00A4E4]/40 text-[#00A4E4] hover:bg-[#00A4E4]/10"
                                : item.chain === "XLM"
                                  ? "border-[#7B61FF]/40 text-[#7B61FF] hover:bg-[#7B61FF]/10"
                                  : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                            }`}
                          >
                            {item.linkLabel}
                            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Wallet className="h-4 w-4 inline mr-2" />
            Why CryptoOwnBank for Both Chains?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Shield,
                title: "One Dashboard, Full Control",
                desc: "Track XRP and XLM assets side by side. No switching between apps or block explorers.",
              },
              {
                icon: Lock,
                title: "Non-Custodial Always",
                desc: "Your keys stay on your device — Ledger, Xaman for XRP, Lobstr or StellarTerm for XLM. We never touch them.",
              },
              {
                icon: DollarSign,
                title: "Best Yield Strategy",
                desc: "Use RLUSD on XRP for savings (5-8% APR). Use USDC on Stellar for spending and remittances. Optimize across chains.",
              },
              {
                icon: Clock,
                title: "Instant on Both",
                desc: "Both chains settle in 3-5 seconds. No waiting days for wire transfers or ACH.",
              },
              {
                icon: CreditCard,
                title: "Unified Payment Tools",
                desc: "Send invoices, accept payments, generate QR codes — works with both XRP and Stellar addresses.",
              },
              {
                icon: TrendingUp,
                title: "Future-Ready",
                desc: "XLS-66 lending on XRP, Soroban DeFi on Stellar — CryptoOwnBank grows as both ecosystems evolve.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-md border p-4 space-y-2"
                data-testid={`card-why-both-${i}`}
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-md bg-muted/30 border border-muted p-4 text-center space-y-2" data-testid="text-chain-guide-cta">
            <p className="text-sm font-medium">
              You don't have to choose one chain. Use the right tool for each job.
            </p>
            <p className="text-xs text-muted-foreground">
              CryptoOwnBank positions XRP as your institutional savings engine and XLM as your retail payments rail — both managed from one non-custodial dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
