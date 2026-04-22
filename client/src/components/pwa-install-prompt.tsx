import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "cob-pwa-dismissed-at";
const DISMISS_DAYS = 14;

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const cooledDown = !dismissedAt || Date.now() - dismissedAt > DISMISS_DAYS * 86400_000;
    if (!cooledDown) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isMobile = isIos || /android/i.test(window.navigator.userAgent);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (isIos && isMobile) {
      const t = setTimeout(() => setIosHint(true), 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setIosHint(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setVisible(false);
    } else {
      dismiss();
    }
  };

  if (!visible && !iosHint) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-[60] max-w-md mx-auto" data-testid="pwa-install-prompt">
      <Card className="p-3 shadow-2xl border-primary/30 bg-background/95 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" data-testid="text-install-title">
              Install CryptoOwnBank
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {iosHint
                ? "Tap the Share button, then 'Add to Home Screen' to use it like a native app."
                : "Add to your home screen for fullscreen access and faster launch."}
            </p>
            {!iosHint && (
              <Button
                size="sm"
                className="mt-2 h-8"
                onClick={install}
                data-testid="button-install-pwa"
              >
                Install app
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 -mt-1 -mr-1"
            onClick={dismiss}
            data-testid="button-dismiss-pwa"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
