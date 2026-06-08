import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { useEvmWallet, EVM_CHAINS, shortenAddress, getExplorerTxUrl } from "@/lib/evm-wallet";
import {
  scanChainApprovals,
  revokeApproval,
  getAllowance,
  formatTokenAmount,
  DEFAULT_SCAN_CHAINS,
  EXTRA_SCAN_CHAINS,
  type ChainScanResult,
  type TokenApproval,
} from "@/lib/token-approvals";
import {
  ShieldAlert,
  ShieldCheck,
  Wallet,
  Search,
  ExternalLink,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Info,
  Eye,
  Radar,
  PenLine,
} from "lucide-react";

function chainName(chainId: number): string {
  return EVM_CHAINS[chainId]?.name || `Chain ${chainId}`;
}

function explorerAddressUrl(chainId: number, address: string): string {
  const chain = EVM_CHAINS[chainId];
  if (!chain) return "#";
  return `${chain.explorerUrl}/address/${address}`;
}

interface ApprovalRowProps {
  approval: TokenApproval;
  owner: string;
  revoked: boolean;
  onRevoked: (id: string) => void;
}

function ApprovalRow({ approval, owner, revoked, onRevoked }: ApprovalRowProps) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  async function handleRevoke() {
    setPending(true);
    try {
      const hash = await revokeApproval(approval.chainId, approval.token, approval.spender, owner);
      toast({
        title: "Revoke sent",
        description: "Waiting for the network to confirm…",
      });
      // Poll the allowance until it reads zero (or give up after a while).
      let confirmed = false;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const current = await getAllowance(approval.chainId, approval.token, owner, approval.spender);
          if (current <= 0n) {
            confirmed = true;
            break;
          }
        } catch {
          /* keep polling */
        }
      }
      if (confirmed) {
        onRevoked(approval.id);
        toast({
          title: "Permission revoked",
          description: `${approval.tokenSymbol} approval to this contract is now zero.`,
        });
      } else {
        toast({
          title: "Revoke submitted",
          description: (
            <span>
              It may still be confirming.{" "}
              <a
                href={getExplorerTxUrl(approval.chainId, hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View on explorer
              </a>
            </span>
          ),
        });
      }
    } catch (err: any) {
      toast({
        title: "Couldn't revoke",
        description: err?.message || "The transaction was rejected or failed.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3"
      data-testid={`row-approval-${approval.id}`}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium" data-testid={`text-token-${approval.id}`}>
            {approval.tokenSymbol}
          </span>
          {approval.isUnlimited ? (
            <Badge variant="destructive" className="text-xs gap-1" data-testid={`badge-unlimited-${approval.id}`}>
              <AlertTriangle className="h-3 w-3" /> Unlimited
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Limited
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Approved spender:{" "}
          <a
            href={explorerAddressUrl(approval.chainId, approval.spender)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-0.5"
            data-testid={`link-spender-${approval.id}`}
          >
            {approval.spenderLabel || shortenAddress(approval.spender)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
        <p className="text-xs text-muted-foreground" data-testid={`text-atrisk-${approval.id}`}>
          {approval.isUnlimited ? (
            <>Can move your entire {approval.tokenSymbol} balance ({formatTokenAmount(approval.walletBalance, approval.tokenDecimals)} held)</>
          ) : (
            <>Can move up to {formatTokenAmount(approval.allowance, approval.tokenDecimals)} {approval.tokenSymbol} ({formatTokenAmount(approval.atRisk, approval.tokenDecimals)} at risk now)</>
          )}
        </p>
      </div>
      <div className="shrink-0">
        {revoked ? (
          <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" data-testid={`badge-revoked-${approval.id}`}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Revoked
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleRevoke}
            disabled={pending}
            data-testid={`button-revoke-${approval.id}`}
          >
            {pending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-1.5" />}
            {pending ? "Revoking…" : "Revoke"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function WalletSecurity() {
  const { user } = useAuth();
  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  const tier = subscriptionData?.tier || (user as any)?.subscriptionTier || "free";
  const isAdmin = (user as any)?.isAdmin === true;
  const hasPremium = isAdmin || tier === "premium" || tier === "pro" || tier === "premium_annual";

  const { address, isConnected, isConnecting, error, connect, connectWalletConnect, disconnect } = useEvmWallet();

  const [selectedChains, setSelectedChains] = useState<number[]>([...DEFAULT_SCAN_CHAINS]);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ChainScanResult[] | null>(null);
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.title = "Wallet Security Center — Revoke Risky Approvals | CryptoOwnBank";
  }, []);

  function toggleChain(chainId: number) {
    setSelectedChains((prev) =>
      prev.includes(chainId) ? prev.filter((c) => c !== chainId) : [...prev, chainId],
    );
  }

  async function handleScan() {
    if (!address || selectedChains.length === 0) return;
    setScanning(true);
    setResults(null);
    setRevokedIds(new Set());
    try {
      const scans = await Promise.all(selectedChains.map((c) => scanChainApprovals(c, address)));
      setResults(scans.sort((a, b) => a.chainId - b.chainId));
    } finally {
      setScanning(false);
    }
  }

  function markRevoked(id: string) {
    setRevokedIds((prev) => new Set(prev).add(id));
  }

  const summary = useMemo(() => {
    if (!results) return null;
    let open = 0;
    let unlimited = 0;
    let scanned = 0;
    let failed = 0;
    for (const r of results) {
      if (r.ok) scanned++;
      else failed++;
      for (const a of r.approvals) {
        if (revokedIds.has(a.id)) continue;
        open++;
        if (a.isUnlimited) unlimited++;
      }
    }
    return { open, unlimited, scanned, failed };
  }, [results, revokedIds]);

  if (!hasPremium) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Wallet Security Center</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
            See every contract permission your wallet has handed out — and shut down the risky ones with one click.
          </p>
        </div>
        <UpgradePrompt
          feature="The Wallet Security Center scans your wallet for open token approvals — the silent permissions that let apps move your tokens — and lets you revoke the risky ones. You sign every transaction; we never touch your funds."
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <ShieldCheck className="h-6 w-6 text-[#00A4E4]" />
          Wallet Security Center
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
          Every time you use a DeFi app, you give its contract permission to move a token. Those permissions stay open
          forever — and stale ones are a top way wallets get drained. Scan yours, then revoke anything you don't recognize.
        </p>
      </div>

      {/* How it works — scan, explain, route, sign */}
      <Card className="border-[#00A4E4]/30 bg-[#00A4E4]/5 dark:bg-[#00A4E4]/10" data-testid="card-how-it-works">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <Radar className="h-4 w-4 text-[#00A4E4] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">We scan</p>
                <p className="text-xs text-muted-foreground">Read-only. We look up the permissions on the public blockchain — no transactions, nothing signed.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Eye className="h-4 w-4 text-[#00A4E4] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">We explain</p>
                <p className="text-xs text-muted-foreground">Each row shows which app can move which token, and how much is at risk. "Unlimited" gets a red flag.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <PenLine className="h-4 w-4 text-[#00A4E4] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">You sign</p>
                <p className="text-xs text-muted-foreground">Revoke builds a normal transaction in your own wallet. You approve it. We never hold a key or your funds.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet connect */}
      <Card data-testid="card-wallet">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Your wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isConnected && address ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium" data-testid="text-connected-address">{shortenAddress(address)}</p>
                <p className="text-xs text-muted-foreground">Connected</p>
              </div>
              <Button variant="outline" size="sm" onClick={disconnect} data-testid="button-disconnect">
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect the wallet you want to check. We only read its public address.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={connect} disabled={isConnecting} data-testid="button-connect-metamask">
                  {isConnecting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Wallet className="h-4 w-4 mr-1.5" />}
                  Connect MetaMask
                </Button>
                <Button variant="outline" onClick={connectWalletConnect} disabled={isConnecting} data-testid="button-connect-walletconnect">
                  WalletConnect
                </Button>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400" data-testid="text-wallet-error">{error}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chain selection + scan */}
      {isConnected && address && (
        <Card data-testid="card-scan">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Choose networks to scan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Recommended networks (on by default):</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_SCAN_CHAINS.map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant={selectedChains.includes(c) ? "default" : "outline"}
                    onClick={() => toggleChain(c)}
                    data-testid={`button-chain-${c}`}
                  >
                    {selectedChains.includes(c) && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                    {chainName(c)}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Scan deeper (slower on free connections):</p>
              <div className="flex flex-wrap gap-2">
                {EXTRA_SCAN_CHAINS.map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant={selectedChains.includes(c) ? "default" : "outline"}
                    onClick={() => toggleChain(c)}
                    data-testid={`button-chain-${c}`}
                  >
                    {selectedChains.includes(c) && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                    {chainName(c)}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleScan}
              disabled={scanning || selectedChains.length === 0}
              data-testid="button-scan"
            >
              {scanning ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Radar className="h-4 w-4 mr-1.5" />}
              {scanning ? "Scanning…" : "Scan my approvals"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {scanning && (
        <Card data-testid="card-scanning">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#00A4E4]" />
            <p className="text-sm text-muted-foreground">
              Reading the public history of your wallet across {selectedChains.length} network{selectedChains.length === 1 ? "" : "s"}. This can take a minute.
            </p>
          </CardContent>
        </Card>
      )}

      {results && summary && (
        <div className="space-y-4" data-testid="results">
          <Card data-testid="card-summary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {summary.open === 0 ? (
                  <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <div>
                  <p className="font-semibold" data-testid="text-summary">
                    {summary.open === 0
                      ? "No open approvals found 🎉"
                      : `${summary.open} open approval${summary.open === 1 ? "" : "s"} — ${summary.unlimited} unlimited`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scanned {summary.scanned} network{summary.scanned === 1 ? "" : "s"}
                    {summary.failed > 0 ? ` · ${summary.failed} couldn't be fully read right now` : ""}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {results.map((r) => {
            const visible = r.approvals.filter((a) => !revokedIds.has(a.id));
            return (
              <Card key={r.chainId} data-testid={`card-chain-result-${r.chainId}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{chainName(r.chainId)}</span>
                    {!r.ok ? (
                      <Badge variant="outline" className="text-amber-600 dark:text-amber-400">Couldn't scan</Badge>
                    ) : r.partial ? (
                      <Badge variant="outline" className="text-amber-600 dark:text-amber-400" data-testid={`badge-partial-${r.chainId}`}>
                        {visible.length} found · partial
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{visible.length} open</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {r.ok && r.partial && (
                    <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400" data-testid={`text-chain-partial-${r.chainId}`}>
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>Partial scan — the free connection only returned recent history, so older approvals may not show. Try scanning this network again on its own for a fuller view.</span>
                    </div>
                  )}
                  {!r.ok ? (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground" data-testid={`text-chain-error-${r.chainId}`}>
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>The free connection for this network wouldn't return the full history right now. Try scanning it again in a moment.</span>
                    </div>
                  ) : visible.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid={`text-chain-clean-${r.chainId}`}>
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span>No open approvals on {chainName(r.chainId)}.</span>
                    </div>
                  ) : (
                    visible.map((a) => (
                      <ApprovalRow
                        key={a.id}
                        approval={a}
                        owner={address!}
                        revoked={revokedIds.has(a.id)}
                        onRevoked={markRevoked}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Honest caveats */}
      <Card data-testid="card-caveats">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="text-sm font-medium text-foreground">Good to know</p>
              <p>
                <strong>The scan is read-only.</strong> Revoking is a normal blockchain transaction you sign in your own
                wallet, and it costs a small network fee (gas). CryptoOwnBank never holds your keys or your funds.
              </p>
              <p>
                <strong>Free connections have limits.</strong> We use public network connections, so a very busy wallet or
                a busy network may not return its full history in one pass. If a network says "couldn't scan," try again,
                or scan fewer networks at once.
              </p>
              <p>
                This tool covers standard tokens (ERC-20). It does not yet cover NFT approvals. Revoking a permission does
                not move or affect the tokens themselves — it only takes back the app's ability to move them later.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#00A4E4]/20 bg-[#00A4E4]/5">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <ShieldCheck className="h-8 w-8 text-[#00A4E4] shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Want to put your wallet to work safely?</h3>
              <p className="text-sm text-muted-foreground">
                Once you've cleaned up old permissions, explore non-custodial lending and borrowing — you still sign every move.
              </p>
            </div>
            <Link href="/aave" data-testid="link-aave-hub">
              <Button variant="outline">Open Aave Hub</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
