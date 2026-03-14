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

const XUMM_PENDING_KEY = "xumm_pending_signin";
const XUMM_PENDING_PAYMENT_KEY = "xumm_pending_payment";
const XUMM_PENDING_LINK_KEY = "xumm_pending_link";

export function hasPendingXummPayment(): boolean {
  return !!sessionStorage.getItem(XUMM_PENDING_PAYMENT_KEY);
}

export function getPendingXummPaymentUuid(): string | null {
  return sessionStorage.getItem(XUMM_PENDING_PAYMENT_KEY);
}

export async function completePendingXummPayment(): Promise<XummSignResult> {
  const uuid = sessionStorage.getItem(XUMM_PENDING_PAYMENT_KEY);
  if (!uuid) {
    return { success: false, error: "No pending payment" };
  }

  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const status = await checkXummStatus(uuid);
      if (status.resolved) {
        sessionStorage.removeItem(XUMM_PENDING_PAYMENT_KEY);
        if (status.signed) {
          return { success: true, txHash: uuid };
        }
        return { success: false, error: "Payment was declined" };
      }
    } catch {
      sessionStorage.removeItem(XUMM_PENDING_PAYMENT_KEY);
      return { success: false, error: "Failed to check payment status" };
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  sessionStorage.removeItem(XUMM_PENDING_PAYMENT_KEY);
  return { success: false, error: "Payment timed out. Please try again." };
}

export function clearPendingXummPayment(): void {
  sessionStorage.removeItem(XUMM_PENDING_PAYMENT_KEY);
}

export async function createXummSignIn(): Promise<XummSignInPayload> {
  const res = await apiRequest("POST", "/api/xumm/signin");
  return res.json();
}

export async function checkXummStatus(uuid: string): Promise<{ resolved: boolean; signed: boolean; account: string | null }> {
  const res = await fetch(`/api/xumm/status/${uuid}`);
  return res.json();
}

export function hasPendingXummSignIn(): boolean {
  return !!sessionStorage.getItem(XUMM_PENDING_KEY);
}

export async function completePendingXummSignIn(): Promise<XummSignResult> {
  const uuid = sessionStorage.getItem(XUMM_PENDING_KEY);
  if (!uuid) {
    return { success: false, error: "No pending sign-in" };
  }

  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const status = await checkXummStatus(uuid);
      if (status.resolved) {
        sessionStorage.removeItem(XUMM_PENDING_KEY);
        if (status.signed && status.account) {
          return { success: true, address: status.account };
        }
        return { success: false, error: "Sign-in was declined" };
      }
    } catch {
      sessionStorage.removeItem(XUMM_PENDING_KEY);
      return { success: false, error: "Failed to check sign-in status" };
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  sessionStorage.removeItem(XUMM_PENDING_KEY);
  return { success: false, error: "Sign-in timed out. Please try again." };
}

export interface PendingLink {
  uuid: string;
  expectedAddress: string;
  timestamp: number;
}

export function hasPendingXummLink(): boolean {
  const raw = localStorage.getItem(XUMM_PENDING_LINK_KEY);
  if (!raw) return false;
  try {
    const data: PendingLink = JSON.parse(raw);
    if (Date.now() - data.timestamp > 5 * 60 * 1000) {
      localStorage.removeItem(XUMM_PENDING_LINK_KEY);
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem(XUMM_PENDING_LINK_KEY);
    return false;
  }
}

export function getPendingXummLink(): PendingLink | null {
  const raw = localStorage.getItem(XUMM_PENDING_LINK_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(XUMM_PENDING_LINK_KEY);
    return null;
  }
}

export function clearPendingXummLink(): void {
  localStorage.removeItem(XUMM_PENDING_LINK_KEY);
}

export async function completePendingXummLink(): Promise<XummSignResult & { expectedAddress?: string }> {
  const pending = getPendingXummLink();
  if (!pending) {
    return { success: false, error: "No pending link" };
  }

  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const status = await checkXummStatus(pending.uuid);
      if (status.resolved) {
        localStorage.removeItem(XUMM_PENDING_LINK_KEY);
        if (status.signed && status.account) {
          return { success: true, address: status.account, expectedAddress: pending.expectedAddress };
        }
        return { success: false, error: "Sign-in was declined" };
      }
    } catch {
      localStorage.removeItem(XUMM_PENDING_LINK_KEY);
      return { success: false, error: "Failed to check sign-in status" };
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  localStorage.removeItem(XUMM_PENDING_LINK_KEY);
  return { success: false, error: "Sign-in timed out. Please try again." };
}

export interface XummLinkPayload {
  uuid: string;
  qrUrl: string;
  deepLink: string;
  expectedAddress: string;
}

export async function createXummLinkPayload(expectedAddress: string): Promise<XummLinkPayload> {
  const payload = await createXummSignIn();
  return {
    uuid: payload.uuid,
    qrUrl: payload.qrUrl,
    deepLink: payload.deepLink,
    expectedAddress,
  };
}

export async function pollXummLinkStatus(
  uuid: string,
  onResolved: (result: XummSignResult) => void,
  onPoll?: () => void,
): Promise<() => void> {
  let cancelled = false;

  const poll = async () => {
    const maxAttempts = 90;
    for (let i = 0; i < maxAttempts && !cancelled; i++) {
      try {
        onPoll?.();
        const status = await checkXummStatus(uuid);
        if (status.resolved) {
          if (status.signed && status.account) {
            onResolved({ success: true, address: status.account });
          } else {
            onResolved({ success: false, error: "Sign-in was declined" });
          }
          return;
        }
      } catch {
        onResolved({ success: false, error: "Failed to check sign-in status" });
        return;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    if (!cancelled) {
      onResolved({ success: false, error: "Sign-in timed out. Please try again." });
    }
  };

  poll();

  return () => { cancelled = true; };
}

export async function connectXummForLinkDesktop(expectedAddress: string): Promise<XummSignResult> {
  try {
    const payload = await createXummSignIn();

    return new Promise((resolve) => {
      const popup = window.open("", "XummLinkIn", "width=460,height=520,toolbar=no,menubar=no,scrollbars=no,resizable=no");
      if (popup) {
        popup.document.write(`
          <!DOCTYPE html>
          <html><head><title>Link with Xaman</title>
          <style>
            body { margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0a0a0a; color:#fff; font-family:system-ui,sans-serif; }
            img { width:280px; height:280px; border-radius:12px; margin-bottom:16px; }
            h3 { margin:0 0 8px; font-size:18px; }
            p { margin:0; font-size:14px; color:#999; }
          </style></head><body>
            <h3>Link with Xaman</h3>
            <img src="${payload.qrUrl}" alt="QR Code" />
            <p>Open Xaman → switch to the matching account → scan</p>
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

export async function connectXumm(): Promise<XummSignResult> {
  try {
    const payload = await createXummSignIn();

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      sessionStorage.setItem(XUMM_PENDING_KEY, payload.uuid);
      window.location.href = payload.deepLink;
      return new Promise(() => {});
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

export async function signTransaction(txJson: Record<string, any>): Promise<XummSignResult> {
  try {
    const res = await apiRequest("POST", "/api/xumm/payload", txJson);
    const payload = await res.json();

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      sessionStorage.setItem(XUMM_PENDING_PAYMENT_KEY, payload.uuid);
      window.location.href = payload.deepLink;
      return new Promise(() => {});
    }

    return new Promise((resolve) => {
      const txType = txJson.TransactionType || "Transaction";
      const popup = window.open("", "XummTransaction", "width=460,height=520,toolbar=no,menubar=no,scrollbars=no,resizable=no");
      if (popup) {
        popup.document.write(`
          <!DOCTYPE html>
          <html><head><title>Approve ${txType}</title>
          <style>
            body { margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0a0a0a; color:#fff; font-family:system-ui,sans-serif; }
            img { width:280px; height:280px; border-radius:12px; margin-bottom:16px; }
            h3 { margin:0 0 8px; font-size:18px; }
            p { margin:0; font-size:14px; color:#999; }
          </style></head><body>
            <h3>Approve ${txType}</h3>
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

export async function signPayment(
  destination: string,
  amount: string | { currency: string; value: string; issuer: string },
  options?: { destinationTag?: number; memos?: Array<{ MemoType?: string; MemoData?: string }> }
): Promise<XummSignResult> {
  try {
    const txJson: Record<string, any> = {
      TransactionType: "Payment",
      Destination: destination,
      Amount: amount,
    };
    if (options?.destinationTag !== undefined) {
      txJson.DestinationTag = options.destinationTag;
    }
    if (options?.memos && options.memos.length > 0) {
      const toHex = (str: string) => Array.from(new TextEncoder().encode(str)).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      txJson.Memos = options.memos.map((m) => ({
        Memo: {
          ...(m.MemoType ? { MemoType: toHex(m.MemoType) } : {}),
          ...(m.MemoData ? { MemoData: toHex(m.MemoData) } : {}),
        },
      }));
    }
    const res = await apiRequest("POST", "/api/xumm/payload", txJson);
    const payload = await res.json();

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      sessionStorage.setItem(XUMM_PENDING_PAYMENT_KEY, payload.uuid);
      window.location.href = payload.deepLink;
      return new Promise(() => {});
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
      sessionStorage.setItem(XUMM_PENDING_PAYMENT_KEY, payload.uuid);
      window.location.href = payload.deepLink;
      return new Promise(() => {});
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
