import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wallet, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [, params] = useRoute("/verify-email/:token");
  const token = params?.token || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link");
      return;
    }

    fetch(`/api/auth/verify-email/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.message);
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Verification failed. Please try again.");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#00A4E4]">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold">CryptoOwnBank</span>
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            {status === "loading" && (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Loader2 className="h-8 w-8 text-[#00A4E4] animate-spin" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Verifying Email</h2>
                <p className="text-muted-foreground">Please wait...</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2" data-testid="heading-email-verified">Email Verified</h2>
                <p className="text-muted-foreground mb-6">
                  Your email has been verified successfully. You can now sign in.
                </p>
                <a href="/login">
                  <Button className="w-full bg-[#00A4E4] hover:bg-[#0090c9]" data-testid="button-go-to-login">
                    Go to Login
                  </Button>
                </a>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold mb-2" data-testid="heading-verify-error">Verification Failed</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <a href="/">
                  <Button variant="outline" className="w-full" data-testid="button-go-home">
                    Go to Home
                  </Button>
                </a>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
