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

  const res = await fetch(`${ANONPAY_API}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) {
    const msg = data?.error || data?.message || `Trocador AnonPay error ${res.status}`;
    throw new Error(msg);
  }

  return {
    id: String(data.id),
    url: data.url || `https://trocador.app/anonpay/${data.id}`,
  };
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
  return { id, status: data?.status || "unknown" };
}
