import { useState, Suspense, lazy } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Usb,
  QrCode,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Copy,
  X,
} from "lucide-react";
import { connectTrezor } from "@/lib/trezor-connector";
import { useToast } from "@/hooks/use-toast";

const AnimatedQRScanner = lazy(() =>
  import("@keystonehq/animated-qr").then((m) => ({
    default: m.AnimatedQRScanner,
  })),
);

type DeviceStatus = "idle" | "busy" | "done" | "error";

function shorten(addr: string) {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export function WalletTestPanel() {
  const { toast } = useToast();

  // Trezor
  const [tzStatus, setTzStatus] = useState<DeviceStatus>("idle");
  const [tzAddress, setTzAddress] = useState("");
  const [tzError, setTzError] = useState("");

  // Keystone
  const [ksStatus, setKsStatus] = useState<DeviceStatus>("idle");
  const [ksScanning, setKsScanning] = useState(false);
  const [ksAddress, setKsAddress] = useState("");
  const [ksError, setKsError] = useState("");

  async function handleTrezor() {
    setTzStatus("busy");
    setTzError("");
    const r = await connectTrezor();
    if (r.success && r.address) {
      setTzAddress(r.address);
      setTzStatus("done");
    } else {
      setTzError(r.error || "Could not connect to Trezor.");
      setTzStatus("error");
    }
  }

  async function handleKeystoneScan(ur: { type: string; cbor: string }) {
    try {
      const { parseKeystoneAccount } = await import("@/lib/keystone-connector");
      const acct = parseKeystoneAccount(ur.type, ur.cbor);
      setKsAddress(acct.address);
      setKsStatus("done");
      setKsScanning(false);
      setKsError("");
    } catch (e: any) {
      setKsError(
        "That QR didn't look like a Keystone XRP account. On the Keystone, open Connect Software Wallet → XRP and show its QR.",
      );
      setKsStatus("error");
      setKsScanning(false);
    }
  }

  function handleKeystoneError(err: string) {
    setKsScanning(false);
    setKsError(
      err === "NO_WEBCAM_ACCESS"
        ? "We couldn't use your camera. Please allow camera access and try again."
        : err === "NO_WEBCAM_FOUND"
          ? "No camera found. Keystone needs a camera to scan its QR codes."
          : "Camera error. Please try again.",
    );
    setKsStatus("error");
  }

  async function copy(addr: string) {
    try {
      await navigator.clipboard.writeText(addr);
      toast({ title: "Address copied" });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  }

  return (
    <Card className="border-[#00A4E4]/30" data-testid="card-wallet-test-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Usb className="h-5 w-5 text-[#00A4E4]" />
          Test your hardware wallet
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Check that your device connects to CryptoOwnBank before you rely on it.
          This only reads your public XRP address — it never moves funds and
          never sees your keys.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {/* Trezor */}
        <div
          className="rounded-lg border p-4 flex flex-col"
          data-testid="test-device-trezor"
        >
          <div className="flex items-center gap-2 mb-1">
            <Usb className="h-4 w-4 text-[#00A4E4]" />
            <span className="font-semibold text-sm">Trezor</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              USB
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Plug in over USB on Chrome or Edge (desktop). A Trezor pop-up opens
            for you to confirm.
          </p>

          {tzStatus === "done" ? (
            <div className="mt-auto space-y-2">
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </div>
              <button
                onClick={() => copy(tzAddress)}
                className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground"
                data-testid="text-trezor-address"
              >
                {shorten(tzAddress)}
                <Copy className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="mt-auto space-y-2">
              <Button
                size="sm"
                onClick={handleTrezor}
                disabled={tzStatus === "busy"}
                className="w-full"
                data-testid="button-connect-trezor"
              >
                {tzStatus === "busy" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Waiting…
                  </>
                ) : (
                  "Connect Trezor"
                )}
              </Button>
              {tzStatus === "error" && (
                <p className="text-xs text-amber-600 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  {tzError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Keystone */}
        <div
          className="rounded-lg border p-4 flex flex-col"
          data-testid="test-device-keystone"
        >
          <div className="flex items-center gap-2 mb-1">
            <QrCode className="h-4 w-4 text-[#00A4E4]" />
            <span className="font-semibold text-sm">Keystone</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              QR
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Fully offline. On the Keystone open Connect Software Wallet → XRP,
            then scan its QR with your camera.
          </p>

          {ksScanning ? (
            <div className="mt-auto space-y-2">
              <div className="rounded-md overflow-hidden border max-w-[260px]">
                <Suspense
                  fallback={
                    <div className="p-6 text-xs text-muted-foreground">
                      Loading camera…
                    </div>
                  }
                >
                  <AnimatedQRScanner
                    urTypes={["bytes"]}
                    handleScan={handleKeystoneScan}
                    handleError={handleKeystoneError}
                    options={{ width: 260 }}
                  />
                </Suspense>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setKsScanning(false);
                  if (ksStatus === "busy") setKsStatus("idle");
                }}
                data-testid="button-keystone-cancel"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          ) : ksStatus === "done" ? (
            <div className="mt-auto space-y-2">
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Read address
              </div>
              <button
                onClick={() => copy(ksAddress)}
                className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground"
                data-testid="text-keystone-address"
              >
                {shorten(ksAddress)}
                <Copy className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="mt-auto space-y-2">
              <Button
                size="sm"
                onClick={() => {
                  setKsError("");
                  setKsStatus("busy");
                  setKsScanning(true);
                }}
                className="w-full"
                data-testid="button-scan-keystone"
              >
                Scan Keystone QR
              </Button>
              {ksStatus === "error" && (
                <p className="text-xs text-amber-600 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  {ksError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Cypherock — blocked pending security filter */}
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 flex flex-col"
          data-testid="test-device-cypherock"
        >
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-sm">Cypherock</span>
            <Badge className="ml-auto text-[10px] bg-amber-500 text-white">
              Action needed
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Cypherock's official toolkit needs a software component
            (<span className="font-mono">protobufjs</span>) that this project's
            security filter is currently blocking, so we can't connect it yet.
            Once that's allowed, Cypherock connects over USB just like Trezor and
            we'll switch it on here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
