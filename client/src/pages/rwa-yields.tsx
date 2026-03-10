import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Landmark,
  Shield,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  Building2,
  Globe,
  Info,
  ArrowRight,
  FileText,
  Lock,
  Droplets,
  Scale,
} from "lucide-react";

interface YieldOpportunity {
  protocol: string;
  chain: string;
  asset: string;
  apyRange: string;
  apyMid: number;
  backingType: string;
  tvl: string;
  riskLevel: "Low" | "Medium" | "High";
  link: string;
  description: string;
  integrated: boolean;
}

const YIELD_OPPORTUNITIES: YieldOpportunity[] = [
  {
    protocol: "Soil Protocol",
    chain: "XRPL",
    asset: "RLUSD",
    apyRange: "5–8%",
    apyMid: 6.5,
    backingType: "Private Credit & Treasuries",
    tvl: "$12M+",
    riskLevel: "Low",
    link: "https://soil.xyz",
    description: "Earn yield on RLUSD through institutional-grade credit vaults on the XRP Ledger. Backed by real-world loan portfolios and short-term treasuries.",
    integrated: true,
  },
  {
    protocol: "Ondo Finance",
    chain: "Ethereum",
    asset: "USDY",
    apyRange: "~5.2%",
    apyMid: 5.2,
    backingType: "US Treasuries",
    tvl: "$500M+",
    riskLevel: "Low",
    link: "https://ondo.finance",
    description: "USDY is a tokenized note backed by short-term US Treasuries and bank deposits. Offers transparent, regulated yield with daily liquidity.",
    integrated: false,
  },
  {
    protocol: "Ondo Finance",
    chain: "Ethereum",
    asset: "OUSG",
    apyRange: "~4.8%",
    apyMid: 4.8,
    backingType: "Short-Term Govt Bonds",
    tvl: "$200M+",
    riskLevel: "Low",
    link: "https://ondo.finance",
    description: "OUSG provides tokenized exposure to short-term US government bond funds managed by BlackRock. Institutional-grade with KYC required.",
    integrated: false,
  },
  {
    protocol: "Centrifuge",
    chain: "Ethereum / Base",
    asset: "Various",
    apyRange: "4–10%",
    apyMid: 7.0,
    backingType: "Invoices / Real Estate / Trade Finance",
    tvl: "$250M+",
    riskLevel: "Medium",
    link: "https://centrifuge.io",
    description: "Centrifuge tokenizes real-world assets like invoices, real estate mortgages, and trade finance receivables into on-chain pools. Variable yields depending on pool risk.",
    integrated: false,
  },
  {
    protocol: "XDC / TradeFi",
    chain: "XDC Network",
    asset: "XDC-based",
    apyRange: "5–9%",
    apyMid: 7.0,
    backingType: "Trade Receivables",
    tvl: "$100M+",
    riskLevel: "Medium",
    link: "https://xinfin.org",
    description: "XDC Network focuses on tokenized trade finance. Platforms like Tradeteq and Yodaplus offer exposure to global trade receivables with attractive yields.",
    integrated: false,
  },
  {
    protocol: "Maple Finance",
    chain: "Ethereum / Solana",
    asset: "USDC / wETH",
    apyRange: "6–12%",
    apyMid: 9.0,
    backingType: "Institutional Lending",
    tvl: "$100M+",
    riskLevel: "Medium",
    link: "https://maple.finance",
    description: "Maple provides under-collateralized lending pools for institutional borrowers. Higher yields but with credit exposure to vetted corporate borrowers.",
    integrated: false,
  },
];

interface ComparisonRow {
  type: string;
  product: string;
  apy: string;
  apyNum: number;
  notes: string;
}

const COMPARISON_DATA: ComparisonRow[] = [
  { type: "Traditional", product: "Bank Savings Account", apy: "~0.5%", apyNum: 0.5, notes: "FDIC insured, instant access, negligible yield" },
  { type: "Traditional", product: "High-Yield Savings", apy: "~4.5%", apyNum: 4.5, notes: "Online banks, FDIC insured, variable rate" },
  { type: "Traditional", product: "Money Market Fund", apy: "~5.0%", apyNum: 5.0, notes: "Not FDIC insured, daily liquidity, government bonds" },
  { type: "Tokenized", product: "USDY (Ondo)", apy: "~5.2%", apyNum: 5.2, notes: "Tokenized treasuries, 24/7 settlement, blockchain-native" },
  { type: "Tokenized", product: "Soil RLUSD Vaults", apy: "5–8%", apyNum: 6.5, notes: "XRPL-native, credit-backed, non-custodial" },
  { type: "Tokenized", product: "Centrifuge Pools", apy: "4–10%", apyNum: 7.0, notes: "Real estate, invoices, trade finance pools" },
];

interface RiskInfo {
  type: string;
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  mitigation: string;
}

const RISK_EDUCATION: RiskInfo[] = [
  {
    type: "credit",
    icon: Building2,
    title: "Credit Risk",
    description: "RWA yields depend on real-world borrowers repaying their loans. If borrowers default, the principal in the pool could be partially or fully lost.",
    mitigation: "Look for protocols with over-collateralization, insurance reserves, and transparent borrower vetting processes. Diversify across multiple pools.",
  },
  {
    type: "smart_contract",
    icon: Lock,
    title: "Smart Contract Risk",
    description: "RWA tokens rely on smart contracts to manage deposits, interest accrual, and redemptions. Bugs or exploits in these contracts could lead to loss of funds.",
    mitigation: "Choose protocols with multiple audits from reputable firms. Check if they have bug bounty programs and insurance coverage.",
  },
  {
    type: "liquidity",
    icon: Droplets,
    title: "Liquidity Risk",
    description: "Some RWA pools have lock-up periods or limited secondary markets. You may not be able to withdraw your funds immediately when needed.",
    mitigation: "Check withdrawal terms before depositing. Some protocols offer instant redemption for smaller amounts. Plan your liquidity needs accordingly.",
  },
  {
    type: "regulatory",
    icon: Scale,
    title: "Regulatory Risk",
    description: "Tokenized RWAs operate in a rapidly evolving regulatory landscape. New rules could affect token availability, yields, or legal status in your jurisdiction.",
    mitigation: "Use protocols that are proactively seeking regulatory compliance. Check if tokens are available in your jurisdiction before investing.",
  },
];

function getRiskColor(level: string) {
  if (level === "Low") return "text-green-600 dark:text-green-400";
  if (level === "Medium") return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getRiskBadgeVariant(level: string) {
  if (level === "Low") return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (level === "Medium") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

export default function RwaYields() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-rwa-yields-title">
          Real-World Asset Yield Explorer
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="text-rwa-yields-subtitle">
          Your money working in the real economy — not just crypto speculation
        </p>
      </div>

      <Card data-testid="card-rwa-education">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-[#00A4E4] shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium">What are Real-World Assets (RWAs)?</p>
              <p className="text-sm text-muted-foreground">
                RWA tokens represent ownership or exposure to real-world assets — like US Treasury bonds, real estate mortgages, trade invoices, or corporate loans — on the blockchain. Instead of earning yield from speculative crypto trading, RWA yields come from tangible economic activity: governments paying interest on bonds, businesses paying invoices, or borrowers repaying loans.
              </p>
              <p className="text-sm text-muted-foreground">
                This means more predictable, sustainable returns compared to volatile DeFi farming — often with institutional-grade backing and transparent collateral.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-yield-opportunities-heading">
          <TrendingUp className="h-5 w-5 text-[#00A4E4]" />
          Yield Opportunities
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {YIELD_OPPORTUNITIES.map((opp) => (
            <Card key={`${opp.protocol}-${opp.asset}`} data-testid={`card-yield-${opp.protocol.toLowerCase().replace(/[\s\/]/g, "-")}-${opp.asset.toLowerCase()}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="min-w-0">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap" data-testid={`text-protocol-${opp.protocol.toLowerCase().replace(/[\s\/]/g, "-")}`}>
                    {opp.protocol}
                    {opp.integrated && (
                      <Badge variant="default" className="text-xs bg-[#00A4E4]" data-testid={`badge-integrated-${opp.protocol.toLowerCase().replace(/[\s\/]/g, "-")}`}>
                        Integrated
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{opp.chain}</p>
                </div>
                <Badge className={`shrink-0 ${getRiskBadgeVariant(opp.riskLevel)}`} data-testid={`badge-risk-${opp.protocol.toLowerCase().replace(/[\s\/]/g, "-")}-${opp.asset.toLowerCase()}`}>
                  {opp.riskLevel} Risk
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{opp.description}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Asset</p>
                    <p className="text-sm font-medium" data-testid={`text-asset-${opp.protocol.toLowerCase().replace(/[\s\/]/g, "-")}-${opp.asset.toLowerCase()}`}>{opp.asset}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">APY</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400" data-testid={`text-apy-${opp.protocol.toLowerCase().replace(/[\s\/]/g, "-")}-${opp.asset.toLowerCase()}`}>{opp.apyRange}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Backing</p>
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <p className="text-sm font-medium" data-testid={`text-backing-${opp.protocol.toLowerCase().replace(/[\s\/]/g, "-")}-${opp.asset.toLowerCase()}`}>{opp.backingType}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">TVL</p>
                    <p className="text-sm font-medium" data-testid={`text-tvl-${opp.protocol.toLowerCase().replace(/[\s\/]/g, "-")}-${opp.asset.toLowerCase()}`}>{opp.tvl}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end pt-1">
                  {opp.integrated ? (
                    <a href="/ownbank/vaults" data-testid={`link-deposit-${opp.protocol.toLowerCase().replace(/[\s\/]/g, "-")}`}>
                      <Button size="sm" className="bg-[#00A4E4] text-white border-[#00A4E4]">
                        <Landmark className="h-4 w-4 mr-1.5" />
                        Deposit Now
                      </Button>
                    </a>
                  ) : (
                    <a href={opp.link} target="_blank" rel="noopener noreferrer" data-testid={`link-protocol-${opp.protocol.toLowerCase().replace(/[\s\/]/g, "-")}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-1.5" />
                        Visit Protocol
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-comparison-heading">
          <Scale className="h-5 w-5" />
          Traditional vs Tokenized Yields
        </h2>
        <Card data-testid="card-yield-comparison">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">APY</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_DATA.map((row, i) => (
                    <tr key={i} className="border-b last:border-b-0" data-testid={`row-comparison-${i}`}>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-xs ${row.type === "Tokenized" ? "border-[#00A4E4]/40 text-[#00A4E4]" : ""}`}>
                          {row.type}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">{row.product}</td>
                      <td className="p-3">
                        <span className={`font-semibold ${row.apyNum >= 5 ? "text-green-600 dark:text-green-400" : row.apyNum >= 4 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                          {row.apy}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Info className="h-3 w-3 shrink-0" />
          Yields are approximate and subject to change. Traditional rates based on US market as of early 2026. Tokenized rates vary by pool and market conditions.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-risks-heading">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Understanding RWA Risks
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          RWA tokens offer attractive yields but carry unique risks different from traditional DeFi. Understanding these risks helps you make informed allocation decisions.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {RISK_EDUCATION.map((risk) => (
            <Card key={risk.type} data-testid={`card-risk-${risk.type}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <risk.icon className={`h-5 w-5 shrink-0 ${risk.type === "credit" ? "text-amber-500" : risk.type === "smart_contract" ? "text-red-500" : risk.type === "liquidity" ? "text-blue-500" : "text-purple-500"}`} />
                  <h3 className="font-semibold text-sm" data-testid={`text-risk-title-${risk.type}`}>{risk.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{risk.description}</p>
                <div className="rounded-md bg-muted/30 border border-muted p-3">
                  <p className="text-xs">
                    <span className="font-medium text-foreground">Mitigation:</span>{" "}
                    <span className="text-muted-foreground">{risk.mitigation}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-[#00A4E4]/30 bg-[#00A4E4]/5" data-testid="card-rwa-cta">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Landmark className="h-6 w-6 text-[#00A4E4] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Ready to earn RWA yield?</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Soil Protocol is already integrated with CryptoOwnBank. Deposit RLUSD and start earning 5–8% APY backed by real-world credit.
                </p>
              </div>
            </div>
            <a href="/ownbank/vaults" data-testid="link-cta-vaults">
              <Button className="bg-[#00A4E4] text-white border-[#00A4E4] shrink-0">
                <ArrowRight className="h-4 w-4 mr-1.5" />
                Go to Vaults
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center pb-2">
        Information provided is for educational purposes only. Not financial advice. Always do your own research before depositing into any protocol. Past yields do not guarantee future returns.
      </p>
    </div>
  );
}
