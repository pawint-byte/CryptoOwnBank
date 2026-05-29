import { storage } from "../storage";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { RLUSD, ADMIN_EMAILS } from "@shared/constants";

export function safeServerDate(dateValue: string | Date): Date {
  if (dateValue instanceof Date) return dateValue;
  const str = String(dateValue);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str + "T12:00:00");
  }
  if (/^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z?$/.test(str)) {
    return new Date(str.slice(0, 10) + "T12:00:00");
  }
  return new Date(str);
}

export function detectChainMismatch(chain: string, address: string): string | null {
  const a = address.trim();
  const patterns: Record<string, (addr: string) => boolean> = {
    cronos: (addr) => addr.startsWith("cro1") || addr.startsWith("0x"),
    ethereum: (addr) => addr.startsWith("0x") && addr.length === 42,
    bitcoin: (addr) => /^(1|3|bc1)[a-zA-Z0-9]{25,}$/.test(addr),
    xrpl: (addr) => addr.startsWith("r") && addr.length >= 25 && addr.length <= 35,
    solana: (addr) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr) && !addr.startsWith("0x"),
    tron: (addr) => addr.startsWith("T") && addr.length === 34,
    algorand: (addr) => addr.length === 58 && /^[A-Z2-7]+$/.test(addr),
    cosmos: (addr) => addr.startsWith("cosmos1"),
    hedera: (addr) => /^0\.0\.\d+$/.test(addr),
    polkadot: (addr) => /^[1-9A-HJ-NP-Za-km-z]{46,48}$/.test(addr),
    stellar: (addr) => addr.startsWith("G") && addr.length === 56,
  };
  const validator = patterns[chain];
  if (validator && !validator(a)) {
    for (const [otherChain, otherValidator] of Object.entries(patterns)) {
      if (otherChain !== chain && otherValidator(a)) {
        return `Address looks like ${otherChain}, not ${chain}`;
      }
    }
    return `Address format doesn't match ${chain}`;
  }
  return null;
}

export const SOIL_VAULT_ADDRESSES = [
  "rHKx9ngSgQUQGMSrP313hFKDukvJXdVfBX",
  "rnvp6FiucXE7kjR8LKRocosWmg8pGhFZa8",
  // YIELD vault address — add here when Soil activates the pool
];
export const SOIL_VAULT_ADDRESS = SOIL_VAULT_ADDRESSES[0];
export const RLUSD_CURRENCY_HEX = RLUSD.currency;

export async function getEffectiveTier(userId: string): Promise<{ tier: string; billingCycle: string }> {
  const settings = await storage.getUserSettings(userId);
  const tier = settings?.subscriptionTier || "free";
  const billingCycle = settings?.subscriptionBillingCycle || "monthly";

  const [user] = await db.select({ email: users.email, isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
  if (user?.isAdmin || ADMIN_EMAILS.includes(user?.email?.toLowerCase() || "")) {
    return { tier: "pro", billingCycle: "yearly" };
  }

  return { tier, billingCycle };
}
