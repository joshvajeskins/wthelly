/**
 * Script 5: Reveal Bets
 * - Each bettor reveals their bet with the secret
 * - Contract verifies commitment hash matches
 * - Update database
 */

import { type Hex, formatUnits } from "viem";
import { revealBet, getMarket, formatUSDC } from "./lib/contracts.js";
import { updateBetRevealed, closePool } from "./lib/db.js";
import type { BetInfo } from "./3-place-bet.js";

export async function runRevealBets(bets: BetInfo[]): Promise<void> {
  console.log(`\n=== Reveal Bets (${bets.length} bets) ===`);

  for (const bet of bets) {
    console.log(
      `\n--- Revealing: ${bet.userAddress.slice(0, 10)}... ${bet.isYes ? "YES" : "NO"} $${formatUSDC(bet.amount)} ---`
    );

    // Step 1: Reveal on-chain
    console.log(`  Revealing with secret: ${bet.secret.slice(0, 20)}...`);
    const txHash = await revealBet(
      bet.userKey,
      bet.marketId,
      bet.isYes,
      bet.secret
    );
    console.log(`  TX: ${txHash}`);

    // Step 2: Update database
    try {
      await updateBetRevealed(
        bet.marketId,
        bet.userAddress,
        bet.isYes ? "yes" : "no",
        bet.secret
      );
      console.log(`  [DB] Bet marked as revealed`);
    } catch (err: any) {
      console.warn(`  [DB] Skipped: ${err.message}`);
    }

    console.log(`  --- Revealed ---`);
  }

  // Verify market pools
  if (bets.length > 0) {
    const market = await getMarket(bets[0].marketId);
    console.log(`\nMarket pools after reveal:`);
    console.log(`  Total YES: ${formatUSDC(market.totalYes)} USDC`);
    console.log(`  Total NO: ${formatUSDC(market.totalNo)} USDC`);
    console.log(`  Commit count: ${market.commitCount}`);
  }

  console.log(`\n=== All Bets Revealed ===`);
}

// Run standalone (requires bet info from place-bet)
if (process.argv[1]?.endsWith("5-reveal-bets.ts")) {
  console.log("This script should be called from 7-full-flow.ts with bet info.");
  console.log("Usage: import { runRevealBets } from './5-reveal-bets.js'");
  process.exit(0);
}
