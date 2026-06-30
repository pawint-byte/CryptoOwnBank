import {
  Wallet,
  BadgeCheck,
  Compass,
  Coins,
  ShieldCheck,
  Fuel,
  Send,
  FileText,
} from "lucide-react";
import type { Flow, FlowStep, Rail, AssetKind, Goal } from "@/lib/flows/types";
import {
  assetSymbol,
  nativeSymbol,
  RAIL_LABEL,
  GOAL_LABEL,
  RESERVE,
} from "@/lib/flows/types";
import type { Readiness } from "@/lib/flows/use-readiness";

interface BuildArgs {
  goal: Goal;
  rail: Rail;
  asset: AssetKind;
  readiness: Readiness;
}

interface RailState {
  connected: boolean;
  address: string | null;
  activated: boolean;
  nativeBalance: number;
  stableBalance: number;
  hasTrust: boolean;
}

function railState(rail: Rail, r: Readiness): RailState {
  if (rail === "xrpl") {
    return {
      connected: r.xrpl.connected,
      address: r.xrpl.address,
      activated: r.xrpl.activated,
      nativeBalance: r.xrpl.xrpBalance,
      stableBalance: r.xrpl.rlusdBalance,
      hasTrust: r.xrpl.hasRlusdTrust,
    };
  }
  return {
    connected: r.stellar.connected,
    address: r.stellar.address,
    activated: r.stellar.activated,
    nativeBalance: r.stellar.xlmBalance,
    stableBalance: r.stellar.usdcBalance,
    hasTrust: r.stellar.hasUsdcTrust,
  };
}

const walletPage: Record<Rail, string> = {
  xrpl: "/ownbank",
  stellar: "/stellar/wallet",
};
const invoicesPage: Record<Rail, string> = {
  xrpl: "/ownbank/invoices",
  stellar: "/stellar/invoices",
};
const sendPage: Record<Rail, string> = {
  xrpl: "/ownbank/send",
  stellar: "/stellar/send",
};
const tokensPage: Record<Rail, string> = {
  xrpl: "/ownbank/tokens",
  stellar: "/stellar/tokens",
};

function connectStep(rail: Rail, s: RailState): FlowStep {
  return {
    id: "connect",
    icon: Wallet,
    gate: "chain",
    title: "Connect your wallet",
    status: s.connected ? "ready" : "action",
    detail: s.connected
      ? `Connected on ${RAIL_LABEL[rail]} — your keys stay with you.`
      : `Connect a ${RAIL_LABEL[rail]} wallet to begin. We never hold your keys.`,
    aidHref: "/help/create-wallet",
    aidLabel: "How to get a wallet",
    action: s.connected
      ? undefined
      : { kind: "link", label: "Connect", href: walletPage[rail] },
  };
}

function activateStep(rail: Rail, s: RailState): FlowStep {
  const sym = nativeSymbol(rail);
  const need = rail === "xrpl" ? RESERVE.xrpl.base : RESERVE.stellar.minAccount;
  return {
    id: "activate",
    icon: BadgeCheck,
    gate: "chain",
    title: `Activate your ${RAIL_LABEL[rail]} account`,
    status: !s.connected ? "locked" : s.activated ? "ready" : "action",
    detail: !s.connected
      ? `A new ${RAIL_LABEL[rail]} account must hold about ${need} ${sym} in reserve to exist.`
      : s.activated
        ? `Your account is active (about ${need} ${sym} stays locked as reserve).`
        : `Add about ${need} ${sym} so your account exists on ${RAIL_LABEL[rail]}. This reserve stays in your wallet.`,
    aidHref: "/start",
    aidLabel: "Prime the pump",
    action:
      s.connected && !s.activated
        ? { kind: "link", label: `Add ${sym}`, href: `/buy-crypto?coin=${sym}` }
        : undefined,
  };
}

function trustStep(rail: Rail, asset: AssetKind, r: Readiness, s: RailState): FlowStep {
  const sym = assetSymbol(rail, asset);
  const base: FlowStep = {
    id: "trust",
    icon: ShieldCheck,
    gate: "chain",
    title: `Open your ${sym} line`,
    status: !s.connected ? "locked" : s.hasTrust ? "ready" : "action",
    detail: "",
  };

  if (rail === "xrpl") {
    const ledgerOnMobile = r.xrpl.ledgerOnMobile;
    base.detail = !s.connected
      ? `A one-time trust line lets your wallet hold ${sym} (locks ~${RESERVE.xrpl.perObject} XRP reserve).`
      : s.hasTrust
        ? `Your wallet already trusts ${sym}.`
        : ledgerOnMobile
          ? `Open this on desktop (Ledger) or use Xaman to set the ${sym} trust line.`
          : `One-time setup so your wallet can hold ${sym} (locks ~${RESERVE.xrpl.perObject} XRP reserve).`;
    base.action =
      s.connected && !s.hasTrust && !ledgerOnMobile
        ? {
            kind: "inline",
            label: "Set trust line",
            run: r.setRlusdTrust,
            busy: r.settingRlusdTrust,
          }
        : undefined;
    return base;
  }

  // Stellar — no in-app Freighter trust signer yet; route to the tokens page.
  base.detail = !s.connected
    ? `A one-time trust line lets your wallet hold ${sym} (locks ~${RESERVE.stellar.perEntry} XLM reserve).`
    : s.hasTrust
      ? `Your wallet already trusts ${sym}.`
      : `One-time setup so your wallet can hold ${sym} (locks ~${RESERVE.stellar.perEntry} XLM reserve).`;
  base.action =
    s.connected && !s.hasTrust
      ? { kind: "link", label: `Add ${sym} trust line`, href: tokensPage.stellar }
      : undefined;
  return base;
}

function holdStep(rail: Rail, asset: AssetKind, s: RailState): FlowStep {
  const sym = assetSymbol(rail, asset);
  const balance = asset === "native" ? s.nativeBalance : s.stableBalance;
  const has = balance > 0;
  return {
    id: "hold",
    icon: Coins,
    gate: "chain",
    title: `Hold ${sym} to send`,
    status: !s.connected ? "locked" : has ? "ready" : "action",
    detail: !s.connected
      ? `You send the ${sym} you hold — we never hold it for you.`
      : has
        ? `You hold ${balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${sym}.`
        : `Add some ${sym} to your wallet, then come back here.`,
    aidHref: "/buy-crypto",
    aidLabel: "Where to get it",
    action:
      s.connected && !has
        ? { kind: "link", label: `Add ${sym}`, href: `/buy-crypto?coin=${sym}` }
        : undefined,
  };
}

// Minimum native balance a member must keep FREE to transact: the locked reserve
// (which grows by one object/entry when they hold a trust line) plus a small fee
// headroom. Dynamic so a trust-line holder sitting at their true reserve floor is
// not falsely told to add more, and a bare native sender isn't over-gated.
function requiredFreeNative(rail: Rail, s: RailState): number {
  if (rail === "xrpl") {
    const objects = s.hasTrust ? 1 : 0;
    return (
      RESERVE.xrpl.base +
      RESERVE.xrpl.perObject * objects +
      RESERVE.xrpl.feeHeadroom
    );
  }
  const entries = s.hasTrust ? 1 : 0;
  return (
    RESERVE.stellar.minAccount +
    RESERVE.stellar.perEntry * entries +
    RESERVE.stellar.feeHeadroom
  );
}

function feeStep(rail: Rail, s: RailState): FlowStep {
  const sym = nativeSymbol(rail);
  const need = requiredFreeNative(rail, s);
  const needLabel = need.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const enough = s.nativeBalance >= need;
  return {
    id: "fees",
    icon: Fuel,
    gate: "chain",
    title: `Keep a little ${sym} for the fee`,
    status: !s.connected ? "locked" : enough ? "ready" : "action",
    detail: !s.connected
      ? `${RAIL_LABEL[rail]} fees are tiny, but your reserve must stay untouched.`
      : enough
        ? `You have enough ${sym} (about ${needLabel} ${sym} kept free covers reserve + fee).`
        : `Keep about ${needLabel} ${sym} free — that covers your account reserve plus the tiny network fee.`,
    aidHref: "/chain-guide",
    aidLabel: "How fees work",
    action:
      s.connected && !enough
        ? { kind: "link", label: `Add ${sym}`, href: `/buy-crypto?coin=${sym}` }
        : undefined,
  };
}

function planStep(rail: Rail, r: Readiness): FlowStep {
  const tier = r.subscription.tier;
  const isPaid = tier === "premium" || tier === "pro";
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
  return {
    id: "plan",
    icon: BadgeCheck,
    gate: "platform",
    title: "Your plan",
    status: "ready",
    detail: isPaid
      ? `You're on ${tierName} — payment requests plus automatic reminders are on.`
      : `You're on Free — you can create and send payment requests. Premium adds automatic reminders.`,
    aidHref: "/pricing",
    aidLabel: isPaid ? "See your plan" : "Add auto-reminders",
  };
}

function finishStep(opts: {
  id: string;
  title: string;
  icon: typeof Send;
  href: string;
  label: string;
  cleared: boolean;
  clearedDetail: string;
}): FlowStep {
  return {
    id: opts.id,
    icon: opts.icon,
    gate: "platform",
    title: opts.title,
    status: opts.cleared ? "ready" : "locked",
    detail: opts.cleared
      ? opts.clearedDetail
      : "This lights up once the steps above are green.",
    action: opts.cleared
      ? { kind: "link", label: opts.label, href: opts.href }
      : undefined,
  };
}

function buildGetPaid(rail: Rail, asset: AssetKind, r: Readiness): Flow {
  const s = railState(rail, r);
  const sym = assetSymbol(rail, asset);
  const steps: FlowStep[] = [];

  steps.push(planStep(rail, r));
  steps.push(connectStep(rail, s));
  steps.push({
    id: "rail",
    icon: Compass,
    gate: "chain",
    title: "Pick your rail & coin",
    status: "ready",
    detail: `Receiving ${sym} on ${RAIL_LABEL[rail]}. You can change this above.`,
    aidHref: "/chain-guide",
    aidLabel: "Compare rails",
  });
  steps.push(activateStep(rail, s));
  if (asset === "stable") steps.push(trustStep(rail, asset, r, s));

  const cleared =
    s.connected && s.activated && (asset === "native" || s.hasTrust);
  steps.push(
    finishStep({
      id: "request",
      title: "Send your payment request",
      icon: FileText,
      href: invoicesPage[rail],
      label: "Create request",
      cleared,
      clearedDetail: `You're ready to receive ${sym}. Create a request and share the link — they pay, you keep your keys.`,
    }),
  );

  return {
    id: `get-paid-${rail}-${asset}`,
    goal: "get-paid",
    rail,
    asset,
    title: GOAL_LABEL["get-paid"],
    subtitle: `Receive ${sym} on ${RAIL_LABEL[rail]}`,
    steps,
  };
}

function buildPay(rail: Rail, asset: AssetKind, r: Readiness): Flow {
  const s = railState(rail, r);
  const sym = assetSymbol(rail, asset);
  const steps: FlowStep[] = [];

  steps.push(connectStep(rail, s));
  if (asset === "stable") steps.push(trustStep(rail, asset, r, s));
  steps.push(holdStep(rail, asset, s));
  steps.push(feeStep(rail, s));

  const balance = asset === "native" ? s.nativeBalance : s.stableBalance;
  const cleared =
    s.connected &&
    (asset === "native" || s.hasTrust) &&
    balance > 0 &&
    s.nativeBalance >= requiredFreeNative(rail, s);

  steps.push(
    finishStep({
      id: "sign",
      title: "Review & sign to send",
      icon: Send,
      href: sendPage[rail],
      label: "Go to send",
      cleared,
      clearedDetail: `You're clear — enter the amount and recipient, then sign with your own keys.`,
    }),
  );

  return {
    id: `pay-${rail}-${asset}`,
    goal: "pay",
    rail,
    asset,
    title: GOAL_LABEL["pay"],
    subtitle: `Send ${sym} on ${RAIL_LABEL[rail]}`,
    steps,
  };
}

export function buildFlow({ goal, rail, asset, readiness }: BuildArgs): Flow {
  return goal === "get-paid"
    ? buildGetPaid(rail, asset, readiness)
    : buildPay(rail, asset, readiness);
}
