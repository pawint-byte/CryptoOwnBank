const LN_ADDRESS_RE = /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const BOLT11_RE = /^ln(bc|tb)[0-9]{0,10}[munp]?[a-z0-9]+$/i;

export type LnAddressInfo = {
  ok: true;
  address: string;
  callback: string;
  minSendableSats: number;
  maxSendableSats: number;
  metadataDescription?: string;
  commentAllowed?: number;
} | {
  ok: false;
  reason: string;
};

export function isValidLightningAddress(input: string): boolean {
  return LN_ADDRESS_RE.test(input.trim());
}

export function isValidBolt11(input: string): boolean {
  return BOLT11_RE.test(input.trim());
}

export async function resolveLightningAddress(address: string): Promise<LnAddressInfo> {
  const trimmed = address.trim();
  if (!isValidLightningAddress(trimmed)) {
    return { ok: false, reason: "Not a valid Lightning Address (expected name@domain.tld)" };
  }
  const [name, domain] = trimmed.split("@");
  const url = `https://${domain}/.well-known/lnurlp/${encodeURIComponent(name)}`;
  let res: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    clearTimeout(timer);
  } catch (err: any) {
    return { ok: false, reason: `Could not reach ${domain} (${err?.message || "network error"})` };
  }
  if (!res.ok) {
    return { ok: false, reason: `${domain} responded ${res.status} for that address. Check the spelling.` };
  }
  let data: any;
  try {
    data = await res.json();
  } catch {
    return { ok: false, reason: `${domain} did not return valid JSON` };
  }
  if (data.tag !== "payRequest") {
    return { ok: false, reason: `${domain} replied but it isn't a Lightning payRequest endpoint` };
  }
  const min = Number(data.minSendable);
  const max = Number(data.maxSendable);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { ok: false, reason: `${domain} returned malformed sendable amounts` };
  }
  let metaDesc: string | undefined;
  try {
    if (typeof data.metadata === "string") {
      const parsed = JSON.parse(data.metadata);
      if (Array.isArray(parsed)) {
        const textRow = parsed.find((row: any) => Array.isArray(row) && row[0] === "text/plain");
        if (textRow) metaDesc = String(textRow[1]);
      }
    }
  } catch {
    /* ignore */
  }
  return {
    ok: true,
    address: trimmed,
    callback: String(data.callback || ""),
    minSendableSats: Math.floor(min / 1000),
    maxSendableSats: Math.floor(max / 1000),
    metadataDescription: metaDesc,
    commentAllowed: typeof data.commentAllowed === "number" ? data.commentAllowed : undefined,
  };
}

export async function fetchInvoiceForLnAddress(
  callback: string,
  amountSats: number,
  comment?: string
): Promise<{ ok: true; bolt11: string } | { ok: false; reason: string }> {
  const url = new URL(callback);
  url.searchParams.set("amount", String(amountSats * 1000));
  if (comment) url.searchParams.set("comment", comment.slice(0, 200));
  let res: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    res = await fetch(url.toString(), { signal: controller.signal, headers: { Accept: "application/json" } });
    clearTimeout(timer);
  } catch (err: any) {
    return { ok: false, reason: `Could not reach payment endpoint (${err?.message || "network"})` };
  }
  if (!res.ok) {
    return { ok: false, reason: `Endpoint responded ${res.status}` };
  }
  let data: any;
  try {
    data = await res.json();
  } catch {
    return { ok: false, reason: "Endpoint returned non-JSON" };
  }
  if (data.status === "ERROR") {
    return { ok: false, reason: data.reason || "Endpoint refused the invoice request" };
  }
  if (typeof data.pr !== "string" || !isValidBolt11(data.pr)) {
    return { ok: false, reason: "Endpoint did not return a valid BOLT11 invoice" };
  }
  return { ok: true, bolt11: data.pr };
}
