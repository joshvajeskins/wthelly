/**
 * Script 1: Create Market
 * - Admin creates a prediction market on HellyHook
 * - Inserts market into database
 * - Verifies on-chain state
 */

import { type Hex } from "viem";
import { ADMIN_KEY } from "./lib/accounts.js";
import { createMarket, getMarket, formatUSDC } from "./lib/contracts.js";
import { generateMarketId } from "./lib/commitment.js";
import { insertMarket, getMarketFromDB, closePool } from "./lib/db.js";

const DEFAULT_QUESTION = "Will ETH hit $5k by end of 2026?";
const BETTING_WINDOW_SECONDS = 3600; // 1 hour
const REVEAL_WINDOW_SECONDS = 1800; // 30 minutes

export async function runCreateMarket(
  question: string = DEFAULT_QUESTION,
  bettingWindowSec: number = BETTING_WINDOW_SECONDS,
  revealWindowSec: number = REVEAL_WINDOW_SECONDS
): Promise<{ marketId: Hex; deadline: bigint; revealDeadline: bigint }> {
  console.log("=== Create Market ===\n");

  // Generate market ID
  const marketId = generateMarketId(question);
  console.log(`Market ID: ${marketId}`);
  console.log(`Question: ${question}`);

  // Calculate deadlines
  const now = BigInt(Math.floor(Date.now() / 1000));
  const deadline = now + BigInt(bettingWindowSec);
  const revealWindow = BigInt(revealWindowSec);

  console.log(`Deadline: ${new Date(Number(deadline) * 1000).toISOString()}`);
  console.log(`Reveal window: ${revealWindowSec}s after resolution`);

  // Create market on-chain
  console.log("\nCreating market on-chain...");
  const txHash = await createMarket(
    ADMIN_KEY,
    marketId,
    question,
    deadline,
    revealWindow
  );
  console.log(`  TX: ${txHash}`);

  // Verify on-chain
  const market = await getMarket(marketId);
  console.log("\nOn-chain verification:");
  console.log(`  Question: ${market.question}`);
  console.log(`  Resolved: ${market.resolved}`);
  console.log(`  Settled: ${market.settled}`);
  console.log(`  Commit count: ${market.commitCount}`);

  // Insert into database
  try {
    await insertMarket(
      marketId,
      question,
      new Date(Number(deadline) * 1000),
      new Date(Number(deadline + revealWindow) * 1000)
    );
    const dbMarket = await getMarketFromDB(marketId);
    console.log(`\n  [DB] Market inserted, status: ${dbMarket?.status}`);
  } catch (err: any) {
    console.warn(`\n  [DB] Skipped: ${err.message}`);
  }

  console.log("\n=== Market Created ===");
  return { marketId, deadline, revealDeadline: deadline + revealWindow };
}

// Run standalone
if (process.argv[1]?.endsWith("1-create-market.ts")) {
  runCreateMarket()
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed:", err);
      process.exit(1);
    });
}
