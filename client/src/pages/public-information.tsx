import { Link, useLocation } from "wouter";
import { SeoHead } from "@/components/seo-head";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Compass,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Split,
  WalletCards,
} from "lucide-react";

type Page = {
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  points: { title: string; body: string }[];
  practical: string[];
  links: { label: string; href: string; note: string }[];
  faq?: { q: string; a: string }[];
};

const pages: Page[] = [
  {
    path: "/features",
    eyebrow: "What the operating system does",
    title: "A clearer way to run a personal treasury.",
    description: "Explore CryptoOwnBank features for self-directed crypto organization, monitoring, planning, and recordkeeping without handing over signing authority.",
    intro: "CryptoOwnBank brings the moving parts of self-directed crypto into one working view. It helps members organize information, prepare actions, and maintain continuity plans; members choose what to do and sign with their own wallet.",
    points: [
      { title: "See the shape of your holdings", body: "Track connected public addresses and activity so the work of locating balances, positions, and records starts from one place." },
      { title: "Prepare, then decide", body: "Use tools that explain routes and assemble transaction details. Review every destination, amount, network, and fee before your wallet is asked to sign." },
      { title: "Keep a human record", body: "Build useful context around wallets, beneficiaries, check-ins, and important instructions instead of leaving a family a list of unexplained addresses." },
    ],
    practical: ["Connect only addresses you want to observe.", "Use a wallet you control for any signature.", "Review information independently before acting."],
    links: [
      { label: "Legacy Plan", href: "/features/legacy-plan", note: "Continuity instructions and check-ins" },
      { label: "Portfolio tracker", href: "/features/portfolio-tracker", note: "A working view of holdings" },
      { label: "Security architecture", href: "/security/non-custodial-architecture", note: "How control remains with members" },
    ],
  },
  {
    path: "/features/legacy-plan",
    eyebrow: "Feature: legacy planning",
    title: "Make your crypto legible to the people you trust.",
    description: "Learn how CryptoOwnBank Legacy Plan helps members organize encrypted instructions, beneficiaries, and check-ins while keeping wallet control with the member.",
    intro: "A Legacy Plan is a practical continuity layer for self-custody. It helps you record what matters, choose recipients for encrypted instructions, and set a check-in rhythm. It does not take possession of wallets or transfer assets.",
    points: [
      { title: "Instructions with context", body: "Record wallet locations, recovery guidance, and personal notes in a structure your chosen recipients can understand." },
      { title: "A check-in routine", body: "Regular check-ins are intended to confirm that you are still active. Missed check-ins are signals for the plan’s communication workflow, not proof of incapacity." },
      { title: "A plan you revisit", body: "Beneficiaries, instructions, and assets change. Review your plan after major life changes and test what your recipients can actually use." },
    ],
    practical: ["Get independent legal advice for your jurisdiction.", "Do not place seed phrases in ordinary notes or email.", "Tell trusted people that a plan exists and how to contact you."],
    links: [
      { label: "Split delivery", href: "/features/legacy-plan/split-delivery", note: "Reduce reliance on one message" },
      { label: "Legacy check-ins", href: "/security/legacy-plan-check-ins", note: "Understand the check-in model" },
      { label: "Family estate planning", href: "/solutions/family-estate-planning", note: "A practical planning framework" },
    ],
  },
  {
    path: "/features/legacy-plan/split-delivery",
    eyebrow: "Feature: split delivery",
    title: "Avoid making one message the whole plan.",
    description: "Understand CryptoOwnBank split delivery, a way to distribute different parts of legacy instructions to selected recipients without giving one delivery the full picture.",
    intro: "Split delivery is designed for plans where a single instruction bundle would be too much responsibility for one person. Different recipients can receive different context or steps, chosen by you.",
    points: [
      { title: "Separate roles clearly", body: "One person may know where records live while another understands a recovery procedure. Define roles in plain language." },
      { title: "Use it as a planning aid", body: "Split delivery is not secret sharing, legal escrow, or an automated inheritance system. It cannot prevent recipients from sharing what they receive." },
      { title: "Practice the handoff", body: "A plan is only as useful as its instructions. Run a non-sensitive rehearsal and update unclear wording." },
    ],
    practical: ["Choose recipients who can handle the responsibility.", "Keep your own offline inventory current.", "Use professional advice for legal and tax questions."],
    links: [
      { label: "Legacy Plan", href: "/features/legacy-plan", note: "The wider continuity workflow" },
      { label: "Legacy Plan FAQ", href: "/security/faq", note: "Common limits and questions" },
      { label: "Self-custody security", href: "/solutions/self-custody-security", note: "Build resilient habits" },
    ],
  },
  {
    path: "/features/portfolio-tracker",
    eyebrow: "Feature: portfolio tracker",
    title: "A portfolio view without a new place to keep assets.",
    description: "Learn how CryptoOwnBank portfolio tracking helps self-directed users organize public wallet information, activity, and records across their crypto life.",
    intro: "A tracker is useful when it reduces the hunt for information. CryptoOwnBank helps members bring addresses and records into a coherent view while wallets and private keys remain outside the platform.",
    points: [
      { title: "Follow what you already control", body: "Start with public addresses and existing accounts rather than moving assets into a new product just to see them together." },
      { title: "Turn activity into records", body: "Review transactions and portfolio context to support personal recordkeeping and conversations with qualified tax professionals." },
      { title: "Keep uncertainty visible", body: "Market values, token data, and third-party integrations can be incomplete or change. Treat the dashboard as an aid, not a final source of truth." },
    ],
    practical: ["Label wallets by purpose, not just chain.", "Reconcile material activity against your wallet or network explorer.", "Keep records appropriate to your tax situation."],
    links: [
      { label: "Yield tracking", href: "/features/yield-tracking", note: "Review positions without yield promises" },
      { label: "Active crypto investors", href: "/solutions/active-crypto-investors", note: "A disciplined operating routine" },
      { label: "Glossary", href: "/learn/glossary", note: "Plain-language crypto terms" },
    ],
  },
  {
    path: "/features/decentralized-trading",
    eyebrow: "Feature: decentralized trading",
    title: "Trade with a process, not a handoff.",
    description: "Explore CryptoOwnBank tools that help members understand and prepare decentralized trading actions while they review and sign from their own wallets.",
    intro: "Decentralized trading introduces market, liquidity, smart-contract, routing, and network risk. CryptoOwnBank can help surface information and prepare actions, but it does not decide suitability or execute without your signature.",
    points: [
      { title: "Inspect before signing", body: "Read the asset, route, estimated output, slippage settings, network, and fees. If any part is unclear, pause." },
      { title: "Keep signing local", body: "The member’s compatible wallet is the signing authority. A prepared transaction is not a completed transaction." },
      { title: "Respect thin markets", body: "Displayed prices and estimated outputs may move. Smaller pools and volatile assets can produce materially different execution." },
    ],
    practical: ["Verify token identifiers, not names alone.", "Start with an amount you can afford to test.", "Never approve a wallet request you do not understand."],
    links: [
      { label: "Security FAQ", href: "/security/faq", note: "Questions to ask before signing" },
      { label: "Guides", href: "/learn/guides", note: "Build a repeatable review process" },
      { label: "Portfolio tracker", href: "/features/portfolio-tracker", note: "Keep records of activity" },
    ],
  },
  {
    path: "/features/yield-tracking",
    eyebrow: "Feature: yield tracking",
    title: "Track yield claims with the same care as the principal.",
    description: "Learn how CryptoOwnBank helps members organize and monitor yield-related positions without fixed-return promises or investment recommendations.",
    intro: "Yield is not a category without risk. Rates, availability, counterparties, smart contracts, reward rules, token prices, and withdrawal conditions can all change. Tracking helps you ask better questions; it does not make an outcome certain.",
    points: [
      { title: "Separate quoted from realized", body: "A displayed rate is not the same as a realized return. Track the terms, time period, and asset in which a reward is quoted." },
      { title: "Record the tradeoffs", body: "Note liquidity restrictions, protocol dependencies, token exposure, and the steps required to exit a position." },
      { title: "Review rather than assume", body: "Revisit positions after protocol updates, changing rates, or changes in your own risk tolerance." },
    ],
    practical: ["Read the underlying protocol documentation.", "Consider asset price risk alongside reward rates.", "Keep independent records of deposits, withdrawals, and rewards."],
    links: [
      { label: "Portfolio tracker", href: "/features/portfolio-tracker", note: "Bring positions into context" },
      { label: "Yield guides", href: "/learn/guides", note: "Questions to research first" },
      { label: "Security architecture", href: "/security/non-custodial-architecture", note: "Understand signing boundaries" },
    ],
  },
  {
    path: "/features/global-remittance",
    eyebrow: "Feature: global remittance",
    title: "Move value across borders with clear checks.",
    description: "Learn how CryptoOwnBank helps self-directed members prepare wallet-to-wallet transfers and maintain records for global remittance activity.",
    intro: "Wallet-to-wallet transfers can be useful, but they are not a replacement for understanding the recipient, the destination network, fees, local rules, or potential compliance obligations. Members decide whether and how to transact.",
    points: [
      { title: "Confirm the destination twice", body: "Address, network, destination tag or memo, and recipient instructions should all match before signing." },
      { title: "Make the transfer explainable", body: "Keep a note of purpose, recipient context, and transaction record for your own files." },
      { title: "Plan for finality", body: "Many transfers cannot be reversed once confirmed. Test with a small amount when the route is unfamiliar." },
    ],
    practical: ["Check restrictions relevant to you and the recipient.", "Use a verified communication channel to confirm address changes.", "Budget for network and conversion costs."],
    links: [
      { label: "Security FAQ", href: "/security/faq", note: "Sending safely" },
      { label: "Guides", href: "/learn/guides", note: "A pre-send checklist" },
      { label: "Decentralized trading", href: "/features/decentralized-trading", note: "Understand networks and routes" },
    ],
  },
  {
    path: "/solutions",
    eyebrow: "Who this is for",
    title: "Tools for people doing the work of ownership.",
    description: "Explore CryptoOwnBank solutions for family continuity, self-custody security, and active crypto recordkeeping built around member-held signing authority.",
    intro: "Self-directed crypto is not one use case. A family planner, a security-minded holder, and an active investor need different workflows. The common thread is that decisions and signatures remain with the member.",
    points: [
      { title: "For families", body: "Create useful continuity materials without pretending software can replace legal planning or family conversations." },
      { title: "For security-first holders", body: "Organize a deliberate routine around wallets, transaction review, and recovery awareness." },
      { title: "For active investors", body: "Keep a working record of positions and activity while avoiding the trap of treating a dashboard as advice." },
    ],
    practical: ["Start with the problem you actually have.", "Use the smallest amount of access needed.", "Build a routine you can maintain."],
    links: [
      { label: "Family estate planning", href: "/solutions/family-estate-planning", note: "Continuity without overpromising" },
      { label: "Self-custody security", href: "/solutions/self-custody-security", note: "A resilient operating posture" },
      { label: "Active crypto investors", href: "/solutions/active-crypto-investors", note: "Structure for active workflows" },
    ],
  },
  {
    path: "/solutions/family-estate-planning",
    eyebrow: "Solution: families",
    title: "Start the conversation before it becomes urgent.",
    description: "A practical CryptoOwnBank framework for families who want to organize self-custody records and legacy instructions alongside qualified legal advice.",
    intro: "Crypto can be difficult for families to locate and understand. A thoughtful plan connects wallet context, recovery guidance, trusted people, and professional advice. It does not override local inheritance law or guarantee access.",
    points: [
      { title: "Inventory what exists", body: "Create a clear but appropriately protected inventory of wallets, accounts, devices, and the people who can explain them." },
      { title: "Choose understandable instructions", body: "Write for the person who may need the information, not for a future version of yourself who remembers every detail." },
      { title: "Coordinate with professionals", body: "Bring relevant questions to a qualified lawyer, tax professional, and estate planner in your jurisdiction." },
    ],
    practical: ["Review after changes to family, assets, or devices.", "Do not assume a will alone explains wallet recovery.", "Avoid sending sensitive recovery material through routine channels."],
    links: [
      { label: "Legacy Plan", href: "/features/legacy-plan", note: "Organize continuity instructions" },
      { label: "Split delivery", href: "/features/legacy-plan/split-delivery", note: "Define separate responsibilities" },
      { label: "Legacy check-ins", href: "/security/legacy-plan-check-ins", note: "Understand how check-ins work" },
    ],
  },
  {
    path: "/solutions/self-custody-security",
    eyebrow: "Solution: self-custody",
    title: "Security is a routine, not a product setting.",
    description: "Build practical self-custody security habits with CryptoOwnBank: deliberate signing, clear recovery records, and careful transaction review.",
    intro: "Self-custody gives you control and responsibility. A robust setup is layered: wallet hygiene, recovery planning, device awareness, transaction review, and a plan for changes in your life.",
    points: [
      { title: "Protect recovery material", body: "Private keys and recovery phrases need a considered physical and operational security plan. No app can make an exposed phrase safe." },
      { title: "Slow down signatures", body: "Treat every request as a decision. Confirm the wallet, network, permissions, destination, and amount." },
      { title: "Make recovery practical", body: "Document enough for trusted people to understand the process without casually exposing credentials." },
    ],
    practical: ["Use unique device and account protections.", "Verify addresses through trusted channels.", "Rehearse recovery steps without exposing secrets."],
    links: [
      { label: "Non-custodial architecture", href: "/security/non-custodial-architecture", note: "What the product can and cannot do" },
      { label: "Security FAQ", href: "/security/faq", note: "Straight answers about boundaries" },
      { label: "Legacy Plan", href: "/features/legacy-plan", note: "Continuity planning" },
    ],
  },
  {
    path: "/solutions/active-crypto-investors",
    eyebrow: "Solution: active investors",
    title: "Keep activity from becoming administrative fog.",
    description: "CryptoOwnBank helps active self-directed crypto investors organize positions, records, transaction preparation, and review habits without investment advice.",
    intro: "Active participation creates more decisions and more records. The aim is not more trading; it is a disciplined way to see what happened, understand what you are signing, and keep your own operating record.",
    points: [
      { title: "Know your exposure", body: "Use a coherent portfolio view to spot concentration, stale records, and activity that needs reconciliation." },
      { title: "Use decision gates", body: "Before acting, identify the thesis, downside, liquidity, counterparty or protocol risk, and the condition that would change your mind." },
      { title: "Close the record loop", body: "After activity, capture the transaction details and rationale while they are still clear." },
    ],
    practical: ["Set your own limits before market stress.", "Separate research from execution.", "Consult qualified professionals for tax and financial decisions."],
    links: [
      { label: "Portfolio tracker", href: "/features/portfolio-tracker", note: "Create a working view" },
      { label: "Decentralized trading", href: "/features/decentralized-trading", note: "Review before you sign" },
      { label: "Yield tracking", href: "/features/yield-tracking", note: "Monitor terms and risks" },
    ],
  },
  {
    path: "/learn",
    eyebrow: "The field guide",
    title: "Learn the parts before you rely on them.",
    description: "CryptoOwnBank learning resources explain self-custody, wallet safety, legacy planning, on-chain activity, and common crypto terms in practical language.",
    intro: "The best decision is often a slower, better-informed one. These materials are educational and general. They are not legal, tax, financial, or investment advice.",
    points: [
      { title: "Guides for repeatable actions", body: "Use checklists and plain-language context before connecting a wallet, signing, sending, or arranging continuity materials." },
      { title: "A shared vocabulary", body: "Define common terms so a family member, adviser, or teammate does not have to guess what a phrase means." },
      { title: "Education with boundaries", body: "We explain risks and mechanics; we do not tell you what to buy, sell, hold, or how much risk to take." },
    ],
    practical: ["Verify critical information with primary sources.", "Pause when a term or request is unfamiliar.", "Ask local professionals about matters specific to you."],
    links: [
      { label: "Guides", href: "/learn/guides", note: "Practical self-custody checklists" },
      { label: "Glossary", href: "/learn/glossary", note: "Terms in plain language" },
      { label: "Security FAQ", href: "/security/faq", note: "Product boundaries and safety" },
    ],
  },
  {
    path: "/learn/guides",
    eyebrow: "Learning library: guides",
    title: "Practical guides for careful crypto ownership.",
    description: "Read practical CryptoOwnBank guides for wallet connection, transaction review, recordkeeping, yield research, and legacy planning.",
    intro: "Good self-custody habits are deliberately unglamorous: verify, record, test, and revisit. Use these as prompts for your own process, not as a substitute for professional advice or independent research.",
    points: [
      { title: "Before connecting a wallet", body: "Confirm the site, understand the requested connection, and use only the access you intend to grant." },
      { title: "Before signing a transaction", body: "Read the wallet prompt, identify the network and action, and stop if the request differs from what you expected." },
      { title: "Before creating a legacy plan", body: "Identify trusted people, describe roles plainly, and coordinate legal questions with qualified professionals." },
    ],
    practical: ["Use test transfers for unfamiliar destinations.", "Keep sensitive recovery details out of cloud notes.", "Schedule a recurring review of critical records."],
    links: [
      { label: "Glossary", href: "/learn/glossary", note: "Definitions that support the guides" },
      { label: "Self-custody security", href: "/solutions/self-custody-security", note: "Turn guidance into a routine" },
      { label: "Global remittance", href: "/features/global-remittance", note: "A careful sending workflow" },
    ],
  },
  {
    path: "/learn/glossary",
    eyebrow: "Learning library: glossary",
    title: "Crypto terms, without the performance.",
    description: "A plain-language CryptoOwnBank glossary covering self-custody, seed phrases, signing, public addresses, smart contracts, decentralized exchanges, and legacy planning.",
    intro: "Words matter when a signature can move assets. This short glossary favors useful distinctions over jargon. Definitions are general and may vary across networks and wallet providers.",
    points: [
      { title: "Self-custody", body: "An arrangement where you, rather than a service provider, control the credentials needed to authorize wallet activity." },
      { title: "Public address", body: "An identifier that can receive assets and be viewed on a blockchain. It is not the same as a private key or recovery phrase." },
      { title: "Signing", body: "Using wallet credentials to authorize a message or transaction. A signature can approve more than a payment, so read prompts carefully." },
      { title: "Smart contract", body: "Code deployed to a blockchain that can manage assets or rules. It can contain risks, limitations, and vulnerabilities." },
      { title: "Decentralized exchange", body: "A venue or protocol for on-chain asset swaps. Liquidity, pricing, and execution conditions vary." },
      { title: "Recovery phrase", body: "A sequence of words that can restore access to many wallets. Anyone with it may be able to control the associated assets." },
    ],
    practical: ["Never share a recovery phrase with a website or support contact.", "Treat unfamiliar signature requests as high risk.", "Use official documentation for network-specific details."],
    links: [
      { label: "Guides", href: "/learn/guides", note: "Put terms into practice" },
      { label: "Security FAQ", href: "/security/faq", note: "Important product boundaries" },
      { label: "Non-custodial architecture", href: "/security/non-custodial-architecture", note: "How signing authority works here" },
    ],
  },
  {
    path: "/security",
    eyebrow: "Security, plainly stated",
    title: "Control belongs with the person who signs.",
    description: "Learn CryptoOwnBank's practical security approach: non-custodial architecture, member-controlled signing, legacy check-ins, and clear operational limits.",
    intro: "CryptoOwnBank is designed to help self-directed members organize and prepare. It is not a custodian, and it cannot remove the risks that come with self-custody, networks, wallets, or third-party protocols.",
    points: [
      { title: "Member-controlled signing", body: "Actions requiring wallet authorization are reviewed and signed through the member’s compatible wallet." },
      { title: "Clear limits", body: "No security model is absolute. Devices, wallets, networks, recipients, and human decisions all matter." },
      { title: "Practical continuity", body: "Legacy features help organize instructions and check-ins. They are not a substitute for legal planning or a guarantee of any outcome." },
    ],
    practical: ["Use security controls available in your wallet.", "Be skeptical of urgency and unsolicited support.", "Revisit your setup as circumstances change."],
    links: [
      { label: "Non-custodial architecture", href: "/security/non-custodial-architecture", note: "What remains outside our control" },
      { label: "Legacy Plan check-ins", href: "/security/legacy-plan-check-ins", note: "How the signal works" },
      { label: "Security FAQ", href: "/security/faq", note: "Direct answers" },
    ],
  },
  {
    path: "/security/non-custodial-architecture",
    eyebrow: "Security architecture",
    title: "We can prepare an action. Your wallet authorizes it.",
    description: "Understand CryptoOwnBank's non-custodial architecture and the distinction between organizing information, preparing transactions, and member-controlled wallet signing.",
    intro: "Non-custodial describes an important boundary: CryptoOwnBank does not hold your wallet’s private keys or recovery phrases, and it cannot sign as you. This does not eliminate risk, nor does it make every connected service non-custodial.",
    points: [
      { title: "Information and preparation", body: "The product can display supported information and help construct transaction details for your review." },
      { title: "Authorization stays in the wallet", body: "Your compatible wallet presents a signature request. You choose whether to approve it." },
      { title: "Third parties have their own terms", body: "Networks, wallet providers, protocols, bridges, and exchanges operate independently. Review their terms and risks separately." },
    ],
    practical: ["Protect the device and wallet that signs.", "Inspect permissions as carefully as payments.", "Disconnect and revoke access you no longer need."],
    links: [
      { label: "Self-custody security", href: "/solutions/self-custody-security", note: "Build practical habits" },
      { label: "Decentralized trading", href: "/features/decentralized-trading", note: "A careful review process" },
      { label: "Security FAQ", href: "/security/faq", note: "Clarify common misunderstandings" },
    ],
  },
  {
    path: "/security/legacy-plan-check-ins",
    eyebrow: "Security architecture: check-ins",
    title: "A missed check-in is a signal, not a verdict.",
    description: "Learn how CryptoOwnBank Legacy Plan check-ins support continuity planning through member activity signals, with clear limits and no inheritance guarantees.",
    intro: "Check-ins are designed to support a member-defined communication workflow. They are not a legal determination, a death certificate, a guarantee of delivery, or a mechanism that transfers wallet assets.",
    points: [
      { title: "You define the rhythm", body: "Choose a cadence that fits your circumstances and update it when travel, health, access, or responsibilities change." },
      { title: "Missed signals need context", body: "A missed response can happen for ordinary reasons. Keep trusted contacts and alternate plans current." },
      { title: "Keep legal planning separate", body: "Use appropriate legal documents and qualified local advice for inheritance, fiduciary duties, and beneficiary questions." },
    ],
    practical: ["Make sure check-in contact methods stay current.", "Tell a trusted person what to do if a check-in is missed.", "Test your plan without using sensitive credentials."],
    links: [
      { label: "Legacy Plan", href: "/features/legacy-plan", note: "Build the continuity materials" },
      { label: "Family estate planning", href: "/solutions/family-estate-planning", note: "Coordinate the broader plan" },
      { label: "Legacy Plan FAQ", href: "/security/faq", note: "Boundaries and common questions" },
    ],
  },
  {
    path: "/security/faq",
    eyebrow: "Security FAQ",
    title: "The questions worth asking before you begin.",
    description: "CryptoOwnBank security FAQ: non-custodial boundaries, private keys, transaction signing, Legacy Plan check-ins, and what members remain responsible for.",
    intro: "Short answers are useful only if the limits are clear. CryptoOwnBank provides software and educational tools for self-directed members; it does not provide custody, legal advice, tax advice, or investment advice.",
    points: [
      { title: "Does CryptoOwnBank hold my private keys?", body: "No. Your private keys and recovery phrases should remain under your control in the wallet or storage method you choose." },
      { title: "Can CryptoOwnBank move my assets?", body: "CryptoOwnBank cannot sign as you. Wallet actions require your review and authorization through a compatible wallet." },
      { title: "Does a Legacy Plan guarantee inheritance?", body: "No. It helps organize instructions and check-ins. Legal effect, recipient access, and asset outcomes depend on your setup, applicable law, wallets, and other circumstances." },
      { title: "Are yields or transaction outcomes guaranteed?", body: "No. Rates, liquidity, prices, protocols, and networks can change. CryptoOwnBank does not promise outcomes or recommend investments." },
    ],
    practical: ["Read every wallet prompt.", "Keep recovery credentials private.", "Seek qualified advice for decisions requiring it."],
    links: [
      { label: "Security overview", href: "/security", note: "Our practical approach" },
      { label: "Non-custodial architecture", href: "/security/non-custodial-architecture", note: "The signing boundary" },
      { label: "Legacy check-ins", href: "/security/legacy-plan-check-ins", note: "How continuity signals work" },
    ],
    faq: [
      { q: "Does CryptoOwnBank custody crypto?", a: "No. It is designed for self-directed use and does not hold members’ private keys or recovery phrases." },
      { q: "Does connecting a wallet let CryptoOwnBank sign transactions?", a: "No. A compatible wallet remains the place where the member reviews and authorizes a request." },
      { q: "Can a Legacy Plan replace a will or legal advice?", a: "No. It is a planning and communication tool. Seek qualified local advice for legal matters." },
    ],
  },
];

const iconFor = (path: string) => path.includes("security") ? ShieldCheck : path.includes("learn") ? BookOpen : path.includes("legacy") ? Split : path.includes("portfolio") ? WalletCards : path.includes("solutions") ? Compass : Landmark;

export default function PublicInformation() {
  const [location] = useLocation();
  const page = pages.find((item) => item.path === location) ?? pages[0];
  const Icon = iconFor(page.path);
  const jsonLd = page.faq ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  } : {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url: `https://cryptoownbank.com${page.path}`,
    isPartOf: { "@type": "WebSite", name: "CryptoOwnBank", url: "https://cryptoownbank.com" },
  };

  return (
    <div className="min-h-[100dvh] bg-[#f4f3ec] text-[#183338] selection:bg-[#d8eadf]">
      <SeoHead title={`${page.title} | CryptoOwnBank`} description={page.description} path={page.path} jsonLd={jsonLd} />
      <header className="sticky top-0 z-30 border-b border-[#183338]/10 bg-[#f4f3ec]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#183338] text-[#d8eadf]"><LockKeyhole className="h-4 w-4" /></span>CryptoOwnBank</Link>
          <div className="flex items-center gap-3"><Link href="/learn" className="hidden text-sm font-medium text-[#46636a] hover:text-[#183338] sm:block">Learn</Link><Link href="/security" className="hidden text-sm font-medium text-[#46636a] hover:text-[#183338] sm:block">Security</Link><ThemeToggle /><Link href="/signup" className="rounded-full bg-[#d56b45] px-4 py-2 text-sm font-semibold text-[#fff8ed] transition-transform hover:-translate-y-0.5">Create account</Link></div>
        </div>
      </header>
      <main>
        <section className="relative overflow-hidden border-b border-[#183338]/10 px-5 py-16 md:py-24">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#d8eadf] opacity-70" />
          <div className="relative mx-auto max-w-6xl">
            <div className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.17em] text-[#b45231]"><Icon className="h-4 w-4" />{page.eyebrow}</div>
            <h1 className="max-w-4xl font-serif text-5xl leading-[0.97] tracking-tight text-[#183338] md:text-7xl">{page.title}</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#46636a] md:text-xl">{page.intro}</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-[#183338] px-5 py-3 text-sm font-semibold text-[#f4f3ec] transition-transform hover:-translate-y-0.5">Start with your own wallet <ArrowRight className="h-4 w-4" /></Link><Link href="/principles" className="inline-flex items-center gap-2 rounded-full border border-[#183338]/20 px-5 py-3 text-sm font-semibold transition-colors hover:bg-[#e7e4d8]">Read our principles <ChevronRight className="h-4 w-4" /></Link></div>
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[0.8fr_1.2fr] md:py-24">
          <aside><p className="text-xs font-bold uppercase tracking-[0.17em] text-[#b45231]">In practice</p><ol className="mt-5 space-y-5 border-l border-[#183338]/15 pl-5">{page.practical.map((item, index) => <li key={item} className="text-sm leading-6 text-[#46636a]"><span className="mr-2 font-mono text-xs text-[#b45231]">0{index + 1}</span>{item}</li>)}</ol></aside>
          <div className="space-y-8">{page.points.map((point, index) => <article key={point.title} className="group border-b border-[#183338]/10 pb-8"><span className="font-mono text-xs text-[#b45231]">0{index + 1}</span><h2 className="mt-2 text-2xl font-semibold tracking-tight">{point.title}</h2><p className="mt-3 max-w-xl leading-7 text-[#46636a]">{point.body}</p></article>)}</div>
        </section>
        <section className="bg-[#183338] px-5 py-16 text-[#f4f3ec] md:py-20"><div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[0.17em] text-[#d8eadf]">Keep exploring</p><div className="mt-7 grid gap-px overflow-hidden rounded-2xl bg-[#f4f3ec]/20 md:grid-cols-3">{page.links.map((link) => <Link key={link.href} href={link.href} className="group bg-[#183338] p-6 transition-colors hover:bg-[#25474b]"><p className="flex items-center justify-between font-semibold">{link.label}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></p><p className="mt-2 text-sm leading-6 text-[#d8eadf]">{link.note}</p></Link>)}</div></div></section>
      </main>
      <footer className="border-t border-[#183338]/10 px-5 py-10"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 text-sm text-[#46636a] md:flex-row"><p>CryptoOwnBank helps members organize, explain, construct, monitor, and record. Members decide and sign.</p><nav className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/features">Features</Link><Link href="/solutions">Solutions</Link><Link href="/learn">Learn</Link><Link href="/security">Security</Link><Link href="/contact">Contact</Link></nav></div><p className="mx-auto mt-6 max-w-6xl text-xs leading-5 text-[#46636a]">CryptoOwnBank is non-custodial software and education for self-directed users. It does not provide legal, tax, or investment advice. Digital assets and third-party protocols involve risk.</p></footer>
    </div>
  );
}