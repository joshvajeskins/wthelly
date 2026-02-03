/**
 * Script 6: Settle Market
 * - Admin settles the market
 * - Winners get paid, losers lose, platform fee collected
 * - Users withdraw from HellyHook
 * - Update database
 */

import { type Hex, type Address, formatUnits } from "viem";
import { ADMIN_KEY, ADMIN_ADDRESS } from "./lib/accounts.js";
import {
  settleMarket,
  getMarket,
  getBalance,
  withdrawFromHook,
  getUSDCBalance,
  formatUSDC,
} from "./lib/contracts.js";
import {
  updateMarketStatus,
  insertSettlement,
  updateBetPayout,
  getBetsForMarket,
  closePool,
} from "./lib/db.js";
import { ONE_USDC, PLATFORM_FEE_BPS } from "./lib/config.js";
import type { BetInfo } from "./3-place-bet.js";

export interface SettlementResult {
  txHash: Hex;
  winnerPayouts: Map<Address, bigint>;
  platformFee: bigint;
  totalDistributed: bigint;
}

export async function runSettleMarket(
  marketId: Hex,
  bets: BetInfo[]
): Promise<SettlementResult> {
  console.log(`\n=== Settle Market ===`);
  console.log(`Market ID: ${marketId.slice(0, 20)}...`);

  // Pre-settlement balances
  console.log("\nPre-settlement balances:");
  const preBals = new Map<Address, bigint>();
  for (const bet of bets) {
    const bal = await getBalance(bet.userAddress);
    preBals.set(bet.userAddress, bal);
    console.log(`  ${bet.userAddress.slice(0, 10)}...: ${formatUSDC(bal)} USDC`);
  }
  const adminPreBal = await getBalance(ADMIN_ADDRESS);
  console.log(`  Admin: ${formatUSDC(adminPreBal)} USDC`);

  // Step 1: Settle on-chain
  console.log("\nSettling market on-chain...");
  const txHash = await settleMarket(ADMIN_KEY, marketId);
  console.log(`  TX: ${txHash}`);

  // Step 2: Verify settlement
  const market = await getMarket(marketId);
  console.log(`\nOn-chain verification:`);
  console.log(`  Settled: ${market.settled}`);
  console.log(`  Total YES: ${formatUSDC(market.totalYes)} USDC`);
  console.log(`  Total NO: ${formatUSDC(market.totalNo)} USDC`);

  // Step 3: Check post-settlement balances
  console.log("\nPost-settlement balances:");
  const winnerPayouts = new Map<Address, bigint>();
  let totalDistributed = 0n;

  for (const bet of bets) {
    const postBal = await getBalance(bet.userAddress);
    const preBal = preBals.get(bet.userAddress)!;
    const diff = postBal - preBal;

    console.log(
      `  ${bet.userAddress.slice(0, 10)}...: ${formatUSDC(postBal)} USDC` +
        (diff > 0n ? ` (+${formatUSDC(diff)} winnings)` : diff === 0n ? " (lost)" : "")
    );

    if (diff > 0n) {
      winnerPayouts.set(bet.userAddress, diff);
      totalDistributed += diff;
    }
  }

  const adminPostBal = await getBalance(ADMIN_ADDRESS);
  const platformFee = adminPostBal - adminPreBal;
  console.log(
    `  Admin (fee): ${formatUSDC(adminPostBal)} USDC (+${formatUSDC(platformFee)} fee)`
  );

  // Step 4: Users withdraw their balances
  console.log("\nWithdrawing balances...");
  for (const bet of bets) {
    const bal = await getBalance(bet.userAddress);
    if (bal > 0n) {
      const withdrawHash = await withdrawFromHook(bet.userKey, bal);
      const usdcBal = await getUSDCBalance(bet.userAddress);
      console.log(
        `  ${bet.userAddress.slice(0, 10)}...: withdrew ${formatUSDC(bal)} USDC (wallet: ${formatUSDC(usdcBal)})`
      );
    }
  }

  // Admin withdraws fee
  if (platformFee > 0n) {
    await withdrawFromHook(ADMIN_KEY, platformFee);
    console.log(`  Admin: withdrew ${formatUSDC(platformFee)} USDC fee`);
  }

  // Step 5: Update database
  try {
    await updateMarketStatus(marketId, "settled");
    await insertSettlement(
      marketId,
      txHash,
      Number(formatUnits(totalDistributed, 6)),
      Number(formatUnits(platformFee, 6)),
      winnerPayouts.size,
      bets.length - winnerPayouts.size
    );

    // Update individual bet payouts
    for (const bet of bets) {
      const postBal = winnerPayouts.get(bet.userAddress);
      if (postBal) {
        await updateBetPayout(
          marketId,
          bet.userAddress,
          Number(formatUnits(bet.amount + postBal, 6))
        );
      } else {
        await updateBetPayout(marketId, bet.userAddress, 0);
      }
    }

    console.log(`\n  [DB] Settlement recorded`);
  } catch (err: any) {
    console.warn(`\n  [DB] Skipped: ${err.message}`);
  }

  console.log(`\n=== Market Settled ===`);

  return { txHash, winnerPayouts, platformFee, totalDistributed };
}

// Run standalone
if (process.argv[1]?.endsWith("6-settle-market.ts")) {
  console.log("This script should be called from 7-full-flow.ts with bet info.");
  console.log("Usage: import { runSettleMarket } from './6-settle-market.js'");
  process.exit(0);
}
