import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, Lock, Unlock, Eye, EyeOff, Info, Copy, CheckCircle2 } from "lucide-react";

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

export default function DecryptPage() {
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold" data-testid="text-decrypt-title">CryptoOwnBank Legacy Vault</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Decrypt recovery information left for you through a CryptoOwnBank Legacy Plan. Everything happens in your browser — nothing is sent to any server.
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How this works</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            <p>1. Paste the encrypted text from the email you received.</p>
            <p>2. Enter the Legacy Passphrase. This was shared with you separately — verbally, in a will, or through an attorney.</p>
            <p>3. The decryption happens entirely in your browser. No data leaves this page.</p>
          </AlertDescription>
        </Alert>

        {!result ? (
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
                    data-testid="button-toggle-passphrase"
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
        ) : (
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
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Write this information down and store it securely. Close this page when done — the decrypted content is not saved anywhere.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground">
          CryptoOwnBank never stores your passphrase or decrypted content. This page works entirely offline after loading.
        </p>
      </div>
    </div>
  );
}
