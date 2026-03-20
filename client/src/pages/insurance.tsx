import { useState } from "react";
import { Link } from "wouter";
import { SeoHead } from "@/components/seo-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ExternalLink,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Layers,
  Globe,
  Zap,
  Plane,
  Users,
  Lock,
  Scale,
  Compass,
  Wallet,
} from "lucide-react";

interface InsuranceProtocol {
  id: string;
  name: string;
  covers: string;
  chains: string[];
  howItWorks: string;
  link: string;
  description: string;
  coverTypes: string[];
  minCover: string;
  premiumRange: string;
  claimProcess: string;
  steps: string[];
}

const INSURANCE_PROTOCOLS: InsuranceProtocol[] = [
  {
    id: "nexus-mutual",
    name: "Nexus Mutual",
    covers: "Smart Contract Cover, Protocol Cover, Custody Cover",
    chains: ["Ethereum"],
    howItWorks: "Members pool ETH into a mutual to underwrite cover. If a covered smart contract is hacked or a protocol suffers a loss event, members can file a claim. Claims are assessed by other members who vote on validity. Payouts come from the mutual's capital pool.",
    link: "https://nexusmutual.io",
    description: "The largest and most established DeFi insurance protocol. Nexus Mutual operates as a discretionary mutual where members share risk. It covers smart contract failures, protocol exploits, and custodian hacks.",
    coverTypes: ["Smart Contract Cover", "Protocol Cover", "Custody Cover", "Yield Token Cover"],
    minCover: "No strict minimum (gas fees apply)",
    premiumRange: "2–8% annually depending on protocol risk",
    claimProcess: "File claim with evidence \u2192 Community assessment \u2192 Vote \u2192 Payout if approved",
    steps: [
      "Visit app.nexusmutual.io and connect your Ethereum wallet",
      "Browse available cover products — search by protocol name or category",
      "Select your cover amount and duration (30–365 days)",
      "Pay the premium in ETH or NXM tokens",
      "If a covered event occurs, file a claim through the app with supporting evidence",
    ],
  },
  {
    id: "insurace",
    name: "InsurAce",
    covers: "Smart Contract Vulnerabilities, Stablecoin De-peg, Bridge Exploits",
    chains: ["Ethereum", "BSC", "Polygon", "Avalanche", "Arbitrum"],
    howItWorks: "InsurAce uses a portfolio-based model where users can bundle cover for multiple protocols at a discount. Premiums are calculated dynamically based on risk assessments. Claims undergo a community governance vote, and payouts are made from insurance pools funded by liquidity providers.",
    link: "https://insurace.io",
    description: "A multi-chain DeFi insurance protocol offering portfolio cover across many chains and protocols. InsurAce stands out with its low premiums and ability to bundle multiple covers into a single policy.",
    coverTypes: ["Smart Contract Cover", "Stablecoin De-peg Cover", "Bridge Cover", "CEX Cover"],
    minCover: "$100 equivalent",
    premiumRange: "1–5% annually (portfolio discounts available)",
    claimProcess: "File claim within 15 days \u2192 Advisory committee review \u2192 Community vote \u2192 Payout",
    steps: [
      "Visit app.insurace.io and connect your wallet on the chain of your choice",
      "Browse the cover marketplace or use the portfolio builder to bundle multiple covers",
      "Select cover amount, duration, and review the premium quote",
      "Purchase cover by paying the premium in the supported token",
      "Monitor your active covers in the dashboard — file a claim if a covered event occurs",
    ],
  },
  {
    id: "bridge-mutual",
    name: "Bridge Mutual",
    covers: "Smart Contract Exploits, Stablecoin De-peg, Exchange Hacks",
    chains: ["Ethereum", "BSC", "Polygon"],
    howItWorks: "Bridge Mutual is a peer-to-peer insurance platform. Anyone can create coverage pools for any protocol or asset. Liquidity providers earn premiums by underwriting risk. Claims are decided through a decentralized voting process with multiple appeal rounds to ensure fairness.",
    link: "https://bridgemutual.io",
    description: "A decentralized, peer-to-peer insurance platform where anyone can create coverage pools and provide liquidity to earn premiums. Offers a permissionless model where the community decides what gets covered.",
    coverTypes: ["Smart Contract Cover", "Stablecoin Cover", "Exchange Cover", "Custom Pools"],
    minCover: "Varies by pool",
    premiumRange: "2–7% annually depending on pool",
    claimProcess: "File claim \u2192 Voting period (7 days) \u2192 Appeal option \u2192 Final decision \u2192 Payout",
    steps: [
      "Visit app.bridgemutual.io and connect your Ethereum, BSC, or Polygon wallet",
      "Browse available coverage pools or search for a specific protocol",
      "Select your coverage amount and duration",
      "Pay the premium to activate your cover",
      "If a loss event occurs, submit a claim with transaction evidence during the claim window",
    ],
  },
  {
    id: "etherisc",
    name: "Etherisc",
    covers: "Parametric Insurance (Flight Delay, Crop Insurance, Crypto Wallet Protection)",
    chains: ["Ethereum", "Gnosis Chain"],
    howItWorks: "Etherisc focuses on parametric insurance — policies that pay out automatically based on verifiable data (e.g., flight delays confirmed by oracles). No manual claim process needed for parametric products. Smart contracts trigger payouts when predefined conditions are met, using on-chain oracles for data verification.",
    link: "https://etherisc.com",
    description: "A decentralized insurance protocol specializing in parametric insurance products. Unlike traditional DeFi insurance focused on smart contract risk, Etherisc bridges blockchain insurance with real-world events like flight delays and crop failures.",
    coverTypes: ["Flight Delay Insurance", "Crop Insurance", "Crypto Wallet Protection", "Parametric Products"],
    minCover: "Varies by product",
    premiumRange: "Product-specific pricing",
    claimProcess: "Automatic payout via oracle data (parametric) or manual filing for other products",
    steps: [
      "Visit etherisc.com and explore available insurance products",
      "Choose a product (e.g., flight delay insurance for an upcoming trip)",
      "Enter the required details (flight number, date, etc.) and review the quote",
      "Purchase the policy by paying the premium with supported tokens",
      "For parametric products, payouts are triggered automatically — no claim filing needed",
    ],
  },
];

interface RecommendationItem {
  title: string;
  description: string;
  icon: typeof Shield;
}

const RECOMMENDATIONS: RecommendationItem[] = [
  {
    title: "Cover your DeFi positions first",
    description: "If you're depositing into yield protocols like Soil, Centrifuge, or Maple Finance, consider smart contract cover from Nexus Mutual or InsurAce. This protects against protocol exploits — the biggest risk in DeFi.",
    icon: Shield,
  },
  {
    title: "Consider stablecoin de-peg cover",
    description: "If a significant portion of your portfolio is in stablecoins (RLUSD, USDC, USDT), de-peg cover from InsurAce can protect against scenarios where a stablecoin loses its peg.",
    icon: Scale,
  },
  {
    title: "Bundle covers to save on premiums",
    description: "InsurAce offers portfolio discounts when you bundle multiple covers. If you're using several protocols, this can significantly reduce your overall premium cost.",
    icon: Layers,
  },
  {
    title: "Understand the limitations",
    description: "DeFi insurance is not the same as traditional insurance. It doesn't cover market losses, impermanent loss, or regulatory actions. It specifically covers technical failures like smart contract exploits and oracle manipulation.",
    icon: AlertTriangle,
  },
];

function ProtocolCard({ protocol }: { protocol: InsuranceProtocol }) {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <Card data-testid={`card-insurance-${protocol.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap" data-testid={`text-protocol-${protocol.id}`}>
            {protocol.name}
          </CardTitle>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {protocol.chains.map((chain) => (
              <Badge key={chain} variant="secondary" className="text-xs" data-testid={`badge-chain-${protocol.id}-${chain.toLowerCase()}`}>
                {chain}
              </Badge>
            ))}
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 text-xs" data-testid={`badge-free-${protocol.id}`}>
          Free to View
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground" data-testid={`text-description-${protocol.id}`}>{protocol.description}</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" /> Covers
            </p>
            <p className="text-sm font-medium" data-testid={`text-covers-${protocol.id}`}>{protocol.covers}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="h-3 w-3" /> Chains
            </p>
            <p className="text-sm font-medium" data-testid={`text-chains-${protocol.id}`}>{protocol.chains.join(", ")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Min Cover</p>
            <p className="text-sm font-medium" data-testid={`text-min-cover-${protocol.id}`}>{protocol.minCover}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Premium Range</p>
            <p className="text-sm font-medium" data-testid={`text-premium-${protocol.id}`}>{protocol.premiumRange}</p>
          </div>
        </div>

        <div className="pt-1 border-t">
          <p className="text-xs text-muted-foreground mb-1">Cover Types</p>
          <div className="flex flex-wrap gap-1.5">
            {protocol.coverTypes.map((type) => (
              <Badge key={type} variant="secondary" className="text-xs" data-testid={`badge-cover-type-${protocol.id}-${type.toLowerCase().replace(/\s/g, "-")}`}>
                {type}
              </Badge>
            ))}
          </div>
        </div>

        <div className="pt-1 border-t">
          <p className="text-xs text-muted-foreground mb-1">How It Works</p>
          <p className="text-sm text-muted-foreground" data-testid={`text-how-${protocol.id}`}>{protocol.howItWorks}</p>
        </div>

        <div className="pt-1 border-t">
          <p className="text-xs text-muted-foreground mb-1">Claim Process</p>
          <p className="text-sm font-medium" data-testid={`text-claim-${protocol.id}`}>{protocol.claimProcess}</p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <a href={protocol.link} target="_blank" rel="noopener noreferrer" data-testid={`link-protocol-${protocol.id}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Visit {protocol.name}
            </Button>
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSteps(!showSteps)}
            data-testid={`button-steps-${protocol.id}`}
          >
            {showSteps ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
            {showSteps ? "Hide Steps" : "Get Started"}
          </Button>
        </div>

        {showSteps && (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3" data-testid={`steps-${protocol.id}`}>
            <p className="text-sm font-semibold flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#00A4E4]" />
              How to get started with {protocol.name}
            </p>
            <ol className="space-y-2">
              {protocol.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#00A4E4]/10 text-[#00A4E4] text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Insurance() {
  return (
    <div className="max-w-5xl mx-auto space-y-8" data-testid="page-insurance">
      <SeoHead
        title="DeFi Insurance Directory — CryptoOwnBank | Protect Your Crypto"
        description="Compare decentralized insurance protocols to protect your crypto, DeFi positions, and smart contract risk. Nexus Mutual, InsurAce, Etherisc, and more."
        path="/insurance"
      />
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">DeFi Insurance Directory</h1>
        <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
          Protect your crypto and DeFi positions with decentralized insurance protocols
        </p>
      </div>

      <Card data-testid="card-what-is-defi-insurance">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-[#00A4E4]" />
            What is DeFi Insurance?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            DeFi insurance protocols allow you to protect your crypto assets and DeFi positions against specific risks like smart contract exploits, stablecoin de-pegging events, and exchange hacks. Unlike traditional insurance companies, DeFi insurance is powered by decentralized pools of capital where community members both provide coverage and assess claims.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-[#00A4E4]/10 shrink-0">
                <Lock className="h-4 w-4 text-[#00A4E4]" />
              </div>
              <div>
                <p className="text-sm font-medium">Smart Contract Cover</p>
                <p className="text-xs text-muted-foreground">Protects against hacks and exploits in DeFi protocols you use</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-[#00A4E4]/10 shrink-0">
                <Scale className="h-4 w-4 text-[#00A4E4]" />
              </div>
              <div>
                <p className="text-sm font-medium">De-peg Cover</p>
                <p className="text-xs text-muted-foreground">Covers losses if a stablecoin loses its peg to the underlying asset</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-[#00A4E4]/10 shrink-0">
                <Zap className="h-4 w-4 text-[#00A4E4]" />
              </div>
              <div>
                <p className="text-sm font-medium">Parametric Insurance</p>
                <p className="text-xs text-muted-foreground">Automatic payouts when predefined conditions are met via oracles</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 flex items-start gap-2.5 mt-2" data-testid="banner-insurance-disclaimer">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              DeFi insurance is different from traditional insurance. It does not cover market losses, impermanent loss, user error (like sending to a wrong address), or regulatory actions. Coverage is limited to the specific events described in each protocol's policy terms. Always read the cover wording before purchasing.
            </p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-section-protocols">
          <Shield className="h-5 w-5 text-[#00A4E4]" />
          Insurance Protocols
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {INSURANCE_PROTOCOLS.map((protocol) => (
            <ProtocolCard key={protocol.id} protocol={protocol} />
          ))}
        </div>
      </div>

      <Card data-testid="card-recommendations">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            What CryptoOwnBank Recommends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {RECOMMENDATIONS.map((rec) => {
              const Icon = rec.icon;
              return (
                <div key={rec.title} className="flex items-start gap-3" data-testid={`recommendation-${rec.title.toLowerCase().replace(/\s/g, "-")}`}>
                  <div className="flex items-center justify-center h-8 w-8 rounded-md bg-muted shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{rec.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#00A4E4]/20 bg-[#00A4E4]/5" data-testid="card-cta-portfolio-insurance">
        <CardContent className="py-5">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="h-12 w-12 rounded-lg bg-[#00A4E4]/10 flex items-center justify-center shrink-0">
              <Wallet className="h-6 w-6 text-[#00A4E4]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Know What to Protect</h3>
              <p className="text-sm text-muted-foreground">
                Review your portfolio to identify which assets and DeFi positions would benefit most from coverage.
              </p>
            </div>
            <Link href="/portfolio" data-testid="link-cta-portfolio-insurance">
              <Button className="bg-[#00A4E4] text-white border-[#00A4E4] shrink-0">
                <Wallet className="h-4 w-4 mr-2" />
                View Your Portfolio
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border p-4 flex items-start gap-3" data-testid="banner-not-financial-advice">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          CryptoOwnBank does not sell, underwrite, or administer insurance products. This page is an educational directory only. All insurance protocols listed are independent third-party services. We do not receive commissions or referral fees. Always do your own research and read the full policy terms before purchasing any cover. This is not financial or insurance advice.
        </p>
      </div>
    </div>
  );
}