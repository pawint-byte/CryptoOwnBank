import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SeoHead } from "@/components/seo-head";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  CreditCard,
  ExternalLink,
  Shield,
  Wallet,
  Smartphone,
  Globe,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Plus,
  Zap,
  Star,
  RefreshCcw,
} from "lucide-react";

interface DebitCard {
  name: string;
  network: "Visa" | "Mastercard";
  custodyModel: string;
  cashback?: string;
  regions: string[];
  walletType: "full" | "partial";
  walletDescription: string;
  supportedAssets: string[];
  features: string[];
  appleGooglePay: boolean;
  url: string;
  description: string;
  hookText: string;
  bestFor: string;
  color: string;
  featured?: boolean;
}

const cards: DebitCard[] = [
  {
    name: "MetaMask Card",
    network: "Mastercard",
    custodyModel: "True self-custody — spends directly from your MetaMask wallet",
    cashback: undefined,
    regions: ["United States (nationwide since early 2026)"],
    walletType: "full",
    walletDescription: "Full DeFi wallet — same MetaMask you already use. DEX, swaps, dApps, WalletConnect, send/receive. The card is just an added feature on top of your existing wallet.",
    supportedAssets: ["USDC", "USDT", "ERC-20 tokens"],
    features: [
      "Spends directly from your MetaMask wallet — no separate balance to manage",
      "Automatic crypto-to-fiat conversion at checkout",
      "Works with Ledger hardware wallet connected to MetaMask for maximum security",
      "Full EVM DeFi access — same wallet for spending and trading",
    ],
    appleGooglePay: true,
    url: "https://portfolio.metamask.io/card",
    description: "The gold standard for EVM users. Your MetaMask wallet becomes a debit card — spend USDC, USDT, or any ERC-20 at any Mastercard terminal. No separate app, no deposit, no custody handoff.",
    hookText: "Already using MetaMask with CryptoOwnBank's EVM Swap? This card lets you spend from the same wallet. Your balance updates here in real time after every purchase.",
    bestFor: "EVM users who already have MetaMask",
    color: "#F6851B",
    featured: true,
  },
  {
    name: "Bleap",
    network: "Mastercard",
    custodyModel: "Non-custodial MPC wallet — your keys, split across secure enclaves",
    cashback: "2% flat cashback in USDC",
    regions: ["Global rollout in progress — 150+ countries"],
    walletType: "partial",
    walletDescription: "MPC wallet with send/receive. Not a full DeFi wallet, but you can move crypto in and out freely.",
    supportedAssets: ["USDC", "USDT", "ETH", "BTC", "major tokens"],
    features: [
      "2% flat cashback in USDC on every purchase",
      "Zero FX or currency conversion fees",
      "Non-custodial MPC wallet — your keys never held by a single party",
      "Apple Pay and Google Pay ready",
      "Reload anytime by sending more crypto",
    ],
    appleGooglePay: true,
    url: "https://bleap.com",
    description: "The cleanest all-around option. 2% cashback in USDC, zero fees, and global coverage. Your crypto stays in your MPC wallet until the moment you tap to pay.",
    hookText: "Add your Bleap wallet to CryptoOwnBank to track your spending balance and cashback rewards alongside your full portfolio.",
    bestFor: "Everyone — best cashback and global coverage",
    color: "#6366F1",
    featured: true,
  },
  {
    name: "Gnosis Pay",
    network: "Visa",
    custodyModel: "Safe smart contract wallet — on-chain, auditable, non-custodial",
    cashback: "Up to 4% cashback (with GNO staking)",
    regions: ["Europe (EU/EEA)", "UK"],
    walletType: "full",
    walletDescription: "Full Safe wallet — interact with DeFi protocols, send to any address, connect to any dApp. Your funds are in a smart contract you control.",
    supportedAssets: ["EURe", "GBPe", "USDC", "GNO"],
    features: [
      "On-chain Safe wallet — fully auditable, recoverable",
      "Up to 4% cashback when staking GNO",
      "Funds stay on-chain until the moment you spend",
      "Full DeFi composability — same wallet for spending and DeFi",
      "Very popular in European crypto community",
    ],
    appleGooglePay: true,
    url: "https://gnosispay.com",
    description: "Built on Safe (the most trusted smart contract wallet). Your funds stay on-chain until you tap to pay. Extremely popular with European crypto users who want full DeFi access from their spending wallet.",
    hookText: "Add your Gnosis Pay wallet address to CryptoOwnBank to see your spending balance alongside your other wallets — all on one dashboard.",
    bestFor: "European users who want on-chain spending",
    color: "#3E6957",
  },
  {
    name: "Cypher",
    network: "Visa",
    custodyModel: "Non-custodial — backed by Y Combinator and Coinbase Ventures",
    cashback: undefined,
    regions: ["Global — 40M+ merchant terminals"],
    walletType: "partial",
    walletDescription: "Prepaid wallet with send/receive. Load crypto, spend anywhere Visa is accepted. Not a full DeFi wallet.",
    supportedAssets: ["USDC", "USDT", "ETH", "BTC", "SOL", "major tokens"],
    features: [
      "Accepted at 40M+ Visa terminals worldwide",
      "Prepaid model — load and spend, reload anytime",
      "Backed by Y Combinator and Coinbase Ventures",
      "Multi-chain support including Solana",
      "Simple, clean UX — great for first-time card users",
    ],
    appleGooglePay: true,
    url: "https://cyphercard.io",
    description: "Backed by Y Combinator and Coinbase Ventures. Prepaid Visa that works at 40M+ terminals. Load crypto, spend anywhere, reload when you need more. Simple and reliable.",
    hookText: "Track your Cypher card balance on CryptoOwnBank — add the wallet address and see your spending power update alongside your portfolio.",
    bestFor: "Global travelers and everyday spenders",
    color: "#1E40AF",
  },
  {
    name: "COCA",
    network: "Visa",
    custodyModel: "Non-custodial MPC wallet with biometric recovery",
    cashback: "Rewards paid in stablecoins",
    regions: ["Global — expanding"],
    walletType: "partial",
    walletDescription: "MPC wallet with biometric recovery (face/fingerprint). Send/receive crypto. Not a full DeFi wallet but has strong security features.",
    supportedAssets: ["USDC", "USDT", "stablecoins"],
    features: [
      "Stablecoin-native — designed for USDC/USDT spending",
      "Biometric recovery — recover your wallet with face or fingerprint",
      "Rewards paid in stablecoins (not a separate token)",
      "MPC wallet — non-custodial, no single point of failure",
      "Apple Pay and Google Pay support",
    ],
    appleGooglePay: true,
    url: "https://coca.xyz",
    description: "Stablecoin-native spending card with biometric recovery. If you hold USDC or USDT, this is purpose-built for you. Rewards are paid in stablecoins too — no random reward tokens.",
    hookText: "Hold stablecoins across multiple wallets? Add your COCA wallet to CryptoOwnBank and see all your stablecoin balances in one place.",
    bestFor: "Stablecoin holders (USDC, USDT, RLUSD)",
    color: "#059669",
  },
];

export default function CryptoDebitCards() {
  const { user } = useAuth();
  const [showFaq, setShowFaq] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">
      <SeoHead
        title="Crypto Debit Cards — Spend Crypto Anywhere | CryptoOwnBank"
        description="Non-custodial crypto debit cards that let you spend directly from your own wallet at any Visa or Mastercard terminal. Compare Bleap, MetaMask Card, Gnosis Pay, Cypher, and COCA."
        path="/crypto-debit-cards"
      />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-crypto-debit-cards">
          <CreditCard className="h-6 w-6 text-blue-600" />
          Crypto Debit Cards
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Spend crypto at any Visa or Mastercard terminal — directly from your own wallet. Non-custodial only.
        </p>
      </div>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <strong>Non-custodial means your crypto stays in YOUR wallet.</strong> These cards don't require you to deposit crypto
              into a company account. Your funds remain in your own wallet until the exact moment you tap to pay.
              No exchange. No custodian. No counterparty risk.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card border text-center">
          <Wallet className="h-5 w-5 text-blue-500" />
          <span className="text-xs font-medium">Your Keys</span>
          <span className="text-[10px] text-muted-foreground">Spend from your own wallet</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card border text-center">
          <Globe className="h-5 w-5 text-green-500" />
          <span className="text-xs font-medium">Worldwide</span>
          <span className="text-[10px] text-muted-foreground">Visa & Mastercard accepted everywhere</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card border text-center">
          <RefreshCcw className="h-5 w-5 text-violet-500" />
          <span className="text-xs font-medium">Reloadable</span>
          <span className="text-[10px] text-muted-foreground">Send more crypto anytime</span>
        </div>
      </div>

      <div className="space-y-4">
        {cards.map((card) => {
          const isExpanded = expandedCard === card.name;
          return (
            <Card
              key={card.name}
              className={`transition-all ${card.featured ? "border-2" : ""}`}
              style={card.featured ? { borderColor: `${card.color}40` } : undefined}
              data-testid={`card-debit-${card.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
            >
              <CardHeader className="cursor-pointer" onClick={() => setExpandedCard(isExpanded ? null : card.name)} data-testid={`button-toggle-${card.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <CardTitle className="text-lg">{card.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px]">{card.network}</Badge>
                      {card.featured && (
                        <Badge className="text-[10px]" style={{ backgroundColor: card.color, color: "white" }}>
                          <Star className="h-3 w-3 mr-1" /> Recommended
                        </Badge>
                      )}
                      {card.cashback && (
                        <Badge className="bg-green-600 text-white text-[10px]">{card.cashback}</Badge>
                      )}
                    </div>
                    <CardDescription>{card.description}</CardDescription>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Shield className="h-3 w-3" />
                        {card.walletType === "full" ? "Full DeFi Wallet" : "Spending Wallet"}
                      </Badge>
                      {card.appleGooglePay && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Smartphone className="h-3 w-3" />
                          Apple/Google Pay
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">{card.bestFor}</span>
                    </div>
                  </div>
                  <div className="shrink-0 mt-1">
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Custody Model</p>
                        <p className="text-sm">{card.custodyModel}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Wallet Functionality</p>
                        <p className="text-sm">{card.walletDescription}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Available In</p>
                        <ul className="text-sm space-y-0.5">
                          {card.regions.map((r) => (
                            <li key={r} className="flex items-center gap-1.5">
                              <Globe className="h-3 w-3 text-muted-foreground" /> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Supported Assets</p>
                        <div className="flex flex-wrap gap-1">
                          {card.supportedAssets.map((a) => (
                            <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Key Features</p>
                        <ul className="text-sm space-y-1.5">
                          {card.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                              <span className="text-muted-foreground">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Card className="border-green-500/20 bg-green-500/5">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <div className="text-sm text-muted-foreground">
                          <strong className="text-green-700 dark:text-green-400">CryptoOwnBank integration:</strong>{" "}
                          {card.hookText}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex items-center gap-3 flex-wrap">
                    <a href={card.url} target="_blank" rel="noopener noreferrer">
                      <Button className="gap-2" style={{ backgroundColor: card.color }} data-testid={`button-get-${card.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                        <ExternalLink className="h-4 w-4" />
                        Get {card.name}
                      </Button>
                    </a>
                    {user && (
                      <Link href="/wallets">
                        <Button variant="outline" className="gap-2 border-green-500/30 text-green-700" data-testid="button-add-card-wallet">
                          <Plus className="h-4 w-4" /> Add Card Wallet to CryptoOwnBank
                        </Button>
                      </Link>
                    )}
                    <Link href="/buy-crypto">
                      <Button variant="ghost" className="gap-2 text-muted-foreground" data-testid="button-need-crypto-for-card">
                        <CreditCard className="h-4 w-4" /> Need crypto to load your card?
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="border-indigo-500/20 bg-indigo-500/5">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold mb-1">The full crypto lifecycle — right here</p>
              <p className="text-sm text-muted-foreground mb-3">
                CryptoOwnBank covers every step: buy crypto, track your portfolio, trade on DEX, set up DCA orders, swap across chains, earn yield in vaults, send payments — and now spend it anywhere with a debit card. Add all your wallets (including your card wallet) and manage everything from one dashboard.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/buy-crypto">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" data-testid="link-buy-crypto">
                    <ArrowRight className="h-3 w-3" /> Buy Crypto
                  </Button>
                </Link>
                <Link href="/wallets">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" data-testid="link-wallets">
                    <Wallet className="h-3 w-3" /> Add Wallets
                  </Button>
                </Link>
                <Link href="/portfolio">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" data-testid="link-portfolio">
                    <Globe className="h-3 w-3" /> View Portfolio
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!user && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold mb-1">Ready to take control of your crypto?</p>
                <p className="text-sm text-muted-foreground">
                  Sign up free, add your wallet addresses (including your debit card wallet), and see all your balances on one dashboard. Track spending, trading, and earning — all in one place.
                </p>
              </div>
            </div>
            <Link href="/auth">
              <Button className="w-full gap-2 mt-2" style={{ backgroundColor: "#16a34a", borderColor: "#15803d" }} data-testid="button-signup-cards-cta">
                <Wallet className="h-4 w-4" />
                Sign Up Free — Start Managing Your Crypto
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowFaq(!showFaq)}
          data-testid="button-toggle-cards-faq"
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              Common Questions
            </CardTitle>
            {showFaq ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>
        {showFaq && (
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">What does "non-custodial" mean for a debit card?</p>
              <p className="text-sm text-muted-foreground">
                Unlike traditional crypto cards (like the old Crypto.com or Coinbase cards), these non-custodial cards don't require you to
                deposit crypto into a company account. Your funds stay in YOUR wallet — a wallet where you hold the keys.
                The card provider converts crypto to fiat at the moment you tap to pay, but they never hold your balance.
                If the card company goes bankrupt, your crypto is still safe in your wallet.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Can I reload my card?</p>
              <p className="text-sm text-muted-foreground">
                Yes. All these cards are reloadable. For wallet-based cards (MetaMask, Gnosis Pay), your wallet balance IS your spending limit —
                just send more crypto to your wallet anytime. For prepaid-style cards (Cypher), you load crypto and spend it, then reload when needed.
                Either way, you can top up as often as you want.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Can I use my card wallet for DeFi, DEX trading, and swaps?</p>
              <p className="text-sm text-muted-foreground">
                It depends on the card. <strong>MetaMask Card</strong> and <strong>Gnosis Pay</strong> use full DeFi wallets — you can trade on DEXs,
                connect to dApps, use CryptoOwnBank's EVM Swap, and do everything a regular crypto wallet can do. The card is just an extra feature.
                <strong> Bleap, Cypher, and COCA</strong> have more focused wallets designed primarily for spending — you can send and receive crypto,
                but they're not full DeFi wallets.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Which card should I get?</p>
              <p className="text-sm text-muted-foreground">
                <strong>MetaMask Card</strong> if you already use MetaMask (especially with CryptoOwnBank's EVM tools).{" "}
                <strong>Bleap</strong> for the best all-around option (2% cashback, zero fees, global).{" "}
                <strong>Gnosis Pay</strong> if you're in Europe and want on-chain spending.{" "}
                <strong>Cypher</strong> for simplicity and global acceptance.{" "}
                <strong>COCA</strong> if you primarily hold stablecoins.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">How does this work with CryptoOwnBank?</p>
              <p className="text-sm text-muted-foreground">
                Add your card's wallet address to CryptoOwnBank under{" "}
                <Link href="/wallets" className="text-blue-600 hover:underline">Wallets</Link>.
                We'll automatically track your balance — so you can see your spending power alongside your portfolio,
                trading positions, and yield earnings. Everything in one dashboard. When you spend and your balance drops, it updates here.
                When you reload, it updates here. One view of everything.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Are there fees?</p>
              <p className="text-sm text-muted-foreground">
                Each card has its own fee structure. Bleap stands out with zero FX and conversion fees. Others may charge a small spread
                when converting crypto to fiat at checkout (typically 0.5-2%). Check each card's website for current fee details.
                There are no fees from CryptoOwnBank — we're just helping you find the right card and track your balance.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">I don't have crypto yet. Where do I start?</p>
              <p className="text-sm text-muted-foreground">
                Check our{" "}
                <Link href="/buy-crypto" className="text-blue-600 hover:underline">Buy Crypto</Link>{" "}
                page — 14 different ways to get crypto without an exchange, including card purchases, P2P (gift cards, cash, mobile money),
                and options for every region worldwide. Once you have crypto in a wallet, you can load your debit card and start spending.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Disclaimer:</strong> CryptoOwnBank does not issue, sponsor, or manage any debit cards. We provide informational
              guides to help you find non-custodial crypto spending options. All cards are issued by third-party providers and subject
              to their own terms, fees, and regional availability. Crypto carries risk including loss of principal. DYOR.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
