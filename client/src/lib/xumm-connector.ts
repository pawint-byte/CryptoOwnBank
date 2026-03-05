import { apiRequest } from "./queryClient";

export interface XummSignResult {
  success: boolean;
  txHash?: string;
  address?: string;
  error?: string;
}

export interface XummSignInPayload {
  uuid: string;
  qrUrl: string;
  deepLink: string;
}

export async function createXummSignIn(): Promise<XummSignInPayload> {
  const res = await apiRequest("POST", "/api/xumm/signin");
  return res.json();
}

export async function checkXummStatus(uuid: string): Promise<{ resolved: boolean; signed: boolean; account: string | null }> {
  const res = await fetch(`/api/xumm/status/${uuid}`);
  return res.json();
}

export async function connectXumm(): Promise<XummSignResult> {
  try {
    const payload = await createXummSignIn();

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = payload.deepLink;
      return { success: false, error: "Redirecting to Xaman..." };
    }

    return new Promise((resolve) => {
      const popup = window.open("", "XummSignIn", "width=460,height=520,toolbar=no,menubar=no,scrollbars=no,resizable=no");
      if (popup) {
        popup.document.write(`
          <!DOCTYPE html>
          <html><head><title>Sign in with Xaman</title>
          <style>
            body { margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0a0a0a; color:#fff; font-family:system-ui,sans-serif; }
            img { width:280px; height:280px; border-radius:12px; margin-bottom:16px; }
            h3 { margin:0 0 8px; font-size:18px; }
            p { margin:0; font-size:14px; color:#999; }
          </style></head><body>
            <h3>Scan with Xaman</h3>
            <img src="${payload.qrUrl}" alt="QR Code" />
            <p>Open Xaman app → Scan QR code</p>
          </body></html>
        `);
      }

      const pollInterval = setInterval(async () => {
        try {
          const status = await checkXummStatus(payload.uuid);
          if (status.resolved) {
            clearInterval(pollInterval);
            if (popup && !popup.closed) popup.close();
            if (status.signed && status.account) {
              resolve({ success: true, address: status.account });
            } else {
              resolve({ success: false, error: "Sign-in was declined" });
            }
          }
        } catch {
          clearInterval(pollInterval);
          if (popup && !popup.closed) popup.close();
          resolve({ success: false, error: "Failed to check sign-in status" });
        }
      }, 2000);

      if (popup) {
        const popupCheck = setInterval(() => {
          if (popup.closed) {
            clearInterval(popupCheck);
            setTimeout(() => {
              clearInterval(pollInterval);
            }, 5000);
          }
        }, 1000);
      }

      setTimeout(() => {
        clearInterval(pollInterval);
        if (popup && !popup.closed) popup.close();
        resolve({ success: false, error: "Sign-in timed out. Please try again." });
      }, 120000);
    });
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to connect Xumm" };
  }
}

export async function disconnectXumm(): Promise<void> {
}

export async function signPayment(
  destination: string,
  amount: string | { currency: string; value: string; issuer: string }
): Promise<XummSignResult> {
  try {
    const res = await apiRequest("POST", "/api/xumm/payload", {
      TransactionType: "Payment",
      Destination: destination,
      Amount: amount,
    });
    const payload = await res.json();

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = payload.deepLink;
    }

    return new Promise((resolve) => {
      const popup = window.open("", "XummPayment", "width=460,height=520,toolbar=no,menubar=no,scrollbars=no,resizable=no");
      if (popup) {
        popup.document.write(`
          <!DOCTYPE html>
          <html><head><title>Approve Transaction</title>
          <style>
            body { margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0a0a0a; color:#fff; font-family:system-ui,sans-serif; }
            img { width:280px; height:280px; border-radius:12px; margin-bottom:16px; }
            h3 { margin:0 0 8px; font-size:18px; }
            p { margin:0; font-size:14px; color:#999; }
          </style></head><body>
            <h3>Approve in Xaman</h3>
            <img src="${payload.qrUrl}" alt="QR Code" />
            <p>Scan to approve this transaction</p>
          </body></html>
        `);
      }

      const pollInterval = setInterval(async () => {
        try {
          const status = await checkXummStatus(payload.uuid);
          if (status.resolved) {
            clearInterval(pollInterval);
            if (popup && !popup.closed) popup.close();
            if (status.signed) {
              resolve({ success: true, txHash: payload.uuid });
            } else {
              resolve({ success: false, error: "Transaction was declined" });
            }
          }
        } catch {
          clearInterval(pollInterval);
          if (popup && !popup.closed) popup.close();
          resolve({ success: false, error: "Failed to check transaction status" });
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (popup && !popup.closed) popup.close();
        resolve({ success: false, error: "Transaction timed out" });
      }, 120000);
    });
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
    const res = await apiRequest("POST", "/api/xumm/payload", {
      TransactionType: "TrustSet",
      LimitAmount: { currency, issuer, value: limit },
    });
    const payload = await res.json();

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = payload.deepLink;
    }

    return new Promise((resolve) => {
      const popup = window.open("", "XummTrustSet", "width=460,height=520,toolbar=no,menubar=no,scrollbars=no,resizable=no");
      if (popup) {
        popup.document.write(`
          <!DOCTYPE html>
          <html><head><title>Set Trust Line</title>
          <style>
            body { margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0a0a0a; color:#fff; font-family:system-ui,sans-serif; }
            img { width:280px; height:280px; border-radius:12px; margin-bottom:16px; }
            h3 { margin:0 0 8px; font-size:18px; }
            p { margin:0; font-size:14px; color:#999; }
          </style></head><body>
            <h3>Approve Trust Line</h3>
            <img src="${payload.qrUrl}" alt="QR Code" />
            <p>Scan to approve this trust line</p>
          </body></html>
        `);
      }

      const pollInterval = setInterval(async () => {
        try {
          const status = await checkXummStatus(payload.uuid);
          if (status.resolved) {
            clearInterval(pollInterval);
            if (popup && !popup.closed) popup.close();
            if (status.signed) {
              resolve({ success: true, txHash: payload.uuid });
            } else {
              resolve({ success: false, error: "Trust line was declined" });
            }
          }
        } catch {
          clearInterval(pollInterval);
          if (popup && !popup.closed) popup.close();
          resolve({ success: false, error: "Failed to check trust line status" });
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (popup && !popup.closed) popup.close();
        resolve({ success: false, error: "Trust line timed out" });
      }, 120000);
    });
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to sign TrustSet" };
  }
}
