import { Client } from "xrpl";
import { KNOWN_XRPL_ADDRESSES } from "./known-xrpl-addresses";
import { db } from "../db";
import { walletIdentityCache } from "@shared/schema";
import { eq } from "drizzle-orm";

const memoryCache = new Map<string, { label: string | null; expiresAt: number }>();
const MEMORY_CACHE_TTL_MS = 60 * 60 * 1000;
const NEGATIVE_MEMORY_CACHE_TTL_MS = 15 * 60 * 1000;
const DB_CACHE_STALE_MS = 24 * 60 * 60 * 1000;

let sharedXrplClient: Client | null = null;

export function setSharedXrplClient(client: Client) {
  sharedXrplClient = client;
}

function decodeDomainHex(hex: string): string {
  try {
    const bytes = Buffer.from(hex, "hex");
    return bytes.toString("utf8");
  } catch {
    return "";
  }
}

async function queryAccountDomain(address: string): Promise<string | null> {
  if (!sharedXrplClient || !sharedXrplClient.isConnected()) return null;

  try {
    const response = await sharedXrplClient.request({
      command: "account_info",
      account: address,
      ledger_index: "validated",
    });

    const domain = response?.result?.account_data?.Domain;
    if (domain && typeof domain === "string") {
      const decoded = decodeDomainHex(domain);
      if (decoded && decoded.length > 0 && decoded.length < 200) {
        return decoded;
      }
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (!errMsg.includes("actNotFound")) {
      console.error(`[wallet-resolver] Error querying domain for ${address}:`, errMsg);
    }
  }

  return null;
}

async function getFromDbCache(address: string): Promise<{ label: string | null; isStale: boolean } | null> {
  try {
    const [cached] = await db.select().from(walletIdentityCache).where(eq(walletIdentityCache.address, address));
    if (!cached) return null;
    const age = Date.now() - (cached.updatedAt?.getTime() || 0);
    return { label: cached.label, isStale: age > DB_CACHE_STALE_MS };
  } catch (err: unknown) {
    console.error(`[wallet-resolver] DB cache read error for ${address}:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function saveToDbCache(address: string, label: string | null, source: string): Promise<void> {
  try {
    await db.insert(walletIdentityCache)
      .values({ address, label, source, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: walletIdentityCache.address,
        set: { label, source, updatedAt: new Date() },
      });
  } catch (err: unknown) {
    console.error(`[wallet-resolver] DB cache write error for ${address}:`, err instanceof Error ? err.message : String(err));
  }
}

export async function resolveWalletLabel(address: string): Promise<string | null> {
  if (!address) return null;

  const knownLabel = KNOWN_XRPL_ADDRESSES[address];
  if (knownLabel) return knownLabel;

  const memCached = memoryCache.get(address);
  if (memCached && Date.now() < memCached.expiresAt) {
    return memCached.label;
  }

  const dbCached = await getFromDbCache(address);
  if (dbCached && !dbCached.isStale) {
    const ttl = dbCached.label ? MEMORY_CACHE_TTL_MS : NEGATIVE_MEMORY_CACHE_TTL_MS;
    memoryCache.set(address, { label: dbCached.label, expiresAt: Date.now() + ttl });
    return dbCached.label;
  }

  const domain = await queryAccountDomain(address);

  if (domain) {
    memoryCache.set(address, { label: domain, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
    await saveToDbCache(address, domain, "xrpl_domain");
    return domain;
  }

  memoryCache.set(address, { label: null, expiresAt: Date.now() + NEGATIVE_MEMORY_CACHE_TTL_MS });
  await saveToDbCache(address, null, "not_found");
  return null;
}

export async function resolveWalletLabels(
  senderAddress: string,
  receiverAddress: string
): Promise<{ senderLabel: string | null; receiverLabel: string | null }> {
  const [senderLabel, receiverLabel] = await Promise.all([
    resolveWalletLabel(senderAddress),
    resolveWalletLabel(receiverAddress),
  ]);
  return { senderLabel, receiverLabel };
}
