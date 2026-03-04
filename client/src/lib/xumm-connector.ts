import { Xumm } from "xumm";

let xummInstance: Xumm | null = null;

function getXumm(): Xumm {
  if (!xummInstance) {
    const apiKey = import.meta.env.VITE_XUMM_API_KEY || "xumm-api-key-placeholder";
    xummInstance = new Xumm(apiKey);
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
  try {
    window.history.replaceState(null, "", window.location.origin + "/");
    
    xummInstance = null;
    if ((window as any)._XummPkce) {
      delete (window as any)._XummPkce;
    }
    
    const xumm = getXumm();
    await xumm.authorize();

    window.history.replaceState(null, "", "/ownbank");

    const account = await xumm.user.account;
    if (account) {
      return { success: true, address: account };
    }
    return { success: false, error: "No account returned from Xumm" };
  } catch (error: any) {
    window.history.replaceState(null, "", "/ownbank");
    return { success: false, error: error.message || "Failed to connect Xumm" };
  }
}

export async function disconnectXumm(): Promise<void> {
  try {
    const xumm = getXumm();
    await xumm.logout();
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
