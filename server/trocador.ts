const ANONPAY_API = "https://trocador.app/anonpay/";
const ANONPAY_STATUS = "https://trocador.app/anonpay/status/";

export interface CreateAnonpaySessionInput {
  tickerTo: string;
  networkTo: string;
  address: string;
  memo?: string;
  amount?: number;
  fiatEquiv?: string;
  tickerFrom?: string;
}

export interface AnonpaySessionResult {
  id: string;
  url: string;
}

export async function createAnonpaySession(
  input: CreateAnonpaySessionInput,
): Promise<AnonpaySessionResult> {
  // Shared params for both the JSON API call and the fallback widget URL.
  const params = new URLSearchParams();
  params.set("ticker_to", input.tickerTo.toLowerCase());
  params.set("network_to", input.networkTo);
  params.set("address", input.address);
  if (input.memo) params.set("memo", input.memo);
  if (input.amount && input.amount > 0) params.set("amount", String(input.amount));
  if (input.fiatEquiv) params.set("fiat_equiv", input.fiatEquiv);
  if (input.tickerFrom) params.set("ticker_from", input.tickerFrom.toLowerCase());
  params.set("name", "CryptoOwnBank");

  const ref = process.env.TROCADOR_REF;
  if (ref) params.set("ref", ref);

  params.set("direct", "False");

  // GUARANTEED FALLBACK: the human-openable widget URL. With `simple_mode=True`
  // the AnonPay endpoint 302-redirects to the hosted widget page (served with
  // `X-Frame-Options: DENY`), so this URL must ONLY ever be opened in a new tab
  // — never fetched as JSON, never put in an <iframe>. It pre-fills the member's
  // receiving address and completes the swap on Trocador's own secure page.
  const widgetParams = new URLSearchParams(params);
  widgetParams.set("simple_mode", "True");
  widgetParams.set("buttonbgcolor", "00b4d8");
  widgetParams.set("textcolor", "ffffff");
  const widgetUrl = `${ANONPAY_API}?${widgetParams.toString()}`;

  // BEST EFFORT: the SAME endpoint WITHOUT `simple_mode` returns a JSON body
  // ({ ID, url, url_onion }) with a clean short session link. We prefer that
  // when we can get it. But it is environment-sensitive (some IPs get a bare
  // 302/HTML instead of JSON), so every failure path falls back to the widget
  // URL above — a member must never be blocked by a bad parse (that was the old
  // bogus "AnonPay error 200"). The id may be empty; the frontend only needs the
  // URL to open the swap in a new tab.
  try {
    const res = await fetch(`${ANONPAY_API}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data: any = await res.json().catch(() => null);
      const id = data?.ID ?? data?.id;
      const cleanUrl = data?.url ?? data?.URL;
      if (cleanUrl) {
        return { id: id ? String(id) : "", url: cleanUrl };
      }
    }
  } catch {
    // ignore and fall through to the widget URL
  }

  return { id: "", url: widgetUrl };
}

export interface AnonpayStatus {
  id: string;
  status: string;
}

export async function getAnonpayStatus(id: string): Promise<AnonpayStatus> {
  const res = await fetch(`${ANONPAY_STATUS}${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Trocador status error ${res.status}`);
  }
  // Normalize the status VALUE to lowercase too — the client's status-label and
  // "done" maps are keyed lowercase (e.g. "anonpaynew", "finished"), so a
  // capitalized value from Trocador would otherwise miss and polling never stops.
  const status = String(data?.Status || data?.status || "unknown").trim().toLowerCase();
  return { id, status };
}
