/**
 * Script 4: Resolve Market
 * - Admin resolves the market with an outcome (YES/NO)
 * - Update database
 * - Verify on-chain state
 */

import { type Hex } from "viem";
import { ADMIN_KEY } from "./lib/accounts.js";
import { resolveMarket, getMarket } from "./lib/contracts.js";
import { updateMarketStatus, closePool } from "./lib/db.js";

export async function runResolveMarket(
  marketId: Hex,
  outcome: boolean
): Promise<void> {
  console.log(`\n=== Resolve Market ===`);
  console.log(`Market ID: ${marketId.slice(0, 20)}...`);
  console.log(`Outcome: ${outcome ? "YES" : "NO"}`);

  // Step 1: Resolve on-chain
  console.log("\nResolving on-chain...");
  const txHash = await resolveMarket(ADMIN_KEY, marketId, outcome);
  console.log(`  TX: ${txHash}`);

  // Step 2: Verify on-chain
  const market = await getMarket(marketId);
  console.log(`\nOn-chain verification:`);
  console.log(`  Resolved: ${market.resolved}`);
  console.log(`  Outcome: ${market.outcome ? "YES" : "NO"}`);
  console.log(`  Total YES pool: ${market.totalYes}`);
  console.log(`  Total NO pool: ${market.totalNo}`);

  // Step 3: Update database
  try {
    await updateMarketStatus(marketId, "resolved", outcome);
    console.log(`\n  [DB] Market status updated to 'resolved'`);
  } catch (err: any) {
    console.warn(`\n  [DB] Skipped: ${err.message}`);
  }

  console.log(`\nReveal phase started. Users should reveal their bets now.`);
  console.log(
    `Reveal deadline: ${new Date(Number(market.revealDeadline) * 1000).toISOString()}`
  );

  console.log(`\n=== Market Resolved ===`);
}

// Run standalone
if (process.argv[1]?.endsWith("4-resolve-market.ts")) {
  const marketId = process.argv[2] as Hex;
  const outcome = process.argv[3] === "yes" || process.argv[3] === "true";
  if (!marketId) {
    console.error("Usage: npx tsx scripts/4-resolve-market.ts <marketId> <yes|no>");
    process.exit(1);
  }
  runResolveMarket(marketId, outcome)
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed:", err);
      process.exit(1);
    });
}
