import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Wallet,
  Unplug,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  Zap,
  Shield,
  HelpCircle,
  Star,
  Coins,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SeoHead } from "@/components/seo-head";
import {
  useStellarStore,
  fetchStellarBalances,
  type StellarBalance,
} from "@/lib/stellar-store";
import { Link } from "wouter";

const STELLAR_PURPLE = "#7B61FF";

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function formatBalance(val: string | number): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0";
  if (num === 0) return "0";
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (num < 0.0001) return num.toExponential(4);
  return num.toFixed(Math.min(7, Math.max(2, 7 - Math.floor(Math.log10(num)))));
}

const KNOWN_ASSETS: Record<string, string> = {
  "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN": "USDC (Circle)",
  "EURC:GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y36DAVIZA67UEAX7CTAZ5STE": "EURC (Circle)",
  "yXLM:GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55": "yXLM (UltraStellar)",
  "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA": "AQUA",
  "SHX:GDSTRSHXHGJ7ZIVRBXEYE5Q74XUVCUSEZ6JHR5PX7CXZJOQL5WFHAVPS": "SHX (Stronghold)",
};

function assetLabel(b: StellarBalance): string {
  if (b.asset_type === "native") return "XLM (Stellar Lumens)";
  const key = `${b.asset_code}:${b.asset_issuer}`;
  return KNOWN_ASSETS[key] || b.asset_code;
}

export default function StellarWallet() {
  const { toast } = useToast();
  const {
    stellarAddress,
    isConnected,
    xlmBalance,
    balances,
    loading,
    connect,
    disconnect,
    setBalances,
    setLoading,
  } = useStellarStore();

  const [addressInput, setAddressInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [eduOpen, setEduOpen] = useState(true);

  const loadBalances = useCallback(async () => {
    if (!stellarAddress) return;
    setLoading(true);
    try {
      const result = await fetchStellarBalances(stellarAddress);
      setBalances(result.xlm, result.balances);
    } catch {
      toast({
        title: "Failed to fetch balances",
        description: "Could not connect to Stellar Horizon.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [stellarAddress, setBalances, setLoading, toast]);

  useEffect(() => {
    if (isConnected && stellarAddress) {
      loadBalances();
    }
  }, [isConnected, stellarAddress, loadBalances]);

  const handleConnect = () => {
    const addr = addressInput.trim();
    if (!addr.startsWith("G") || addr.length !== 56) {
      toast({
        title: "Invalid Address",
        description: "Stellar addresses start with 'G' and are 56 characters long.",
        variant: "destructive",
      });
      return;
    }
    connect(addr);
    setAddressInput("");
    toast({ title: "Wallet Connected", description: `Connected: ${truncateAddress(addr)}` });
  };

  const handleDisconnect = () => {
    disconnect();
    toast({ title: "Wallet Disconnected" });
  };

  const handleCopyAddress = () => {
    if (!stellarAddress) return;
    navigator.clipboard.writeText(stellarAddress);
    setCopied(true);
    toast({ title: "Address Copied" });
    setTimeout(() => setCopied(false), 2000);
  };

  const nonNativeBalances = balances.filter((b) => b.asset_type !== "native");
  const totalTrustlines = nonNativeBalances.length;

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <SeoHead
          title="Stellar Wallet — CryptoOwnBank"
          description="Connect your Stellar wallet to view XLM balances, manage tokens, and send payments on the Stellar network."
          path="/stellar/wallet"
        />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-stellar-wallet-title">Stellar Wallet</h1>
          <p className="text-muted-foreground">
            Connect your Stellar address to view balances and manage your assets
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="flex items-center justify-center h-16 w-16 rounded-full" style={{ backgroundColor: `${STELLAR_PURPLE}15` }}>
              <Wallet className="h-8 w-8" style={{ color: STELLAR_PURPLE }} />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold" data-testid="text-connect-heading">Connect Your Stellar Address</h2>
              <p className="text-muted-foreground max-w-md">
                Enter your Stellar public key to view your XLM balance, token holdings, and trustlines. Non-custodial — we never store your private keys.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
              <Input
                placeholder="GXXXXXXXXX... (56 characters)"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="flex-1"
                data-testid="input-stellar-address"
              />
              <Button
                onClick={handleConnect}
                style={{ backgroundColor: STELLAR_PURPLE, borderColor: STELLAR_PURPLE }}
                className="text-white"
                data-testid="button-connect-stellar"
              >
                <Star className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              Your Stellar address (public key) starts with 'G' and is 56 characters long.
              You can find it in LOBSTR, Freighter, Solar, or any Stellar wallet app.
            </p>
          </CardContent>
        </Card>

        <Collapsible open={eduOpen} onOpenChange={setEduOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" style={{ color: STELLAR_PURPLE }} />
                  Learn: Stellar Basics
                </CardTitle>
                {eduOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border p-4 space-y-2">
                    <h4 className="text-sm font-semibold" data-testid="text-what-is-stellar">What is Stellar?</h4>
                    <p className="text-sm text-muted-foreground">
                      Stellar is a decentralized blockchain network designed for fast, low-cost cross-border payments.
                      Transactions settle in ~4 seconds and cost a fraction of a penny.
                    </p>
                  </div>
                  <div className="rounded-md border p-4 space-y-2" style={{ borderColor: `${STELLAR_PURPLE}30`, backgroundColor: `${STELLAR_PURPLE}08` }}>
                    <h4 className="text-sm font-semibold" data-testid="text-stellar-features">Key Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1.5">
                      <li>~4-second transaction finality</li>
                      <li>Near-zero fees (~0.00001 XLM)</li>
                      <li>Built-in DEX for token trading</li>
                      <li>Path payments for auto currency conversion</li>
                      <li>Regulated stablecoins (USDC, EURC)</li>
                    </ul>
                  </div>
                </div>
                <div className="rounded-md bg-muted/30 border border-muted p-4 space-y-2">
                  <h4 className="text-sm font-semibold">Non-Custodial</h4>
                  <p className="text-sm text-muted-foreground">
                    CryptoOwnBank is non-custodial. We read your public address to display balances, but we never hold your keys.
                    All transactions are signed in your own Stellar wallet (LOBSTR, Freighter, Solar, etc.).
                  </p>
                </div>
                <a
                  href="https://stellar.org/learn/intro-to-stellar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline inline-flex items-center gap-1"
                  style={{ color: STELLAR_PURPLE }}
                  data-testid="link-stellar-learn"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Learn more at Stellar.org
                </a>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SeoHead
        title="Stellar Wallet — CryptoOwnBank"
        description="View your Stellar wallet balances and manage your assets."
        path="/stellar/wallet"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-stellar-wallet-title">Stellar Wallet</h1>
          <p className="text-muted-foreground">View your Stellar balances and manage assets</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" style={{ borderColor: `${STELLAR_PURPLE}40` }} data-testid="badge-stellar-address">
            <Star className="h-3 w-3 mr-1" style={{ color: STELLAR_PURPLE }} />
            {truncateAddress(stellarAddress!)}
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleCopyAddress} data-testid="button-copy-stellar-address">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={loadBalances} disabled={loading} data-testid="button-refresh-stellar">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDisconnect} data-testid="button-disconnect-stellar">
            <Unplug className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${STELLAR_PURPLE}15` }}>
                <Star className="h-5 w-5" style={{ color: STELLAR_PURPLE }} />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <p className="text-2xl font-bold" data-testid="text-xlm-balance">{formatBalance(xlmBalance)}</p>
                )}
                <p className="text-xs text-muted-foreground">XLM Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted">
                <Coins className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-trustline-count">{totalTrustlines}</p>
                <p className="text-xs text-muted-foreground">Token Trustlines</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-emerald-500/10">
                <Shield className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-reserve">
                  {loading ? <Skeleton className="h-7 w-16" /> : `${Math.max(0, xlmBalance - (1 + totalTrustlines * 0.5)).toFixed(2)}`}
                </p>
                <p className="text-xs text-muted-foreground">Available (after reserve)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base" data-testid="text-holdings-heading">Token Holdings</CardTitle>
          <Link href="/stellar/tokens">
            <Button variant="outline" size="sm" data-testid="button-manage-tokens">
              Manage Tokens
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : balances.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No balances found. This account may not be funded yet.</p>
          ) : (
            <div className="space-y-2">
              {balances.map((b, i) => (
                <div
                  key={`${b.asset_code}-${b.asset_issuer || "native"}-${i}`}
                  className="flex items-center justify-between rounded-md border p-3"
                  data-testid={`row-balance-${b.asset_code}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: b.asset_type === "native" ? STELLAR_PURPLE : "#6b7280" }}
                    >
                      {b.asset_code.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{assetLabel(b)}</p>
                      {b.asset_issuer && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {b.asset_issuer.slice(0, 6)}...{b.asset_issuer.slice(-4)}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-mono font-medium" data-testid={`text-balance-${b.asset_code}`}>
                    {formatBalance(b.balance)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: STELLAR_PURPLE }} />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/stellar/send">
              <Button variant="outline" className="w-full justify-start" style={{ borderColor: `${STELLAR_PURPLE}30` }} data-testid="button-quick-send">
                <Globe className="h-4 w-4 mr-2" style={{ color: STELLAR_PURPLE }} />
                Send & Receive
              </Button>
            </Link>
            <Link href="/stellar/tokens">
              <Button variant="outline" className="w-full justify-start" style={{ borderColor: `${STELLAR_PURPLE}30` }} data-testid="button-quick-tokens">
                <Coins className="h-4 w-4 mr-2" style={{ color: STELLAR_PURPLE }} />
                Token Manager
              </Button>
            </Link>
            <Link href="/stellar/dex">
              <Button variant="outline" className="w-full justify-start" style={{ borderColor: `${STELLAR_PURPLE}30` }} data-testid="button-quick-dex">
                <Star className="h-4 w-4 mr-2" style={{ color: STELLAR_PURPLE }} />
                DEX Trading
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Non-Custodial</p>
              <p>
                CryptoOwnBank reads your public address to display balances.
                We never hold your private keys. All transactions are signed in your own Stellar wallet
                (LOBSTR, Freighter, Solar, etc.).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
