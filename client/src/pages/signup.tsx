import { useState } from "react";
import { SeoHead } from "@/components/seo-head";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wallet, Eye, EyeOff, CheckCircle2, Mail } from "lucide-react";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const signupMutation = useMutation({
    mutationFn: async () => {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message);
      }
      return data;
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    signupMutation.mutate();
  };

  if (success) {
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
              <div className="mx-auto w-16 h-16 rounded-full bg-[#00A4E4]/10 flex items-center justify-center mb-6">
                <Mail className="h-8 w-8 text-[#00A4E4]" />
              </div>
              <h2 className="text-2xl font-bold mb-2" data-testid="heading-check-email">Check Your Email</h2>
              <p className="text-muted-foreground mb-2">
                We've sent a verification link to:
              </p>
              <p className="font-medium mb-6" data-testid="text-signup-email">{email}</p>
              <p className="text-sm text-muted-foreground mb-6">
                Click the link in your email to verify your address, then you can sign in.
              </p>
              <a href="/login">
                <Button className="w-full" variant="outline" data-testid="button-go-to-login">
                  Go to Login
                </Button>
              </a>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SeoHead
        title="Sign Up — CryptoOwnBank | Create Your Free Account"
        description="Create a free CryptoOwnBank account. Track your crypto portfolio across 24 blockchains, earn yield on RLUSD, and manage everything from one dashboard."
        path="/signup"
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
              <h1 className="text-2xl font-bold" data-testid="heading-signup">Create Account</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Join CryptoOwnBank — Be Your Own Bank
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    data-testid="input-last-name"
                  />
                </div>
              </div>

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
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 chars, uppercase, lowercase, number"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className={password.length >= 8 ? "text-emerald-500" : ""}>
                    {password.length >= 8 ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> : "○ "}
                    At least 8 characters
                  </p>
                  <p className={/[A-Z]/.test(password) ? "text-emerald-500" : ""}>
                    {/[A-Z]/.test(password) ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> : "○ "}
                    One uppercase letter
                  </p>
                  <p className={/[a-z]/.test(password) ? "text-emerald-500" : ""}>
                    {/[a-z]/.test(password) ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> : "○ "}
                    One lowercase letter
                  </p>
                  <p className={/[0-9]/.test(password) ? "text-emerald-500" : ""}>
                    {/[0-9]/.test(password) ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> : "○ "}
                    One number
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  data-testid="input-confirm-password"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-[#00A4E4] hover:bg-[#0090c9]"
                disabled={signupMutation.isPending}
                data-testid="button-signup-submit"
              >
                {signupMutation.isPending ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <a href="/login" className="text-[#00A4E4] hover:underline font-medium" data-testid="link-login">
                Sign In
              </a>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
