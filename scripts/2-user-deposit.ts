/**
 * Script 2: User Deposit
 * - Mint USDC to user
 * - Deposit USDC to HellyHook (for betting)
 * - Optionally connect to Clearnode and open channel
 * - Register user in database
 */

import { type Hex, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ADMIN_KEY } from "./lib/accounts.js";
import {
  mintUSDC,
  depositToHook,
  getBalance,
  getUSDCBalance,
  formatUSDC,
} from "./lib/contracts.js";
import { ONE_USDC } from "./lib/config.js";
import { upsertUser, closePool } from "./lib/db.js";
import { ALICE_KEY, ALICE_ADDRESS } from "./lib/accounts.js";

export async function runUserDeposit(
  userKey: Hex,
  depositAmount: bigint = 500n * ONE_USDC,
  mintAmount: bigint = 1000n * ONE_USDC,
  username?: string
): Promise<void> {
  const account = privateKeyToAccount(userKey);
  const userAddress = account.address;

  console.log(`\n--- User Deposit: ${userAddress.slice(0, 10)}... ---`);

  // Step 1: Mint USDC to user
  console.log(`  Minting ${formatUSDC(mintAmount)} USDC...`);
  await mintUSDC(ADMIN_KEY, userAddress, mintAmount);
  const usdcBal = await getUSDCBalance(userAddress);
  console.log(`  USDC balance: ${formatUSDC(usdcBal)}`);

  // Step 2: Deposit to HellyHook
  console.log(`  Depositing ${formatUSDC(depositAmount)} USDC to HellyHook...`);
  const depositHash = await depositToHook(userKey, depositAmount);
  console.log(`  Deposit TX: ${depositHash}`);

  // Step 3: Verify balances
  const hookBalance = await getBalance(userAddress);
  const remainingUSDC = await getUSDCBalance(userAddress);
  console.log(`  HellyHook balance: ${formatUSDC(hookBalance)} USDC`);
  console.log(`  Remaining USDC: ${formatUSDC(remainingUSDC)} USDC`);

  // Step 4: Register in database
  try {
    await upsertUser(userAddress, username);
    console.log(`  [DB] User registered`);
  } catch (err: any) {
    console.warn(`  [DB] Skipped: ${err.message}`);
  }

  console.log(`--- Deposit Complete ---`);
}

// Run standalone with Alice
if (process.argv[1]?.endsWith("2-user-deposit.ts")) {
  runUserDeposit(ALICE_KEY, 500n * ONE_USDC, 1000n * ONE_USDC, "Alice")
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed:", err);
      process.exit(1);
    });
}
