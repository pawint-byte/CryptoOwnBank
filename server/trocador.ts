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
  const params = new URLSearchParams();
  params.set("ticker_to", input.tickerTo.toLowerCase());
  params.set("network_to", input.networkTo);
  params.set("address", input.address);
  if (input.memo) params.set("memo", input.memo);
  if (input.amount && input.amount > 0) params.set("amount", String(input.amount));
  if (input.fiatEquiv) params.set("fiat_equiv", input.fiatEquiv);
  if (input.tickerFrom) params.set("ticker_from", input.tickerFrom.toLowerCase());
  params.set("name", "CryptoOwnBank");
  params.set("simple_mode", "True");
  params.set("buttonbgcolor", "00b4d8");
  params.set("textcolor", "ffffff");

  const ref = process.env.TROCADOR_REF;
  if (ref) params.set("ref", ref);

  params.set("direct", "False");

  // AnonPay is a HOSTED widget page, not a JSON API: it 302-redirects to the
  // localized page and serves it with `X-Frame-Options: DENY`, and there is no
  // API key for Trocador's authenticated trade API. Fetching this URL
  // server-side used to follow the redirect to the HTML page and then fail JSON
  // parsing, which surfaced to members as a bogus "AnonPay error 200". So we
  // simply build the pre-filled AnonPay URL and let the member open it in a new
  // tab — the swap completes on Trocador's own secure page, still non-custodial,
  // with their receiving address already filled in.
  const url = `${ANONPAY_API}?${params.toString()}`;
  return { id: "", url };
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
