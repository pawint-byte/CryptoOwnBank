import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import {
  AlertTriangle,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronUp,
  Shield,
  Compass,
  Landmark,
  Percent,
  Scale,
  Zap,
  Lock,
  Layers,
  TrendingDown,
  BookOpen,
} from "lucide-react";

interface LendingProtocol {
  id: string;
  name: string;
  chains: string[];
  collateralAccepted: string[];
  borrowAssets: string[];
  borrowRateRange: string;
  ltvRange: string;
  liquidationThreshold: string;
  link: string;
  description: string;
  riskLevel: "Low" | "Medium" | "High";
  steps: string[];
}

const LENDING_PROTOCOLS: LendingProtocol[] = [
  {
    id: "aave",
    name: "Aave",
    chains: ["Ethereum", "Polygon", "Arbitrum", "Optimism", "Avalanche", "Base"],
    collateralAccepted: ["ETH", "WBTC", "USDC", "USDT", "DAI", "LINK", "AAVE"],
    borrowAssets: ["USDC", "DAI", "USDT", "ETH", "WBTC"],
    borrowRateRange: "2–12% variable",
    ltvRange: "50–80%",
    liquidationThreshold: "65–90%",
    link: "https://app.aave.com",
    description: "The largest decentralized lending protocol by TVL. Aave pioneered flash loans and offers variable and stable interest rates across multiple chains. Governance-controlled risk parameters and a robust safety module make it the go-to for DeFi borrowing.",
    riskLevel: "Medium",
    steps: [
      "Visit app.aave.com and connect your Ethereum wallet (MetaMask, WalletConnect, etc.)",
      "Select the market and chain you want to use (e.g., Ethereum mainnet, Polygon, Arbitrum)",
      "Deposit collateral — supply ETH, WBTC, or other supported assets to the protocol",
      "Once your collateral is deposited, navigate to the borrow section and choose the asset and amount to borrow",
      "Review the LTV ratio and liquidation threshold carefully — keep your health factor above 1.0 to avoid liquidation",
      "Confirm the borrow transaction in your wallet — borrowed assets will appear in your wallet immediately",
    ],
  },
  {
    id: "compound",
    name: "Compound",
    chains: ["Ethereum", "Polygon", "Arbitrum", "Base"],
    collateralAccepted: ["ETH", "WBTC", "USDC", "UNI", "LINK", "COMP"],
    borrowAssets: ["USDC", "ETH", "WBTC"],
    borrowRateRange: "2–10% variable",
    ltvRange: "50–75%",
    liquidationThreshold: "60–85%",
    link: "https://app.compound.finance",
    description: "One of the original DeFi lending protocols. Compound V3 (Comet) simplified the model to single-asset markets, reducing risk. COMP token holders govern protocol parameters. Known for its battle-tested smart contracts and transparent risk model.",
    riskLevel: "Medium",
    steps: [
      "Visit app.compound.finance and connect your Ethereum-compatible wallet",
      "Select the market you want to participate in (e.g., USDC market on Ethereum)",
      "Supply collateral by depositing supported assets — ETH, WBTC, or other tokens",
      "Enable borrowing against your collateral by clicking the borrow button",
      "Choose the amount to borrow while monitoring your borrow capacity and collateral factor",
      "Sign the transaction — borrowed assets are transferred directly to your wallet",
    ],
  },
  {
    id: "maple",
    name: "Maple Finance",
    chains: ["Ethereum", "Solana"],
    collateralAccepted: ["USDC", "wETH"],
    borrowAssets: ["USDC", "wETH"],
    borrowRateRange: "6–12% (institutional pools)",
    ltvRange: "Under-collateralized (institutional)",
    liquidationThreshold: "Pool-specific terms",
    link: "https://maple.finance",
    description: "Maple Finance facilitates institutional lending through under-collateralized pools. Pool delegates vet borrowers and manage credit risk. Yields tend to be higher due to credit exposure, and the protocol has undergone significant risk improvements after 2022.",
    riskLevel: "High",
    steps: [
      "Visit app.maple.finance and connect your Ethereum or Solana wallet",
      "Browse available lending pools — each pool has a delegate who vets borrowers",
      "Review pool terms including borrower quality, historical performance, and yield",
      "Deposit USDC or wETH into your chosen pool to start earning yield",
      "Note: Maple pools have lock-up periods — check withdrawal terms before depositing",
      "Monitor your position in the Maple dashboard and on CryptoOwnBank",
    ],
  },
  {
    id: "makerdao",
    name: "MakerDAO (Sky)",
    chains: ["Ethereum"],
    collateralAccepted: ["ETH", "WBTC", "stETH", "Real-World Assets"],
    borrowAssets: ["DAI"],
    borrowRateRange: "0.5–8% (stability fee)",
    ltvRange: "50–67%",
    liquidationThreshold: "130–170% collateralization ratio",
    link: "https://app.sky.money",
    description: "The protocol behind DAI, the most battle-tested decentralized stablecoin. MakerDAO (rebranded to Sky) allows you to lock collateral in Vaults to mint DAI. The stability fee acts as your borrow rate. Over $8B in TVL and years of operation make it one of the most trusted DeFi protocols.",
    riskLevel: "Medium",
    steps: [
      "Visit app.sky.money (formerly oasis.app) and connect your Ethereum wallet",
      "Choose the vault type based on your collateral (e.g., ETH-A, WBTC-A, stETH-A)",
      "Deposit your collateral into the vault — this locks it in the MakerDAO smart contract",
      "Generate (borrow) DAI against your collateral up to the maximum allowed by the vault's collateralization ratio",
      "Keep your collateralization ratio well above the liquidation threshold — the protocol will liquidate your vault if it drops below",
      "Repay your DAI debt plus stability fee to unlock and withdraw your collateral",
    ],
  },
];

interface RiskInfo {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
}

const RISK_WARNINGS: RiskInfo[] = [
  {
    icon: TrendingDown,
    title: "Liquidation Risk",
    description: "If your collateral value drops below the liquidation threshold, your position will be automatically liquidated. You may lose a significant portion of your collateral plus a liquidation penalty. Always maintain a healthy collateral ratio well above the minimum.",
  },
  {
    icon: Lock,
    title: "Smart Contract Risk",
    description: "DeFi lending protocols rely on smart contracts that could have undiscovered vulnerabilities. While major protocols have been audited extensively, no code is guaranteed bug-free. Consider using DeFi insurance to mitigate this risk.",
  },
  {
    icon: Percent,
    title: "Interest Rate Risk",
    description: "Variable borrow rates can change rapidly based on market utilization. A rate that seems low today could spike during high-demand periods, significantly increasing your borrowing costs.",
  },
  {
    icon: Scale,
    title: "Regulatory Risk",
    description: "DeFi lending operates in a rapidly evolving regulatory landscape. Changes in regulation could affect protocol availability, token status, or your ability to access these services in your jurisdiction.",
  },
];

function getRiskBadgeClass(level: string) {
  if (level === "Low") return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (level === "Medium") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

function ProtocolCard({ protocol }: { protocol: LendingProtocol }) {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <Card data-testid={`card-protocol-${protocol.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap" data-testid={`text-protocol-${protocol.id}`}>
            {protocol.name}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{protocol.chains.join(", ")}</p>
        </div>
        <Badge className={`shrink-0 ${getRiskBadgeClass(protocol.riskLevel)}`} data-testid={`badge-risk-${protocol.id}`}>
          {protocol.riskLevel} Risk
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{protocol.description}</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Collateral Accepted</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {protocol.collateralAccepted.map((c) => (
                <Badge key={c} variant="secondary" className="text-xs" data-testid={`badge-collateral-${protocol.id}-${c.toLowerCase()}`}>
                  {c}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Borrow Assets</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {protocol.borrowAssets.map((a) => (
                <Badge key={a} variant="outline" className="text-xs" data-testid={`badge-borrow-${protocol.id}-${a.toLowerCase()}`}>
                  {a}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-1 border-t">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" /> Borrow Rate
            </p>
            <p className="text-sm font-medium" data-testid={`text-rate-${protocol.id}`}>{protocol.borrowRateRange}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3" /> LTV Ratio
            </p>
            <p className="text-sm font-medium" data-testid={`text-ltv-${protocol.id}`}>{protocol.ltvRange}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Liquidation
            </p>
            <p className="text-sm font-medium" data-testid={`text-liquidation-${protocol.id}`}>{protocol.liquidationThreshold}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <a href={protocol.link} target="_blank" rel="noopener noreferrer" data-testid={`link-protocol-${protocol.id}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Visit Protocol
            </Button>
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSteps(!showSteps)}
            data-testid={`button-steps-${protocol.id}`}
          >
            {showSteps ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
            {showSteps ? "Hide Guide" : "Step-by-Step Guide"}
          </Button>
        </div>

        {showSteps && (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3" data-testid={`steps-${protocol.id}`}>
            <p className="text-sm font-semibold flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#00A4E4]" />
              How to borrow using {protocol.name}
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

export default function DeFiBorrowing() {
  const { user } = useAuth();
  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  const isPro = subscriptionData?.tier === "pro";

  if (!isPro) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">DeFi Borrowing Hub</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
            Explore crypto-collateralized lending protocols to borrow against your assets without selling them.
          </p>
        </div>
        <UpgradePrompt
          feature="The DeFi Borrowing Hub gives Pro members access to detailed guides for borrowing against crypto collateral using Aave, Compound, Maple Finance, and MakerDAO."
          variant="pro"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">DeFi Borrowing Hub</h1>
        <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
          Explore crypto-collateralized lending protocols to borrow against your assets without selling them.
        </p>
      </div>

      <Card className="border-[#00A4E4]/30 bg-[#00A4E4]/5 dark:bg-[#00A4E4]/10" data-testid="card-education">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-md bg-[#00A4E4]/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-[#00A4E4]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold" data-testid="text-education-title">How DeFi Borrowing Works</h2>
              <p className="text-sm text-muted-foreground mt-1">
                DeFi lending protocols let you deposit crypto assets as collateral and borrow other assets against them. This is useful when you want liquidity without selling your holdings (avoiding a taxable event). Here's what you need to know:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="flex items-start gap-2">
              <Landmark className="h-4 w-4 text-[#00A4E4] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Deposit Collateral</p>
                <p className="text-xs text-muted-foreground">Lock up crypto assets (ETH, WBTC, etc.) in a smart contract to back your loan.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Percent className="h-4 w-4 text-[#00A4E4] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Borrow Up to LTV</p>
                <p className="text-xs text-muted-foreground">Borrow a percentage of your collateral value. LTV of 75% means you can borrow $750 against $1,000 collateral.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TrendingDown className="h-4 w-4 text-[#00A4E4] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Watch Liquidation</p>
                <p className="text-xs text-muted-foreground">If your collateral value drops too far, the protocol will sell it to repay the loan. Always over-collateralize.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-[#00A4E4] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Repay Anytime</p>
                <p className="text-xs text-muted-foreground">Pay back your loan plus interest at any time to unlock your collateral. No fixed terms in most protocols.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20" data-testid="card-risk-warnings">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <CardTitle className="text-base text-red-900 dark:text-red-200">Important Risk Warnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RISK_WARNINGS.map((risk) => {
              const Icon = risk.icon;
              return (
                <div key={risk.title} className="flex items-start gap-2.5" data-testid={`risk-${risk.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  <Icon className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900 dark:text-red-200">{risk.title}</p>
                    <p className="text-xs text-red-800 dark:text-red-300 mt-0.5">{risk.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-protocols-heading">
          <Shield className="h-5 w-5 text-[#00A4E4]" />
          Lending Protocols
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {LENDING_PROTOCOLS.map((protocol) => (
            <ProtocolCard key={protocol.id} protocol={protocol} />
          ))}
        </div>
      </div>

      <Card data-testid="card-disclaimer">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Disclaimer</p>
              <p className="text-xs text-muted-foreground">
                CryptoOwnBank does not provide financial advice, and this page is for educational purposes only. DeFi borrowing carries significant risks including total loss of collateral. We do not endorse any specific protocol. Always do your own research (DYOR), understand the risks, and never borrow more than you can afford to lose. Protocol rates and parameters change frequently — always verify current terms on the protocol's official site.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
