import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  KeyRound,
  Download,
  Printer,
  ShieldCheck,
  RefreshCw,
  HeartHandshake,
  Wallet as WalletIcon,
  AlertTriangle,
  FileText,
} from "lucide-react";
import type { UserWallet } from "@shared/schema";
import { useState } from "react";

export default function SovereigntyKitPage() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const { data: wallets, isLoading } = useQuery<UserWallet[]>({
    queryKey: ["/api/wallets"],
  });

  const walletCount = wallets?.length ?? 0;
  const chains = Array.from(new Set((wallets || []).map((w) => w.chain))).sort();

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch("/api/sovereignty-kit/export", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disp = res.headers.get("Content-Disposition") || "";
      const m = disp.match(/filename="?([^"]+)"?/);
      a.download = m ? m[1] : `cryptoownbank-sovereignty-kit-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Sovereignty Kit downloaded",
        description: "Print it and keep it with your seed phrase. Re-download anytime as wallets change.",
      });
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err?.message || "Could not generate your kit.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="page-sovereignty-kit">
      <div>
        <p className="text-sm font-medium tracking-wide uppercase text-[#00A4E4] mb-2" data-testid="eyebrow-kit">
          Sovereignty
        </p>
        <h1 className="text-3xl font-bold tracking-tight mb-3" data-testid="heading-kit">
          Your Sovereignty Recovery Kit
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          A printable reference that proves &mdash; on paper, in your hands &mdash; that you can
          get to your assets without us, without your usual wallet, and without any specific
          company being around. Built from the addresses you already track here, paired with
          open standards that don't depend on any vendor.
        </p>
      </div>

      <Card className="border-[#00A4E4]/30 bg-[#00A4E4]/5" data-testid="card-promise">
        <CardContent className="p-6 flex gap-4 items-start">
          <div className="flex-shrink-0 h-10 w-10 rounded-md bg-[#00A4E4]/15 text-[#00A4E4] flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-2">For you &mdash; not for survivors.</h3>
            <p className="text-sm leading-relaxed">
              This kit is for the living owner: any day you want to verify sovereignty, swap
              wallets, do your annual drill, or hand a reference to a friend or family member who
              is just learning. For survivor instructions after you're gone, use the{" "}
              <a href="/legacy-plan" className="text-[#00A4E4] underline underline-offset-4" data-testid="link-legacy-plan-from-kit">
                Legacy Plan
              </a>{" "}
              export instead &mdash; that one is beneficiary-shaped, this one is chain-shaped.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-whats-in-it">
        <CardContent className="p-6">
          <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#00A4E4]" />
            What's inside your kit
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-[#00A4E4]">&bull;</span>
              <span>Every wallet address you track here, grouped by chain.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00A4E4]">&bull;</span>
              <span>What your seed phrase looks like on each chain (length, format, open standard).</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00A4E4]">&bull;</span>
              <span>Current good wallets for each chain &mdash; ones that follow the open standard, so you're never locked in.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00A4E4]">&bull;</span>
              <span>Plain-language restore steps: install &rarr; import &rarr; enter phrase &rarr; balance appears.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00A4E4]">&bull;</span>
              <span>Seed-phrase storage guidance (paper, metal, what to avoid).</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00A4E4]">&bull;</span>
              <span>Annual sovereignty drill checklist.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00A4E4]">&bull;</span>
              <span>The honest "if we disappear" note &mdash; the AGPL-3.0 source and self-host path.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="card-your-addresses">
        <CardContent className="p-6">
          <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
            <WalletIcon className="h-4 w-4 text-[#00A4E4]" />
            Addresses we'll include
          </h3>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : walletCount === 0 ? (
            <div className="text-sm text-muted-foreground space-y-3">
              <p className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>
                  You haven't added any wallet addresses yet. The kit will still include the
                  generic restore guidance, wallet recommendations, and storage advice &mdash; but
                  it'll be much more useful with your real addresses in it.
                </span>
              </p>
              <a href="/wallets">
                <Button variant="outline" size="sm" data-testid="button-add-wallets">
                  Add a wallet address
                </Button>
              </a>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Your kit will include <strong className="text-foreground">{walletCount}</strong>{" "}
                address{walletCount === 1 ? "" : "es"} across{" "}
                <strong className="text-foreground">{chains.length}</strong> chain
                {chains.length === 1 ? "" : "s"}:
              </p>
              <div className="flex flex-wrap gap-2" data-testid="chip-chains">
                {chains.map((c) => (
                  <span
                    key={c}
                    className="text-xs px-2 py-1 rounded-md bg-muted text-foreground"
                    data-testid={`chip-chain-${c}`}
                  >
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Public addresses only. Your kit never contains seed phrases, private keys, or
                anything we couldn't already see on the blockchain.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/20" data-testid="card-honest-note">
        <CardContent className="p-5 flex gap-3 items-start">
          <div className="flex-shrink-0 h-8 w-8 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">What this kit is not.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              It is not your seed phrase. We don't have your seed phrase &mdash; nobody here does.
              If you lose your seed phrase, no kit, no tool, and no company can recover your
              assets. That's the trade for sovereignty: nobody can take them from you, and nobody
              can give them back if you lose the key. Store the phrase well. The kit is the
              guide. The phrase is the lock.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-drill">
        <CardContent className="p-6 flex gap-4 items-start">
          <div className="flex-shrink-0 h-10 w-10 rounded-md bg-[#00A4E4]/10 text-[#00A4E4] flex items-center justify-center">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-2">Print it. Try it. Once a year.</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Download the kit. Print it. Store it with the same care you'd store the seed phrase
              itself &mdash; same room, separate envelope. Once a year, pick a chain from the
              kit, install a different wallet from the list, import your phrase on a clean device,
              confirm your balance, and put it away. That's the drill. Three drills in and the
              fear of being locked out is gone for good.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 z-10">
        <Button
          size="lg"
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 bg-[#00A4E4] hover:bg-[#00A4E4]/90 text-white shadow-lg"
          data-testid="button-download-kit"
        >
          <Download className="mr-2 h-5 w-5" />
          {downloading ? "Generating..." : "Download my Sovereignty Kit"}
        </Button>
        <a href="/sovereignty" className="sm:flex-shrink-0">
          <Button size="lg" variant="outline" className="w-full" data-testid="button-read-sovereignty">
            <KeyRound className="mr-2 h-5 w-5" />
            Read the Sovereignty page
          </Button>
        </a>
      </div>

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2 pt-2">
        <Printer className="h-3.5 w-3.5" />
        Self-contained HTML, styled for print. There's a Print button at the top of the document,
        or use your browser's Print menu.
      </p>

      <Card className="border-dashed" data-testid="card-legacy-cross-ref">
        <CardContent className="p-5 flex gap-3 items-start">
          <HeartHandshake className="h-5 w-5 text-[#00A4E4] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">Have a Legacy Plan? It already includes this.</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              The Legacy Plan export &mdash; the document your family uses if you're gone or
              incapacitated &mdash; bundles this same chain-by-chain restore guidance as an
              appendix automatically. Survivors don't need a second document. The kit on this
              page is for <em>you</em>: print it, run the annual drill, prove to yourself you
              can still get to your assets.
            </p>
            <a href="/legacy-plan">
              <Button variant="outline" size="sm" data-testid="button-go-legacy-plan">
                Go to Legacy Plan
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
