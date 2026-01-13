import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  PieChart, 
  Shield, 
  TrendingUp, 
  FileText,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

const features = [
  {
    icon: PieChart,
    title: "Portfolio Tracking",
    description: "Real-time portfolio monitoring across all your exchanges and brokerages in one dashboard.",
  },
  {
    icon: TrendingUp,
    title: "Performance Analytics",
    description: "Track ROI, P&L, and visualize your gains with interactive charts and metrics.",
  },
  {
    icon: FileText,
    title: "Tax Reports",
    description: "Auto-calculate capital gains using FIFO/LIFO. Export IRS-ready reports with one click.",
  },
  {
    icon: Shield,
    title: "Bank-Grade Security",
    description: "Your API keys are encrypted at rest. We never store your exchange credentials in plain text.",
  },
];

const benefits = [
  "Connect unlimited exchanges",
  "Real-time price updates",
  "FIFO & LIFO tax calculations",
  "CSV & PDF export",
  "Multi-asset support",
  "Dark mode included",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
                <PieChart className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">CryptoBroker Tracker</span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a href="/api/login">
                <Button data-testid="button-login">Sign In</Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                    Track Your Crypto
                    <span className="block text-primary">& Investments</span>
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-lg">
                    Connect your exchanges and brokerages. Monitor performance in real-time. 
                    Generate tax reports automatically. All in one beautiful dashboard.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <a href="/api/login">
                    <Button size="lg" className="w-full sm:w-auto" data-testid="button-get-started">
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-chart-2" />
                    Free forever
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-chart-2" />
                    No credit card required
                  </span>
                </div>
              </div>

              <div className="relative">
                <div className="relative rounded-lg border bg-card p-6 shadow-lg">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
                        <p className="text-3xl font-bold font-mono">$127,845.32</p>
                      </div>
                      <div className="flex items-center gap-1 text-chart-2">
                        <TrendingUp className="h-5 w-5" />
                        <span className="font-medium">+12.4%</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 rounded-md bg-muted">
                        <p className="text-xs text-muted-foreground">24h P&L</p>
                        <p className="font-mono font-medium text-chart-2">+$2,340</p>
                      </div>
                      <div className="p-3 rounded-md bg-muted">
                        <p className="text-xs text-muted-foreground">ROI</p>
                        <p className="font-mono font-medium">+45.2%</p>
                      </div>
                      <div className="p-3 rounded-md bg-muted">
                        <p className="text-xs text-muted-foreground">Assets</p>
                        <p className="font-mono font-medium">12</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Bitcoin (BTC)</span>
                        <span className="font-mono">$67,234.56</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full w-[52%] bg-chart-1 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -z-10 -inset-4 bg-gradient-to-r from-primary/20 to-chart-2/20 rounded-xl blur-2xl opacity-50" />
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Powerful tools to track, analyze, and optimize your crypto and stock investments.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">
                  Built for Serious Investors
                </h2>
                <p className="text-muted-foreground mb-8">
                  Whether you're a crypto enthusiast or a diversified investor, 
                  CryptoBroker Tracker gives you the tools to stay on top of your portfolio.
                </p>
                <ul className="grid grid-cols-2 gap-4">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-chart-2 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-primary">10+</div>
                  <div className="text-sm text-muted-foreground">Supported Exchanges</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-primary">1000+</div>
                  <div className="text-sm text-muted-foreground">Crypto Assets</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-primary">256-bit</div>
                  <div className="text-sm text-muted-foreground">AES Encryption</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-primary">24/7</div>
                  <div className="text-sm text-muted-foreground">Real-time Data</div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Take Control?</h2>
            <p className="text-primary-foreground/80 mb-8">
              Join thousands of investors who trust CryptoBroker Tracker to manage their portfolios.
            </p>
            <a href="/api/login">
              <Button size="lg" variant="secondary" data-testid="button-cta-start">
                Start Tracking Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            <span className="font-semibold">CryptoBroker Tracker</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CryptoBroker Tracker. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
