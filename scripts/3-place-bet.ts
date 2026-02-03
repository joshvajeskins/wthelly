/**
 * Script 3: Place Bet
 * - Generate secret locally
 * - Compute commitment hash
 * - Submit commitment to HellyHook on-chain
 * - Store bet in database (with secret for later reveal)
 */

import { type Hex, type Address, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  submitCommitment,
  getCommitmentHash,
  getBalance,
  getMarket,
  formatUSDC,
} from "./lib/contracts.js";
import { generateSecret, computeCommitmentHash } from "./lib/commitment.js";
import { ONE_USDC } from "./lib/config.js";
import { insertBet, closePool } from "./lib/db.js";
import { ALICE_KEY } from "./lib/accounts.js";

export interface BetInfo {
  marketId: Hex;
  userKey: Hex;
  userAddress: Address;
  isYes: boolean;
  amount: bigint;
  secret: Hex;
  commitHash: Hex;
}

export async function runPlaceBet(
  userKey: Hex,
  marketId: Hex,
  isYes: boolean,
  amount: bigint
): Promise<BetInfo> {
  const account = privateKeyToAccount(userKey);
  const userAddress = account.address;

  console.log(
    `\n--- Place Bet: ${userAddress.slice(0, 10)}... ${isYes ? "YES" : "NO"} $${formatUSDC(amount)} ---`
  );

  // Step 1: Generate secret
  const secret = generateSecret();
  console.log(`  Secret: ${secret.slice(0, 20)}...`);

  // Step 2: Compute commitment hash (off-chain, matching on-chain formula)
  const commitHash = computeCommitmentHash(
    marketId,
    isYes,
    amount,
    secret,
    userAddress
  );
  console.log(`  Commitment hash: ${commitHash.slice(0, 20)}...`);

  // Step 3: Verify commitment matches on-chain computation
  const onChainHash = await getCommitmentHash(
    marketId,
    isYes,
    amount,
    secret,
    userAddress
  );
  if (commitHash !== onChainHash) {
    throw new Error("Commitment hash mismatch! Off-chain != on-chain");
  }
  console.log(`  Hash verified (off-chain == on-chain)`);

  // Step 4: Submit commitment on-chain
  console.log(`  Submitting commitment...`);
  const txHash = await submitCommitment(userKey, marketId, commitHash, amount);
  console.log(`  TX: ${txHash}`);

  // Step 5: Verify balance locked
  const hookBalance = await getBalance(userAddress);
  console.log(`  Remaining HellyHook balance: ${formatUSDC(hookBalance)} USDC`);

  // Step 6: Verify market state
  const market = await getMarket(marketId);
  console.log(`  Market commit count: ${market.commitCount}`);

  // Step 7: Store in database
  try {
    await insertBet(
      marketId,
      userAddress,
      commitHash,
      Number(formatUnits(amount, 6)),
      secret,
      isYes ? "yes" : "no"
    );
    console.log(`  [DB] Bet stored`);
  } catch (err: any) {
    console.warn(`  [DB] Skipped: ${err.message}`);
  }

  console.log(`--- Bet Placed ---`);

  return {
    marketId,
    userKey,
    userAddress,
    isYes,
    amount,
    secret,
    commitHash,
  };
}

// Run standalone
if (process.argv[1]?.endsWith("3-place-bet.ts")) {
  const marketId = process.argv[2] as Hex;
  if (!marketId) {
    console.error("Usage: npx tsx scripts/3-place-bet.ts <marketId>");
    process.exit(1);
  }
  runPlaceBet(ALICE_KEY, marketId, true, 100n * ONE_USDC)
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed:", err);
      process.exit(1);
    });
}
