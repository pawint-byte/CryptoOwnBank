import { Horizon, TransactionBuilder, Asset, Operation, BASE_FEE, Networks, Transaction, StrKey } from "@stellar/stellar-sdk";
import crypto from "node:crypto";
import type { DcaOrder } from "@shared/schema";

const HORIZON_URL = "https://horizon.stellar.org";
const NETWORK_PASSPHRASE = Networks.PUBLIC;

const STELLAR_ASSETS: Record<string, { code: string; issuer: string | null }> = {
  XLM: { code: "XLM", issuer: null },
  USDC: { code: "USDC", issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" },
  EURC: { code: "EURC", issuer: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2" },
  yXLM: { code: "yXLM", issuer: "GARDNV3Q7YGT4AKSDF25LT32YSCCW2EV2WCFC4XK7M2YFCAYEY3MMBKW" },
  AQUA: { code: "AQUA", issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA" },
  yUSDC: { code: "yUSDC", issuer: "GDGTVWSM4MGS4T7Z6W4RPWOCHE2I6RDFCIFZGS3DOA63LWQTRNZNTTFF" },
};

export type StellarBuildResult =
  | { kind: "needsTrustline"; assetCode: string; assetIssuer: string; trustlineDeepLink: string }
  | { kind: "needsFunding"; minXlm: number; currentXlm: number }
  | { kind: "noLiquidity"; spendCurrency: string; buyCurrency: string }
  | { kind: "ready"; token: string; deepLink: string; expectedReceive: string; minReceive: string; expiresAt: number };

interface PendingBuild {
  orderId: string;
  userId: string;
  sourceAddress: string;
  spendAmount: string;
  spendCurrency: string;
  spendIssuer: string | null;
  buyCurrency: string;
  buyIssuer: string | null;
  expectedReceive: string;
  minReceive: string;
  unsignedXdr: string;
  createdAt: number;
}

const PENDING_BUILDS = new Map<string, PendingBuild>();
const BUILD_TTL_MS = 15 * 60 * 1000;

function pruneExpired() {
  const now = Date.now();
  for (const [token, build] of Array.from(PENDING_BUILDS.entries())) {
    if (now - build.createdAt > BUILD_TTL_MS) PENDING_BUILDS.delete(token);
  }
}

export function getPendingBuild(token: string): PendingBuild | undefined {
  pruneExpired();
  return PENDING_BUILDS.get(token);
}

export function consumePendingBuild(token: string): PendingBuild | undefined {
  const build = getPendingBuild(token);
  if (build) PENDING_BUILDS.delete(token);
  return build;
}

function resolveAsset(code: string, issuerOverride?: string | null): Asset {
  if (code === "XLM" || code === "native") return Asset.native();
  const known = STELLAR_ASSETS[code];
  const issuer = issuerOverride || known?.issuer;
  if (!issuer) {
    throw new Error(`Unknown Stellar asset ${code} — no issuer is configured. Delete this DCA order and recreate it from the current preset list.`);
  }
  if (!StrKey.isValidEd25519PublicKey(issuer)) {
    throw new Error(`The issuer for ${code} on this DCA order is not a valid Stellar account ID. This usually means the order was created against an outdated asset preset. Delete this order and recreate it from the current list.`);
  }
  return new Asset(code, issuer);
}

function toSep7CallbackParam(url: string): string {
  return `url:${url}`;
}

function buildDeepLink(xdr: string, callbackUrl: string): string {
  const params = new URLSearchParams();
  params.set("xdr", xdr);
  params.set("callback", toSep7CallbackParam(callbackUrl));
  params.set("msg", "Approve your scheduled DCA buy");
  return `web+stellar:tx?${params.toString()}`;
}

export async function buildTrustlineDeepLink(params: {
  sourceAddress: string;
  assetCode: string;
  assetIssuer: string;
  publicAppUrl: string;
}): Promise<string> {
  const server = new Horizon.Server(HORIZON_URL);
  const account = await server.loadAccount(params.sourceAddress);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.changeTrust({
        asset: new Asset(params.assetCode, params.assetIssuer),
      })
    )
    .setTimeout(600)
    .build();
  const xdr = tx.toXDR();
  const params2 = new URLSearchParams();
  params2.set("xdr", xdr);
  params2.set("msg", `Add ${params.assetCode} trustline to enable DCA buys`);
  return `web+stellar:tx?${params2.toString()}`;
}

export async function buildStellarDcaTransaction(params: {
  order: DcaOrder;
  sourceAddress: string;
  publicAppUrl: string;
  slippagePercent?: number;
}): Promise<StellarBuildResult> {
  const { order, sourceAddress, publicAppUrl } = params;
  const slippage = params.slippagePercent ?? 1.5;

  const server = new Horizon.Server(HORIZON_URL);

  let account: Awaited<ReturnType<typeof server.loadAccount>>;
  try {
    account = await server.loadAccount(sourceAddress);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return { kind: "needsFunding", minXlm: 1, currentXlm: 0 };
    }
    throw err;
  }

  const xlmBalance = parseFloat(
    (account.balances.find((b: any) => b.asset_type === "native") as any)?.balance || "0"
  );
  if (xlmBalance < 1.5) {
    return { kind: "needsFunding", minXlm: 1.5, currentXlm: xlmBalance };
  }

  const sendAsset = resolveAsset(order.spendCurrency, order.spendIssuer);
  const destAsset = resolveAsset(order.buyCurrency, order.buyIssuer);

  if (!destAsset.isNative()) {
    const destCode = destAsset.getCode();
    const destIssuer = destAsset.getIssuer();
    const trusts = account.balances.some(
      (b: any) =>
        b.asset_type !== "native" &&
        b.asset_code === destCode &&
        b.asset_issuer === destIssuer
    );
    if (!trusts) {
      const trustlineDeepLink = await buildTrustlineDeepLink({
        sourceAddress,
        assetCode: destCode,
        assetIssuer: destIssuer,
        publicAppUrl,
      });
      return { kind: "needsTrustline", assetCode: destCode, assetIssuer: destIssuer, trustlineDeepLink };
    }
  }

  if (!sendAsset.isNative()) {
    const sendCode = sendAsset.getCode();
    const sendIssuer = sendAsset.getIssuer();
    const sendBal = account.balances.find(
      (b: any) =>
        b.asset_type !== "native" &&
        b.asset_code === sendCode &&
        b.asset_issuer === sendIssuer
    ) as any;
    const sendAmountNum = parseFloat(order.spendAmount);
    if (!sendBal || parseFloat(sendBal.balance) < sendAmountNum) {
      return { kind: "noLiquidity", spendCurrency: order.spendCurrency, buyCurrency: order.buyCurrency };
    }
  } else {
    const sendAmountNum = parseFloat(order.spendAmount);
    if (xlmBalance - 1.5 < sendAmountNum) {
      return { kind: "noLiquidity", spendCurrency: order.spendCurrency, buyCurrency: order.buyCurrency };
    }
  }

  let expectedReceive: string;
  let routePath: Asset[] = [];
  try {
    const pathRes: any = await (server as any).strictSendPaths(sendAsset, order.spendAmount, [destAsset]).call();
    const records = pathRes?.records || [];
    if (records.length === 0) {
      return { kind: "noLiquidity", spendCurrency: order.spendCurrency, buyCurrency: order.buyCurrency };
    }
    const best = records[0];
    expectedReceive = best.destination_amount;
    routePath = (best.path || []).map((hop: any) => {
      if (hop.asset_type === "native") return Asset.native();
      return new Asset(hop.asset_code, hop.asset_issuer);
    });
  } catch (err) {
    return { kind: "noLiquidity", spendCurrency: order.spendCurrency, buyCurrency: order.buyCurrency };
  }

  const minReceiveNum = parseFloat(expectedReceive) * (1 - slippage / 100);
  const minReceive = minReceiveNum.toFixed(7);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset,
        sendAmount: order.spendAmount,
        destination: sourceAddress,
        destAsset,
        destMin: minReceive,
        path: routePath,
      })
    )
    .setTimeout(600)
    .build();

  const xdr = tx.toXDR();
  const token = crypto.randomBytes(24).toString("base64url");
  const callbackUrl = `${params.publicAppUrl.replace(/\/$/, "")}/api/stellar/dca-callback?token=${token}`;
  const deepLink = buildDeepLink(xdr, callbackUrl);

  PENDING_BUILDS.set(token, {
    orderId: order.id,
    userId: order.userId,
    sourceAddress,
    spendAmount: order.spendAmount,
    spendCurrency: order.spendCurrency,
    spendIssuer: sendAsset.isNative() ? null : sendAsset.getIssuer(),
    buyCurrency: order.buyCurrency,
    buyIssuer: destAsset.isNative() ? null : destAsset.getIssuer(),
    expectedReceive,
    minReceive,
    unsignedXdr: xdr,
    createdAt: Date.now(),
  });

  return {
    kind: "ready",
    token,
    deepLink,
    expectedReceive,
    minReceive,
    expiresAt: Date.now() + BUILD_TTL_MS,
  };
}

function assetMatches(a: Asset, code: string | null, issuer: string | null): boolean {
  if (!code || code === "XLM" || code === "native") return a.isNative();
  if (a.isNative()) return false;
  return a.getCode() === code && a.getIssuer() === issuer;
}

export function verifySignedXdrMatchesIntent(signedXdr: string, pending: PendingBuild): { ok: true } | { ok: false; reason: string } {
  let tx: Transaction;
  try {
    const parsed = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    if ((parsed as any).innerTransaction) {
      return { ok: false, reason: "fee-bump transactions are not allowed" };
    }
    tx = parsed as Transaction;
  } catch {
    return { ok: false, reason: "could not parse signed XDR" };
  }
  if ((tx as any).networkPassphrase && (tx as any).networkPassphrase !== NETWORK_PASSPHRASE) {
    return { ok: false, reason: "wrong network" };
  }
  if (tx.source !== pending.sourceAddress) {
    return { ok: false, reason: "source account mismatch" };
  }
  if (tx.operations.length !== 1) {
    return { ok: false, reason: "expected exactly one operation" };
  }
  const op: any = tx.operations[0];
  if (op.type !== "pathPaymentStrictSend") {
    return { ok: false, reason: `expected pathPaymentStrictSend, got ${op.type}` };
  }
  if (op.source && op.source !== pending.sourceAddress) {
    return { ok: false, reason: "operation source mismatch" };
  }
  if (op.destination !== pending.sourceAddress) {
    return { ok: false, reason: "destination must equal source (self-trade)" };
  }
  if (!assetMatches(op.sendAsset, pending.spendCurrency, pending.spendIssuer)) {
    return { ok: false, reason: "send asset mismatch" };
  }
  if (!assetMatches(op.destAsset, pending.buyCurrency, pending.buyIssuer)) {
    return { ok: false, reason: "destination asset mismatch" };
  }
  if (op.sendAmount !== pending.spendAmount) {
    return { ok: false, reason: `send amount mismatch (got ${op.sendAmount}, expected ${pending.spendAmount})` };
  }
  if (parseFloat(op.destMin) < parseFloat(pending.minReceive) - 1e-9) {
    return { ok: false, reason: `destMin too low (got ${op.destMin}, expected >= ${pending.minReceive})` };
  }
  return { ok: true };
}

export async function submitSignedStellarTransaction(signedXdr: string): Promise<{ hash: string; receivedAmount?: string }> {
  const server = new Horizon.Server(HORIZON_URL);
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result: any = await server.submitTransaction(tx as any);
  let receivedAmount: string | undefined;
  try {
    if (Array.isArray(result?.offer_results)) {
      receivedAmount = result.offer_results[0]?.amount_bought;
    }
  } catch {
    /* ignore */
  }
  return { hash: result.hash, receivedAmount };
}

export const STELLAR_DCA_BUILD_TTL_MS = BUILD_TTL_MS;
