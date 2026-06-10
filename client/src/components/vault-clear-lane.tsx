import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  CheckCircle2,
  Lock,
  Loader2,
  ArrowRight,
  Wallet,
  PenLine,
  ShieldCheck,
  Coins,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useXrplStore } from "@/lib/xrpl-store";
import { getAccountTrustlines } from "@/lib/xrpl-client";
import { isWebUSBSupported, signTrustSetWithLedger } from "@/lib/ledger-connector";
import { signTrustSet } from "@/lib/xumm-connector";
import { RLUSD } from "@/lib/constants";

type LightStatus = "ready" | "action" | "locked";

interface StepView {
  id: string;
  icon: typeof Wallet;
  title: string;
  detail: string;
  status: LightStatus;
  action?: React.ReactNode;
}

const dot: Record<LightStatus, string> = {
  ready: "bg-emerald-500 border-emerald-500",
  action: "bg-amber-400 border-amber-400 animate-pulse",
  locked: "bg-transparent border-muted-foreground/30",
};

const ring: Record<LightStatus, string> = {
  ready: "border-emerald-500/30 bg-emerald-500/5",
  action: "border-amber-400/40 bg-amber-400/5",
  locked: "border-border bg-muted/20 opacity-70",
};

const titleColor: Record<LightStatus, string> = {
  ready: "text-emerald-700 dark:text-emerald-300",
  action: "text-amber-700 dark:text-amber-300",
  locked: "text-muted-foreground",
};

function StatusIcon({ status }: { status: LightStatus }) {
  if (status === "ready")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (status === "action")
    return <ArrowRight className="h-4 w-4 text-amber-500 shrink-0" />;
  return <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />;
}

/**
 * The "clear lane": progressive prerequisite lights for a SOIL/RLUSD deposit.
 * Green = ready, amber = your move, grey = locked. Everything is read from real
 * wallet state — no faking. Tells the honest truth per device so a member never
 * hits a dead end (e.g. Ledger on a phone routes them to Xaman).
 */
export function VaultClearLane({
  vaultName,
}: {
  vaultName: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected, walletAddress, walletType, rlusdBalance } = useXrplStore();

  const [hasUsb, setHasUsb] = useState(false);
  const [settingTrust, setSettingTrust] = useState(false);

  useEffect(() => {
    isWebUSBSupported().then(setHasUsb).catch(() => setHasUsb(false));
  }, []);

  const { data: trustlines, refetch: refetchTrust } = useQuery({
    queryKey: ["xrpl-trustlines", walletAddress],
    queryFn: () => getAccountTrustlines(walletAddress!),
    enabled: isConnected && !!walletAddress,
    staleTime: 30_000,
  });

  const hasRlusdTrust =
    rlusdBalance > 0 ||
    !!trustlines?.some(
      (t) => t.currency === "RLUSD" && t.issuer === RLUSD.issuer,
    );
  const hasRlusd = rlusdBalance > 0;

  // Can the connected wallet actually sign an RLUSD (IOU) payment on this device?
  const ledgerOnMobile = walletType === "ledger" && !hasUsb;
  const signerReady =
    isConnected && (walletType === "xumm" || (walletType === "ledger" && hasUsb));

  async function handleSetTrust() {
    if (!walletAddress) return;
    setSettingTrust(true);
    try {
      const result =
        walletType === "ledger"
          ? await signTrustSetWithLedger(RLUSD.currency, RLUSD.issuer, walletAddress)
          : await signTrustSet(RLUSD.currency, RLUSD.issuer);
      if (result.success) {
        toast({
          title: "RLUSD line opened",
          description: "Your wallet can now hold and move RLUSD.",
        });
        await refetchTrust();
        queryClient.invalidateQueries({ queryKey: ["/api/positions/soil"] });
      } else {
        toast({
          title: "Couldn't open the RLUSD line",
          description: result.error || "The request wasn't completed.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Couldn't open the RLUSD line",
        description: e?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSettingTrust(false);
    }
  }

  const steps: StepView[] = [];

  // 1) Connect
  steps.push({
    id: "connect",
    icon: Wallet,
    title: "Connect your wallet",
    status: isConnected ? "ready" : "action",
    detail: isConnected
      ? walletType === "ledger"
        ? "Ledger connected."
        : "Xaman connected."
      : "Connect a wallet to begin — your keys stay with you.",
  });

  // 2) Signing route for this device
  steps.push({
    id: "signer",
    icon: PenLine,
    title: "Signing route for your device",
    status: !isConnected ? "locked" : signerReady ? "ready" : "action",
    detail: !isConnected
      ? "Connect first to see how you'll approve."
      : walletType === "xumm"
        ? "Xaman will ask you to approve — works on phone and desktop."
        : hasUsb
          ? "Your Ledger signs over USB on this computer."
          : "Ledger needs a desktop. On this phone, connect Xaman to finish.",
  });

  // 3) Trust the RLUSD line
  steps.push({
    id: "trust",
    icon: ShieldCheck,
    title: "Open your RLUSD line",
    status: !isConnected ? "locked" : hasRlusdTrust ? "ready" : "action",
    detail: !isConnected
      ? "A one-time trust line lets your wallet hold RLUSD."
      : hasRlusdTrust
        ? "Your wallet already trusts RLUSD."
        : ledgerOnMobile
          ? "Open this on desktop (Ledger) or use Xaman to set the trust line."
          : "One-time setup so your wallet can hold RLUSD.",
    action:
      isConnected && !hasRlusdTrust && !ledgerOnMobile ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-amber-400/50"
          onClick={handleSetTrust}
          disabled={settingTrust}
          data-testid="button-set-rlusd-trust"
        >
          {settingTrust ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Opening…
            </>
          ) : (
            "Set trust line"
          )}
        </Button>
      ) : undefined,
  });

  // 4) Hold RLUSD
  steps.push({
    id: "fund",
    icon: Coins,
    title: "Hold RLUSD to deposit",
    status: !isConnected ? "locked" : hasRlusd ? "ready" : "action",
    detail: !isConnected
      ? "You deposit the RLUSD you hold — we never hold it for you."
      : hasRlusd
        ? `You hold ${rlusdBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} RLUSD.`
        : "Add some RLUSD to your wallet, then come back here.",
    action:
      isConnected && !hasRlusd ? (
        <Link href="/buy-crypto?coin=RLUSD">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-400/50"
            data-testid="button-add-rlusd"
          >
            Add RLUSD
          </Button>
        </Link>
      ) : undefined,
  });

  // 5) Finish line
  const clear = signerReady && hasRlusdTrust && hasRlusd;
  steps.push({
    id: "deposit",
    icon: Sparkles,
    title: `Deposit & sign to ${vaultName}`,
    status: clear ? "ready" : "locked",
    detail: clear
      ? "You're clear — enter an amount below and sign with your own keys."
      : "This lights up once the steps above are green.",
  });

  const greenCount = steps.filter((s) => s.status === "ready").length;

  return (
    <div className="rounded-lg border p-3 space-y-2" data-testid="vault-clear-lane">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your clear lane
        </p>
        <span className="text-[11px] text-muted-foreground" data-testid="text-lane-progress">
          {greenCount}/{steps.length} lit
        </span>
      </div>

      <div className="space-y-1.5">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex gap-2.5">
              {/* rail + dot */}
              <div className="flex flex-col items-center pt-1">
                <span
                  className={`h-3 w-3 rounded-full border-2 ${dot[step.status]}`}
                />
                {i < steps.length - 1 && (
                  <span className="w-px flex-1 bg-border mt-1" />
                )}
              </div>

              <div
                className={`flex-1 rounded-md border px-2.5 py-1.5 ${ring[step.status]}`}
                data-testid={`lane-step-${step.id}`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${titleColor[step.status]}`} />
                  <span className={`text-xs font-medium ${titleColor[step.status]}`}>
                    {step.title}
                  </span>
                  <span className="ml-auto">
                    <StatusIcon status={step.status} />
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {step.detail}
                </p>
                {step.action && <div className="mt-1.5">{step.action}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
