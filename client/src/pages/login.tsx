import { useState } from "react";
import { SeoHead } from "@/components/seo-head";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Eye, EyeOff, AlertCircle, Mail, RefreshCw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorState, setErrorState] = useState<{ message: string; code?: string } | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  const handleResendVerification = async () => {
    if (!email) return;
    setResendingVerification(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      toast({ title: "Verification Email Sent", description: data.message });
      setErrorState(null);
    } catch {
      toast({ title: "Error", description: "Failed to resend verification email. Please try again.", variant: "destructive" });
    } finally {
      setResendingVerification(false);
    }
  };

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw { message: data.message, code: data.code };
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    },
    onError: (error: any) => {
      setErrorState({ message: error.message, code: error.code });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorState(null);
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SeoHead
        title="Log In — CryptoOwnBank"
        description="Log in to your CryptoOwnBank account. Track your crypto portfolio, manage yield vaults, and access your dashboard."
        path="/login"
      />
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
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold" data-testid="heading-login">Sign In</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Welcome back to CryptoOwnBank
              </p>
            </div>

            {errorState && (
              <div className={`mb-6 p-4 rounded-lg border ${errorState.code === "EMAIL_NOT_VERIFIED" ? "bg-blue-50 dark:bg-blue-950/30 border-[#00A4E4]/30" : "bg-destructive/10 border-destructive/20"}`}>
                <div className="flex items-start gap-3">
                  {errorState.code === "EMAIL_NOT_VERIFIED" ? (
                    <Mail className="h-5 w-5 text-[#00A4E4] mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{errorState.message}</p>
                    {errorState.code === "EMAIL_NOT_VERIFIED" && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-2">
                          Didn't get the email or link didn't work? We'll send a new one.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResendVerification}
                          disabled={resendingVerification || !email}
                          className="border-[#00A4E4] text-[#00A4E4] hover:bg-[#00A4E4]/10"
                          data-testid="button-resend-verification"
                        >
                          {resendingVerification ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="h-3.5 w-3.5 mr-1.5" />
                              Resend Verification Email
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    {errorState.code === "NO_ACCOUNT" && (
                      <a href="/signup" className="text-sm text-[#00A4E4] hover:underline mt-1 inline-block" data-testid="link-create-account">
                        Create an Account
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="/forgot-password" className="text-xs text-[#00A4E4] hover:underline" data-testid="link-forgot-password">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#00A4E4] hover:bg-[#0090c9]"
                disabled={loginMutation.isPending}
                data-testid="button-login-submit"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <a href="/signup" className="text-[#00A4E4] hover:underline font-medium" data-testid="link-signup">
                Sign Up
              </a>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
