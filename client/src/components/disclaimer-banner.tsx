import { useState, useEffect } from "react";
import { AlertTriangle, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface DisclaimerBannerProps {
  variant: "persistent" | "inline" | "modal";
  onAccept?: () => void;
  className?: string;
}

const DISCLAIMER_ACCEPTED_KEY = "statement_insights_disclaimer_accepted";

const FULL_DISCLAIMER = `CryptoOwnBank empowers you to see your full financial picture — but the decisions are always yours.

This tool provides factual, side-by-side comparisons of publicly available financial product rates. Nothing on this platform constitutes financial, investment, tax, or legal advice. We are not a registered investment advisor, broker-dealer, or financial planner.

All information is presented for your own research (DYOR). Rate comparisons are based on publicly available data and may not reflect current offerings. Rates change frequently and without notice. Past performance does not guarantee future results.

DeFi and blockchain-based yields carry risks including but not limited to: smart contract vulnerabilities, protocol risk, regulatory risk, liquidity risk, and issuer risk. DeFi deposits are NOT FDIC insured and are NOT backed by any government agency. You could lose some or all of your deposited funds.

Traditional bank deposits may be FDIC insured up to $250,000 per depositor, per insured institution. This protection does not extend to any DeFi or blockchain-based product.

You are solely responsible for evaluating all risks and making your own financial decisions. We strongly encourage you to consult a licensed financial advisor before acting on any information presented here.

CryptoOwnBank does not provide custody services, does not hold your funds, does not execute transactions on your behalf, and does not have access to your banking credentials.`;

export function DisclaimerBanner({ variant, onAccept, className = "" }: DisclaimerBannerProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (variant === "modal") {
      const accepted = localStorage.getItem(DISCLAIMER_ACCEPTED_KEY);
      if (!accepted) {
        setShowModal(true);
      }
    }
  }, [variant]);

  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, "true");
    setShowModal(false);
    onAccept?.();
  };

  if (variant === "modal") {
    return (
      <Dialog open={showModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="modal-disclaimer">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Your Money, Your Decisions
            </DialogTitle>
            <DialogDescription>
              Please read and acknowledge before using Statement Insights
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed py-2">
            {FULL_DISCLAIMER}
          </div>
          <DialogFooter>
            <Button onClick={handleAccept} data-testid="button-accept-disclaimer">
              I Understand — Let Me See My Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (variant === "inline") {
    return (
      <p className={`text-[11px] text-muted-foreground/70 italic ${className}`} data-testid="text-disclaimer-inline">
        Factual rate comparison — not a recommendation. Rates vary. Your decision, your responsibility. DYOR.
      </p>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 ${className}`}
      data-testid="banner-disclaimer"
    >
      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
        <span className="font-medium">Not financial advice.</span> This tool shows factual rate comparisons from publicly available data. DeFi yields carry smart contract and protocol risk and are not FDIC insured. Traditional bank deposits may be FDIC insured up to $250K. You are responsible for your own financial decisions. DYOR — consult a licensed advisor before acting.
      </p>
    </div>
  );
}
