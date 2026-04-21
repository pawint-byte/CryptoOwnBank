import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, Lock, Unlock, Eye, EyeOff, Info, Copy, CheckCircle2, Layers, Plus, Trash2, AlertTriangle } from "lucide-react";
import { combineShards, hexToMnemonic } from "@/lib/slip39-client";

async function decryptVault(encryptedBase64: string, passphrase: string): Promise<string> {
  const raw = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  if (raw.length < 28) throw new Error("Invalid encrypted data");
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const ciphertext = raw.slice(28);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

function VaultDecryptForm() {
  const [encryptedText, setEncryptedText] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDecrypt = async () => {
    setError(null);
    setResult(null);
    if (!encryptedText.trim() || !passphrase) {
      setError("Please paste the encrypted text and enter the passphrase.");
      return;
    }
    setDecrypting(true);
    try {
      const cleaned = encryptedText.replace(/\s+/g, "");
      const plaintext = await decryptVault(cleaned, passphrase);
      setResult(plaintext);
    } catch {
      setError("Decryption failed. Check that the encrypted text is correct and the passphrase matches exactly.");
    } finally {
      setDecrypting(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (result) {
    return (
      <Card className="border-green-500" data-testid="card-decrypt-result">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" /> Decryption Successful
          </CardTitle>
          <CardDescription>The recovery information is shown below. Keep it safe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-4">
            <pre className="whitespace-pre-wrap text-sm font-mono" data-testid="text-decrypted-content">{result}</pre>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCopy} data-testid="button-copy-result">
              {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied" : "Copy to Clipboard"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => { setResult(null); setPassphrase(""); setEncryptedText(""); }} data-testid="button-decrypt-another">
              Decrypt Another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Decrypt Recovery Information</CardTitle>
        <CardDescription>Paste the encrypted block from your Legacy Plan email</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Encrypted Text</Label>
          <Textarea
            value={encryptedText}
            onChange={(e) => setEncryptedText(e.target.value)}
            placeholder="Paste the encrypted text block here..."
            rows={6}
            className="font-mono text-xs"
            data-testid="input-encrypted-text"
          />
        </div>
        <div className="space-y-2">
          <Label>Legacy Passphrase</Label>
          <div className="relative">
            <Input
              type={showPassphrase ? "text" : "password"}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter the passphrase shared with you"
              data-testid="input-decrypt-passphrase"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setShowPassphrase(!showPassphrase)}
            >
              {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {error && (
          <Alert variant="destructive" data-testid="alert-decrypt-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button className="w-full" size="lg" onClick={handleDecrypt} disabled={decrypting} data-testid="button-decrypt">
          <Unlock className="h-5 w-5 mr-2" />
          {decrypting ? "Decrypting..." : "Decrypt"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ShardCombineForm() {
  const [shards, setShards] = useState<string[]>(["", ""]);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [result, setResult] = useState<{ hex: string; mnemonic: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealResult, setRevealResult] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateShard = (i: number, v: string) => {
    setShards((prev) => prev.map((s, idx) => (idx === i ? v : s)));
  };

  const addShard = () => setShards((prev) => [...prev, ""]);
  const removeShard = (i: number) => setShards((prev) => prev.filter((_, idx) => idx !== i));

  const handleCombine = async () => {
    setError(null);
    setResult(null);
    setRevealResult(false);
    const cleaned = shards.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length < 2) {
      setError("Add at least 2 shards. Most schemes need 2 or 3.");
      return;
    }
    setBusy(true);
    try {
      const hex = combineShards(cleaned, passphrase);
      let mnemonic = "";
      try {
        mnemonic = hexToMnemonic(hex);
      } catch {
        mnemonic = "";
      }
      setResult({ hex, mnemonic });
    } catch (e: any) {
      const msg = e?.message || "Could not reconstruct seed.";
      const friendly =
        msg.includes("threshold") || msg.includes("Insufficient")
          ? "Not enough valid shards yet — collect more from the other holders, then try again."
          : msg.toLowerCase().includes("checksum") || msg.toLowerCase().includes("typo")
          ? "One or more shards have a typo — check word spelling. SLIP-39 shards are exactly 20 words each."
          : msg.toLowerCase().includes("passphrase")
          ? "The passphrase doesn't match the one used at split time."
          : msg;
      setError(`${friendly}\n\nTechnical detail: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = () => {
    if (result?.mnemonic) {
      navigator.clipboard.writeText(result.mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (result) {
    return (
      <Card className="border-green-500" data-testid="card-combine-result">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" /> Seed Reconstructed
          </CardTitle>
          <CardDescription>
            The shards combined successfully. The recovered seed is below — handle with extreme care.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">This is the original wallet seed</AlertTitle>
            <AlertDescription className="text-xs space-y-1">
              <p>Anyone who sees this controls the wallet. Reveal only when you are alone and ready to import it into a wallet app immediately.</p>
              <p>After importing, transfer funds to a wallet you control, then close this page.</p>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Recovered BIP-39 seed phrase</Label>
              <Button size="sm" variant="outline" onClick={() => setRevealResult(!revealResult)} data-testid="button-reveal-result">
                {revealResult ? <><EyeOff className="h-3 w-3 mr-1" /> Hide</> : <><Eye className="h-3 w-3 mr-1" /> Reveal</>}
              </Button>
            </div>
            <div className={`rounded-md border bg-muted/30 p-4 font-mono text-sm ${revealResult ? "" : "blur-md select-none"}`} data-testid="text-recovered-mnemonic">
              {result.mnemonic || `(non-BIP-39 secret) hex: ${result.hex}`}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCopy} disabled={!result.mnemonic} data-testid="button-copy-mnemonic">
              {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied" : "Copy seed phrase"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => { setResult(null); setShards(["", ""]); setPassphrase(""); setRevealResult(false); }} data-testid="button-recover-another">
              Start over
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Combine SLIP-39 Shards</CardTitle>
        <CardDescription>
          Paste each 20-word shard you received. Enter the threshold number — extras are fine but missing one will fail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {shards.map((s, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Shard {i + 1}</Label>
              {shards.length > 2 && (
                <Button size="sm" variant="ghost" onClick={() => removeShard(i)} data-testid={`button-remove-shard-${i}`}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>
              )}
            </div>
            <Textarea
              value={s}
              onChange={(e) => updateShard(i, e.target.value)}
              placeholder="word1 word2 word3 ... (20 words)"
              rows={2}
              className="font-mono text-xs"
              data-testid={`input-shard-${i}`}
            />
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addShard} data-testid="button-add-shard">
          <Plus className="h-3 w-3 mr-1" /> Add another shard
        </Button>

        <div className="space-y-1">
          <Label>SLIP-39 passphrase (only if one was set at split time)</Label>
          <div className="relative">
            <Input
              type={showPassphrase ? "text" : "password"}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Leave empty for standard recovery"
              data-testid="input-combine-passphrase"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setShowPassphrase(!showPassphrase)}
            >
              {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" data-testid="alert-combine-error">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <Button className="w-full" size="lg" onClick={handleCombine} disabled={busy} data-testid="button-combine">
          <Unlock className="h-5 w-5 mr-2" />
          {busy ? "Combining..." : "Reconstruct seed"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DecryptPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold" data-testid="text-decrypt-title">CryptoOwnBank Legacy Recovery</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Decrypt a passphrase-protected vault, or combine SLIP-39 shards from family members. Everything happens in your browser — nothing is sent to any server.
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Two ways to recover</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            <p><strong>Encrypted Vault:</strong> a single block of text decrypted with a passphrase. The legacy holder gave you both pieces.</p>
            <p><strong>SLIP-39 Shards:</strong> two or more 20-word "shards" handed to different people. Combine the threshold to reveal the original wallet seed.</p>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="vault" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vault" data-testid="tab-vault">Encrypted Vault</TabsTrigger>
            <TabsTrigger value="shards" data-testid="tab-shards">SLIP-39 Shards</TabsTrigger>
          </TabsList>
          <TabsContent value="vault" className="mt-4">
            <VaultDecryptForm />
          </TabsContent>
          <TabsContent value="shards" className="mt-4">
            <ShardCombineForm />
          </TabsContent>
        </Tabs>

        <p className="text-xs text-center text-muted-foreground">
          CryptoOwnBank never stores your passphrase, shards, or recovered seed. This page works entirely in your browser.
        </p>
      </div>
    </div>
  );
}
