import { db } from "../server/db";
import { positions, accounts } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  const userId = "3e7353fc-9f2f-4f72-aba9-93c49b629b89";
  
  const yahooAccounts = await db.select().from(accounts).where(
    and(eq(accounts.userId, userId), eq(accounts.provider, "yahoo_import"))
  );
  
  if (yahooAccounts.length === 0) {
    console.log("No Yahoo Finance Import account found");
    return;
  }
  
  const yahooAccountId = yahooAccounts[0].id;
  console.log("Found Yahoo account:", yahooAccountId);
  
  const yahooPositions = await db.select().from(positions).where(
    and(eq(positions.userId, userId), eq(positions.accountId, yahooAccountId))
  );
  
  console.log(`Found ${yahooPositions.length} Yahoo Finance Import positions to delete`);
  
  for (const pos of yahooPositions) {
    await db.delete(positions).where(eq(positions.id, pos.id));
    console.log(`  Deleted: ${pos.assetSymbol} (${pos.quantity})`);
  }
  
  console.log(`\nDone — deleted ${yahooPositions.length} positions`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
