import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const faqGroups = [
  {
    heading: "About CryptoOwnBank",
    items: [
      {
        q: "Why was CryptoOwnBank created? (And why should I use it?)",
        a: "CryptoOwnBank was created for one reason: to help people truly become their own bank \u2014 without giving up control of their assets. Most tools today force you to choose between: custodial platforms (Uphold, Binance, Coinbase) that hold your keys and pay low yields (3\u20136%), traditional banks that pay almost nothing (0.01\u20134.5%) and control your money, or raw blockchain explorers and DeFi apps that feel complicated and overwhelming. We built CryptoOwnBank to fix all three problems at once: (1) Full ownership \u2014 your cold wallet (Ledger, ELLIPAL, Arculus, etc.) stays in control; we never see or store your private keys. (2) Real, higher yields \u2014 earn 5\u20138% fixed APR on RLUSD through Soil Protocol\u2019s real-world-asset vaults (Treasuries, private credit) with automatic compounding if you don\u2019t withdraw interest. (3) Simplicity & power \u2014 one clean dashboard to connect your wallet, track your XRPL portfolio, deposit to vaults, withdraw only the interest you want, and see everything in real time. No copy-pasting addresses, no switching apps. (4) Future-proof \u2014 built for XRPL today (RLUSD + Soil), ready for tomorrow (XLS-66 XRP lending, more protocols, multi-chain support) \u2014 all while keeping you non-custodial.",
      },
      {
        q: "What is CryptoOwnBank?",
        a: "CryptoOwnBank is a non-custodial dashboard that lets you track your XRP & RLUSD portfolio and earn fixed yield on RLUSD through Soil Protocol vaults \u2014 all while keeping full control via your cold wallet (Ledger or Xumm). We help you \u201Cbe your own bank\u201D: deposit RLUSD, earn 5\u20138% fixed APR, withdraw only the interest, and leave your principal locked and protected forever \u2014 without ever selling your base holdings.",
      },
      {
        q: "How does CryptoOwnBank compare to traditional banks and crypto exchanges?",
        a: "Banks offer 0.01\u20134.5% yield but you\u2019re an unsecured creditor \u2014 they own the money. Centralized exchanges (Uphold ~3.75%, others up to 6%) hold your keys custodially. CryptoOwnBank + Soil gives you 5\u20138% fixed APR with automatic compounding, and you own 100% \u2014 keys stay on your cold wallet, every action requires your signature. Other advantages: no KYC on our end, no bank linking, low XRPL fees (~0.0001 XRP vs $15\u201330 wire fees), interest-only withdrawals so principal keeps earning, and future XLS-66 XRP lending from the same dashboard.",
      },
      {
        q: "How does CryptoOwnBank make money?",
        a: "Free tier forever (basic tracking + manual withdrawals). Premium subscription ($9/mo or $79/yr) for auto-withdrawals, tax exports, family views, etc. Affiliate referrals (e.g., when you buy RLUSD via our exchange links or join Soil via our referral \u2014 we may earn rewards; disclosed transparently). We never take fees from your yields or principal.",
      },
      {
        q: "Can CryptoOwnBank connect to other blockchains and protocols in the future?",
        a: "Yes \u2014 and that\u2019s exactly the vision. CryptoOwnBank is built to be your personal on-chain control center \u2014 not just for XRPL today, but for any blockchain or smart contract that offers yield, lending, staking, or tokenized assets. Coming soon: native XRP lending, more XRPL protocols, and multi-chain support \u2014 all while keeping you in 100% control.",
      },
      {
        q: "Why should I join now?",
        a: "Regulatory clarity is advancing, RLUSD is growing as the compliant stablecoin of choice, and institutional DeFi is expanding. Banks are still offering minimal yields. CryptoOwnBank lets you start earning real, fixed yield today while keeping full control of your assets \u2014 no waiting for traditional finance to catch up.",
      },
    ],
  },
  {
    heading: "Wallet & Security Basics",
    items: [
      {
        q: "Why do I need a cold wallet to use CryptoOwnBank?",
        a: "To keep you in full control. We are 100% non-custodial \u2014 your private keys never leave your Ledger, ELLIPAL, Arculus, SafePal, etc. The site only reads public data and builds transactions for you to sign. Without a cold wallet, there\u2019s no way to approve deposits or withdrawals.",
      },
      {
        q: "Is this a wallet? Do you hold my funds?",
        a: "No \u2014 we are 100% non-custodial. We never hold, control, or have access to your funds or private keys. All actions (deposits, withdrawals) are signed directly from your own cold wallet. The dashboard is just a secure interface to view balances and interact with XRPL + Soil. Your keys stay on your Ledger or Xumm device at all times.",
      },
      {
        q: "What wallets are supported?",
        a: "For XRPL yield vaults, we support Xumm/Xaman (mobile app with QR code / deep link connection) and Ledger hardware wallets (Nano S/X via Bluetooth through Xaman). Both are cold wallet solutions that keep your private keys completely offline or on a secure device. For portfolio tracking, you connect exchange accounts via API keys. See our step-by-step Setup Guide at /setup-guide for detailed instructions.",
      },
      {
        q: "Do Ledger Nano X and Xaman show the same address for RLUSD?",
        a: "Yes \u2014 when you pair Ledger Nano X with Xaman, Xaman displays the exact XRPL address controlled by your Ledger device. There is only one address. Xaman is the bridge that sends signing requests to Ledger \u2014 the keys stay on Ledger.",
      },
      {
        q: "Does every transaction require Ledger signing even if I use Xaman?",
        a: "Yes. Xaman builds the transaction and forwards it to your paired Ledger for offline approval. You physically confirm on the Ledger device every time. This is the security model \u2014 no keys ever leave hardware.",
      },
      {
        q: "How do I connect my Ledger Nano X with Xaman?",
        a: "1) Install Xaman (App Store/Google Play) and Ledger Live. 2) Open Xaman \u2192 Settings \u2192 Hardware Wallets \u2192 Ledger \u2192 enable Bluetooth \u2192 unlock Ledger \u2192 open XRP app \u2192 pairs automatically. 3) Add RLUSD trust line: tap \u201C+\u201D Add Token \u2192 RLUSD \u2192 Setup Trust Line \u2192 sign on Ledger. 4) On CryptoOwnBank, click \u201CConnect Wallet\u201D \u2192 Xumm/Xaman \u2192 approve in Xaman (Ledger confirms if needed). Done \u2014 deposit RLUSD to Soil vaults and sign with your Ledger/Xaman combo. Full guide: /setup-guide",
      },
      {
        q: "Do I need a destination tag/memo when transferring RLUSD?",
        a: "No \u2014 RLUSD on XRPL does not require tags or memos (unlike XLM on Stellar). Just send to your correct XRPL address (starts with \u201Cr\u2026\u201D). Always double-check the address before sending.",
      },
      {
        q: "Is my data secure?",
        a: "Your exchange API keys are encrypted at rest using AES-256. Your XRPL wallet connection is read-only \u2014 we only see your public address. All transaction signing happens on your device. We use secure authentication and Stripe for payment processing. We never store private keys or seed phrases.",
      },
    ],
  },
  {
    heading: "Yield & Soil Mechanics",
    items: [
      {
        q: "What is RLUSD and how do the yield vaults work?",
        a: "RLUSD is Ripple\u2019s regulated stablecoin, pegged 1:1 to the US Dollar and backed by cash and cash equivalents. The yield comes from Soil Protocol, which lends your RLUSD to institutional borrowers \u2014 similar to how traditional banks make money, except the interest goes to you. The Treasury Vault (5.2% APR) is backed by US government securities. The CREDIT+ Vault (8.0% APR) is backed by diversified private credit pools.",
      },
      {
        q: "Which vault should I choose \u2014 Treasury (5.2%) or CREDIT+ (8.0%)?",
        a: "It depends on your risk tolerance and how soon you might need your funds. The Treasury Vault (5.2% APR) is backed by US government securities \u2014 essentially the safest asset class in the world. It has a short 3-day rolling withdrawal period, so you can access your funds quickly. Best for: stability and liquidity. The CREDIT+ Vault (8.0% APR) is backed by diversified private credit pools (institutional lending). It pays more but requires a 90-day notice + 10-day cooldown to withdraw, and carries higher default risk than Treasuries. Best for: users willing to lock funds longer for bigger returns. You can also split your RLUSD across both vaults.",
      },
      {
        q: "Does interest in Soil vaults compound automatically?",
        a: "Yes. If you do not withdraw the earned interest, it is automatically added to your position in the vault and starts earning additional yield right away. Example: Deposit $10,000 RLUSD at 6% APR. After one month \u2248 $50 interest is earned. If left in the vault, your new balance becomes ~$10,050. Next month\u2019s interest is calculated on the larger amount \u2014 this is automatic compounding. There is no \u201Creinvest\u201D button because it happens by default.",
      },
      {
        q: "How does Soil compare to Uphold\u2019s 3.75% yield?",
        a: "Soil offers 5\u20138% fixed APR (real RWA-backed yield from Treasuries and private credit) with automatic compounding \u2014 usually higher than Uphold\u2019s ~3.75%. Plus you get full self-custody (your keys stay on your cold wallet) instead of Uphold holding everything custodially. The trade-off: Uphold is simpler to start with, but you give up ownership and earn less.",
      },
      {
        q: "How do I withdraw my earned interest?",
        a: "Go to the Withdraw Interest page, select a vault, and click \u201CWithdraw Interest.\u201D The app builds a transaction sending ONLY your accrued interest to your designated spending wallet. You sign the transaction on your Xumm or Ledger. Free users withdraw manually; Premium users can set up automatic weekly withdrawals.",
      },
      {
        q: "Why can\u2019t I withdraw my full principal anytime?",
        a: "Soil vaults are lending pools backed by real-world assets (U.S. Treasuries, private credit, etc.). Withdrawal rules depend on the vault: Liquid/Treasury vaults have a 3-day rolling period. Credit vaults require a 90-day notice + 10-day cooldown (interest continues during notice). Your funds earn during notice periods, but the lock-up aligns with underlying assets for stability.",
      },
      {
        q: "How safe is my principal?",
        a: "Your principal is protected in two ways: 1) Non-custodial design \u2014 keys never leave your cold wallet. 2) Soil vaults are backed by real-world assets (Treasuries, credit funds) with institutional-grade underwriting. Yields are fixed and predictable, but crypto/blockchain always carries risks (smart contract bugs, protocol changes, market events). Always DYOR.",
      },
      {
        q: "What happens if Soil or XRPL has issues?",
        a: "Soil is a compliant RWA protocol on XRPL \u2014 funds are loaned to Soil Ltd. (backed by real assets), not algorithmic or high-risk DeFi. If issues arise (rare), withdrawals follow vault rules (notice periods). XRPL itself is battle-tested and decentralized. Your assets stay on-chain in your wallet \u2014 we can\u2019t access or lose them.",
      },
    ],
  },
  {
    heading: "Exchange API Keys",
    items: [
      {
        q: "How do I get an API key from my exchange?",
        a: "Each exchange has its own process, but the general steps are: 1) Log in to your exchange account. 2) Go to Account Settings or Security. 3) Find the 'API' or 'API Management' section. 4) Create a new API key and label it 'CryptoOwnBank'. 5) IMPORTANT: Only enable READ-ONLY permissions (never enable trading or withdrawal). 6) Copy the API Key and Secret. 7) Paste them into the Integrations page on CryptoOwnBank. When you select an exchange on our Integrations page, we show you step-by-step instructions specific to that exchange.",
      },
      {
        q: "How do I get a Binance.US API key? (US residents)",
        a: "Log in to Binance.US > click your profile icon > API Management > Create API > choose 'System generated' > label it 'CryptoOwnBank' > complete 2FA verification > IMPORTANT: only enable 'Can Read' (disable trading/withdrawals) > copy your API Key and Secret Key. Direct link: binance.us/settings/api-management. Note: US residents must use Binance.US — the global Binance platform (binance.com) is not available to US users.",
      },
      {
        q: "How do I get a Binance (Global) API key?",
        a: "Log in to Binance > hover over your profile icon > API Management > Create API > choose 'System generated' > label it 'CryptoOwnBank' > complete 2FA verification > IMPORTANT: only enable 'Enable Reading' (disable trading/withdrawals) > copy your API Key and Secret Key. Direct link: binance.com/en/my/settings/api-management. Note: This is the global Binance platform — US residents should use Binance.US instead.",
      },
      {
        q: "How do I get a Coinbase API key?",
        a: "Log in to Coinbase > Settings > API > New API Key > select all 'View' permissions only (wallet:accounts:read, wallet:transactions:read, etc.) > complete 2FA > copy your API Key and API Secret. Direct link: coinbase.com/settings/api",
      },
      {
        q: "How do I get a Kraken API key?",
        a: "Log in to Kraken > Security > API > Add Key > name it 'CryptoOwnBank' > under Permissions check ONLY 'Query Funds' and 'Query Open Orders & Trades' > Generate Key > copy your API Key and Private Key. Direct link: kraken.com/u/security/api",
      },
      {
        q: "How do I get a Crypto.com API key?",
        a: "Log in to Crypto.com Exchange > Settings > API Keys > Create a new API Key > label it 'CryptoOwnBank' > enable ONLY 'Read' permissions > complete 2FA > copy your API Key and Secret Key. Direct link: crypto.com/exchange/personal/api-management",
      },
      {
        q: "How do I get API keys for KuCoin, Bybit, OKX, or other exchanges?",
        a: "The process is similar for all exchanges: go to your account's API settings, create a new key with READ-ONLY permissions, and copy the credentials. For KuCoin, Bybit, and OKX you may also need to set an API passphrase — save this separately as you'll need it. When you select any exchange on our Integrations page, we show you the exact steps and a direct link to that exchange's API settings page.",
      },
      {
        q: "Can I connect Robinhood or Fidelity?",
        a: "Robinhood and Fidelity do not currently offer public APIs for third-party portfolio tracking. You can manually add your holdings or export your transaction history as CSV files from their apps/websites and import them into CryptoOwnBank. We're monitoring both platforms for future API availability.",
      },
      {
        q: "Is it safe to give CryptoOwnBank my API key?",
        a: "Yes — we take several precautions: 1) All API keys are encrypted using AES-256 before storage. 2) We only request read-only access — we cannot trade, transfer, or withdraw anything from your exchange account. 3) You can disconnect (revoke access) anytime from our Integrations page. 4) For extra safety, most exchanges let you restrict API keys by IP address. Always create keys with the minimum permissions needed (read-only).",
      },
    ],
  },
  {
    heading: "Getting Started & Transfers",
    items: [
      {
        q: "How do I start earning yield on RLUSD?",
        a: "1) Buy RLUSD on a trusted exchange (Binance, Kraken, Coinbase, etc.) and withdraw it to your XRPL wallet. 2) Connect your cold wallet to the dashboard. 3) Deposit RLUSD into a Soil vault (Treasury-backed at 5.2% or CREDIT+ at 8.0%). 4) Earn fixed yield immediately \u2014 your principal stays locked. 5) Withdraw only the accrued interest whenever you want (manual or auto for Premium users). No KYC on our end, no bank linking required.",
      },
      {
        q: "Can I transfer RLUSD from Uphold to my cold wallet?",
        a: "Yes \u2014 Uphold supports XRPL withdrawals. Go to Withdraw \u2192 RLUSD \u2192 XRPL network \u2192 paste your wallet address. Test with a small amount first. Make sure your trust line to RLUSD is set in Xaman/Ledger before sending. Funds typically arrive in seconds with fees around ~0.0001 XRP.",
      },
      {
        q: "Which exchange should I recommend for buying RLUSD?",
        a: "Binance usually offers the best liquidity and lowest fees for RLUSD. Kraken is great for low-cost XRPL withdrawals. Crypto.com and Uphold are beginner-friendly. Use the referral links on the My Referrals page to help others \u2014 you may earn rewards when they sign up and buy.",
      },
      {
        q: "Should I route through an exchange to earn referral rewards on my own transfer?",
        a: "Not worth it for your own funds. Referral commissions only trigger for new users signing up via your link \u2014 self-referral usually doesn\u2019t pay and adds extra fees/steps. Transfer directly from Uphold (or wherever your RLUSD is) to your cold wallet, then use your referral links to help others buy RLUSD.",
      },
      {
        q: "Why don\u2019t you connect directly to my bank account?",
        a: "We deliberately stay on-chain only to keep things simple, secure, and non-custodial. Bank integrations would require us to handle fiat, trigger money transmitter rules (federal MSB registration + state licenses), and force KYC/AML on users \u2014 adding delays, fees, and risks. By skipping banks, we avoid all that: no middleman, no data collection, no compliance overhead. You buy RLUSD on exchanges, deposit on-chain, and manage everything from your wallet \u2014 faster, cheaper, and truly in your control.",
      },
      {
        q: "Can I use this for other cryptos besides XRP/RLUSD?",
        a: "Currently focused on XRPL-native assets (XRP, RLUSD, Soil positions). You can also connect exchange accounts (Coinbase, Kraken, Binance) to track your full crypto portfolio \u2014 Bitcoin, Ethereum, altcoins, and more. Future updates will add multi-chain support so you can manage more from one dashboard \u2014 still signing from your cold wallet.",
      },
    ],
  },
  {
    heading: "Premium, Referrals & Features",
    items: [
      {
        q: "What\u2019s the difference between Free and Premium?",
        a: "Free gives you full access to portfolio tracking, wallet connection, vault deposits, manual interest withdrawal, tax reports (CSV export), 3 price alerts, and the yield calculator. Premium ($9/month or $79/year) adds automatic weekly interest withdrawals, PDF tax report exports, unlimited price alerts, priority vault alerts, XLS-66 lending early access, and premium referral bonuses.",
      },
      {
        q: "How do Price Alerts work?",
        a: "Set a target price for any supported crypto (XRP, BTC, ETH, SOL, ADA, and more). Choose whether you want to be notified when the price goes above or below your target. Our system checks prices every 60 seconds and sends you an email notification when your alert triggers. Free users can have up to 3 active alerts; Premium users get unlimited alerts.",
      },
      {
        q: "What is the Yield Calculator?",
        a: "The Yield Calculator is a free public tool (no login required) that lets you estimate how much you\u2019d earn by depositing RLUSD into Soil vaults. Enter any amount, choose Treasury (5.2% APR) or CREDIT+ (8.0% APR), and toggle between simple and compound interest to see projected daily, weekly, monthly, and yearly earnings. Try it at /yield-calculator.",
      },
      {
        q: "Can I export my tax report as a PDF?",
        a: "Yes \u2014 Premium users can download a professionally formatted PDF tax report with a summary of short-term and long-term gains/losses, a full table of all gain events, and a disclaimer footer. Free users can still export CSV files. Go to Tax Reports, select your year and method, then click the PDF button.",
      },
      {
        q: "How does the referral program work?",
        a: "Share your unique referral link with friends. When they sign up and deposit RLUSD, you earn bonus SEED points through Soil Protocol, which can boost your yields over time. If a referred friend upgrades to Premium, you get one free month of Premium.",
      },
      {
        q: "What is XLS-66 Lending?",
        a: "XLS-66 is a proposed XRPL amendment for native on-ledger lending. When it goes live (expected Q2 2026), OwnBank will integrate it so you can lend directly on the XRPL without any intermediary. Premium members get early access.",
      },
    ],
  },
  {
    heading: "Tax Reporting & Filing",
    items: [
      {
        q: "Can I use the CryptoOwnBank tax report directly for IRS filing?",
        a: "Our tax report is a detailed worksheet — not the actual IRS form itself. It gives you all the data you need (dates, proceeds, cost basis, gains/losses) organized to map directly to IRS Form 8949 and Schedule D. You can hand it to your accountant, import the TurboTax CSV into tax software, or use the numbers to fill in the forms manually.",
      },
      {
        q: "Which IRS forms do I need for crypto taxes?",
        a: "Capital gains and losses from selling or trading crypto go on IRS Form 8949 (Sales and Dispositions of Capital Assets), with totals transferring to Schedule D of your Form 1040. Soil vault interest income is taxable as ordinary income — report it on Schedule 1 (Additional Income), Line 8z as 'Other income.' Our reports break everything down by short-term vs long-term to match these forms.",
      },
      {
        q: "How do I import my tax report into TurboTax?",
        a: "On the Tax Reports page, click the 'TurboTax' export button to download a CSV formatted specifically for TurboTax import. In TurboTax, navigate to Investment Income, select 'Upload CSV,' and choose the downloaded file. The column format (Currency Name, Purchase Date, Date Sold, Proceeds, Cost Basis, Gain/Loss) matches what TurboTax expects.",
      },
      {
        q: "Does the report combine exchange data and Soil vault activity?",
        a: "Yes — the tax report pulls from all sources into one unified output. This includes trades from connected exchanges (Binance, Coinbase, Kraken, etc.), Soil vault deposits and interest payments synced from the XRPL blockchain, and any manually entered transactions. You get one complete picture across all your crypto activity in a single downloadable file.",
      },
      {
        q: "How is Soil vault interest taxed?",
        a: "Soil vault interest payments are classified as ordinary income, taxable in the year you receive them. Each interest payment from the Soil vault address to your wallet is recorded with the exact amount, date, and transaction hash from the XRPL blockchain. Depositing RLUSD into a Soil vault is a capital movement (not a taxable event). Only the interest you actually receive is reported as income — accrued but unpaid interest is not included.",
      },
      {
        q: "Do I still need the tax forms from my exchanges?",
        a: "Our report is designed to be your single source for all crypto tax data. However, exchanges like Coinbase and Kraken also issue their own tax forms (1099-MISC, 1099-B). It's good practice to cross-reference, but you don't need to report the same transactions twice. Our system deduplicates — exchange API data and on-chain Soil data are separate transaction sets with no overlap.",
      },
    ],
  },
  {
    heading: "Safety & Disclaimers",
    items: [
      {
        q: "Is this financial advice?",
        a: "No \u2014 this is not financial, investment, or tax advice. Crypto and yield protocols involve risk of loss. Past performance isn\u2019t indicative of future results. Always do your own research (DYOR) and consider your own situation. We provide tools and information only.",
      },
      {
        q: "What if I have more questions or issues?",
        a: "Use the in-site contact form or join XRPL community channels. Note: we can\u2019t help with wallet recovery or fund issues since we\u2019re non-custodial \u2014 only you control your keys.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left gap-4"
        data-testid={`faq-toggle-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
      >
        <span className="font-medium text-foreground">{q}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {open && (
        <p className="pb-5 text-muted-foreground leading-relaxed pr-8">{a}</p>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="faq-title">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mt-2">Everything you need to know about CryptoOwnBank, RLUSD vaults, and earning yield.</p>
      </div>
      {faqGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground mb-2" data-testid={`faq-group-${groupIndex}`}>{group.heading}</h2>
          <div className="rounded-lg border bg-card">
            {group.items.map((faq, index) => (
              <FAQItem key={index} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
