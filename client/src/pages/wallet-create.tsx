import { useState, useMemo, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import * as bip39 from "bip39";
import { Wallet as XrplWallet } from "xrpl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SeoHead } from "@/components/seo-head";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { deriveAllAddresses, NON_DERIVABLE_CHAINS, type DerivedAddress } from "@/lib/multi-chain-derive";
import { chainHasThorBridge } from "@/lib/thorchain";
import { AutoBridgeModal } from "@/components/auto-bridge-modal";
import {
  getStripeOptionsForChain,
  getExternalOnrampsForChain,
  chainHasAnyOnramp,
  createOnrampSessionAndRedirect,
  STRIPE_ONRAMP_BY_CHAIN,
  type StripeOnrampOption,
} from "@/lib/stripe-onramp";
import {
  Wallet as WalletIcon,
  Shield,
  Dice5,
  KeyRound,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  Lock,
  Download,
  Globe,
  Loader2,
  Info,
  CreditCard,
} from "lucide-react";

type Step = "mode" | "generate" | "import" | "entropy" | "verify" | "done";
type Mode = "generate" | "import" | "entropy";

const STORAGE_HINTS = [
  "Handwrite on the printable backup template (link below)",
  "Steel backup plate (Cryptosteel / Billfodl — search online, no affiliate)",
  "Encrypted file on a USB drive you keep in a safe",
  "Bank safety deposit box",
  "Split between two trusted locations (advanced)",
];

function downloadText(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function shannonEntropyBits(input: string): number {
  if (!input) return 0;
  const freq: Record<string, number> = {};
  for (const ch of input) freq[ch] = (freq[ch] || 0) + 1;
  const len = input.length;
  let bitsPerChar = 0;
  for (const ch in freq) {
    const p = freq[ch] / len;
    bitsPerChar -= p * Math.log2(p);
  }
  return Math.round(bitsPerChar * len);
}

export default function WalletCreate() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<Mode | null>(null);
  const [mnemonic, setMnemonic] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [importInput, setImportInput] = useState<string>("");
  const [entropyInput, setEntropyInput] = useState<string>("");
  const [showSeed, setShowSeed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [verifyIndices, setVerifyIndices] = useState<[number, number]>([0, 1]);
  const [verifyAnswers, setVerifyAnswers] = useState<[string, string]>(["", ""]);
  const [walletLabel, setWalletLabel] = useState<string>("");
  const [savedWalletId, setSavedWalletId] = useState<string | null>(null);
  const [seedLength, setSeedLength] = useState<12 | 24>(12);
  const [savingAll, setSavingAll] = useState(false);
  const [savedChains, setSavedChains] = useState<Set<string>>(new Set());
  const [onrampLoading, setOnrampLoading] = useState<string | null>(null);
  const [bridgeModalChain, setBridgeModalChain] = useState<string | null>(null);

  const handleBuyWithCard = useCallback(
    async (walletAddress: string, option: StripeOnrampOption) => {
      const key = `${option.currency}-${option.network}`;
      setOnrampLoading(key);
      try {
        await createOnrampSessionAndRedirect({
          walletAddress,
          destinationCurrency: option.currency,
          destinationNetwork: option.network,
        });
        toast({
          title: "Stripe onramp opened in new tab",
          description: `Buying ${option.symbol} → ${walletAddress.slice(0, 10)}…${walletAddress.slice(-6)}. The crypto goes directly to your wallet. CryptoOwnBank never touches it.`,
        });
      } catch (err: any) {
        toast({
          title: "Could not open Stripe onramp",
          description: err?.message || "Please try again or use a different funding method.",
          variant: "destructive",
        });
      } finally {
        setOnrampLoading(null);
      }
    },
    [toast],
  );

  const mnemonicWords = useMemo(() => (mnemonic ? mnemonic.split(" ") : []), [mnemonic]);

  const derivedAll = useMemo<DerivedAddress[]>(() => {
    if (step !== "done" || !mnemonic) return [];
    try {
      return deriveAllAddresses(mnemonic);
    } catch (err) {
      console.error("[wallet-create] multi-chain derivation failed:", err);
      return [];
    }
  }, [step, mnemonic]);

  const handleSaveAllChains = async () => {
    if (savingAll || derivedAll.length === 0) return;
    setSavingAll(true);
    const newlySaved = new Set(savedChains);
    let failed = 0;
    for (const d of derivedAll) {
      if (newlySaved.has(d.chain)) continue;
      try {
        await apiRequest("POST", "/api/wallets/keygen-save", {
          chain: d.chain,
          address: d.address,
          label: `${d.symbol}_Wallet_${d.chain}`,
        });
        newlySaved.add(d.chain);
        setSavedChains(new Set(newlySaved));
      } catch (err: any) {
        failed += 1;
        console.warn(`[wallet-create] save failed for ${d.chain}:`, err?.message);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
    setSavingAll(false);
    if (failed === 0) {
      toast({ title: `Saved ${newlySaved.size} addresses`, description: "Your wallet list now shows all chains." });
    } else {
      toast({
        title: `Saved ${newlySaved.size - failed} of ${derivedAll.length}`,
        description: `${failed} couldn't be saved — likely already in your list.`,
      });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: { chain: string; address: string; label: string }) => {
      return await apiRequest("POST", "/api/wallets/keygen-save", payload);
    },
    onSuccess: async (res: any) => {
      const data = await res.json().catch(() => ({}));
      setSavedWalletId(data?.wallet?.id ?? "saved");
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: (err: any) => {
      toast({
        title: "Could not save wallet",
        description: err?.message ?? "Try again or copy your address manually.",
        variant: "destructive",
      });
    },
  });

  const resetAll = () => {
    setMode(null);
    setStep("mode");
    setMnemonic("");
    setAddress("");
    setImportInput("");
    setEntropyInput("");
    setShowSeed(false);
    setAcknowledged(false);
    setVerifyIndices([0, 1]);
    setVerifyAnswers(["", ""]);
    setWalletLabel("");
    setSavedWalletId(null);
  };

  const deriveAddressFromMnemonic = useCallback((m: string): string => {
    const w = XrplWallet.fromMnemonic(m, { derivationPath: "m/44'/144'/0'/0/0" });
    return w.classicAddress;
  }, []);

  const handleModeSelect = (m: Mode) => {
    setMode(m);
    if (m === "generate") {
      const fresh = bip39.generateMnemonic(seedLength === 24 ? 256 : 128);
      setMnemonic(fresh);
      try {
        setAddress(deriveAddressFromMnemonic(fresh));
      } catch (err: any) {
        toast({ title: "Wallet generation failed", description: err?.message, variant: "destructive" });
        return;
      }
      setStep("generate");
    } else if (m === "import") {
      setStep("import");
    } else {
      setStep("entropy");
    }
  };

  const handleImportSubmit = async () => {
    const cleaned = importInput.trim().toLowerCase().replace(/\s+/g, " ");
    if (!bip39.validateMnemonic(cleaned)) {
      toast({
        title: "That doesn't look like a valid seed phrase",
        description: "Check spelling, word count (12, 15, 18, 21, or 24 words), and that words are from the BIP-39 list.",
        variant: "destructive",
      });
      return;
    }
    try {
      const derived = deriveAddressFromMnemonic(cleaned);
      setMnemonic(cleaned);
      setAddress(derived);
      await saveMutation.mutateAsync({
        chain: "xrp",
        address: derived,
        label: walletLabel.trim() || "Imported XRPL Wallet",
      });
      setStep("done");
    } catch (err: any) {
      toast({ title: "Could not derive wallet", description: err?.message, variant: "destructive" });
    }
  };

  const handleEntropySubmit = async () => {
    const requiredBits = seedLength === 24 ? 256 : 128;
    const bits = shannonEntropyBits(entropyInput);
    if (bits < requiredBits) {
      toast({
        title: "Not enough entropy yet",
        description: `You have ~${bits} bits. Need ${requiredBits}+ for a ${seedLength}-word seed. Add more dice rolls, coin flips, or random characters.`,
        variant: "destructive",
      });
      return;
    }
    try {
      const hex = await sha256Hex(entropyInput);
      const hexLen = seedLength === 24 ? 64 : 32;
      const fresh = bip39.entropyToMnemonic(hex.slice(0, hexLen));
      setMnemonic(fresh);
      setAddress(deriveAddressFromMnemonic(fresh));
      setStep("generate");
    } catch (err: any) {
      toast({ title: "Could not derive seed from your entropy", description: err?.message, variant: "destructive" });
    }
  };

  const proceedToVerify = () => {
    if (!acknowledged) return;
    const a = Math.floor(Math.random() * mnemonicWords.length);
    let b = Math.floor(Math.random() * mnemonicWords.length);
    while (b === a) b = Math.floor(Math.random() * mnemonicWords.length);
    setVerifyIndices([Math.min(a, b), Math.max(a, b)]);
    setVerifyAnswers(["", ""]);
    setStep("verify");
  };

  const submitVerification = async () => {
    const [i1, i2] = verifyIndices;
    const ok =
      verifyAnswers[0].trim().toLowerCase() === mnemonicWords[i1] &&
      verifyAnswers[1].trim().toLowerCase() === mnemonicWords[i2];
    if (!ok) {
      toast({
        title: "Those words don't match",
        description: "Double-check the words you wrote down. They must match exactly.",
        variant: "destructive",
      });
      return;
    }
    await saveMutation.mutateAsync({
      chain: "xrp",
      address,
      label: walletLabel.trim() || "My XRPL Wallet",
    });
    setStep("done");
  };

  const copy = async (txt: string, label: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast({ title: `${label} copied`, description: "Paste it somewhere safe." });
    } catch {
      toast({ title: "Copy failed", description: "Select and copy manually.", variant: "destructive" });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <SeoHead title="Create a wallet — CryptoOwnBank" path="/wallet/create" />
        <main className="pt-20 pb-20 px-4 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Sign in to save your wallet</CardTitle>
              <CardDescription>
                You can still generate a wallet without an account — the keys live in your browser either way. But to
                save the address so you can use it across CryptoOwnBank, sign in first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/api/login">
                <Button data-testid="button-signin">Sign in</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Create a non-custodial wallet — CryptoOwnBank"
        description="Generate a real XRPL wallet in your browser. Your keys never leave your device. Be your own bank — now and forever."
        path="/wallet/create"
      />
      <main className="pt-8 pb-20 px-4 max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[#00A4E4] mb-3">
            <WalletIcon className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2" data-testid="heading-wallet-create">
            Create a non-custodial XRPL wallet
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Keys are generated in your browser. We never see, store, or transmit them. You walk away owning everything.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6 text-xs text-muted-foreground">
          <StepDot active={step === "mode"} done={step !== "mode"} label="Mode" />
          <span>→</span>
          <StepDot active={["generate", "import", "entropy"].includes(step)} done={["verify", "done"].includes(step)} label="Seed" />
          <span>→</span>
          <StepDot active={step === "verify"} done={step === "done"} label="Verify" />
          <span>→</span>
          <StepDot active={step === "done"} done={false} label="Done" />
        </div>

        {step === "mode" && (
          <div className="space-y-3" data-testid="step-mode">
            <div className="rounded-md border bg-muted/30 p-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold">Seed phrase length</div>
                <div className="text-xs text-muted-foreground">
                  {seedLength === 12
                    ? "12 words = 128 bits of entropy. Plenty for personal use, easier to back up. Industry default."
                    : "24 words = 256 bits of entropy. Maximum strength, what cold-wallet manufacturers ship by default. Same security model — just more to write down."}
                </div>
              </div>
              <div className="inline-flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSeedLength(12)}
                  className={`px-3 py-1.5 text-sm font-semibold transition-colors ${
                    seedLength === 12 ? "bg-[#00A4E4] text-white" : "bg-background hover:bg-muted"
                  }`}
                  data-testid="button-seedlen-12"
                >
                  12 words
                </button>
                <button
                  type="button"
                  onClick={() => setSeedLength(24)}
                  className={`px-3 py-1.5 text-sm font-semibold transition-colors border-l ${
                    seedLength === 24 ? "bg-[#00A4E4] text-white" : "bg-background hover:bg-muted"
                  }`}
                  data-testid="button-seedlen-24"
                >
                  24 words
                </button>
              </div>
            </div>

            <ModeCard
              icon={<Sparkles className="h-5 w-5" />}
              title="Generate a wallet for me"
              subtitle={`Recommended for first-timers. We create a fresh ${seedLength}-word seed in your browser.`}
              badge="Most common"
              onClick={() => handleModeSelect("generate")}
              testId="card-mode-generate"
            />
            <ModeCard
              icon={<KeyRound className="h-5 w-5" />}
              title="I already have a seed phrase"
              subtitle="Bring an existing wallet from Xaman, MetaMask, Ledger, or any BIP-39 source. Your wallet appears here instantly."
              badge="Migrating"
              onClick={() => handleModeSelect("import")}
              testId="card-mode-import"
            />
            <ModeCard
              icon={<Dice5 className="h-5 w-5" />}
              title="Roll your own entropy"
              subtitle="Don't trust our randomness? Provide your own — roll physical dice, flip coins, or type random characters. We derive a seed from your source."
              badge="Advanced"
              onClick={() => handleModeSelect("entropy")}
              testId="card-mode-entropy"
            />

            <Alert className="mt-6 border-[#00A4E4]/30 bg-[#00A4E4]/5">
              <Lock className="h-4 w-4" />
              <AlertTitle>What "non-custodial" means here</AlertTitle>
              <AlertDescription className="text-sm">
                Whichever mode you pick, the keys are created on your device and stay there. CryptoOwnBank never sees,
                stores, transmits, or has access to your seed phrase or private keys. We can't recover them if you lose
                them — and that's the point. You are the bank.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === "entropy" && (
          <Card data-testid="step-entropy">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dice5 className="h-5 w-5" /> Roll your own entropy
              </CardTitle>
              <CardDescription>
                Type the result of physical dice rolls (e.g. "3 6 2 1 4 5 2 6 ..."), coin flips ("HTHTHHTH..."), or any
                long random string. We hash your input with SHA-256 in your browser to derive a seed phrase.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Roll a 6-sided die 99 times and type the numbers. Or flip a coin 256 times. Or just type long random gibberish."
                value={entropyInput}
                onChange={(e) => setEntropyInput(e.target.value)}
                rows={6}
                data-testid="input-entropy"
              />
              <EntropyMeter input={entropyInput} />
              <Alert variant="default" className="border-amber-500/40 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Hashing cannot create randomness — it can only preserve it. If you type something predictable
                  ("password123", a quote, the alphabet), the result is predictable too, no matter how long. Use
                  <strong> physical dice or coins</strong> if you want this to be meaningfully stronger than the
                  "Generate" mode. The meter measures character diversity, which is a rough proxy, not a guarantee.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetAll} data-testid="button-back-mode">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={handleEntropySubmit} className="flex-1" data-testid="button-derive-entropy">
                  Derive my seed <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "import" && (
          <Card data-testid="step-import">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" /> Bring your existing seed
              </CardTitle>
              <CardDescription>
                Paste or type your 12, 15, 18, 21, or 24-word BIP-39 seed phrase. It will be validated in your browser
                and your XRPL address will be derived. The seed never leaves your device.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="default" className="border-amber-500/40 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Only paste a seed you generated yourself or own. If anyone — including us — ever asks you for this
                  phrase, they are trying to steal from you. Verify the URL says <strong>cryptoownbank.com</strong>{" "}
                  before pasting.
                </AlertDescription>
              </Alert>
              <Textarea
                placeholder="word1 word2 word3 ... (separated by spaces)"
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                rows={4}
                className="font-mono"
                data-testid="input-import-seed"
              />
              <div>
                <label className="text-sm font-medium block mb-1">Label this wallet (optional)</label>
                <Input
                  value={walletLabel}
                  onChange={(e) => setWalletLabel(e.target.value)}
                  placeholder="e.g. My Xaman wallet"
                  data-testid="input-import-label"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetAll} data-testid="button-back-mode">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={handleImportSubmit}
                  disabled={saveMutation.isPending}
                  className="flex-1"
                  data-testid="button-import-seed"
                >
                  {saveMutation.isPending ? "Saving..." : "Use this seed"} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "generate" && (
          <Card data-testid="step-generate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Your seed phrase
              </CardTitle>
              <CardDescription>
                These {mnemonicWords.length} words <strong>are</strong> your wallet — not a backup of it, they literally
                are it. Anyone who sees them owns your crypto. Anyone who loses them loses access forever. This is the
                same way bearer bonds and physical cash work. You are about to do something that puts you in the same
                position as a 1950s banker holding the keys to the vault.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <div
                  className={`grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 rounded-md bg-muted/50 border-2 border-dashed ${
                    showSeed ? "" : "blur-md select-none"
                  }`}
                  data-testid="seed-grid"
                >
                  {mnemonicWords.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 bg-background rounded border text-sm font-mono"
                      data-testid={`seed-word-${i}`}
                    >
                      <span className="text-muted-foreground text-xs w-5">{i + 1}.</span>
                      <span className="font-semibold">{w}</span>
                    </div>
                  ))}
                </div>
                {!showSeed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button onClick={() => setShowSeed(true)} data-testid="button-reveal-seed">
                      <Eye className="h-4 w-4 mr-1" /> Reveal seed
                    </Button>
                  </div>
                )}
              </div>

              {showSeed && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowSeed(false)} data-testid="button-hide-seed">
                    <EyeOff className="h-4 w-4 mr-1" /> Hide
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copy(mnemonic, "Seed phrase")}
                    data-testid="button-copy-seed"
                  >
                    <Copy className="h-4 w-4 mr-1" /> Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadText(
                        `cryptoownbank-wallet-backup-${Date.now()}.txt`,
                        `CryptoOwnBank — XRPL Wallet Backup\n\nAddress: ${address}\n\nSeed phrase (KEEP SECRET — anyone with these words owns this wallet):\n\n${mnemonicWords
                          .map((w, i) => `${i + 1}. ${w}`)
                          .join("\n")}\n\nStorage advice:\n${STORAGE_HINTS.map((h) => `- ${h}`).join("\n")}\n\nDerivation: BIP-44 m/44'/144'/0'/0/0 (XRPL standard, Xaman-compatible)\n`
                      )
                    }
                    data-testid="button-download-backup"
                  >
                    <Download className="h-4 w-4 mr-1" /> Download as .txt
                  </Button>
                </div>
              )}

              <div className="bg-muted/30 rounded-md p-3 text-sm space-y-2">
                <div className="font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Where to store these words
                </div>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {STORAGE_HINTS.map((h, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span>•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md border">
                <Checkbox
                  id="ack"
                  checked={acknowledged}
                  onCheckedChange={(v) => setAcknowledged(v === true)}
                  data-testid="checkbox-acknowledged"
                />
                <label htmlFor="ack" className="text-sm leading-tight cursor-pointer">
                  I have written down all {mnemonicWords.length} words in the correct order. I understand CryptoOwnBank
                  cannot recover them if I lose them, and anyone who sees them can take my crypto.
                </label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetAll} data-testid="button-cancel-generate">
                  Cancel
                </Button>
                <Button
                  onClick={proceedToVerify}
                  disabled={!acknowledged || !showSeed}
                  className="flex-1"
                  data-testid="button-proceed-verify"
                >
                  I've written it down — verify <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "verify" && (
          <Card data-testid="step-verify">
            <CardHeader>
              <CardTitle>Verify your backup</CardTitle>
              <CardDescription>
                Type two of your words below. If this feels uncomfortable, that's exactly the feeling that proves the
                system works — only you can do this.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Word #{verifyIndices[0] + 1}</label>
                  <Input
                    value={verifyAnswers[0]}
                    onChange={(e) => setVerifyAnswers([e.target.value, verifyAnswers[1]])}
                    placeholder="type word"
                    className="font-mono"
                    data-testid="input-verify-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Word #{verifyIndices[1] + 1}</label>
                  <Input
                    value={verifyAnswers[1]}
                    onChange={(e) => setVerifyAnswers([verifyAnswers[0], e.target.value])}
                    placeholder="type word"
                    className="font-mono"
                    data-testid="input-verify-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Label this wallet (optional)</label>
                <Input
                  value={walletLabel}
                  onChange={(e) => setWalletLabel(e.target.value)}
                  placeholder="e.g. My main XRP wallet"
                  data-testid="input-wallet-label"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("generate")} data-testid="button-back-generate">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Show words again
                </Button>
                <Button
                  onClick={submitVerification}
                  disabled={!verifyAnswers[0] || !verifyAnswers[1] || saveMutation.isPending}
                  className="flex-1"
                  data-testid="button-submit-verify"
                >
                  {saveMutation.isPending ? "Saving..." : "Confirm and save"} <Check className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card data-testid="step-done">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" /> Your wallet is ready
              </CardTitle>
              <CardDescription>
                Keys live on your device only. The address below is public — share it freely to receive XRP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Primary XRPL address</div>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border">
                  <code className="text-sm font-mono break-all flex-1" data-testid="text-wallet-address">
                    {address}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copy(address, "Address")} data-testid="button-copy-address">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {mode !== "import" && (
                <Alert className="border-amber-500/40 bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>This wallet needs 1+ XRP to activate on the ledger</AlertTitle>
                  <AlertDescription className="text-sm">
                    The XRP Ledger requires every new account to hold a small reserve (currently 1 XRP) before it shows
                    up on-chain. Send any amount of XRP ≥ 1 to your address from another wallet, a friend, or an
                    exchange. We don't activate it for you — that would be custody, and we don't do custody.
                  </AlertDescription>
                </Alert>
              )}

              <div className="rounded-md border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-[#00A4E4]/5 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Fund your wallet with a debit or credit card</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Powered by Stripe. The crypto goes directly to your wallet address — CryptoOwnBank never touches
                      it. Stripe verifies your identity (a regulatory requirement for fiat purchases). To stay fully
                      anonymous, fund via a peer-to-peer trade or DEX swap instead.
                    </div>
                  </div>
                </div>

                {(() => {
                  const supportedChains = derivedAll.filter(
                    (d) => chainHasAnyOnramp(d.chain) || chainHasThorBridge(d.chain),
                  );
                  if (supportedChains.length === 0) {
                    return (
                      <div className="text-xs text-muted-foreground italic">
                        None of your derived addresses have a card-purchase rail yet. Fund from any exchange or wallet to the addresses shown.
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2" data-testid="list-stripe-onramp">
                      {supportedChains.map((d) => {
                        const stripeOpts = getStripeOptionsForChain(d.chain);
                        const externalOpts = getExternalOnrampsForChain(d.chain);
                        const bridgeEligible = chainHasThorBridge(d.chain) && d.chain.toLowerCase() !== "btc";
                        return (
                          <div key={d.chain} className="rounded-md border bg-background/60 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-[10px]">{d.symbol}</Badge>
                              <span className="text-sm font-semibold">{d.displayName}</span>
                              <code className="text-[10px] font-mono text-muted-foreground truncate">
                                {d.address.slice(0, 12)}…{d.address.slice(-6)}
                              </code>
                            </div>
                            {stripeOpts.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {stripeOpts.map((opt) => {
                                  const key = `${opt.currency}-${opt.network}`;
                                  const isLoading = onrampLoading === key;
                                  return (
                                    <Button
                                      key={key}
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleBuyWithCard(d.address, opt)}
                                      disabled={onrampLoading !== null}
                                      className="h-7 text-xs"
                                      data-testid={`button-onramp-${d.chain}-${opt.currency}-${opt.network}`}
                                    >
                                      {isLoading ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <CreditCard className="h-3 w-3 mr-1" />
                                      )}
                                      Buy {opt.label}
                                    </Button>
                                  );
                                })}
                              </div>
                            )}
                            {externalOpts.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {externalOpts.map((opt) => (
                                    <Button
                                      key={opt.provider}
                                      size="sm"
                                      variant="outline"
                                      asChild
                                      className="h-7 text-xs"
                                      data-testid={`button-external-onramp-${d.chain}-${opt.provider}`}
                                    >
                                      <a href={opt.url} target="_blank" rel="noopener noreferrer">
                                        <Globe className="h-3 w-3 mr-1" />
                                        {opt.label} →
                                      </a>
                                    </Button>
                                  ))}
                                </div>
                                {externalOpts.map((opt) => (
                                  <div key={`note-${opt.provider}`} className="text-[10px] text-muted-foreground leading-snug">
                                    <span className="font-semibold">{opt.label}:</span> {opt.note}
                                  </div>
                                ))}
                              </div>
                            )}
                            {bridgeEligible && (
                              <div className="space-y-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setBridgeModalChain(d.chain)}
                                  className="h-7 text-xs border-emerald-500/40 hover:bg-emerald-500/10"
                                  data-testid={`button-bridge-${d.chain}`}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  Buy {d.symbol} with card (via THORChain)
                                </Button>
                                <div className="text-[10px] text-muted-foreground leading-snug">
                                  Card → USDC (Stripe) → {d.symbol} (THORChain swap). Two steps, ~10 min, non-custodial.
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div className="text-[11px] text-muted-foreground border-t pt-2 flex items-start gap-1.5">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <div>
                    LTC, DOGE, and BCH use a 2-step bridge (card → USDC → on-chain swap). TRX and ATOM don't have a card rail yet — fund those from any exchange (Coinbase, Kraken, Binance) to the address shown above.
                  </div>
                </div>
              </div>

              {derivedAll.length > 0 && (
                <div className="rounded-md border border-[#00A4E4]/30 bg-gradient-to-br from-[#00A4E4]/5 to-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Globe className="h-5 w-5 text-[#00A4E4] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Your seed unlocks ~22 chains — here are the addresses</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Same 12 words, different derivation paths. All computed in your browser, right now. Every
                        address below is yours and works the moment it receives funds — even if CryptoOwnBank disappears
                        tomorrow.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2" data-testid="list-derived-addresses">
                    {derivedAll.map((d) => (
                      <div
                        key={d.chain}
                        className="rounded-md border bg-background/60 p-3 space-y-1.5"
                        data-testid={`row-derived-${d.chain}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {d.symbol}
                            </Badge>
                            <span className="text-sm font-semibold">{d.displayName}</span>
                            {savedChains.has(d.chain) && (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => copy(d.address, `${d.symbol} address`)}
                            data-testid={`button-copy-${d.chain}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <code className="block text-xs font-mono break-all text-muted-foreground" data-testid={`text-address-${d.chain}`}>
                          {d.address}
                        </code>
                        {d.alsoCovers && d.alsoCovers.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            <span className="text-[10px] text-muted-foreground">Also covers:</span>
                            {d.alsoCovers.map((c) => (
                              <Badge key={c} variant="secondary" className="text-[10px] font-normal py-0">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {d.notes && (
                          <div className="text-[11px] text-muted-foreground italic">{d.notes}</div>
                        )}
                        <div className="text-[10px] text-muted-foreground/70 font-mono">{d.derivationPath}</div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleSaveAllChains}
                    disabled={savingAll || savedChains.size >= derivedAll.length}
                    className="w-full bg-[#00A4E4] hover:bg-[#0090c9] text-white"
                    data-testid="button-save-all-chains"
                  >
                    {savingAll ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving addresses…</>
                    ) : savedChains.size >= derivedAll.length ? (
                      <><Check className="h-4 w-4 mr-2" /> All {derivedAll.length} addresses saved to your wallet list</>
                    ) : (
                      <>Save all {derivedAll.length} addresses to my wallet list</>
                    )}
                  </Button>

                  <div className="text-[11px] text-muted-foreground border-t pt-2">
                    <div className="flex items-start gap-1.5">
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Not literally every chain.</strong> The following chains use non-standard derivation
                        — your seed still controls them mathematically, but you need their native wallet app to see
                        them:{" "}
                        {NON_DERIVABLE_CHAINS.map((c, i) => (
                          <span key={c.name}>
                            <span title={c.reason} className="underline decoration-dotted">{c.name}</span>
                            {i < NON_DERIVABLE_CHAINS.length - 1 ? ", " : "."}
                          </span>
                        ))}{" "}
                        See the FAQ for details.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link href="/wallets">
                  <Button variant="outline" className="w-full" data-testid="button-view-wallets">
                    View all wallets
                  </Button>
                </Link>
                <Link href="/">
                  <Button className="w-full" data-testid="button-dashboard">
                    Go to dashboard <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>

              <div className="text-center pt-2">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                  onClick={resetAll}
                  data-testid="button-create-another"
                >
                  Create another wallet
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {bridgeModalChain && (() => {
        const target = derivedAll.find((d) => d.chain === bridgeModalChain);
        const evm = derivedAll.find((d) => d.chain === "evm");
        if (!target || !evm) return null;
        return (
          <AutoBridgeModal
            open={!!bridgeModalChain}
            onOpenChange={(o) => { if (!o) setBridgeModalChain(null); }}
            toChain={target.chain}
            destinationAddress={target.address}
            evmAddress={evm.address}
          />
        );
      })()}
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1 ${active ? "text-foreground font-semibold" : done ? "text-green-600" : "text-muted-foreground"}`}>
      <span className={`h-2 w-2 rounded-full ${active ? "bg-[#00A4E4]" : done ? "bg-green-600" : "bg-muted-foreground/30"}`} />
      {label}
    </div>
  );
}

function ModeCard({
  icon,
  title,
  subtitle,
  badge,
  onClick,
  testId,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-md border hover:border-[#00A4E4] hover:bg-muted/30 transition-colors"
      data-testid={testId}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-[#00A4E4]">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-semibold">{title}</div>
            <Badge variant="secondary" className="text-xs">{badge}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">{subtitle}</div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
      </div>
    </button>
  );
}

function EntropyMeter({ input }: { input: string }) {
  const bits = shannonEntropyBits(input);
  const pct = Math.min(100, Math.round((bits / 128) * 100));
  const color = bits >= 128 ? "bg-green-600" : bits >= 64 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">Entropy</span>
        <span className={bits >= 128 ? "text-green-600 font-semibold" : "text-muted-foreground"} data-testid="text-entropy-bits">
          ~{bits} / 128 bits {bits >= 128 ? "✓" : ""}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
