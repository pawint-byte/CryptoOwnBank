import { XummPkce } from "xumm-oauth2-pkce";
import { Xumm } from "xumm";

const XUMM_API_KEY = import.meta.env.VITE_XUMM_API_KEY || "xumm-api-key-placeholder";

let xummInstance: Xumm | null = null;

function getXumm(): Xumm {
  if (!xummInstance) {
    xummInstance = new Xumm(XUMM_API_KEY);
  }
  return xummInstance;
}

export interface XummSignResult {
  success: boolean;
  txHash?: string;
  address?: string;
  error?: string;
}

export async function connectXumm(): Promise<XummSignResult> {
  return new Promise((resolve) => {
    try {
      if ((window as any)._XummPkce) {
        delete (window as any)._XummPkce;
      }

      const pkce = new XummPkce(XUMM_API_KEY, {
        redirectUrl: window.location.origin + "/",
        implicit: true,
      } as any);

      pkce.on("error", (err: any) => {
        resolve({ success: false, error: err?.message || "Xumm connection error" });
      });

      pkce.on("success", async () => {
        try {
          const state = await pkce.state();
          if (state?.me?.account) {
            resolve({ success: true, address: state.me.account });
          } else {
            resolve({ success: false, error: "No account returned from Xumm" });
          }
        } catch (e: any) {
          resolve({ success: false, error: e.message || "Failed to get account" });
        }
      });

      pkce.authorize();
    } catch (error: any) {
      resolve({ success: false, error: error.message || "Failed to connect Xumm" });
    }
  });
}

export async function disconnectXumm(): Promise<void> {
  try {
    if ((window as any)._XummPkce) {
      const pkce = (window as any)._XummPkce;
      if (pkce.logout) await pkce.logout();
      delete (window as any)._XummPkce;
    }
    if (xummInstance) {
      await xummInstance.logout();
      xummInstance = null;
    }
  } catch {
  }
}

export async function signPayment(
  destination: string,
  amount: string | { currency: string; value: string; issuer: string }
): Promise<XummSignResult> {
  try {
    const xumm = getXumm();
    const payload = await xumm.payload?.createAndSubscribe(
      {
        TransactionType: "Payment",
        Destination: destination,
        Amount: amount,
      },
      (event: any) => {
        if (event.data.signed === true) return event.data;
        if (event.data.signed === false) return false;
      }
    );

    if (payload?.resolved) {
      const result = await payload.resolved;
      if (result) {
        return {
          success: true,
          txHash: (result as any).txid || (result as any).hash,
        };
      }
    }
    return { success: false, error: "Transaction was rejected" };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to sign transaction" };
  }
}

export async function signTrustSet(
  currency: string,
  issuer: string,
  limit: string = "1000000000"
): Promise<XummSignResult> {
  try {
    const xumm = getXumm();
    const payload = await xumm.payload?.createAndSubscribe(
      {
        TransactionType: "TrustSet",
        LimitAmount: {
          currency,
          issuer,
          value: limit,
        },
      },
      (event: any) => {
        if (event.data.signed === true) return event.data;
        if (event.data.signed === false) return false;
      }
    );

    if (payload?.resolved) {
      const result = await payload.resolved;
      if (result) {
        return { success: true, txHash: (result as any).txid };
      }
    }
    return { success: false, error: "TrustSet was rejected" };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to sign TrustSet" };
  }
}
