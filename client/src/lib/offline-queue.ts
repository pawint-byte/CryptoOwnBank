const QUEUE_KEY = "ownbank-offline-payments";
const BALANCE_CACHE_KEY = "ownbank-cached-balances";

export interface CachedBalance {
  chain: "xrpl" | "stellar";
  currency: string;
  amount: number;
  updatedAt: string;
}

export function cacheBalances(balances: CachedBalance[]): void {
  localStorage.setItem(BALANCE_CACHE_KEY, JSON.stringify(balances));
}

export function getCachedBalances(): CachedBalance[] {
  try {
    const data = localStorage.getItem(BALANCE_CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getCachedBalance(chain: string, currency: string): CachedBalance | null {
  const balances = getCachedBalances();
  return balances.find(b => b.chain === chain && b.currency.toUpperCase() === currency.toUpperCase()) || null;
}

export function getBalanceCacheAge(): string | null {
  const balances = getCachedBalances();
  if (balances.length === 0) return null;
  const newest = balances.reduce((a, b) => new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b);
  const ago = Date.now() - new Date(newest.updatedAt).getTime();
  if (ago < 60000) return "just now";
  if (ago < 3600000) return `${Math.floor(ago / 60000)}m ago`;
  if (ago < 86400000) return `${Math.floor(ago / 3600000)}h ago`;
  return `${Math.floor(ago / 86400000)}d ago`;
}

export interface QueuedPayment {
  id: string;
  to: string;
  amount: string;
  currency: string;
  chain: "xrpl" | "stellar";
  memo: string;
  destinationTag: string;
  recipientName: string;
  status: "queued" | "syncing" | "sent" | "failed";
  errorMessage?: string;
  txHash?: string;
  fromAddress?: string;
  createdAt: string;
  syncedAt?: string;
}

export function getExplorerUrl(chain: string, txHash: string): string {
  if (chain === "stellar") return `https://stellar.expert/explorer/public/tx/${txHash}`;
  return `https://xrpscan.com/tx/${txHash}`;
}

export function getReceiptData(payment: QueuedPayment) {
  return {
    id: payment.id,
    to: payment.to,
    from: payment.fromAddress || "",
    amount: payment.amount,
    currency: payment.currency,
    chain: payment.chain,
    memo: payment.memo,
    txHash: payment.txHash || "",
    recipientName: payment.recipientName,
    createdAt: payment.createdAt,
    syncedAt: payment.syncedAt || "",
    explorerUrl: payment.txHash ? getExplorerUrl(payment.chain, payment.txHash) : "",
  };
}

function generateId(): string {
  return `OPQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export function loadQueue(): QueuedPayment[] {
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveQueue(queue: QueuedPayment[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function addToQueue(payment: Omit<QueuedPayment, "id" | "status" | "createdAt">): QueuedPayment {
  const queue = loadQueue();
  const entry: QueuedPayment = {
    ...payment,
    id: generateId(),
    status: "queued",
    createdAt: new Date().toISOString(),
  };
  queue.unshift(entry);
  saveQueue(queue);
  return entry;
}

export function updateQueueItem(id: string, updates: Partial<QueuedPayment>): void {
  const queue = loadQueue();
  const idx = queue.findIndex(q => q.id === id);
  if (idx >= 0) {
    queue[idx] = { ...queue[idx], ...updates };
    saveQueue(queue);
  }
}

export function removeFromQueue(id: string): void {
  const queue = loadQueue().filter(q => q.id !== id);
  saveQueue(queue);
}

export function clearSentFromQueue(): void {
  const queue = loadQueue().filter(q => q.status !== "sent");
  saveQueue(queue);
}

export function getQueueCount(): number {
  return loadQueue().filter(q => q.status === "queued" || q.status === "failed").length;
}

export function getPendingTotal(chain: string, currency: string): number {
  return loadQueue()
    .filter(q => (q.status === "queued" || q.status === "syncing") && q.chain === chain && q.currency.toUpperCase() === currency.toUpperCase())
    .reduce((sum, q) => sum + (parseFloat(q.amount) || 0), 0);
}

export function getEffectiveBalance(chain: string, currency: string): { total: number; pending: number; available: number } | null {
  const cached = getCachedBalance(chain, currency);
  if (!cached) return null;
  const pending = getPendingTotal(chain, currency);
  return {
    total: cached.amount,
    pending,
    available: Math.max(0, cached.amount - pending),
  };
}
