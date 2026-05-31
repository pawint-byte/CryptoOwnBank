import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  EyeOff,
  Wallet,
  Info,
} from "lucide-react";
import {
  signersByLane,
  LANE_META,
  FIDELITY_META,
  type SignerLane,
  type SignFidelity,
  type SignerCapability,
  type TxType,
} from "@/lib/signer-capabilities";

const LANE_STYLE: Record<
  SignerLane,
  { icon: typeof Star; iconColor: string; border: string; bg: string; badge: string }
> = {
  recommended: {
    icon: Star,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    badge: "bg-emerald-600 text-white",
  },
  supported: {
    icon: CheckCircle2,
    iconColor: "text-[#00A4E4]",
    border: "border-[#00A4E4]/30",
    bg: "bg-[#00A4E4]/5",
    badge: "bg-[#00A4E4] text-white",
  },
  advanced: {
    icon: AlertTriangle,
    iconColor: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    badge: "bg-amber-500 text-white",
  },
  "coming-soon": {
    icon: Clock,
    iconColor: "text-muted-foreground",
    border: "border-muted",
    bg: "bg-muted/30",
    badge: "bg-muted text-muted-foreground",
  },
};

function FidelityBadge({ fidelity }: { fidelity: SignFidelity }) {
  const meta = FIDELITY_META[fidelity];
  if (fidelity === "clear") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 gap-1"
        data-testid={`fidelity-${fidelity}`}
      >
        <ShieldCheck className="h-3 w-3" />
        {meta.label}
      </Badge>
    );
  }
  if (fidelity === "blind") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 text-amber-700 dark:text-amber-400 gap-1"
        data-testid={`fidelity-${fidelity}`}
      >
        <EyeOff className="h-3 w-3" />
        {meta.label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1" data-testid={`fidelity-${fidelity}`}>
      <Clock className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

function SignerRow({ signer, txType }: { signer: SignerCapability; txType: TxType }) {
  const fidelity = signer.fidelity[txType];
  return (
    <div
      className="rounded-md border bg-background/60 p-3 space-y-2"
      data-testid={`signer-${signer.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm" data-testid={`signer-name-${signer.id}`}>
            {signer.name}
          </p>
          <p className="text-xs text-muted-foreground">{signer.connection}</p>
        </div>
        <FidelityBadge fidelity={fidelity} />
      </div>
      <p className="text-xs text-muted-foreground">{signer.note}</p>
      <p className="text-[11px] text-muted-foreground/80">
        <span className="font-medium">Where it works:</span> {signer.platform}
      </p>
    </div>
  );
}

export function WalletCompatibilityMatrix({
  txType = "VaultDeposit",
}: {
  txType?: TxType;
}) {
  const groups = signersByLane(txType);

  return (
    <div className="space-y-6" data-testid="wallet-compatibility-matrix">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[#00A4E4]/10">
          <Wallet className="h-6 w-6 text-[#00A4E4]" />
        </div>
        <div>
          <h2 className="text-xl font-bold" data-testid="matrix-title">
            Which wallet can I use?
          </h2>
          <p className="text-sm text-muted-foreground">
            Not every wallet handles vault deposits the same way yet. Here's an
            honest map of what works today, what's opt-in, and what's coming.
          </p>
        </div>
      </div>

      {/* Lane groups */}
      <div className="space-y-4">
        {groups.map(({ lane, signers }) => {
          const meta = LANE_META[lane];
          const style = LANE_STYLE[lane];
          const Icon = style.icon;
          return (
            <Card
              key={lane}
              className={style.border}
              data-testid={`lane-${lane}`}
            >
              <CardHeader className={`${style.bg} rounded-t-lg`}>
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${style.iconColor}`} />
                  {meta.label}
                  <Badge className={`${style.badge} ml-1`} data-testid={`lane-count-${lane}`}>
                    {signers.length}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              </CardHeader>
              <CardContent className="pt-4 grid gap-3 sm:grid-cols-2">
                {signers.map((signer) => (
                  <SignerRow key={signer.id} signer={signer} txType={txType} />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Clear vs blind signing — the policy */}
      <Card className="border-[#00A4E4]/30" data-testid="signing-policy">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-[#00A4E4]" />
            Clear signing vs. blind signing — and what we allow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Here's the part most sites skip. Our app{" "}
            <span className="font-medium text-foreground">builds</span> the
            transaction, but your device only{" "}
            <span className="font-medium text-foreground">signs</span> it. Whether
            your device can show you what you're approving depends on the device
            maker, not us.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                Clear signing
              </div>
              <p className="text-xs">
                Your device shows real details — "Deposit 1,000 RLUSD into Vault
                X." You trust the device. This is what we recommend.
              </p>
            </div>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                <EyeOff className="h-4 w-4" />
                Blind signing
              </div>
              <p className="text-xs">
                Your device shows only a code. You're trusting{" "}
                <span className="font-medium">our screen</span>, not the device.
                We allow it only as an opt-in, with a warning — never by default.
              </p>
            </div>
            <div className="rounded-md border border-muted bg-muted/30 p-3 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Clock className="h-4 w-4" />
                Not supported
              </div>
              <p className="text-xs">
                The device can't read or sign this transaction type yet. We
                disable it and point you to Xaman until the maker ships an update.
              </p>
            </div>
          </div>

          <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs">
              <span className="font-medium text-foreground">Why this matters:</span>{" "}
              blind signing quietly flips our security model. Normally you verify
              on your own device — that's the whole point of self-custody. With
              blind signing you'd be trusting our app instead, so we keep it
              behind an explicit "Advanced" opt-in and a plain warning.
            </p>
          </div>

          <p className="text-xs">
            <span className="font-medium text-foreground">At launch:</span> Xaman
            carries everything from day one. Direct hardware options switch on
            per-device, only once we've confirmed they can sign vault
            transactions safely — so the list above will change over time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
