/**
 * Script 7: Full E2E Flow
 *
 * Runs the complete prediction market lifecycle with 3 users:
 * - User A (Alice): Bets YES $100
 * - User B (Bob): Bets NO $200
 * - User C (Charlie): Bets YES $150
 *
 * Market resolves YES. Expected:
 * - Alice wins: proportional share of $200 NO pool (minus 2% fee)
 * - Charlie wins: proportional share of $200 NO pool (minus 2% fee)
 * - Bob loses: $200
 * - Platform collects: 2% of $200 = $4
 *
 * Run: npx tsx scripts/7-full-flow.ts
 * Prerequisites: Anvil running (docker-compose up -d or local anvil)
 */

import { type Hex, createPublicClient, http } from "viem";
import { foundry } from "viem/chains";
import { execSync } from "child_process";
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  ADMIN_KEY,
  ADMIN_ADDRESS,
  ALICE_KEY,
  BOB_KEY,
  CHARLIE_KEY,
} from "./lib/accounts.js";
import {
  ANVIL_RPC_URL,
  HELLY_HOOK_ABI,
  ERC20_ABI,
  ONE_USDC,
  PLATFORM_FEE_BPS,
} from "./lib/config.js";
import { getPublicClient, deployContract, formatUSDC } from "./lib/contracts.js";
import { runCreateMarket } from "./1-create-market.js";
import { runUserDeposit } from "./2-user-deposit.js";
import { runPlaceBet, type BetInfo } from "./3-place-bet.js";
import { runResolveMarket } from "./4-resolve-market.js";
import { runRevealBets } from "./5-reveal-bets.js";
import { runSettleMarket } from "./6-settle-market.js";
import { initSchema, closePool } from "./lib/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getContractBytecode(name: string): Hex {
  const contractsDir = join(__dirname, "../contracts");
  execSync("forge build", { cwd: contractsDir, stdio: "pipe" });
  const artifact = JSON.parse(
    readFileSync(join(contractsDir, `out/${name}.sol/${name}.json`), "utf-8")
  );
  return artifact.bytecode.object as Hex;
}

async function deployContracts() {
  console.log("=== Deploying Contracts ===\n");

  const publicClient = getPublicClient();

  // Verify Anvil
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`Anvil running, block #${blockNumber}`);
  } catch {
    console.error("ERROR: Anvil is not running!");
    console.error("Start with: anvil  (or: cd nitrolite && docker-compose up -d)");
    process.exit(1);
  }

  // Deploy MockUSDC
  console.log("Deploying MockUSDC...");
  const mockUSDC = await deployContract(ADMIN_KEY, ERC20_ABI, getContractBytecode("MockUSDC"));
  console.log(`  MockUSDC: ${mockUSDC.address}`);

  // Deploy HellyHook (with dummy PoolManager for local testing)
  const MOCK_POOL_MANAGER = "0x000000000000000000000000000000000000dEaD";
  console.log("Deploying HellyHook...");
  const hellyHook = await deployContract(
    ADMIN_KEY,
    HELLY_HOOK_ABI,
    getContractBytecode("HellyHook"),
    [MOCK_POOL_MANAGER, mockUSDC.address, BigInt(PLATFORM_FEE_BPS)]
  );
  console.log(`  HellyHook: ${hellyHook.address}`);

  // Save deployment
  const deployment = {
    hellyHook: hellyHook.address,
    mockUSDC: mockUSDC.address,
    deployer: ADMIN_ADDRESS,
    chainId: 31337,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(
    join(__dirname, "lib/deployment.json"),
    JSON.stringify(deployment, null, 2)
  );
  console.log("Deployment saved.\n");

  return deployment;
}

async function main() {
  const startTime = Date.now();

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║         WTHELLY — Full E2E Flow Test            ║");
  console.log("║                                                  ║");
  console.log("║  Alice  → YES $100                              ║");
  console.log("║  Bob    → NO  $200                              ║");
  console.log("║  Charlie→ YES $150                              ║");
  console.log("║  Outcome: YES                                   ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ============================================================
  // STEP 0: Deploy contracts
  // ============================================================
  console.log("━━━ Step 0: Deploy Contracts ━━━");
  await deployContracts();

  // ============================================================
  // STEP 0.5: Init database (optional)
  // ============================================================
  try {
    await initSchema();
    console.log("Database schema initialized.\n");
  } catch {
    console.log("Database not available (OK for contract-only testing).\n");
  }

  // ============================================================
  // STEP 1: Create Market
  // ============================================================
  console.log("━━━ Step 1: Create Market ━━━");
  const { marketId } = await runCreateMarket(
    "Will ETH hit $5k by end of 2026?",
    7200, // 2 hour betting window
    3600 // 1 hour reveal window
  );

  // ============================================================
  // STEP 2: User Deposits
  // ============================================================
  console.log("\n━━━ Step 2: User Deposits ━━━");
  await runUserDeposit(ALICE_KEY, 500n * ONE_USDC, 1000n * ONE_USDC, "Alice");
  await runUserDeposit(BOB_KEY, 500n * ONE_USDC, 1000n * ONE_USDC, "Bob");
  await runUserDeposit(CHARLIE_KEY, 500n * ONE_USDC, 1000n * ONE_USDC, "Charlie");

  // ============================================================
  // STEP 3: Place Bets
  // ============================================================
  console.log("\n━━━ Step 3: Place Bets ━━━");
  const aliceBet = await runPlaceBet(ALICE_KEY, marketId, true, 100n * ONE_USDC);
  const bobBet = await runPlaceBet(BOB_KEY, marketId, false, 200n * ONE_USDC);
  const charlieBet = await runPlaceBet(CHARLIE_KEY, marketId, true, 150n * ONE_USDC);

  const allBets: BetInfo[] = [aliceBet, bobBet, charlieBet];

  // ============================================================
  // STEP 4: Resolve Market (YES wins)
  // ============================================================
  console.log("\n━━━ Step 4: Resolve Market ━━━");
  await runResolveMarket(marketId, true);

  // ============================================================
  // STEP 5: Reveal All Bets
  // ============================================================
  console.log("\n━━━ Step 5: Reveal Bets ━━━");
  await runRevealBets(allBets);

  // ============================================================
  // STEP 6: Settle Market
  // ============================================================
  console.log("\n━━━ Step 6: Settle Market ━━━");
  const settlement = await runSettleMarket(marketId, allBets);

  // ============================================================
  // VERIFICATION
  // ============================================================
  console.log("\n━━━ Final Verification ━━━\n");

  // Expected payouts:
  // Loser pool = $200 (Bob)
  // Platform fee = 2% of $200 = $4
  // Net distributable = $196
  // Winner pool = $250 (Alice $100 + Charlie $150)
  // Alice payout = $100 + ($100/$250) * $196 = $100 + $78.40 = $178.40
  // Charlie payout = $150 + ($150/$250) * $196 = $150 + $117.60 = $267.60
  // Bob payout = $0

  const loserPool = 200n * ONE_USDC;
  const fee = (loserPool * BigInt(PLATFORM_FEE_BPS)) / 10000n;
  const net = loserPool - fee;
  const winnerPool = 250n * ONE_USDC;

  console.log("Expected payouts (from contract settlement):");
  console.log(
    `  Alice  (YES $100): bet back + ${formatUSDC((100n * ONE_USDC * net) / winnerPool)} winnings = ${formatUSDC(100n * ONE_USDC + (100n * ONE_USDC * net) / winnerPool)} total`
  );
  console.log(
    `  Charlie(YES $150): bet back + ${formatUSDC((150n * ONE_USDC * net) / winnerPool)} winnings = ${formatUSDC(150n * ONE_USDC + (150n * ONE_USDC * net) / winnerPool)} total`
  );
  console.log(`  Bob    (NO  $200): $0 (lost)`);
  console.log(`  Platform fee: ${formatUSDC(fee)} USDC`);

  // Verify platform fee
  const feeOK = settlement.platformFee === fee;
  console.log(`\nPlatform fee check: ${feeOK ? "PASS" : "FAIL"}`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║               E2E FLOW COMPLETE                  ║");
  console.log(`║           Time: ${elapsed}s                            ║`);
  console.log(`║  Platform fee: ${feeOK ? "PASS" : "FAIL"}                              ║`);
  console.log("╚══════════════════════════════════════════════════╝");

  await closePool();
}

main().catch((err) => {
  console.error("\nE2E flow failed:", err);
  closePool().then(() => process.exit(1));
});
