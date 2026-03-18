import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { XrplDisclaimer } from "@/components/xrpl-disclaimer";
import { useXrplStore } from "@/lib/xrpl-store";
import {
  getBalances,
  getXrpPrice,
  calculateAccruedInterest,
  AFFILIATE_LINKS,
  SOIL_REFERRAL_URL,
} from "@/lib/xrpl-client";
import { connectXumm, hasPendingXummSignIn, completePendingXummSignIn } from "@/lib/xumm-connector";
import { connectLedger } from "@/lib/ledger-connector";
import { useRlusdPolling } from "@/hooks/use-rlusd-polling";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Wallet,
  Unplug,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Copy,
  Check,
  ArrowDownToLine,
  Users,
  RefreshCw,
  Shield,
  X,
  Sparkles,
  ArrowRight,
  Share2,
  Database,
  ArrowUpFromLine,
  CheckCircle,
  HelpCircle,
  Tag,
  Loader2,
  RotateCcw,
  Coins,
  Clock,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Globe,
  Zap,
} from "lucide-react";
import { SiRipple } from "react-icons/si";
import { SocialShare } from "@/components/social-share";

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function OwnBankDashboard() {
  const { toast } = useToast();
  const {
    walletAddress,
    isConnected,
    walletType,
    xrpBalance,
    rlusdBalance,
    vaultDeposits,
    referralCode,
    connect,
    disconnect,
    updateBalances,
    generateReferralCode,
  } = useXrplStore();

  const { data: trackerXrpWallets = [] } = useQuery<Array<{ id: string; chain: string; address: string; label: string | null }>>({
    queryKey: ["/api/wallets"],
    select: (data: Array<{ id: string; chain: string; address: string; label: string | null }>) => data.filter((w) => w.chain === "xrp"),
  });

  const [xrpPrice, setXrpPrice] = useState<number>(0);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [connectingXumm, setConnectingXumm] = useState(false);
  const [connectingLedger, setConnectingLedger] = useState(false);
  const [copied, setCopied] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [syncingSoil, setSyncingSoil] = useState(false);
  const [soilSummary, setSoilSummary] = useState<{
    deposits: number;
    totalDeposited: string;
    withdrawals: number;
    totalWithdrawn: string;
    yieldPayments?: number;
    totalYieldReceived?: string;
    currentPrincipal: string;
    calculatedInterest: string;
    effectiveYieldPercent: string;
    weightedApr?: string;
    firstDepositDate: string | null;
    vaults?: Array<{ address: string; name: string; totalDeposited: string; principal: string; apr: string; interest: string; yieldReceived?: string }>;
    transactions: Array<{ hash: string; type: string; amount: string; currency: string; date: string; vaultName?: string }>;
  } | null>(null);
  const [soilSynced, setSoilSynced] = useState(false);
  const [discoveredAddresses, setDiscoveredAddresses] = useState<Array<{
    address: string;
    totalAmount: number;
    txCount: number;
    lastDate: string;
    direction: string;
  }>>([]);
  const [labelingAddress, setLabelingAddress] = useState<string | null>(null);
  const [labelName, setLabelName] = useState("");
  const [labelApr, setLabelApr] = useState("");
  const [savingLabel, setSavingLabel] = useState(false);
  const [customVaults, setCustomVaults] = useState<Array<{
    address: string;
    name: string;
    apr: number;
    addedAt: string;
  }>>([]);
  const [editingVault, setEditingVault] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editApr, setEditApr] = useState("");
  const [expandedAddr, setExpandedAddr] = useState<string | null>(null);
  const [autoCompoundSettings, setAutoCompoundSettings] = useState<Record<string, boolean>>({});
  const [togglingAutoCompound, setTogglingAutoCompound] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingBalances(true);
    try {
      const balances = await getBalances(walletAddress);
      updateBalances(balances.xrp, balances.rlusd);
    } catch {
      toast({
        title: "Failed to fetch balances",
        description: "Could not connect to XRPL. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingBalances(false);
    }
  }, [walletAddress, updateBalances, toast]);

  const fetchPrice = useCallback(async () => {
    setLoadingPrice(true);
    try {
      const price = await getXrpPrice();
      setXrpPrice(price);
    } catch {
      // silent
    } finally {
      setLoadingPrice(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchBalances();
      fetchPrice();
      saveWalletToServer(walletAddress, walletType || "xumm");
    }
  }, [isConnected, walletAddress, fetchBalances, fetchPrice]);

  useEffect(() => {
    if (!isConnected) {
      fetch("/api/wallet", { credentials: "include" })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.walletAddress) {
            connect(data.walletAddress, data.walletType || "xumm");
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!isConnected && hasPendingXummSignIn()) {
      setConnectingXumm(true);
      completePendingXummSignIn().then((result) => {
        if (result.success && result.address) {
          connect(result.address, "xumm");
          saveWalletToServer(result.address, "xumm");
          toast({ title: "Wallet Connected", description: `Connected via Xaman: ${truncateAddress(result.address)}` });
        } else if (result.error && result.error !== "No pending sign-in") {
          toast({ title: "Connection Failed", description: result.error, variant: "destructive" });
        }
        setConnectingXumm(false);
      });
    }
  }, []);

  const saveWalletToServer = async (address: string, type: string) => {
    try {
      const resp = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ walletAddress: address, walletType: type }),
      });
      if (!resp.ok) {
        console.error("Failed to save wallet to server:", resp.status);
      }
    } catch (err) {
      console.error("Failed to save wallet to server:", err);
    }
    try {
      await apiRequest("POST", "/api/xaman-connections", { xrpAddress: address });
      queryClient.invalidateQueries({ queryKey: ["/api/xaman-connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
    } catch {
    }
  };

  const handleConnectXumm = async () => {
    setConnectingXumm(true);
    try {
      const result = await connectXumm();
      if (result.success && result.address) {
        connect(result.address, "xumm");
        saveWalletToServer(result.address, "xumm");
        toast({ title: "Wallet Connected", description: `Connected via Xaman: ${truncateAddress(result.address)}` });
      } else {
        toast({ title: "Connection Failed", description: result.error || "Could not connect Xaman wallet.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Connection Error", description: err.message || "Unexpected error.", variant: "destructive" });
    } finally {
      setConnectingXumm(false);
    }
  };

  const handleConnectLedger = async () => {
    setConnectingLedger(true);
    try {
      const result = await connectLedger();
      if (result.success && result.address) {
        connect(result.address, "ledger");
        saveWalletToServer(result.address, "ledger");
        toast({ title: "Wallet Connected", description: `Connected via Ledger: ${truncateAddress(result.address)}` });
      } else {
        toast({ title: "Connection Failed", description: result.error || "Could not connect Ledger.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Connection Error", description: err.message || "Unexpected error.", variant: "destructive" });
    } finally {
      setConnectingLedger(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    saveWalletToServer("", "");
    toast({ title: "Wallet Disconnected" });
  };

  const handleSyncSoil = useCallback(async () => {
    if (!walletAddress) return;
    setSyncingSoil(true);
    try {
      const response = await apiRequest("POST", "/api/soil/sync", {
        walletAddress,
        walletType: walletType || "xumm",
      });
      const data = await response.json();
      if (data.success) {
        setSoilSummary(data.summary);
        setSoilSynced(true);
        if (data.discoveredAddresses && data.discoveredAddresses.length > 0) {
          setDiscoveredAddresses(data.discoveredAddresses);
        } else {
          setDiscoveredAddresses([]);
        }
        if (data.newlyImported > 0) {
          toast({
            title: "Soil Activity Synced",
            description: `Found ${data.summary.deposits} deposit(s). ${data.newlyImported} new transaction(s) imported.`,
          });
        }
      }
    } catch (err: any) {
      let errorMsg = "";
      try {
        if (err?.message) errorMsg = err.message;
      } catch {}
      console.error("[Soil sync] Error:", errorMsg);
      if (errorMsg.includes("No wallet connected") || errorMsg.includes("wallet")) {
        setSoilSynced(true);
      } else {
        toast({
          title: "Soil sync issue",
          description: errorMsg || "Could not scan XRPL right now. You can try the refresh button later.",
        });
      }
    } finally {
      setSyncingSoil(false);
    }
  }, [walletAddress, toast]);

  useEffect(() => {
    if (isConnected && walletAddress && !soilSynced) {
      handleSyncSoil();
    }
  }, [isConnected, walletAddress, soilSynced, handleSyncSoil]);

  const fetchCustomVaults = useCallback(async () => {
    try {
      const response = await apiRequest("GET", "/api/custom-vaults");
      const data = await response.json();
      setCustomVaults((data.vaults || []).filter((v: any) => v.name !== "__dismissed__"));
    } catch {}
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchCustomVaults();
    }
  }, [isConnected, fetchCustomVaults]);

  const fetchAutoCompound = useCallback(async () => {
    try {
      const response = await apiRequest("GET", "/api/auto-compound");
      const data = await response.json();
      const map: Record<string, boolean> = {};
      for (const s of data.settings || []) {
        map[s.vaultAddress] = s.enabled;
      }
      setAutoCompoundSettings(map);
    } catch {}
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchAutoCompound();
    }
  }, [isConnected, fetchAutoCompound]);

  const toggleAutoCompound = async (vaultAddress: string) => {
    const current = autoCompoundSettings[vaultAddress] || false;
    setTogglingAutoCompound(vaultAddress);
    try {
      await apiRequest("POST", "/api/auto-compound", {
        vaultAddress,
        enabled: !current,
      });
      setAutoCompoundSettings(prev => ({ ...prev, [vaultAddress]: !current }));
      toast({
        title: !current ? "Auto-Compound Enabled" : "Auto-Compound Disabled",
        description: !current
          ? "You'll receive an email with a one-tap re-deposit link when yield arrives."
          : "Auto-compound notifications turned off for this vault.",
      });
    } catch {
      toast({ title: "Error", description: "Failed to update auto-compound setting", variant: "destructive" });
    } finally {
      setTogglingAutoCompound(null);
    }
  };

  const handleEditVault = async (address: string) => {
    if (!editName.trim()) return;
    try {
      await apiRequest("PATCH", `/api/custom-vaults/${encodeURIComponent(address)}`, {
        name: editName.trim(),
        apr: parseFloat(editApr) || 0,
      });
      setEditingVault(null);
      fetchCustomVaults();
      handleSyncSoil();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update", variant: "destructive" });
    }
  };

  const handleRemoveVault = async (address: string) => {
    try {
      await apiRequest("DELETE", `/api/custom-vaults/${encodeURIComponent(address)}`);
      fetchCustomVaults();
      handleSyncSoil();
    } catch {}
  };

  const handleLabelVault = async (address: string) => {
    if (!labelName.trim()) return;
    setSavingLabel(true);
    try {
      const response = await apiRequest("POST", "/api/custom-vaults", {
        address,
        name: labelName.trim(),
        apr: parseFloat(labelApr) || 0,
      });
      const data = await response.json();
      if (data.success) {
        setDiscoveredAddresses(prev => prev.filter(d => d.address !== address));
        setLabelingAddress(null);
        setLabelName("");
        setLabelApr("");
        toast({
          title: "Address Labeled",
          description: `"${labelName.trim()}" is now tracked. Syncing transactions...`,
        });
        fetchCustomVaults();
        handleSyncSoil();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add vault", variant: "destructive" });
    } finally {
      setSavingLabel(false);
    }
  };

  const handleDismissAddress = async (address: string) => {
    try {
      await apiRequest("POST", "/api/custom-vaults/dismiss", { address });
      setDiscoveredAddresses(prev => prev.filter(d => d.address !== address));
    } catch {}
  };

  const { showDepositPrompt, balanceIncrease, dismissPrompt } = useRlusdPolling();

  const portfolioValue = xrpBalance * xrpPrice + rlusdBalance;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let allTimeInterest = 0;
  let thisMonthInterest = 0;
  for (const dep of vaultDeposits) {
    const totalInterest = calculateAccruedInterest(dep.principal, dep.apr, dep.depositDate);
    allTimeInterest += totalInterest;
    const depositDate = new Date(dep.depositDate);
    if (depositDate < startOfMonth) {
      const daysThisMonth = (now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24);
      thisMonthInterest += dep.principal * (dep.apr / 100) * (daysThisMonth / 365);
    } else {
      thisMonthInterest += totalInterest;
    }
  }

  const SITE_DOMAIN = "https://cryptoownbank.com";
  const referralLink = referralCode
    ? `${SITE_DOMAIN}/?ref=${referralCode}`
    : null;

  const handleCopyReferral = async () => {
    if (!referralLink) {
      const code = generateReferralCode();
      const link = `${SITE_DOMAIN}/?ref=${code}`;
      await navigator.clipboard.writeText(link);
    } else {
      await navigator.clipboard.writeText(referralLink);
    }
    setCopied(true);
    toast({ title: "Referral link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-ownbank-title">OwnBank</h1>
          <p className="text-muted-foreground">
            Non-custodial XRPL yield dashboard. Connect your cold wallet to get started.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-[#00A4E4]/10">
              <Wallet className="h-8 w-8 text-[#00A4E4]" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold" data-testid="text-connect-heading">Connect Your Wallet</h2>
              <p className="text-muted-foreground max-w-md">
                Connect your XRPL cold wallet to view balances, manage vault deposits, and withdraw earned interest.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleConnectXumm}
                disabled={connectingXumm || connectingLedger}
                className="bg-[#00A4E4] border-[#00A4E4] text-white"
                data-testid="button-connect-xumm"
              >
                {connectingXumm ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <SiRipple className="h-4 w-4 mr-2" />
                )}
                {connectingXumm ? "Connecting..." : "Connect Xaman"}
              </Button>
              <Button
                variant="outline"
                onClick={handleConnectLedger}
                disabled={connectingXumm || connectingLedger}
                data-testid="button-connect-ledger"
              >
                {connectingLedger ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Connect Ledger
              </Button>
            </div>
            {trackerXrpWallets.length > 0 && (
              <div className="w-full max-w-lg mt-4">
                <p className="text-sm font-medium mb-2 text-center">Your XRP addresses from Wallets & Addresses:</p>
                <div className="space-y-2">
                  {trackerXrpWallets.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => {
                        connect(w.address, "xumm");
                        saveWalletToServer(w.address, "xumm");
                        toast({ title: "Wallet Connected", description: `Connected: ${truncateAddress(w.address)}` });
                      }}
                      data-testid={`button-use-tracker-xrp-${w.id}`}
                    >
                      <Wallet className="h-4 w-4 shrink-0 text-[#00A4E4]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{w.label || "XRP Wallet"}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{w.address}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs border-[#00A4E4]/40 text-[#00A4E4]">
                        Use
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed" data-testid="card-connect-guide">
          <CardContent className="py-6">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2" data-testid="heading-connect-guide">
              <Shield className="h-4 w-4 text-[#00A4E4]" />
              How to Connect Your Wallet (30 seconds)
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li data-testid="text-guide-step-1">Open <span className="font-medium text-foreground">Xaman</span> on your iPhone (or have <span className="font-medium text-foreground">Ledger Nano X</span> ready).</li>
              <li data-testid="text-guide-step-2">On this page, click <span className="font-medium text-foreground">Connect Xaman</span> or <span className="font-medium text-foreground">Connect Ledger</span> above.</li>
              <li data-testid="text-guide-step-3">Approve the connection in Xaman (or on Ledger device).</li>
              <li data-testid="text-guide-step-4">Your XRPL address appears — you're now connected.</li>
            </ol>
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground" data-testid="text-guide-security">
                Your keys never leave your hardware. The site only reads public data and asks you to sign actions. No KYC. No seed phrases. Ever.
              </p>
            </div>
          </CardContent>
        </Card>

        <XrplDisclaimer />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-ownbank-title">OwnBank</h1>
          <p className="text-muted-foreground">
            Non-custodial XRPL yield dashboard
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" data-testid="badge-wallet-address">
            <Wallet className="h-3 w-3 mr-1" />
            {truncateAddress(walletAddress!)}
          </Badge>
          <Badge variant="secondary" data-testid="badge-wallet-type">
            {walletType === "xumm" ? "Xaman" : "Ledger"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { fetchBalances(); fetchPrice(); }}
            disabled={loadingBalances}
            data-testid="button-refresh-balances"
          >
            <RefreshCw className={`h-4 w-4 ${loadingBalances ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            data-testid="button-disconnect"
          >
            <Unplug className="h-4 w-4 mr-1" />
            Disconnect
          </Button>
        </div>
      </div>

      <Card className="border-[#00A4E4]/20 bg-gradient-to-br from-[#00A4E4]/5 to-transparent">
        <CardContent className="py-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold" data-testid="text-wallet-balances-heading">Wallet Balances</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { fetchBalances(); fetchPrice(); }}
              disabled={loadingBalances}
              data-testid="button-refresh-balances"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingBalances ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">XRP Balance</p>
              {loadingBalances ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <div className="text-lg font-bold font-mono" data-testid="text-xrp-balance">
                  {xrpBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} XRP
                </div>
              )}
              {!loadingBalances && xrpPrice > 0 && (
                <p className="text-xs text-muted-foreground" data-testid="text-xrp-usd">
                  {formatCurrency(xrpBalance * xrpPrice)}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">RLUSD Available</p>
              {loadingBalances ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <div className="text-lg font-bold font-mono" data-testid="text-rlusd-balance">
                  {formatCurrency(rlusdBalance)}
                </div>
              )}
              {rlusdBalance > 0 && (
                <Link href="/ownbank/vaults">
                  <span className="text-xs text-[#00A4E4] hover:underline cursor-pointer" data-testid="link-move-to-soil">
                    Move to Soil →
                  </span>
                </Link>
              )}
            </div>
          </div>
          {!loadingPrice && xrpPrice > 0 && (
            <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Portfolio (wallet)</span>
              <span className="text-sm font-semibold font-mono" data-testid="text-portfolio-value">{formatCurrency(portfolioValue)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {showDepositPrompt && (
        <Alert className="border-emerald-500/40 bg-emerald-500/5">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          <AlertTitle data-testid="text-balance-detected">
            New RLUSD detected in your wallet
          </AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
            <span className="text-sm">
              +{formatCurrency(balanceIncrease || 0)} RLUSD received. Ready to deposit to Soil?
            </span>
            <div className="flex items-center gap-2">
              <Link href="/ownbank/vaults">
                <Button
                  size="sm"
                  className="bg-[#00A4E4] text-white border-[#00A4E4]"
                  data-testid="button-deposit-now"
                >
                  Deposit to Soil
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissPrompt}
                data-testid="button-dismiss-prompt"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">
              <TrendingUp className="h-5 w-5 inline mr-2 text-purple-500" />
              Soil Vault Activity
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">5.2–8.0% APR</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSyncSoil}
                disabled={syncingSoil}
                data-testid="button-sync-soil"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncingSoil ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time activity synced from XRPL ledger. All data verified on-chain.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {syncingSoil && !soilSummary ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Scanning XRPL ledger for Soil transactions...
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </div>
          ) : soilSummary && soilSummary.deposits > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-lg border bg-card p-2 sm:p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowUpFromLine className="h-3.5 w-3.5 text-purple-500" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Deposited</p>
                  </div>
                  <p className="text-sm sm:text-lg font-bold font-mono" data-testid="text-soil-total-deposited">
                    ${parseFloat(soilSummary.totalDeposited).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">{soilSummary.deposits} deposit{soilSummary.deposits !== 1 ? "s" : ""}</p>
                </div>
                <div className="rounded-lg border bg-card p-2 sm:p-3 bg-gradient-to-br from-emerald-500/5 to-transparent">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Interest Earned (est.)</p>
                  </div>
                  <p className="text-sm sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400" data-testid="text-soil-calculated-interest">
                    ${parseFloat(soilSummary.calculatedInterest).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">{soilSummary.effectiveYieldPercent}% return</p>
                </div>
                {(() => {
                  const yieldAmt = parseFloat(soilSummary.totalYieldReceived || "0");
                  const MIN_RLUSD_RESERVE = 0.01;
                  const MIN_DEPOSIT = 10;
                  const maxRedeposit = Math.max(0, Math.floor((rlusdBalance - MIN_RLUSD_RESERVE) * 100) / 100);
                  const canRedeposit = maxRedeposit >= MIN_DEPOSIT;
                  if (yieldAmt <= 0 && rlusdBalance <= 0) return null;
                  return (
                    <div className="col-span-2 rounded-lg border bg-card p-2 sm:p-3 bg-gradient-to-br from-amber-500/5 to-transparent">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Coins className="h-3.5 w-3.5 text-amber-500" />
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Yield Received in Wallet</p>
                          </div>
                          {yieldAmt > 0 && (
                            <p className="text-sm sm:text-lg font-bold font-mono text-amber-600 dark:text-amber-400" data-testid="text-soil-yield-received">
                              ${yieldAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </p>
                          )}
                          <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                            {yieldAmt > 0
                              ? `${soilSummary.yieldPayments || 0} payment${(soilSummary.yieldPayments || 0) !== 1 ? "s" : ""} from Soil vaults`
                              : "No yield payments received yet"}
                          </p>
                          {rlusdBalance > 0 && (
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                              Wallet RLUSD: <span className="font-mono font-medium">${rlusdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              {canRedeposit && (
                                <span className="ml-1">
                                  · Max deposit: <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">${maxRedeposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {canRedeposit ? (
                            <Link href={`/ownbank-xrpl/vaults?redeposit=${maxRedeposit}`}>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-[10px] sm:text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                data-testid="button-redeposit-yield"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Re-deposit ${maxRedeposit.toFixed(2)}
                              </Button>
                            </Link>
                          ) : (
                            <div className="text-[10px] text-muted-foreground text-right italic max-w-[100px] text-right">
                              {rlusdBalance < MIN_DEPOSIT ? `Min ${MIN_DEPOSIT} RLUSD to re-deposit` : "Waiting for yield"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {soilSummary.firstDepositDate && (() => {
                const totalDep = parseFloat(soilSummary.totalDeposited);
                const apr = parseFloat(soilSummary.weightedApr || "6.5") / 100;
                const dailyYield = totalDep * apr / 365;
                const weeklyYield = dailyYield * 7;
                const monthlyYield = dailyYield * 30;
                const firstDate = new Date(soilSummary.firstDepositDate!);
                const daysSinceFirst = Math.max(0, Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
                const yieldAmt = parseFloat(soilSummary.totalYieldReceived || "0");
                const PAYOUT_CYCLE_DAYS = 7;
                const daysSinceLastPayout = yieldAmt > 0
                  ? (() => {
                      const yieldTxns = soilSummary.transactions?.filter(t => t.type === "yield") || [];
                      if (yieldTxns.length > 0) {
                        const lastYield = yieldTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                        return Math.floor((Date.now() - new Date(lastYield.date).getTime()) / (1000 * 60 * 60 * 24));
                      }
                      return daysSinceFirst;
                    })()
                  : daysSinceFirst;
                const daysUntilNext = Math.max(0, PAYOUT_CYCLE_DAYS - (daysSinceLastPayout % PAYOUT_CYCLE_DAYS));
                const nextPayoutDate = new Date(Date.now() + daysUntilNext * 24 * 60 * 60 * 1000);
                const pendingYield = dailyYield * daysSinceLastPayout;

                return (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Active since</span>
                      <span className="font-medium">{firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ({daysSinceFirst}d)</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Blended APR</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{soilSummary.weightedApr || "6.5"}%</span>
                    </div>

                    <div className="border-t pt-2 mt-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
                        <p className="text-[10px] sm:text-xs font-medium">Yield Projections</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Daily</p>
                          <p className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">+${dailyYield.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Weekly</p>
                          <p className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">+${weeklyYield.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Monthly</p>
                          <p className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">+${monthlyYield.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-2 mt-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <p className="text-[10px] sm:text-xs font-medium">Next Payout Estimate</p>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground text-xs">Expected around</span>
                        <span className="text-xs font-medium">
                          {daysUntilNext === 0 ? "Any day now" : `~${nextPayoutDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} (${daysUntilNext}d)`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-0.5">
                        <span className="text-muted-foreground text-xs">Pending yield (est.)</span>
                        <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">~${pendingYield.toFixed(2)}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1 italic">
                        Soil pays yield periodically (~weekly). Exact timing may vary.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {soilSummary.vaults && soilSummary.vaults.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Vault Positions</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {soilSummary.vaults.map((v) => (
                      <div key={v.address} className="rounded-lg border bg-card p-2.5" data-testid={`card-vault-${v.name.toLowerCase()}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium">{v.name}</p>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{v.apr}% APR</span>
                        </div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Deposited</p>
                            <p className="text-sm font-bold font-mono">${parseFloat(v.totalDeposited || v.principal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">Interest (est.)</p>
                            <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">+${parseFloat(v.interest).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        {parseFloat(v.yieldReceived || "0") > 0 && (
                          <div className="flex items-center justify-between pt-1.5 border-t border-dashed">
                            <div className="flex items-center gap-1">
                              <Coins className="h-3 w-3 text-amber-500" />
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                ${parseFloat(v.yieldReceived || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} yield received
                              </p>
                            </div>
                            {rlusdBalance >= 0.01 && (
                              <Link href={`/ownbank-xrpl/vaults?redeposit=${Math.max(0, Math.floor((rlusdBalance - 0.01) * 100) / 100)}&vault=${v.address}`}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 text-[9px] px-1.5 gap-0.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                  data-testid={`button-redeposit-${v.name.toLowerCase()}`}
                                >
                                  <RotateCcw className="h-2.5 w-2.5" />
                                  Re-deposit
                                </Button>
                              </Link>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1.5 border-t">
                          <div className="flex items-center gap-1.5">
                            <RefreshCw className="h-3 w-3 text-blue-500" />
                            <span className="text-[10px] text-muted-foreground">Auto-Compound</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {togglingAutoCompound === v.address && (
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                            <Switch
                              checked={autoCompoundSettings[v.address] || false}
                              onCheckedChange={() => toggleAutoCompound(v.address)}
                              disabled={togglingAutoCompound === v.address}
                              className="scale-75"
                              data-testid={`switch-autocompound-${v.name.toLowerCase()}`}
                            />
                          </div>
                        </div>
                        {autoCompoundSettings[v.address] && (
                          <p className="text-[9px] text-blue-600 dark:text-blue-400 italic">
                            Email notification + one-tap re-deposit when yield arrives
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {discoveredAddresses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-xs font-medium text-muted-foreground">Unrecognized RLUSD Transfers</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    We found RLUSD payments to addresses not yet tracked. If any of these are yield vaults, label them to start tracking automatically.
                  </p>
                  <div className="space-y-2">
                    {discoveredAddresses.map((d) => (
                      <div key={d.address} className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-2.5" data-testid={`card-discovered-${d.address.slice(0, 8)}`}>
                        {labelingAddress === d.address ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium">
                              {d.direction === "outgoing" ? "You sent RLUSD to this address — is it a yield vault?" : "You received RLUSD from this address — is it a yield source?"}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono break-all">{d.address}</p>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Vault name (e.g. Yield)"
                                value={labelName}
                                onChange={(e) => setLabelName(e.target.value)}
                                className="h-7 text-xs"
                                data-testid="input-vault-name"
                              />
                              <Input
                                placeholder="APR %"
                                value={labelApr}
                                onChange={(e) => setLabelApr(e.target.value)}
                                className="h-7 text-xs w-20"
                                type="number"
                                data-testid="input-vault-apr"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleLabelVault(d.address)}
                                disabled={!labelName.trim() || savingLabel}
                                data-testid="button-save-vault"
                              >
                                {savingLabel ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Tag className="h-3 w-3 mr-1" />}
                                Track as Vault
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => { setLabelingAddress(null); setLabelName(""); setLabelApr(""); }}
                                data-testid="button-cancel-label"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground">
                                {d.direction === "outgoing" ? (
                                  <span className="text-purple-600 dark:text-purple-400 font-medium">Sent to </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Received from </span>
                                )}
                                <button
                                  className="font-mono hover:underline cursor-pointer"
                                  onClick={() => setExpandedAddr(expandedAddr === d.address ? null : d.address)}
                                  data-testid={`button-expand-addr-${d.address.slice(0, 8)}`}
                                >
                                  {expandedAddr === d.address ? d.address : `${d.address.slice(0, 8)}...${d.address.slice(-6)}`}
                                </button>
                                {" "}
                                <a
                                  href={`https://xrpscan.com/account/${d.address}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-[#00A4E4] hover:underline"
                                  data-testid={`link-xrpscan-${d.address.slice(0, 8)}`}
                                >
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </p>
                              <p className="text-xs mt-0.5">
                                <span className="font-medium">${d.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="text-muted-foreground"> RLUSD · {d.txCount} tx</span>
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => { setLabelingAddress(d.address); setLabelName(""); setLabelApr(""); }}
                                data-testid={`button-label-${d.address.slice(0, 8)}`}
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                Label
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={() => handleDismissAddress(d.address)}
                                data-testid={`button-dismiss-${d.address.slice(0, 8)}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {customVaults.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Labeled Addresses</p>
                  </div>
                  <div className="space-y-1">
                    {customVaults.map((cv) => (
                      <div key={cv.address} className="rounded-md border bg-card px-2.5 py-2" data-testid={`card-labeled-${cv.address.slice(0, 8)}`}>
                        {editingVault === cv.address ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-7 text-xs"
                                placeholder="Name"
                                data-testid="input-edit-vault-name"
                              />
                              <Input
                                value={editApr}
                                onChange={(e) => setEditApr(e.target.value)}
                                className="h-7 text-xs w-20"
                                type="number"
                                placeholder="APR %"
                                data-testid="input-edit-vault-apr"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="h-6 text-[10px]" onClick={() => handleEditVault(cv.address)} data-testid="button-save-edit">Save</Button>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingVault(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium">{cv.name}{cv.apr > 0 ? <span className="text-emerald-600 dark:text-emerald-400 ml-1.5">{cv.apr}% APR</span> : ""}</p>
                              <p className="text-[10px] text-muted-foreground">
                                <button
                                  className="font-mono hover:underline cursor-pointer"
                                  onClick={() => setExpandedAddr(expandedAddr === cv.address ? null : cv.address)}
                                >
                                  {expandedAddr === cv.address ? cv.address : `${cv.address.slice(0, 8)}...${cv.address.slice(-6)}`}
                                </button>
                                {" "}
                                <a href={`https://xrpscan.com/account/${cv.address}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-[#00A4E4] hover:underline">
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => { setEditingVault(cv.address); setEditName(cv.name); setEditApr(cv.apr.toString()); }} data-testid={`button-edit-${cv.address.slice(0, 8)}`}>
                                Edit
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-destructive" onClick={() => handleRemoveVault(cv.address)} data-testid={`button-remove-${cv.address.slice(0, 8)}`}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {soilSummary.transactions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">On-Chain Transaction History</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {[...soilSummary.transactions].reverse().map((tx) => (
                      <div
                        key={tx.hash}
                        className="flex items-center justify-between gap-2 text-xs rounded-md border px-2 sm:px-3 py-2"
                        data-testid={`row-soil-tx-${tx.hash.slice(0, 8)}`}
                      >
                        <div className="flex items-center gap-1.5 shrink-0">
                          {tx.type === "deposit" ? (
                            <ArrowUpFromLine className="h-3 w-3 text-purple-500" />
                          ) : (
                            <ArrowDownToLine className="h-3 w-3 text-emerald-500" />
                          )}
                          <span className="font-medium capitalize hidden sm:inline">{tx.type}</span>
                          {tx.vaultName && <span className="text-[10px] text-muted-foreground hidden sm:inline">({tx.vaultName})</span>}
                        </div>
                        <span className="font-mono shrink-0">
                          {tx.type === "interest" ? "+" : "-"}${parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <a
                          href={`https://xrpscan.com/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00A4E4] hover:underline shrink-0"
                          data-testid={`link-tx-explorer-${tx.hash.slice(0, 8)}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                All data verified on-chain via XRPL ledger. Synced to your tax reports automatically.
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No Soil transactions found on-chain for this wallet.</p>
              <p className="text-xs text-muted-foreground mt-1">Deposit RLUSD to Soil to start earning 5.2–8.0% APR.</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <Link href="/ownbank/history">
              <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm" data-testid="button-soil-yield">
                <DollarSign className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">History</span>
              </Button>
            </Link>
            <a href={SOIL_REFERRAL_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm" data-testid="button-soil-deposit-more">
                <ArrowRight className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Deposit</span>
              </Button>
            </a>
            <Link href="/ownbank/withdraw">
              <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm" data-testid="button-withdraw-interest">
                <ArrowDownToLine className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Withdraw</span>
              </Button>
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Interest accrues daily on Soil vaults. Use Withdraw to move earned interest to your wallet or bank when ready. Your principal stays locked and protected.
          </p>
        </CardContent>
      </Card>

      {rlusdBalance === 0 && xrpBalance < 1 && (
        <Card className="border-border/50">
          <CardContent className="py-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h3 className="text-base font-semibold" data-testid="text-get-rlusd-heading">
                  Get RLUSD to Start Earning
                </h3>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Buy RLUSD on an exchange, withdraw to your wallet, then deposit into a Soil vault for 5.2–8.0% APR.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={AFFILIATE_LINKS.binance} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-[#F0B90B] text-black hover:bg-[#F0B90B]/90" size="sm" data-testid="link-buy-binance">
                    Binance <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </a>
                <a href={AFFILIATE_LINKS.kraken} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-[#7B61FF] text-white hover:bg-[#7B61FF]/90" size="sm" data-testid="link-buy-kraken">
                    Kraken <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </a>
                <a href={AFFILIATE_LINKS.coinbase} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-[#0052FF] text-white hover:bg-[#0052FF]/90" size="sm" data-testid="link-buy-coinbase">
                    Coinbase <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </a>
                <a href={AFFILIATE_LINKS.uphold} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" data-testid="link-buy-uphold">
                    Uphold <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </a>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Affiliate links — we may earn a referral reward at no extra cost to you.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">
            <Users className="h-4 w-4 inline mr-2" />
            Refer a Friend
          </CardTitle>
          <Link href="/ownbank/referrals">
            <Button variant="ghost" size="sm" data-testid="link-view-referrals">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Share this link with friends — when they sign up and deposit RLUSD, you both earn bonus SEED points.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <code
                className="flex-1 min-w-0 truncate rounded-md bg-muted px-3 py-2 text-sm font-mono"
                data-testid="text-referral-link"
              >
                {referralLink || `${SITE_DOMAIN}/?ref=...`}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReferral}
                data-testid="button-copy-referral"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {typeof navigator !== "undefined" && navigator.share && (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-[#00A4E4] text-white"
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: "CryptoOwnBank — Earn Yield on RLUSD",
                        text: "Earn 5–8% fixed yield on RLUSD with full self-custody. No KYC, no seed phrases — just connect your cold wallet and start earning.",
                        url: referralLink || `${SITE_DOMAIN}`,
                      });
                    } catch {}
                  }}
                  data-testid="button-native-share"
                >
                  <Share2 className="h-4 w-4 mr-1.5" />
                  Share via SMS / Message
                </Button>
              )}
              <SocialShare
                url={referralLink || `${SITE_DOMAIN}`}
                text="Earn 5–8% fixed yield on RLUSD with full self-custody. No KYC, no seed phrases — just connect your cold wallet and start earning."
                buttonLabel="Share on Social"
                buttonSize="sm"
                data-testid="button-share-social"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Collapsible open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
        <Card style={{ borderColor: "#00A4E425" }}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-[#00A4E4]" />
                  How CryptoOwnBank Works with Your Wallets
                </span>
                {howItWorksOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-5 pt-0">
              <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: "#00A4E430", backgroundColor: "#00A4E408" }}>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <SiRipple className="h-4 w-4 text-[#00A4E4]" />
                  The Big Picture
                </p>
                <p className="text-sm text-muted-foreground">
                  CryptoOwnBank is your <span className="font-medium text-foreground">dashboard and command center</span>.
                  Xaman (XRPL) and LOBSTR (Stellar) are your <span className="font-medium text-foreground">signing wallets</span>.
                  We build the transaction — your wallet app approves and signs it. Your keys never leave your wallet.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">How Signing Works</p>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-3 items-start">
                    <Badge className="shrink-0 text-xs text-white mt-0.5" style={{ backgroundColor: "#00A4E4" }}>1</Badge>
                    <p>You set up a yield deposit, trade, or payment on CryptoOwnBank</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Badge className="shrink-0 text-xs text-white mt-0.5" style={{ backgroundColor: "#00A4E4" }}>2</Badge>
                    <p>CryptoOwnBank opens <span className="font-medium text-foreground">Xaman</span> with the transaction details</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Badge className="shrink-0 text-xs text-white mt-0.5" style={{ backgroundColor: "#00A4E4" }}>3</Badge>
                    <p>You review and <span className="font-medium text-foreground">approve in Xaman</span> — this is the "sign off"</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Badge className="shrink-0 text-xs text-white mt-0.5" style={{ backgroundColor: "#00A4E4" }}>4</Badge>
                    <p>The transaction goes through on the XRP Ledger, and CryptoOwnBank shows your updated balance</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Xaman (Phone App) — Your Signing Wallet for XRPL</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                  <li>Xaman signs yield deposits, DEX trades, and payments that you set up here</li>
                  <li>Works automatically — CryptoOwnBank opens Xaman when you need to approve something</li>
                  <li>You can import multiple XRP addresses into Xaman and switch between them</li>
                </ul>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Cold Wallets (Ledger Nano X, etc.)</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                  <li><span className="font-medium text-foreground">Connect directly:</span> Use the "Connect Ledger" button above to sign with your hardware wallet</li>
                  <li><span className="font-medium text-foreground">Tracking only:</span> Add the public address in Wallets & Addresses to see balances in your portfolio</li>
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
                    <Zap className="h-4 w-4 shrink-0 mt-0.5 text-[#00A4E4]" />
                    <p><span className="font-medium text-foreground">Xaman / LOBSTR = Debit card</span> — load what you need to spend, use conveniently from your phone</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Globe className="h-4 w-4 shrink-0 mt-0.5 text-[#00A4E4]" />
                    <p><span className="font-medium text-foreground">CryptoOwnBank = Banking app</span> — see all accounts in one place, make transactions with your "debit card"</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Send what you want to actively use from your cold wallet to Xaman/LOBSTR. If your phone is compromised, you only risk what's on it — your cold wallet savings stay safe. You can always load more when needed.
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
                  Every transaction must be approved and signed in your own wallet app (Xaman, Ledger, LOBSTR, etc.).
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <XrplDisclaimer />
    </div>
  );
}
