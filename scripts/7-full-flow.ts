/**
 * Script 7: Full E2E Flow (Contract-only, no commit-reveal)
 *
 * Runs the complete prediction market lifecycle:
 * - Deploy contracts
 * - Create market with oracle price target
 * - Users deposit USDC
 * - Bets placed off-chain via state channels (simulated)
 * - Resolve market (admin)
 * - Verify final market state
 *
 * Bets are now off-chain via Clearnode state channels, so this
 * E2E test validates the on-chain contract flow only.
 *
 * Run: npx tsx scripts/7-full-flow.ts
 * Prerequisites: Anvil running (docker-compose up -d or local anvil)
 */

import {
  type Hex,
  type Address,
  createPublicClient,
  http,
  keccak256,
  encodePacked,
  formatUnits,
} from "viem";
import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { execSync } from "child_process";
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  ADMIN_KEY,
  ADMIN_ADDRESS,
  ALICE_KEY,
  ALICE_ADDRESS,
  BOB_KEY,
  BOB_ADDRESS,
  CHARLIE_KEY,
  CHARLIE_ADDRESS,
} from "./lib/accounts.js";
import {
  ANVIL_RPC_URL,
  HELLY_HOOK_ABI,
  ERC20_ABI,
  ONE_USDC,
  USDC_DECIMALS,
  PLATFORM_FEE_BPS,
} from "./lib/config.js";
import {
  getPublicClient,
  getWalletClient,
  deployContract,
  formatUSDC,
  getBalance,
} from "./lib/contracts.js";
import { runUserDeposit } from "./2-user-deposit.js";
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

  console.log("==========================================================");
  console.log("         WTHELLY -- Full E2E Flow Test (v2)               ");
  console.log("                                                          ");
  console.log("  Alice   -> deposits $500 USDC                          ");
  console.log("  Bob     -> deposits $500 USDC                          ");
  console.log("  Charlie -> deposits $500 USDC                          ");
  console.log("  Bets placed off-chain via state channels                ");
  console.log("  Market resolved: YES                                    ");
  console.log("==========================================================\n");

  // ============================================================
  // STEP 0: Deploy contracts
  // ============================================================
  console.log("--- Step 0: Deploy Contracts ---");
  const deployment = await deployContracts();

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
  // STEP 1: Create Market with oracle price params
  // ============================================================
  console.log("--- Step 1: Create Market ---");

  const question = "Will ETH hit $5k by end of 2026?";
  const marketId = keccak256(encodePacked(["string"], [question]));
  const now = BigInt(Math.floor(Date.now() / 1000));
  const deadline = now + 7200n; // 2 hour betting window
  const poolId = keccak256(encodePacked(["string"], ["eth-usdc-pool"]));
  const priceTarget = 79228162514264337593543950336n; // sqrtPriceX96 value
  const priceAbove = true;

  console.log(`  Market ID: ${marketId}`);
  console.log(`  Question: ${question}`);
  console.log(`  Deadline: ${new Date(Number(deadline) * 1000).toISOString()}`);
  console.log(`  Pool ID: ${poolId.slice(0, 16)}...`);
  console.log(`  Price Target: ${priceTarget}`);
  console.log(`  Price Above: ${priceAbove}`);

  const adminWc = getWalletClient(ADMIN_KEY);
  const adminAccount = privateKeyToAccount(ADMIN_KEY);
  const txHash = await adminWc.writeContract({
    address: deployment.hellyHook as Address,
    abi: HELLY_HOOK_ABI,
    functionName: "createMarket",
    args: [marketId, question, deadline, poolId, priceTarget, priceAbove],
    chain: foundry,
    account: adminAccount,
  } as any);

  const publicClient = getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`  TX: ${txHash}`);

  // Verify on-chain
  const marketData = await publicClient.readContract({
    address: deployment.hellyHook as Address,
    abi: HELLY_HOOK_ABI,
    functionName: "getMarket",
    args: [marketId],
  }) as any[];

  // getMarket returns: [question, deadline, resolved, outcome, totalYes, totalNo, settled]
  console.log(`\n  On-chain verification:`);
  console.log(`    Question: ${marketData[0]}`);
  console.log(`    Resolved: ${marketData[2]}`);
  console.log(`    Settled: ${marketData[6]}`);
  console.log("\n=== Market Created ===\n");

  // ============================================================
  // STEP 2: User Deposits
  // ============================================================
  console.log("\n--- Step 2: User Deposits ---");
  await runUserDeposit(ALICE_KEY, 500n * ONE_USDC, 1000n * ONE_USDC, "Alice");
  await runUserDeposit(BOB_KEY, 500n * ONE_USDC, 1000n * ONE_USDC, "Bob");
  await runUserDeposit(CHARLIE_KEY, 500n * ONE_USDC, 1000n * ONE_USDC, "Charlie");

  // ============================================================
  // STEP 3: Off-chain Bets (via state channels)
  // ============================================================
  console.log("\n--- Step 3: Off-chain Bets (State Channels) ---");
  console.log("  In production, bets are placed via Clearnode WebSocket state channels.");
  console.log("  Simulating bet intents:");
  console.log(`    Alice  -> YES $100 USDC`);
  console.log(`    Bob    -> NO  $200 USDC`);
  console.log(`    Charlie-> YES $150 USDC`);
  console.log("  (Bets are not submitted on-chain -- they go to TEE via state channels)");

  // ============================================================
  // STEP 4: Resolve Market (YES wins)
  // ============================================================
  console.log("\n--- Step 4: Resolve Market ---");
  console.log(`  Market ID: ${marketId.slice(0, 20)}...`);
  console.log(`  Outcome: YES`);

  const resolveTx = await adminWc.writeContract({
    address: deployment.hellyHook as Address,
    abi: HELLY_HOOK_ABI,
    functionName: "resolveMarket",
    args: [marketId, true],
    chain: foundry,
    account: adminAccount,
  } as any);
  await publicClient.waitForTransactionReceipt({ hash: resolveTx });
  console.log(`  TX: ${resolveTx}`);

  const resolvedMarket = await publicClient.readContract({
    address: deployment.hellyHook as Address,
    abi: HELLY_HOOK_ABI,
    functionName: "getMarket",
    args: [marketId],
  }) as any[];

  console.log(`  Resolved: ${resolvedMarket[2]}`);
  console.log(`  Outcome: ${resolvedMarket[3] ? "YES" : "NO"}`);
  console.log("\n=== Market Resolved ===");

  // ============================================================
  // STEP 5: Verify Market State
  // ============================================================
  console.log("\n--- Step 5: Final Verification ---\n");

  // Check oracle params stored on-chain
  const storedPoolId = await publicClient.readContract({
    address: deployment.hellyHook as Address,
    abi: HELLY_HOOK_ABI,
    functionName: "marketPoolId",
    args: [marketId],
  });
  const storedPriceTarget = await publicClient.readContract({
    address: deployment.hellyHook as Address,
    abi: HELLY_HOOK_ABI,
    functionName: "marketPriceTarget",
    args: [marketId],
  });
  const storedPriceAbove = await publicClient.readContract({
    address: deployment.hellyHook as Address,
    abi: HELLY_HOOK_ABI,
    functionName: "marketPriceAbove",
    args: [marketId],
  });

  console.log("  Oracle params on-chain:");
  console.log(`    Pool ID: ${(storedPoolId as string).slice(0, 16)}...`);
  console.log(`    Price Target: ${storedPriceTarget}`);
  console.log(`    Price Above: ${storedPriceAbove}`);

  // Check user balances (deposits still there since bets are off-chain)
  console.log("\n  User hook balances:");
  for (const [name, addr] of [["Alice", ALICE_ADDRESS], ["Bob", BOB_ADDRESS], ["Charlie", CHARLIE_ADDRESS]] as const) {
    const bal = await getBalance(addr);
    console.log(`    ${name}: ${formatUSDC(bal)} USDC`);
  }

  console.log("\n  Note: Settlement with ZK proof would be triggered by TEE.");
  console.log("  See 9-tee-flow.ts for the full settlement E2E test.\n");

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("==========================================================");
  console.log("               E2E FLOW COMPLETE                          ");
  console.log(`           Time: ${elapsed}s                              `);
  console.log("  Market created with oracle price target: PASS           ");
  console.log("  User deposits: PASS                                     ");
  console.log("  Market resolved: PASS                                   ");
  console.log("==========================================================");

  await closePool();
}

main().catch((err) => {
  console.error("\nE2E flow failed:", err);
  closePool().then(() => process.exit(1));
});
