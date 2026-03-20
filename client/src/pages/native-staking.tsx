import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SeoHead } from "@/components/seo-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import {
  Pickaxe,
  Shield,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Lock,
  Wallet,
  Coins,
  Zap,
  ArrowRight,
  BarChart3,
  Layers,
  ArrowRightLeft,
  LineChart,
} from "lucide-react";

interface StakingChain {
  name: string;
  ticker: string;
  apr: string;
  aprLow: number;
  aprHigh: number;
  lockUp: string;
  mechanism: string;
  riskLevel: string;
  wallets: { name: string; url: string }[];
  howItWorks: string[];
  whyNative: string;
  considerations: string[];
  explorerUrl: string;
  learnUrl: string;
  color: string;
  status: "live" | "pending";
}

const STAKING_CHAINS: StakingChain[] = [
  {
    name: "XRP Ledger",
    ticker: "XRP",
    apr: "TBD",
    aprLow: 0,
    aprHigh: 0,
    lockUp: "None expected",
    mechanism: "Native Lending Vaults (XLS-65/66)",
    riskLevel: "Low",
    wallets: [
      { name: "Xaman (Xumm)", url: "https://xaman.app" },
      { name: "Ledger", url: "https://shop.ledger.com/pages/referral-program?referral_code=H7DFZEAP8RPK4" },
    ],
    howItWorks: [
      "XLS-65 creates native Single Asset Vaults directly in the XRPL ledger engine",
      "Vault operators create vaults that accept XRP or issued tokens",
      "You deposit XRP from your cold wallet by signing a VaultDeposit transaction in Xaman",
      "You receive vault shares as Multi-Purpose Tokens (MPTs) — no trustline needed for XRP vaults",
      "Earn yield as the vault operator deploys capital",
      "Withdraw anytime by signing a VaultWithdraw — shares are redeemed for your XRP plus earned yield",
    ],
    whyNative: "No smart contracts, no bridges, no third-party dependencies. Lending is built directly into the XRPL transaction engine. Your cold wallet signs every transaction via Xaman — keys never leave your device.",
    considerations: [
      "XLS-65 is currently in validator voting (~17% of 80% needed to activate)",
      "How voting works: Validators don't vote yes or no — they signal support by upgrading their server software (rippled 3.1+). Validators on older versions haven't rejected it, they simply haven't upgraded yet. When 80% of validators are running the new version for 2 continuous weeks, the amendment activates automatically. The timeline depends on how quickly validator operators choose to upgrade.",
      "Yield rates will depend on vault operators and market demand",
      "Evaluate vault operators carefully — CryptoOwnBank shows on-chain data but does not endorse any vault",
      "No lock-up period expected — you can withdraw anytime",
    ],
    explorerUrl: "https://livenet.xrpl.org",
    learnUrl: "https://xrpl.org/docs",
    color: "#00A4E4",
    status: "pending",
  },
  {
    name: "Cardano",
    ticker: "ADA",
    apr: "3–4%",
    aprLow: 3,
    aprHigh: 4,
    lockUp: "None",
    mechanism: "Protocol-Level Delegation",
    riskLevel: "Low",
    wallets: [
      { name: "Yoroi", url: "https://yoroi-wallet.com" },
      { name: "Daedalus", url: "https://daedaluswallet.io" },
      { name: "Eternl", url: "https://eternl.io" },
    ],
    howItWorks: [
      "Open your Cardano wallet (Yoroi, Daedalus, or Eternl)",
      "Go to the Staking/Delegation section",
      "Browse available stake pools — look for pools with good uptime, reasonable fees (2–5%), and consistent block production",
      "Click 'Delegate' and confirm the transaction (~2 ADA deposit, refundable)",
      "Your ADA stays in your wallet — it's never transferred anywhere",
      "Rewards arrive automatically every 5 days (epoch) into your wallet",
      "You can spend or move your ADA at any time — there's zero lock-up",
    ],
    whyNative: "Staking is built directly into Cardano's protocol. Your ADA never leaves your wallet — delegation is just a signal to the network. You can spend your ADA while it's staked. No smart contract risk.",
    considerations: [
      "First rewards take 15–20 days to arrive (3–4 epochs delay)",
      "Pick pools with reasonable margin fees (2–5%) and good uptime",
      "Rewards compound automatically — earned ADA is part of your delegated balance",
      "You can re-delegate to a different pool at any time, no penalty",
    ],
    explorerUrl: "https://cardanoscan.io",
    learnUrl: "https://cardano.org/stake-pool-delegation",
    color: "#0033AD",
    status: "live",
  },
  {
    name: "Cosmos",
    ticker: "ATOM",
    apr: "15–20%",
    aprLow: 15,
    aprHigh: 20,
    lockUp: "21-day unbonding",
    mechanism: "Protocol-Level Delegation",
    riskLevel: "Medium",
    wallets: [
      { name: "Keplr", url: "https://www.keplr.app" },
      { name: "Cosmostation", url: "https://www.cosmostation.io" },
      { name: "Leap", url: "https://www.leapwallet.io" },
    ],
    howItWorks: [
      "Install Keplr wallet (browser extension or mobile)",
      "Transfer ATOM to your Keplr wallet",
      "Go to the Staking section and browse validators",
      "Choose a validator — look for high uptime, reasonable commission (5–10%), and not in the top 5 (helps decentralization)",
      "Click 'Delegate' and set your amount, then approve the transaction",
      "Rewards accrue continuously — claim them manually whenever you want",
      "To unstake, initiate an 'Unbonding' — your ATOM is locked for 21 days before it's available",
    ],
    whyNative: "Built into the Cosmos SDK at the protocol level. You delegate directly to validators who secure the network. Higher APR than most chains because inflation is used to incentivize staking.",
    considerations: [
      "21-day unbonding period — your ATOM is illiquid during this time",
      "If your validator misbehaves (double-signing), you can lose a portion of your stake (slashing)",
      "Rewards must be manually claimed (they don't auto-compound)",
      "Consider spreading across 2–3 validators to reduce single-validator risk",
      "High APR partly offsets ATOM inflation — real yield is lower than the nominal rate",
    ],
    explorerUrl: "https://www.mintscan.io/cosmos",
    learnUrl: "https://cosmos.network/learn/staking",
    color: "#2E3148",
    status: "live",
  },
  {
    name: "Polkadot",
    ticker: "DOT",
    apr: "12–15%",
    aprLow: 12,
    aprHigh: 15,
    lockUp: "28-day unbonding",
    mechanism: "Nominated Proof-of-Stake",
    riskLevel: "Medium",
    wallets: [
      { name: "Polkadot.js", url: "https://polkadot.js.org/apps" },
      { name: "Nova Wallet", url: "https://novawallet.io" },
      { name: "Talisman", url: "https://www.talisman.xyz" },
    ],
    howItWorks: [
      "Set up a Polkadot wallet (Nova Wallet is the easiest; Polkadot.js for advanced users)",
      "Transfer DOT to your wallet — minimum ~250 DOT to nominate directly",
      "Go to the Staking section and select 'Nominate'",
      "Choose up to 16 validators to nominate — the protocol automatically assigns your stake to the best-performing ones",
      "Confirm and sign the transaction",
      "Rewards are paid every era (~24 hours) — you need to claim them (or a validator may auto-pay)",
      "To unstake, initiate unbonding — 28-day waiting period before DOT is available",
    ],
    whyNative: "Nominated Proof-of-Stake is Polkadot's core consensus mechanism. Staking secures the relay chain and all parachains. Higher minimum than other chains but rewards are strong.",
    considerations: [
      "Minimum ~250 DOT to nominate directly (or use nomination pools for any amount)",
      "28-day unbonding period — longest of all major chains",
      "Slashing risk if a nominated validator misbehaves",
      "Rewards must be claimed within 84 eras (~84 days) or they expire",
      "Nomination pools allow smaller holders to participate with no minimum",
    ],
    explorerUrl: "https://polkadot.subscan.io",
    learnUrl: "https://wiki.polkadot.network/docs/learn-staking",
    color: "#E6007A",
    status: "live",
  },
  {
    name: "Solana",
    ticker: "SOL",
    apr: "6–8%",
    aprLow: 6,
    aprHigh: 8,
    lockUp: "~2–3 days",
    mechanism: "Protocol-Level Delegation",
    riskLevel: "Low",
    wallets: [
      { name: "Phantom", url: "https://phantom.app" },
      { name: "Solflare", url: "https://solflare.com" },
    ],
    howItWorks: [
      "Open your Solana wallet (Phantom is the most popular)",
      "Go to the Staking section or click 'Start earning SOL'",
      "Browse validators — Phantom shows commission rates and uptime scores",
      "Select a validator and enter how much SOL to stake",
      "Confirm the transaction — your SOL is delegated immediately",
      "Rewards are distributed automatically each epoch (~2 days)",
      "To unstake, click 'Unstake' — your SOL is available after the current epoch ends (~2–3 days)",
    ],
    whyNative: "Solana's proof-of-stake is built into the protocol. Delegation is simple and fast. Short unlock period compared to Cosmos or Polkadot. Most wallets make it a one-click experience.",
    considerations: [
      "No minimum stake amount",
      "Short ~2–3 day unstaking period (much shorter than ATOM or DOT)",
      "Solana has experienced network outages in the past — staked SOL is safe during outages but you can't transact",
      "Commission rates vary by validator (typically 5–10%)",
      "Consider validators outside the top 20 to help decentralization",
    ],
    explorerUrl: "https://solscan.io",
    learnUrl: "https://solana.com/staking",
    color: "#9945FF",
    status: "live",
  },
];

function StakingCard({ chain, isPaid, expanded, onToggle, userBalance }: { chain: StakingChain; isPaid: boolean; expanded: boolean; onToggle: () => void; userBalance?: { amount: number; usdValue: number } }) {
  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`staking-card-${chain.ticker}`}>
      <CardContent className="p-0">
        <button
          className="w-full p-4 text-left flex items-center justify-between"
          onClick={onToggle}
          data-testid={`toggle-${chain.ticker}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${chain.color}15` }}>
              <Pickaxe className="h-5 w-5" style={{ color: chain.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{chain.name}</p>
                <Badge variant="outline" className="text-[10px]">{chain.ticker}</Badge>
                {chain.status === "pending" ? (
                  <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">Pending</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">Live</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{chain.mechanism}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: chain.color }}>{chain.apr}</p>
              <p className="text-[10px] text-muted-foreground">APR</p>
            </div>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4 border-t pt-4">
            {userBalance && userBalance.amount > 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 px-3 py-2 text-sm text-green-700 dark:text-green-400" data-testid={`holding-banner-${chain.ticker}`}>
                <Coins className="h-4 w-4 mt-0.5 shrink-0" />
                <span>You hold <strong>{userBalance.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {chain.ticker}</strong> (${userBalance.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Staking at {chain.apr} APR could earn ~${((userBalance.usdValue * (chain.aprLow + chain.aprHigh) / 200)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/year.</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md border border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground" data-testid={`nudge-banner-${chain.ticker}`}>
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>You don't hold {chain.ticker} yet. Buy some on an exchange and stake it to earn {chain.apr} APR — your crypto works for you while you hold.</span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <TrendingUp className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                <p className="text-xs text-muted-foreground">APR</p>
                <p className="font-semibold text-sm">{chain.apr}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <Lock className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                <p className="text-xs text-muted-foreground">Lock-Up</p>
                <p className="font-semibold text-sm">{chain.lockUp}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <Shield className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                <p className="text-xs text-muted-foreground">Risk</p>
                <p className="font-semibold text-sm">{chain.riskLevel}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <Layers className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-semibold text-sm">Native</p>
              </div>
            </div>

            <div>
              <p className="font-medium text-sm flex items-center gap-1.5 mb-2">
                <Zap className="h-4 w-4" style={{ color: chain.color }} />
                Why it's native
              </p>
              <p className="text-sm text-muted-foreground">{chain.whyNative}</p>
            </div>

            {isPaid ? (
              <>
                <div>
                  <p className="font-medium text-sm flex items-center gap-1.5 mb-2">
                    <ArrowRight className="h-4 w-4" style={{ color: chain.color }} />
                    How to stake {chain.ticker} — step by step
                  </p>
                  <ol className="space-y-2">
                    {chain.howItWorks.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <p className="font-medium text-sm flex items-center gap-1.5 mb-2">
                    <Wallet className="h-4 w-4" style={{ color: chain.color }} />
                    Recommended wallets
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {chain.wallets.map((w) => (
                      <Button
                        key={w.name}
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(w.url, "_blank")}
                        data-testid={`wallet-${chain.ticker}-${w.name}`}
                      >
                        <ExternalLink className="h-3 w-3 mr-1.5" />
                        {w.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-medium text-sm flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Things to know
                  </p>
                  <ul className="space-y-1.5">
                    {chain.considerations.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-amber-500" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href="/ownbank/dex" data-testid={`trade-dex-${chain.ticker}`}>
                    <Button size="sm" className="bg-[#00A4E4] text-white border-[#00A4E4]">
                      <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                      Trade {chain.ticker} on DEX
                    </Button>
                  </Link>
                  <Link href={`/technical-analysis?symbol=${chain.ticker}`} data-testid={`chart-${chain.ticker}`}>
                    <Button size="sm" variant="outline">
                      <LineChart className="h-3.5 w-3.5 mr-1.5" />
                      View Chart
                    </Button>
                  </Link>
                  <Link href="/wallets" data-testid={`track-${chain.ticker}`}>
                    <Button size="sm" variant="outline">
                      <Wallet className="h-3.5 w-3.5 mr-1.5" />
                      Track in Portfolio
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(chain.explorerUrl, "_blank")}
                    data-testid={`explorer-${chain.ticker}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Block Explorer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(chain.learnUrl, "_blank")}
                    data-testid={`learn-${chain.ticker}`}
                  >
                    <Info className="h-3.5 w-3.5 mr-1.5" />
                    Official Docs
                  </Button>
                </div>
              </>
            ) : (
              <div className="bg-muted/30 border rounded-lg p-4 text-center space-y-2">
                <Lock className="h-6 w-6 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">Step-by-step guide, wallet links, and tips</p>
                <p className="text-xs text-muted-foreground">Upgrade to Premium to unlock the full staking guide for {chain.name} — plus track your positions and projected yield from one dashboard.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface WalletBalance {
  assetSymbol: string;
  balance: string;
  usdValue: string;
}

interface WalletData {
  chain: string;
  balances: WalletBalance[];
}

const TICKER_TO_SYMBOL: Record<string, string[]> = {
  XRP: ["XRP"],
  ADA: ["ADA"],
  ATOM: ["ATOM"],
  DOT: ["DOT"],
  SOL: ["SOL"],
};

export default function NativeStakingPage() {
  const { user } = useAuth();
  const [expandedChain, setExpandedChain] = useState<string | null>(null);

  const limitsQuery = useQuery<any>({
    queryKey: ["/api/subscription/limits"],
    enabled: !!user,
  });

  const { data: walletsData } = useQuery<WalletData[]>({
    queryKey: ["/api/wallets"],
    enabled: !!user,
  });

  const userBalancesByTicker: Record<string, { amount: number; usdValue: number }> = {};
  if (walletsData) {
    for (const w of walletsData) {
      for (const b of w.balances || []) {
        const sym = b.assetSymbol.toUpperCase().replace(/\s*\(STAKED\)/i, "");
        for (const [ticker, syms] of Object.entries(TICKER_TO_SYMBOL)) {
          if (syms.includes(sym)) {
            if (!userBalancesByTicker[ticker]) userBalancesByTicker[ticker] = { amount: 0, usdValue: 0 };
            userBalancesByTicker[ticker].amount += parseFloat(b.balance) || 0;
            userBalancesByTicker[ticker].usdValue += parseFloat(b.usdValue) || 0;
          }
        }
      }
    }
  }

  const isPaid = limitsQuery.data?.tier === "premium" || limitsQuery.data?.tier === "pro" || limitsQuery.data?.isPremium || limitsQuery.data?.isPro;

  const liveChains = STAKING_CHAINS.filter(c => c.status === "live");
  const pendingChains = STAKING_CHAINS.filter(c => c.status === "pending");
  const avgApr = liveChains.reduce((sum, c) => sum + (c.aprLow + c.aprHigh) / 2, 0) / liveChains.length;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6" data-testid="native-staking-page">
      <SeoHead
        title="Native Staking Guide — Earn Yield On-Chain | CryptoOwnBank"
        description="Learn how to earn yield through native protocol staking on XRP, Cardano, Cosmos, Polkadot, and Solana. No smart contracts, no bridges — your keys, your rewards."
        path="/native-staking"
      />

      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-500/10">
          <Pickaxe className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Native Staking Guide</h1>
          <p className="text-sm text-muted-foreground">Earn yield directly from the blockchain — no intermediaries, no smart contract risk</p>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-emerald-500/5 to-blue-500/5 border-emerald-500/20">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="font-medium">What is native staking?</p>
              <p className="text-sm text-muted-foreground">
                Native staking means earning yield through a blockchain's own protocol — not through a third-party app or smart contract built on top. Your assets stay in your wallet, you delegate to validators (or vaults) that secure the network, and rewards come directly from the protocol. No bridges, no DeFi risk, no middlemen.
              </p>
              <p className="text-sm text-muted-foreground">
                Think of it like this: instead of lending your money to a company that promises to invest it for you, you're earning rewards directly from the network itself for helping keep it secure and running.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{liveChains.length}</p>
            <p className="text-xs text-muted-foreground">Chains Live Now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pendingChains.length}</p>
            <p className="text-xs text-muted-foreground">Coming Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{avgApr.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Avg. APR (Live)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">100%</p>
            <p className="text-xs text-muted-foreground">Non-Custodial</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-500" />
          Live — Start Earning Today
        </h2>
        <div className="space-y-3">
          {liveChains.map((chain) => (
            <StakingCard
              key={chain.ticker}
              chain={chain}
              isPaid={!!isPaid}
              expanded={expandedChain === chain.ticker}
              onToggle={() => setExpandedChain(expandedChain === chain.ticker ? null : chain.ticker)}
              userBalance={userBalancesByTicker[chain.ticker]}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Coming Soon — Amendment Pending
        </h2>
        <div className="space-y-3">
          {pendingChains.map((chain) => (
            <StakingCard
              key={chain.ticker}
              chain={chain}
              isPaid={!!isPaid}
              expanded={expandedChain === chain.ticker}
              onToggle={() => setExpandedChain(expandedChain === chain.ticker ? null : chain.ticker)}
              userBalance={userBalancesByTicker[chain.ticker]}
            />
          ))}
        </div>
      </div>

      {!isPaid && (
        <Card className="border-2 border-dashed border-primary/20">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Why upgrade?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Free members see the overview and APR comparison for every chain. Premium members get the full picture:
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Step-by-step staking guides for every chain</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Recommended wallets with direct links</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Risk considerations and validator tips</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Track all your staking positions in one dashboard</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Projected yield calculations across all chains</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">One place instead of 5 different apps</span>
              </div>
            </div>
            <UpgradePrompt
              feature="Full Staking Guides"
              requiredTier="premium"
              description="Unlock step-by-step staking guides, wallet recommendations, risk tips, and position tracking for all supported chains."
            />
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Disclaimer:</strong> Staking and lending involve risk, including potential loss of funds through slashing, validator misbehavior, or protocol bugs. APR figures are estimates based on current network conditions and can change. CryptoOwnBank provides educational information and portfolio tracking — we do not custody your assets or operate any staking infrastructure. Always do your own research before staking.</p>
              <p>The chains and protocols listed are selected based on having native, protocol-level yield mechanisms with minimal third-party dependencies. This is not financial advice.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
