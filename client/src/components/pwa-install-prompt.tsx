import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X, Copy, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "cob-pwa-dismissed-at";
const DISMISS_DAYS = 14;

type Mode = "native" | "ios-safari" | "ios-chrome" | null;

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const cooledDown = !dismissedAt || Date.now() - dismissedAt > DISMISS_DAYS * 86400_000;
    if (!cooledDown) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    // Chrome on iOS ships as "CriOS"; Edge as "EdgiOS"; Firefox as "FxiOS"
    const isIosNonSafari = isIos && /CriOS|EdgiOS|FxiOS/i.test(ua);
    const isIosSafari = isIos && !isIosNonSafari;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode("native");
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (isIos) {
      const t = setTimeout(() => setMode(isIosSafari ? "ios-safari" : "ios-chrome"), 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setMode(null);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setMode(null);
    } else {
      dismiss();
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText("https://cryptoownbank.com");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  if (!mode) return null;

  let title = "Install CryptoOwnBank";
  let body: string;
  let action: React.ReactNode = null;

  if (mode === "native") {
    body = "Add to your home screen for fullscreen access and faster launch.";
    action = (
      <Button size="sm" className="mt-2 h-8" onClick={install} data-testid="button-install-pwa">
        Install app
      </Button>
    );
  } else if (mode === "ios-safari") {
    body = "Tap the Share button (square with arrow up), then scroll down and tap 'Add to Home Screen'.";
  } else {
    title = "Open in Safari to install";
    body = "iOS only allows installing apps from Safari. Copy the link below, open Safari, paste, then tap Share → Add to Home Screen.";
    action = (
      <Button
        size="sm"
        variant="outline"
        className="mt-2 h-8"
        onClick={copyUrl}
        data-testid="button-copy-url"
      >
        {copied ? (
          <><Check className="h-3.5 w-3.5 mr-1.5" />Copied</>
        ) : (
          <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy cryptoownbank.com</>
        )}
      </Button>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-[60] max-w-md mx-auto" data-testid="pwa-install-prompt">
      <Card className="p-3 shadow-2xl border-primary/30 bg-background/95 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" data-testid="text-install-title">
              {title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
            {action}
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
