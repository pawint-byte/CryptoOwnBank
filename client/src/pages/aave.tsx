import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SeoHead } from "@/components/seo-head";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import {
  useEvmWallet,
  EVM_CHAINS,
  shortenAddress,
  getExplorerTxUrl,
} from "@/lib/evm-wallet";
import {
  AAVE_CHAIN_IDS,
  AAVE_ASSETS,
  type AaveChainId,
  type AaveAsset,
  type UserAssetPosition,
  type AccountSummary,
  fetchUserAssetPositions,
  fetchUserAccountSummary,
  fetchAllowance,
  sendApprove,
  sendSupply,
  sendWithdraw,
  sendBorrow,
  sendRepay,
  formatAmount,
  parseAmount,
  formatApy,
  formatHealthFactor,
  healthFactorColor,
  MAX_UINT256,
} from "@/lib/aave";

type ActionKind = "supply" | "withdraw" | "borrow" | "repay";

const CHAIN_LABEL: Record<AaveChainId, string> = {
  1: "Ethereum",
  8453: "Base",
  42161: "Arbitrum",
  137: "Polygon",
};

export default function AavePage() {
  const { user } = useAuth() as any;
  const { toast } = useToast();
  const {
    address,
    chainId,
    isConnected,
    isConnecting,
    connect,
    connectWalletConnect,
    disconnect,
    switchChain,
    walletProvider,
    error: walletError,
  } = useEvmWallet();

  const { data: subscription } = useQuery<any>({ queryKey: ["/api/subscription/status"] });
  const isPro = subscription?.tier === "pro";

  const [selectedChain, setSelectedChain] = useState<AaveChainId>(8453);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionKind, setActionKind] = useState<ActionKind>("supply");
  const [actionAsset, setActionAsset] = useState<AaveAsset | null>(null);
  const [actionPosition, setActionPosition] = useState<UserAssetPosition | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [isMaxAmount, setIsMaxAmount] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isConnected && chainId && (AAVE_CHAIN_IDS as readonly number[]).includes(chainId)) {
      setSelectedChain(chainId as AaveChainId);
    }
  }, [isConnected, chainId]);

  const positionsQ = useQuery<UserAssetPosition[]>({
    queryKey: ["aave-positions", selectedChain, address],
    queryFn: () => fetchUserAssetPositions(selectedChain, address!),
    enabled: isConnected && !!address,
    refetchInterval: 60_000,
  });

  const summaryQ = useQuery<AccountSummary>({
    queryKey: ["aave-summary", selectedChain, address],
    queryFn: () => fetchUserAccountSummary(selectedChain, address!),
    enabled: isConnected && !!address,
    refetchInterval: 60_000,
  });

  const marketRows = useMemo(() => {
    if (positionsQ.data) return positionsQ.data;
    return AAVE_ASSETS[selectedChain].map(asset => ({
      asset,
      walletBalance: 0n,
      supplied: 0n,
      borrowed: 0n,
      supplyApy: 0,
      variableBorrowApy: 0,
      aTokenAddress: "",
      variableDebtTokenAddress: "",
    } as UserAssetPosition));
  }, [positionsQ.data, selectedChain]);

  const userSupplied = useMemo(() => marketRows.filter(p => p.supplied > 0n), [marketRows]);
  const userBorrowed = useMemo(() => marketRows.filter(p => p.borrowed > 0n), [marketRows]);

  function openAction(kind: ActionKind, position: UserAssetPosition) {
    setActionKind(kind);
    setActionAsset(position.asset);
    setActionPosition(position);
    setAmountInput("");
    setIsMaxAmount(false);
    setTxHash(null);
    setActionOpen(true);
  }

  async function handleAction() {
    if (!actionAsset || !actionPosition || !address) return;
    const amount = parseAmount(amountInput, actionAsset.decimals);
    if (amount === 0n) {
      toast({ title: "Enter an amount", variant: "destructive" });
      return;
    }
    setBusy(true);
    setTxHash(null);
    try {
      if (actionKind === "supply" || actionKind === "repay") {
        const allowance = await fetchAllowance(selectedChain, actionAsset.address, address);
        if (allowance < amount) {
          toast({ title: "Approving token", description: "Sign the approval in your wallet (step 1 of 2)." });
          const approveHash = await sendApprove(selectedChain, actionAsset.address, amount, address);
          toast({ title: "Approval submitted", description: `Tx: ${shortenAddress(approveHash)}` });
          const provider = await import("ethers").then(m => new m.ethers.JsonRpcProvider(EVM_CHAINS[selectedChain].rpcUrl));
          await provider.waitForTransaction(approveHash, 1, 120_000).catch(() => null);
        }
      }
      let hash = "";
      const sentinel = (actionKind === "withdraw" || actionKind === "repay") && isMaxAmount ? MAX_UINT256 : amount;
      if (actionKind === "supply") hash = await sendSupply(selectedChain, actionAsset.address, amount, address);
      else if (actionKind === "withdraw") hash = await sendWithdraw(selectedChain, actionAsset.address, sentinel, address);
      else if (actionKind === "borrow") hash = await sendBorrow(selectedChain, actionAsset.address, amount, address);
      else if (actionKind === "repay") hash = await sendRepay(selectedChain, actionAsset.address, sentinel, address);
      setTxHash(hash);
      toast({ title: `${labelOf(actionKind)} submitted`, description: `Tx: ${shortenAddress(hash)}` });
      setTimeout(() => { positionsQ.refetch(); summaryQ.refetch(); }, 5000);
    } catch (e: any) {
      const msg = e?.message || "Transaction failed";
      toast({ title: `${labelOf(actionKind)} failed`, description: msg.slice(0, 200), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <SeoHead title="Aave Hub — CryptoOwnBank" description="Supply, borrow, repay, and withdraw on Aave v3 from your own wallet." />
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold">Sign in to access the Aave Hub</h1>
            <Link href="/api/login"><Button data-testid="button-signin">Sign in</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <SeoHead title="Aave Hub — CryptoOwnBank" description="Supply, borrow, repay, and withdraw on Aave v3 from your own wallet." />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Aave Hub</h1>
          <p className="text-muted-foreground mt-1">
            Use Aave v3 directly from CryptoOwnBank — supply for yield, borrow against collateral, all signed by your own wallet.
          </p>
        </div>
        <UpgradePrompt
          feature="The Aave Hub is a Pro feature. Supply, borrow, repay, and withdraw on Aave v3 across Ethereum, Base, Arbitrum, and Polygon — never leaving CryptoOwnBank. Every transaction is signed by your own wallet. We never hold your keys or your funds."
          variant="pro"
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <SeoHead title="Aave Hub — CryptoOwnBank" description="Supply, borrow, repay, and withdraw on Aave v3 from your own wallet." />

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Aave Hub</h1>
            <Badge variant="outline" data-testid="badge-powered-by">Powered by Aave v3</Badge>
          </div>
          <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
            Supply for yield, borrow against collateral. Your wallet, your keys, your signatures — we never touch your funds.
          </p>
        </div>
      </div>

      <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-6 flex gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium">Borrowing risk — read before you borrow.</p>
            <p className="text-muted-foreground">
              If your collateral value falls or your debt grows, Aave will liquidate part of your position to repay lenders. You will lose collateral plus a liquidation penalty. Keep your health factor well above 1.0 — most safe borrowers stay above 1.8. Liquidations have happened to careful, experienced users in fast-moving markets. This page is a UI to a public, audited protocol. CryptoOwnBank does not provide financial, legal, or tax advice.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-wallet">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isConnected ? (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={connect} disabled={isConnecting} data-testid="button-connect-metamask">
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Connect MetaMask
              </Button>
              <Button onClick={connectWalletConnect} disabled={isConnecting} variant="outline" data-testid="button-connect-walletconnect">
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                WalletConnect (mobile)
              </Button>
              {walletError ? <p className="text-sm text-destructive w-full">{walletError}</p> : null}
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" data-testid="badge-wallet-address">{shortenAddress(address!)}</Badge>
              <Badge data-testid="badge-wallet-provider">{walletProvider === "metamask" ? "MetaMask" : "WalletConnect"}</Badge>
              <Select
                value={String(selectedChain)}
                onValueChange={(v) => {
                  const id = Number(v) as AaveChainId;
                  setSelectedChain(id);
                  if (chainId !== id) switchChain(id);
                }}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-chain">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AAVE_CHAIN_IDS.map(id => (
                    <SelectItem key={id} value={String(id)} data-testid={`option-chain-${id}`}>{CHAIN_LABEL[id]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {chainId !== selectedChain ? (
                <Badge variant="destructive" data-testid="badge-chain-mismatch">Switch wallet to {CHAIN_LABEL[selectedChain]}</Badge>
              ) : null}
              <Button variant="ghost" size="sm" onClick={disconnect} data-testid="button-disconnect">Disconnect</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isConnected && summaryQ.data ? (
        <Card data-testid="card-account-summary">
          <CardHeader><CardTitle>Account on {CHAIN_LABEL[selectedChain]}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Collateral" value={`$${summaryQ.data.totalCollateralUsd.toFixed(2)}`} testId="stat-collateral" />
              <Stat label="Borrowed" value={`$${summaryQ.data.totalDebtUsd.toFixed(2)}`} testId="stat-debt" />
              <Stat label="Available to borrow" value={`$${summaryQ.data.availableBorrowsUsd.toFixed(2)}`} testId="stat-available" />
              <Stat
                label="Health factor"
                value={formatHealthFactor(summaryQ.data.healthFactor)}
                valueClass={healthFactorColor(summaryQ.data.healthFactor)}
                testId="stat-health"
              />
            </div>
            {summaryQ.data.totalDebtUsd > 0 && summaryQ.data.healthFactor < 1.5 ? (
              <div className="mt-4 flex items-start gap-2 text-sm text-orange-600 dark:text-orange-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Your health factor is low. Consider repaying debt or supplying more collateral to reduce liquidation risk.</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="positions" data-testid="tabs-aave">
        <TabsList>
          <TabsTrigger value="positions" data-testid="tab-positions">Your positions</TabsTrigger>
          <TabsTrigger value="markets" data-testid="tab-markets">Markets</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4 mt-4">
          {!isConnected ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Connect your wallet to see your Aave positions.</CardContent></Card>
          ) : positionsQ.isLoading ? (
            <Card><CardContent className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></CardContent></Card>
          ) : (
            <>
              <Card data-testid="card-supplied">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Supplied</CardTitle>
                  <CardDescription>Assets you've deposited. Earning interest, usable as collateral.</CardDescription>
                </CardHeader>
                <CardContent>
                  {userSupplied.length === 0 ? (
                    <p className="text-sm text-muted-foreground">You haven't supplied any assets yet on {CHAIN_LABEL[selectedChain]}.</p>
                  ) : (
                    <div className="space-y-2">
                      {userSupplied.map(p => (
                        <PositionRow key={p.asset.address} p={p} kind="supplied" onAction={openAction} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-borrowed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5" /> Borrowed</CardTitle>
                  <CardDescription>Debt against your collateral. Interest accrues every block.</CardDescription>
                </CardHeader>
                <CardContent>
                  {userBorrowed.length === 0 ? (
                    <p className="text-sm text-muted-foreground">You haven't borrowed anything on {CHAIN_LABEL[selectedChain]}.</p>
                  ) : (
                    <div className="space-y-2">
                      {userBorrowed.map(p => (
                        <PositionRow key={p.asset.address} p={p} kind="borrowed" onAction={openAction} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="markets" className="mt-4">
          <Card data-testid="card-markets">
            <CardHeader>
              <CardTitle>{CHAIN_LABEL[selectedChain]} markets</CardTitle>
              <CardDescription>Live rates from the Aave v3 Pool contract. Updated every minute.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-4">Asset</th>
                      <th className="py-2 pr-4 text-right">Supply APY</th>
                      <th className="py-2 pr-4 text-right">Borrow APY</th>
                      <th className="py-2 pr-4 text-right">Wallet</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketRows.map(p => (
                      <tr key={p.asset.address} className="border-b last:border-0" data-testid={`row-market-${p.asset.symbol}`}>
                        <td className="py-3 pr-4 font-medium">{p.asset.symbol}</td>
                        <td className="py-3 pr-4 text-right text-green-600 dark:text-green-400" data-testid={`text-supply-apy-${p.asset.symbol}`}>{formatApy(p.supplyApy)}</td>
                        <td className="py-3 pr-4 text-right text-orange-600 dark:text-orange-400" data-testid={`text-borrow-apy-${p.asset.symbol}`}>{p.asset.isBorrowable ? formatApy(p.variableBorrowApy) : "—"}</td>
                        <td className="py-3 pr-4 text-right text-muted-foreground" data-testid={`text-wallet-balance-${p.asset.symbol}`}>{isConnected ? formatAmount(p.walletBalance, p.asset.decimals) : "—"}</td>
                        <td className="py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" disabled={!isConnected} onClick={() => openAction("supply", p)} data-testid={`button-supply-${p.asset.symbol}`}>Supply</Button>
                            {p.asset.isBorrowable ? (
                              <Button size="sm" variant="outline" disabled={!isConnected} onClick={() => openAction("borrow", p)} data-testid={`button-borrow-${p.asset.symbol}`}>Borrow</Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-center">
        CryptoOwnBank is not affiliated with or endorsed by Aave Companies or the Aave DAO. Aave is a public, open-source protocol; this page builds transactions your wallet signs directly.
      </p>

      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="dialog-action-title">{labelOf(actionKind)} {actionAsset?.symbol}</DialogTitle>
            <DialogDescription>
              {actionKind === "supply" && "Deposit into Aave. Earns interest. Counts as collateral."}
              {actionKind === "withdraw" && "Withdraw from Aave back to your wallet."}
              {actionKind === "borrow" && "Borrow against your supplied collateral. Watch your health factor."}
              {actionKind === "repay" && "Repay debt to free up collateral and reduce interest."}
            </DialogDescription>
          </DialogHeader>

          {actionAsset && actionPosition ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">In wallet</p>
                  <p className="font-medium" data-testid="text-dialog-wallet">{formatAmount(actionPosition.walletBalance, actionAsset.decimals)} {actionAsset.symbol}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{actionKind === "withdraw" || actionKind === "supply" ? "Supplied" : "Borrowed"}</p>
                  <p className="font-medium" data-testid="text-dialog-position">
                    {formatAmount(actionKind === "withdraw" || actionKind === "supply" ? actionPosition.supplied : actionPosition.borrowed, actionAsset.decimals)} {actionAsset.symbol}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{actionKind === "borrow" || actionKind === "repay" ? "Borrow APY" : "Supply APY"}</p>
                  <p className="font-medium">{formatApy(actionKind === "borrow" || actionKind === "repay" ? actionPosition.variableBorrowApy : actionPosition.supplyApy)}</p>
                </div>
                {summaryQ.data ? (
                  <div>
                    <p className="text-muted-foreground">Health factor</p>
                    <p className={`font-medium ${healthFactorColor(summaryQ.data.healthFactor)}`}>{formatHealthFactor(summaryQ.data.healthFactor)}</p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Amount</label>
                <div className="flex gap-2">
                  <Input
                    value={amountInput}
                    onChange={(e) => { setAmountInput(e.target.value); setIsMaxAmount(false); }}
                    placeholder="0.0"
                    inputMode="decimal"
                    data-testid="input-amount"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!actionAsset || !actionPosition) return;
                      const max =
                        actionKind === "supply" ? actionPosition.walletBalance :
                        actionKind === "withdraw" ? actionPosition.supplied :
                        actionKind === "repay" ? (actionPosition.walletBalance < actionPosition.borrowed ? actionPosition.walletBalance : actionPosition.borrowed) :
                        0n;
                      setAmountInput(formatAmount(max, actionAsset.decimals, 18));
                      setIsMaxAmount(actionKind === "withdraw" || actionKind === "repay");
                    }}
                    disabled={actionKind === "borrow"}
                    data-testid="button-max"
                  >MAX</Button>
                </div>
                {actionKind === "borrow" && summaryQ.data ? (
                  <p className="text-xs text-muted-foreground">Available to borrow across all collateral: ~${summaryQ.data.availableBorrowsUsd.toFixed(2)}. Borrow well under the max to keep your health factor safe.</p>
                ) : null}
              </div>

              {actionKind === "borrow" ? (
                <div className="rounded-md border border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-3 text-sm flex gap-2">
                  <ShieldAlert className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                  <span>Borrowing creates liquidation risk. If your health factor drops to 1.0, Aave will sell part of your collateral plus a penalty.</span>
                </div>
              ) : null}

              {txHash ? (
                <a
                  href={getExplorerTxUrl(selectedChain, txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary inline-flex items-center gap-1"
                  data-testid="link-tx"
                >View transaction <ExternalLink className="h-3 w-3" /></a>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionOpen(false)} data-testid="button-cancel">Cancel</Button>
            <Button onClick={handleAction} disabled={busy || !amountInput} data-testid="button-confirm-action">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {labelOf(actionKind)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function labelOf(k: ActionKind): string {
  return { supply: "Supply", withdraw: "Withdraw", borrow: "Borrow", repay: "Repay" }[k];
}

function Stat({ label, value, valueClass, testId }: { label: string; value: string; valueClass?: string; testId: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${valueClass || ""}`} data-testid={testId}>{value}</p>
    </div>
  );
}

function PositionRow({ p, kind, onAction }: { p: UserAssetPosition; kind: "supplied" | "borrowed"; onAction: (kind: ActionKind, p: UserAssetPosition) => void }) {
  const amount = kind === "supplied" ? p.supplied : p.borrowed;
  const apy = kind === "supplied" ? p.supplyApy : p.variableBorrowApy;
  return (
    <div className="flex items-center justify-between gap-2 p-3 rounded-md border" data-testid={`row-${kind}-${p.asset.symbol}`}>
      <div className="min-w-0">
        <p className="font-medium">{p.asset.symbol}</p>
        <p className="text-xs text-muted-foreground">{formatAmount(amount, p.asset.decimals)} · {formatApy(apy)} APY</p>
      </div>
      <div className="flex gap-1 shrink-0">
        {kind === "supplied" ? (
          <Button size="sm" variant="outline" onClick={() => onAction("withdraw", p)} data-testid={`button-withdraw-${p.asset.symbol}`}>
            <ArrowDownLeft className="h-3 w-3 mr-1" /> Withdraw
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onAction("repay", p)} data-testid={`button-repay-${p.asset.symbol}`}>
            <ArrowUpRight className="h-3 w-3 mr-1" /> Repay
          </Button>
        )}
      </div>
    </div>
  );
}
