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
  Plus,
  ArrowRightLeft,
  Pencil,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SeoHead } from "@/components/seo-head";
import {
  useStellarStore,
  fetchStellarBalances,
  type StellarBalance,
} from "@/lib/stellar-store";
import { Link } from "wouter";

interface TrackerWallet {
  id: string;
  chain: string;
  address: string;
  label: string | null;
}

import { CHAIN_COLORS } from "@/lib/constants";
const STELLAR_PURPLE = CHAIN_COLORS.stellar;

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
    loadFromServer,
  } = useStellarStore();

  const [addressInput, setAddressInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [eduOpen, setEduOpen] = useState(true);
  const [showAddAnother, setShowAddAnother] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState("");
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function handleStellarRename(walletId: string) {
    if (!renameValue.trim()) return;
    const finalLabel = renameValue.trim().toUpperCase().startsWith("XLM_") || renameValue.trim().toUpperCase().startsWith("XLM ") || renameValue.trim().toUpperCase().startsWith("XLM-")
      ? renameValue.trim()
      : `XLM_${renameValue.trim()}`;
    try {
      await apiRequest("PATCH", `/api/wallets/${walletId}/label`, { label: finalLabel });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: "Wallet Renamed", description: `Updated to "${finalLabel}"` });
      setRenamingId(null);
      setRenameValue("");
    } catch {
      toast({ title: "Rename Failed", variant: "destructive" });
    }
  }

  const { data: trackerWallets = [] } = useQuery<TrackerWallet[]>({
    queryKey: ["/api/wallets"],
    select: (data: TrackerWallet[]) => data.filter((w) => w.chain === "stellar"),
  });

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

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

  const handleConnectAddress = (addr: string) => {
    const trimmed = addr.trim();
    if (!trimmed.startsWith("G") || trimmed.length !== 56) {
      toast({
        title: "Invalid Address",
        description: "Stellar addresses start with 'G' and are 56 characters long.",
        variant: "destructive",
      });
      return;
    }
    connect(trimmed);
    setAddressInput("");
    toast({ title: "Wallet Connected", description: `Connected: ${truncateAddress(trimmed)}` });
  };

  const handleConnect = () => {
    handleConnectAddress(addressInput);
  };

  const handleDisconnect = () => {
    disconnect();
    toast({ title: "Wallet Disconnected" });
  };

  const handleSwitchWallet = (addr: string) => {
    if (addr === stellarAddress) return;
    connect(addr);
    toast({ title: "Wallet Switched", description: `Now viewing: ${truncateAddress(addr)}` });
  };

  const handleAddAnother = () => {
    const trimmed = newAddressInput.trim();
    if (!trimmed.startsWith("G") || trimmed.length !== 56) {
      toast({
        title: "Invalid Address",
        description: "Stellar addresses start with 'G' and are 56 characters long.",
        variant: "destructive",
      });
      return;
    }
    connect(trimmed);
    setNewAddressInput("");
    setShowAddAnother(false);
    toast({ title: "Wallet Connected", description: `Connected: ${truncateAddress(trimmed)}` });
  };

  const otherTrackerWallets = trackerWallets.filter(
    (w) => w.address.toLowerCase() !== stellarAddress?.toLowerCase()
  );

  const activeWalletInfo = trackerWallets.find(
    (w) => w.address.toLowerCase() === stellarAddress?.toLowerCase()
  );

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
              <h2 className="text-xl font-semibold" data-testid="text-connect-heading">Connect Your Stellar Wallet</h2>
              <p className="text-muted-foreground max-w-md">
                Paste your Stellar public address to view your XLM balance, token holdings, and trustlines. Non-custodial — we never store your private keys.
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

            <div className="w-full max-w-lg space-y-3">
              <p className="text-sm font-medium text-center">How to find your address:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border p-3 space-y-1.5" style={{ borderColor: `${STELLAR_PURPLE}30` }}>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#4A90D9" }}>L</div>
                    <span className="text-sm font-semibold" data-testid="text-lobstr-guide">LOBSTR</span>
                  </div>
                  <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                    <li>Open LOBSTR app</li>
                    <li>Tap <strong>Receive</strong> (bottom bar)</li>
                    <li>Copy the <strong>G...</strong> address shown</li>
                    <li>Paste it above</li>
                  </ol>
                </div>
                <div className="rounded-lg border p-3 space-y-1.5" style={{ borderColor: `${STELLAR_PURPLE}30` }}>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5" style={{ color: STELLAR_PURPLE }} />
                    <span className="text-sm font-semibold" data-testid="text-other-wallets-guide">Freighter / Solar / Other</span>
                  </div>
                  <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                    <li>Open your Stellar wallet</li>
                    <li>Go to <strong>Account</strong> or <strong>Receive</strong></li>
                    <li>Copy your public key (starts with G)</li>
                    <li>Paste it above</li>
                  </ol>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Your Stellar address (public key) starts with 'G' and is 56 characters long. Never share your secret key.
              </p>
            </div>
            {trackerWallets.length > 0 && (
              <div className="w-full max-w-lg mt-4">
                <p className="text-sm font-medium mb-2 text-center">Your XLM addresses from Portfolio Tracker:</p>
                <div className="space-y-2">
                  {trackerWallets.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setAddressInput(w.address);
                        handleConnectAddress(w.address);
                      }}
                      data-testid={`button-use-tracker-wallet-${w.id}`}
                    >
                      <Wallet className="h-4 w-4 shrink-0" style={{ color: STELLAR_PURPLE }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{w.label || "Stellar Wallet"}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{w.address}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(w.address);
                          toast({ title: "Address copied" });
                        }}
                        data-testid={`button-copy-tracker-wallet-${w.id}`}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Badge variant="outline" className="shrink-0 text-xs" style={{ borderColor: `${STELLAR_PURPLE}40`, color: STELLAR_PURPLE }}>
                        Use
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
          <p className="text-muted-foreground">
            {activeWalletInfo?.label
              ? <><span className="font-medium text-foreground">{activeWalletInfo.label}</span> — viewing balances</>
              : "View your Stellar balances and manage assets"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`https://stellar.expert/explorer/public/account/${stellarAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
            data-testid="link-stellar-explorer"
          >
            <Badge variant="outline" className="cursor-pointer hover:bg-accent/50 transition-colors" style={{ borderColor: `${STELLAR_PURPLE}40` }} data-testid="badge-stellar-address">
              <Star className="h-3 w-3 mr-1" style={{ color: STELLAR_PURPLE }} />
              {activeWalletInfo?.label ? `${activeWalletInfo.label}: ${truncateAddress(stellarAddress!)}` : truncateAddress(stellarAddress!)}
              <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
            </Badge>
          </a>
          <Button variant="ghost" size="sm" onClick={handleCopyAddress} title="Copy full address" data-testid="button-copy-stellar-address">
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

      {(otherTrackerWallets.length > 0 || showAddAnother) && (
        <Card className="border-dashed" style={{ borderColor: `${STELLAR_PURPLE}30` }}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" style={{ color: STELLAR_PURPLE }} />
                Switch Wallet
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddAnother(!showAddAnother)}
                data-testid="button-toggle-add-stellar"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Another
              </Button>
            </div>
            <div className="space-y-2 mb-3">
              {activeWalletInfo && (
                <div
                  className="flex items-center gap-2 rounded-lg border-2 p-3"
                  style={{ borderColor: STELLAR_PURPLE, backgroundColor: `${STELLAR_PURPLE}10` }}
                  data-testid="card-active-stellar-wallet"
                >
                  <Star className="h-4 w-4 shrink-0" style={{ color: STELLAR_PURPLE }} />
                  <div className="flex-1 min-w-0">
                    {renamingId === activeWalletInfo.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">XLM_</span>
                        <Input
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          className="h-6 text-xs w-28"
                          placeholder="Name..."
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === "Enter") handleStellarRename(activeWalletInfo.id);
                            if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                          }}
                          onClick={e => e.stopPropagation()}
                          data-testid={`input-rename-stellar-active`}
                        />
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleStellarRename(activeWalletInfo.id); }}>
                          <Check className="h-3 w-3 text-emerald-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setRenamingId(null); setRenameValue(""); }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium truncate">{activeWalletInfo.label || "Stellar Wallet"}</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 shrink-0"
                          onClick={(e) => { e.stopPropagation(); setRenamingId(activeWalletInfo.id); setRenameValue((activeWalletInfo.label || "").replace(/^XLM[_\s-]/i, "")); }}
                          data-testid={`button-rename-stellar-active`}
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground font-mono truncate">{activeWalletInfo.address}</p>
                  </div>
                  <Badge className="shrink-0 text-xs text-white" style={{ backgroundColor: STELLAR_PURPLE }}>
                    Active
                  </Badge>
                </div>
              )}
              {otherTrackerWallets.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => handleSwitchWallet(w.address)}
                  data-testid={`button-switch-stellar-${w.id}`}
                >
                  <Star className="h-4 w-4 shrink-0" style={{ color: STELLAR_PURPLE }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{w.label || "Stellar Wallet"}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{w.address}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs" style={{ borderColor: `${STELLAR_PURPLE}40`, color: STELLAR_PURPLE }}>
                    Switch
                  </Badge>
                </div>
              ))}
            </div>
            {showAddAnother && (
              <div className="flex gap-2">
                <Input
                  placeholder="G... (Stellar address)"
                  value={newAddressInput}
                  onChange={(e) => setNewAddressInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAnother()}
                  data-testid="input-add-another-stellar"
                />
                <Button onClick={handleAddAnother} size="sm" style={{ backgroundColor: STELLAR_PURPLE }} data-testid="button-add-another-stellar">
                  Connect
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {otherTrackerWallets.length === 0 && !showAddAnother && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowAddAnother(true)}
            style={{ color: STELLAR_PURPLE }}
            data-testid="button-add-another-wallet"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Another Wallet
          </Button>
        </div>
      )}

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

      <Collapsible open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
        <Card style={{ borderColor: `${STELLAR_PURPLE}25` }}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" style={{ color: STELLAR_PURPLE }} />
                  How CryptoOwnBank Works with Your Wallets
                </span>
                {howItWorksOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-5 pt-0">
              <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: `${STELLAR_PURPLE}30`, backgroundColor: `${STELLAR_PURPLE}08` }}>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Star className="h-4 w-4" style={{ color: STELLAR_PURPLE }} />
                  The Big Picture
                </p>
                <p className="text-sm text-muted-foreground">
                  CryptoOwnBank is your <span className="font-medium text-foreground">dashboard and command center</span>.
                  LOBSTR (Stellar) and Xaman (XRPL) are your <span className="font-medium text-foreground">signing wallets</span>.
                  We build the transaction — your wallet app approves and signs it. Your keys never leave your wallet.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">How Signing Works</p>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-3 items-start">
                    <Badge className="shrink-0 text-xs text-white mt-0.5" style={{ backgroundColor: STELLAR_PURPLE }}>1</Badge>
                    <p>You set up a trade, send, or trustline on CryptoOwnBank</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Badge className="shrink-0 text-xs text-white mt-0.5" style={{ backgroundColor: STELLAR_PURPLE }}>2</Badge>
                    <p>CryptoOwnBank opens <span className="font-medium text-foreground">LOBSTR</span> (or Xaman for XRPL) with the transaction details</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Badge className="shrink-0 text-xs text-white mt-0.5" style={{ backgroundColor: STELLAR_PURPLE }}>3</Badge>
                    <p>You review and <span className="font-medium text-foreground">approve in your wallet app</span> — this is the "sign off"</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Badge className="shrink-0 text-xs text-white mt-0.5" style={{ backgroundColor: STELLAR_PURPLE }}>4</Badge>
                    <p>The transaction goes through on the blockchain, and CryptoOwnBank shows your updated balance</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">LOBSTR (Phone App) — Your Signing Wallet for Stellar</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                  <li>LOBSTR signs trades, sends, and trustline changes that you set up here</li>
                  <li>Works automatically — CryptoOwnBank opens LOBSTR when you need to approve something</li>
                  <li>You can manage multiple LOBSTR addresses on this page (see Switch Wallet above)</li>
                </ul>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Cold Wallets (Ledger, Arculus, Ellipal, SafePal)</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                  <li><span className="font-medium text-foreground">Tracking only:</span> Add the public address to see balances and portfolio value</li>
                  <li><span className="font-medium text-foreground">To sign transactions:</span> Use StellarTerm or Stellar Laboratory as the signing option (instead of LOBSTR)</li>
                  <li><span className="font-medium text-foreground">Shortcut:</span> If you import your cold wallet's recovery phrase into LOBSTR, then LOBSTR can sign on its behalf from your phone — but this means your keys are now on a hot device (less secure, more convenient)</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "#10b98130", backgroundColor: "#10b98108" }}>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-500" />
                  Best Practice — The Debit Card Approach
                </p>
                <p className="text-sm text-muted-foreground">
                  Think of it like your bank accounts:
                </p>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-2 items-start">
                    <Shield className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <p><span className="font-medium text-foreground">Cold wallet = Savings account</span> — holds the majority of your funds, maximum security</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Zap className="h-4 w-4 shrink-0 mt-0.5" style={{ color: STELLAR_PURPLE }} />
                    <p><span className="font-medium text-foreground">LOBSTR / Xaman = Debit card</span> — load what you need to spend, use conveniently from your phone</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Globe className="h-4 w-4 shrink-0 mt-0.5" style={{ color: STELLAR_PURPLE }} />
                    <p><span className="font-medium text-foreground">CryptoOwnBank = Banking app</span> — see all accounts in one place, make transactions with your "debit card"</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Send what you want to actively use from your cold wallet to LOBSTR/Xaman. If your phone is compromised, you only risk what's on it — your cold wallet savings stay safe. You can always load more when needed.
                </p>
              </div>

              <div className="rounded-md bg-muted/30 border border-muted p-4 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  Security Note
                </p>
                <p className="text-sm text-muted-foreground">
                  CryptoOwnBank <span className="font-medium text-foreground">never sees or stores your private keys</span>.
                  We only read your public address from the blockchain.
                  Every transaction must be approved and signed in your own wallet app (LOBSTR, Xaman, Ledger, etc.).
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
