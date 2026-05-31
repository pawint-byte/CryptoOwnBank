// Trezor connector for XRPL.
//
// We deliberately load Trezor Connect from Trezor's own hosted service at
// sign-time (the officially supported browser route) instead of the npm
// package. The npm package pulls in `protobufjs`, which this project's
// security firewall blocks — but the hosted route needs none of that and is
// exactly how Trezor expects browser apps to integrate. Signing happens inside
// Trezor's own secure pop-up, so keys never touch our page.

const TREZOR_CONNECT_SRC = "https://connect.trezor.io/9/trezor-connect.js";
const XRP_PATH = "m/44'/144'/0'/0/0";

export interface TrezorResult {
  success: boolean;
  address?: string;
  error?: string;
}

function getTC(): any {
  return (window as any).TrezorConnect;
}

let loadPromise: Promise<any> | null = null;

function loadTrezorConnect(): Promise<any> {
  if (getTC()) return Promise.resolve(getTC());
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      // Clear the cached promise on failure so a later attempt can retry
      // after a transient network/device problem (no page reload needed).
      const fail = (err: Error) => {
        loadPromise = null;
        reject(err);
      };
      const onReady = () => {
        const tc = getTC();
        if (tc) resolve(tc);
        else fail(new Error("Trezor Connect loaded but was unavailable."));
      };
      const onErr = () =>
        fail(
          new Error(
            "Could not reach Trezor's connect service. Check your internet connection and try again.",
          ),
        );

      const existing = document.querySelector(
        `script[src="${TREZOR_CONNECT_SRC}"]`,
      ) as HTMLScriptElement | null;

      if (existing) {
        if (getTC()) {
          resolve(getTC());
          return;
        }
        existing.addEventListener("load", onReady);
        existing.addEventListener("error", onErr);
        return;
      }

      const s = document.createElement("script");
      s.src = TREZOR_CONNECT_SRC;
      s.async = true;
      s.onload = onReady;
      s.onerror = onErr;
      document.head.appendChild(s);
    });
  }
  return loadPromise;
}

let initialized = false;

async function ensureInit(): Promise<any> {
  const TrezorConnect = await loadTrezorConnect();
  if (!initialized) {
    await TrezorConnect.init({
      lazyLoad: true,
      manifest: {
        email: "support@cryptoownbank.com",
        appUrl: window.location.origin,
      },
    });
    initialized = true;
  }
  return TrezorConnect;
}

/** Connect a Trezor and read its XRP address (proves the device is wired up). */
export async function connectTrezor(): Promise<TrezorResult> {
  try {
    const TrezorConnect = await ensureInit();
    const res = await TrezorConnect.rippleGetAddress({ path: XRP_PATH });
    if (!res.success) {
      return {
        success: false,
        error:
          res.payload?.error ||
          "The request was cancelled on the Trezor pop-up.",
      };
    }
    return { success: true, address: res.payload.address };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to connect to Trezor.",
    };
  }
}

export interface TrezorRippleTx {
  fee: string;
  flags?: number;
  sequence: number;
  maxLedgerVersion?: number;
  payment: {
    amount: string;
    destination: string;
    destinationTag?: number;
  };
}

/**
 * Sign an XRP transaction with a Trezor. Returns the serialized signed
 * transaction (ready to broadcast) plus the raw signature.
 */
export async function signWithTrezor(
  transaction: TrezorRippleTx,
): Promise<{
  success: boolean;
  serializedTx?: string;
  signature?: string;
  error?: string;
}> {
  try {
    const TrezorConnect = await ensureInit();
    const res = await TrezorConnect.rippleSignTransaction({
      path: XRP_PATH,
      transaction,
    });
    if (!res.success) {
      return {
        success: false,
        error: res.payload?.error || "Signing was cancelled on the device.",
      };
    }
    return {
      success: true,
      serializedTx: res.payload.serializedTx,
      signature: res.payload.signature,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to sign with Trezor.",
    };
  }
}
