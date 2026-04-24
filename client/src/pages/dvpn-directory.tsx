import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink, Shield, Info, Globe } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  description: string;
  devices: string[];
  token: string;
  tokenChain: string;
  approxCost: string;
  usAvailable: string;
  url: string;
  setupUrl: string;
}

const PROVIDERS: Provider[] = [
  {
    id: "sentinel",
    name: "Sentinel",
    description:
      "Decentralized VPN built on Cosmos. Pay-per-bandwidth model with hundreds of community-operated exit nodes worldwide. Open source clients on every major platform.",
    devices: ["Windows", "macOS", "Linux", "Android", "iOS"],
    token: "DVPN",
    tokenChain: "Cosmos / Sentinel Hub",
    approxCost: "~$0.01–0.05 / GB",
    usAvailable: "Yes (use at your discretion)",
    url: "https://sentinel.co",
    setupUrl: "https://docs.sentinel.co/applications",
  },
  {
    id: "mysterium",
    name: "Mysterium Network",
    description:
      "Peer-to-peer dVPN running on Polygon. Browser extension and desktop apps. Pay with crypto or fiat top-ups; node operators are independent third parties.",
    devices: ["Windows", "macOS", "Linux", "Android", "iOS", "Browser Extension"],
    token: "MYST",
    tokenChain: "Polygon",
    approxCost: "~$0.05–0.20 / GB",
    usAvailable: "Yes (use at your discretion)",
    url: "https://www.mysterium.network",
    setupUrl: "https://www.mysterium.network/get-started",
  },
  {
    id: "orchid",
    name: "Orchid",
    description:
      "Probabilistic-payment VPN using nanopayments on Ethereum-compatible chains. Mix multiple providers in a single session. Mobile-first; iOS and Android clients.",
    devices: ["macOS", "Android", "iOS"],
    token: "OXT",
    tokenChain: "Ethereum",
    approxCost: "Pay-as-you-go nanopayments",
    usAvailable: "Yes (use at your discretion)",
    url: "https://www.orchid.com",
    setupUrl: "https://www.orchid.com/download",
  },
];

export default function DvpnDirectory() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Decentralized Network Partners
          </h1>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          A curated directory of decentralized network providers. These are independent
          third-party services — you sign up directly with them. CryptoOwnBank does not
          relay their traffic, custody their tokens, or receive referral commissions from
          this list.
        </p>
      </div>

      <Alert className="mb-6 border-amber-500/40 bg-amber-500/5" data-testid="alert-disclaimer">
        <Shield className="h-4 w-4" />
        <AlertTitle>Important disclaimers</AlertTitle>
        <AlertDescription className="space-y-1 mt-2">
          <p>
            <strong>CryptoOwnBank is not a VPN service.</strong> The providers below are
            operated by independent third parties.
          </p>
          <p>
            Using a dVPN does not anonymize on-chain transactions. Transaction details
            remain permanently visible on the public blockchain.
          </p>
          <p>
            Users are responsible for compliance with applicable laws in their jurisdiction.
            VPN use is restricted in some countries.
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {PROVIDERS.map((p) => (
          <Card key={p.id} data-testid={`card-provider-${p.id}`} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle data-testid={`text-provider-name-${p.id}`}>{p.name}</CardTitle>
                <Badge variant="outline" data-testid={`badge-token-${p.id}`}>
                  {p.token}
                </Badge>
              </div>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-2 text-sm flex-1">
                <div>
                  <span className="text-muted-foreground">Devices: </span>
                  <span data-testid={`text-devices-${p.id}`}>{p.devices.join(", ")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Token network: </span>
                  <span>{p.tokenChain}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Approximate cost: </span>
                  <span>{p.approxCost}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">US availability: </span>
                  <span>{p.usAvailable}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  asChild
                  variant="default"
                  size="sm"
                  className="flex-1"
                  data-testid={`button-visit-${p.id}`}
                >
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    Visit site <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  data-testid={`button-setup-${p.id}`}
                >
                  <a href={p.setupUrl} target="_blank" rel="noopener noreferrer">
                    Setup guide <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Why we share this directory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            CryptoOwnBank is built on a self-sovereign principle: you control your keys,
            and your access to blockchain networks should not depend on any single
            corporate provider. For users in regions where access to blockchain
            infrastructure is restricted, decentralized network partners provide an
            alternative network path.
          </p>
          <p>
            We do not operate any of these services, do not log which providers you choose,
            and do not receive payment for inclusion in this directory. We list only
            established projects with public source code and active maintenance.
          </p>
          <p>
            For network-level privacy from public RPC providers (Infura, Alchemy, Ripple),
            you can also enable our optional <strong>Privacy Mode</strong> in Settings,
            which routes blockchain reads through CryptoOwnBank infrastructure instead of
            sending them directly from your browser to public RPC providers. Privacy Mode
            is included free for all members; Pro members get higher relay throughput
            (60 requests/min vs 10 for free).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
