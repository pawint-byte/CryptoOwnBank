import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/hooks/use-user-data";
import { Sparkles, Wallet, ListChecks, Crown, ArrowRight } from "lucide-react";

export function WelcomeModal({
  hasData,
  dataReady,
}: {
  hasData: boolean;
  dataReady: boolean;
}) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const {
    data: welcomeSeen,
    isLoading: welcomeLoading,
    save: saveWelcomeSeen,
  } = useUserData<boolean>("welcome_seen", false);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (
      user &&
      !welcomeLoading &&
      dataReady &&
      welcomeSeen !== true &&
      !hasData
    ) {
      setOpen(true);
    }
  }, [user, welcomeLoading, dataReady, welcomeSeen, hasData]);

  const dismiss = () => {
    setOpen(false);
    saveWelcomeSeen(true);
  };

  const go = (href: string, resetChecklist?: boolean) => {
    if (resetChecklist) {
      localStorage.removeItem("onboarding-dismissed");
      localStorage.removeItem("onboarding-inventory");
      localStorage.removeItem("onboarding-step-status");
    }
    saveWelcomeSeen(true);
    setOpen(false);
    setLocation(href);
  };

  if (!open) return null;

  const steps = [
    {
      icon: Wallet,
      title: "Bring in your crypto",
      desc: "Paste a wallet address or import an exchange file. We only read it — your keys stay with you.",
    },
    {
      icon: ListChecks,
      title: "Follow your setup checklist",
      desc: "Right on this Home page, a short list walks you through everything, one step at a time.",
    },
    {
      icon: Crown,
      title: "Claim your Founding Member seat",
      desc: "Finish 3 free steps to lock in your permanent member number — first 1,000 only.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-lg" data-testid="modal-welcome">
        <DialogHeader>
          <div className="h-12 w-12 rounded-full bg-[#00A4E4]/10 flex items-center justify-center mb-1">
            <Sparkles className="h-6 w-6 text-[#00A4E4]" />
          </div>
          <DialogTitle className="text-xl" data-testid="text-welcome-title">
            Welcome to CryptoOwnBank
          </DialogTitle>
          <DialogDescription data-testid="text-welcome-subtitle">
            You're set up. Here's the quickest way to get going — pick wherever
            you'd like to start.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {steps.map((s) => (
            <div
              key={s.title}
              className="flex items-start gap-3 rounded-lg border border-muted bg-card p-3"
              data-testid={`welcome-step-${s.title}`}
            >
              <div className="h-9 w-9 rounded-full bg-[#00A4E4]/10 flex items-center justify-center shrink-0">
                <s.icon className="h-4 w-4 text-[#00A4E4]" />
              </div>
              <div>
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button
            className="bg-[#00A4E4] hover:bg-[#0090c9] text-white w-full"
            onClick={() => go("/quick-start", true)}
            data-testid="button-welcome-start"
          >
            Start with my crypto
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => go("/founding")}
              data-testid="button-welcome-founding"
            >
              <Crown className="h-4 w-4 mr-1.5" />
              Claim my seat
            </Button>
            <Button
              variant="ghost"
              className="flex-1 text-muted-foreground"
              onClick={dismiss}
              data-testid="button-welcome-dismiss"
            >
              I'll look around first
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
