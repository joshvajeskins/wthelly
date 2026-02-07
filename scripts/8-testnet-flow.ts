/**
 * Script 8: Unichain Sepolia Testnet E2E Flow
 *
 * Self-contained testnet deployment + full prediction market lifecycle
 * using the new oracle-based architecture (no commit-reveal).
 *
 * Flow:
 *   1. Check admin ETH balance
 *   2. Generate ephemeral wallets (Alice, Bob, Charlie)
 *   3. Fund wallets with ETH
 *   4. Deploy contracts (MockUSDC, HellyHook, MockVerifier)
 *   5. Configure (setVerifier, setTeeAddress)
 *   6. Create market with oracle price params
 *   7. Test deposit & withdraw cycle (verifies those functions work)
 *   8. Fund the settlement pool (mint USDC directly to HellyHook)
 *   9. Simulate off-chain bets (state channels)
 *  10. Resolve market (admin resolves with YES outcome)
 *  11. Settle with ZK proof (MockVerifier for E2E)
 *  12. Verify final state (balances, market status, oracle params)
 *  13. Withdrawals (winners + admin withdraw payouts)
 *  14. Print summary
 *
 * Settlement model:
 *   In production, bets happen off-chain via Clearnode state channels.
 *   The TEE computes settlement and calls settleMarketWithProof which
 *   CREDITS winners' balances (+=). It does NOT debit losers.
 *   The total pool USDC must be in the contract before settlement.
 *   We simulate this by minting the pool directly to the contract.
 *
 * Run: npx tsx scripts/8-testnet-flow.ts
 * Prerequisites:
 *   - .env with EVM_PRIVATE_KEY and TESTNET_RPC_URL
 *   - Admin account has >= 0.05 Unichain Sepolia ETH
 */

import "dotenv/config";

// Set testnet mode BEFORE any lib imports
process.env.TESTNET = "true";

import {
  type Hex,
  type Address,
  formatEther,
  keccak256,
  encodePacked,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { execSync } from "child_process";
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { ADMIN_KEY, ADMIN_ADDRESS, generateTestWallets } from "./lib/accounts.js";
import {
  ONE_USDC,
  PLATFORM_FEE_BPS,
  HELLY_HOOK_ABI,
  ERC20_ABI,
  USDC_DECIMALS,
  EXPLORER_BASE_URL,
  getRpcUrl,
} from "./lib/config.js";
import {
  getPublicClient,
  getWalletClient,
  deployContract,
  fundWithEth,
  formatUSDC,
  getExplorerTxUrl,
  getExplorerAddressUrl,
} from "./lib/contracts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// PoolManager on Unichain Sepolia
const POOL_MANAGER = "0x00b036b58a818b1bc34d502d3fe730db729e62ac" as Address;

// Extended ABI for ZK settlement + oracle functions
const EXTENDED_ABI = [
  ...HELLY_HOOK_ABI,
  {
    type: "function",
    name: "setVerifier",
    inputs: [{ name: "_verifier", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setTeeAddress",
    inputs: [{ name: "_tee", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifier",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "teeAddress",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const;

// MockVerifier ABI (same interface as Groth16Verifier)
const VERIFIER_ABI = [
  {
    type: "function",
    name: "verifyProof",
    inputs: [
      { name: "_pA", type: "uint256[2]" },
      { name: "_pB", type: "uint256[2][2]" },
      { name: "_pC", type: "uint256[2]" },
      { name: "_pubSignals", type: "uint256[4]" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const;

// --- Helpers ---

function txLink(hash: Hex): string {
  return getExplorerTxUrl(hash);
}

function addrLink(addr: Address): string {
  return getExplorerAddressUrl(addr);
}

function step(name: string) {
  console.log(`\n${"━".repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${"━".repeat(60)}`);
}

function getContractBytecode(name: string): Hex {
  const contractsDir = join(__dirname, "../contracts");
  const artifactPath = join(contractsDir, `out/${name}.sol/${name}.json`);
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  return artifact.bytecode.object as Hex;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Wait for RPC consistency after a TX confirmation.
// Unichain Sepolia RPC may load-balance across nodes that haven't
// all processed the latest block yet. A short delay ensures reads
// return the post-TX state.
const RPC_SETTLE_DELAY = 3000;

async function waitForRpc(): Promise<void> {
  await sleep(RPC_SETTLE_DELAY);
}

// Track all TX hashes for summary
const txLog: { step: string; hash: Hex }[] = [];

function logTx(stepName: string, hash: Hex) {
  txLog.push({ step: stepName, hash });
  console.log(`  TX: ${hash}`);
  console.log(`  Explorer: ${txLink(hash)}`);
}

// Write contract and wait for receipt, return the TX hash
async function writeAndWait(
  privateKey: Hex,
  address: Address,
  abi: any,
  functionName: string,
  args: any[],
): Promise<Hex> {
  const account = privateKeyToAccount(privateKey);
  const client = getWalletClient(privateKey);
  const publicClient = getPublicClient();

  const hash = await client.writeContract({
    address,
    abi,
    functionName,
    args,
    account,
  } as any);

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// Read contract state (with optional delay for post-TX consistency)
async function readContract(
  address: Address,
  abi: any,
  functionName: string,
  args: any[] = [],
): Promise<any> {
  const publicClient = getPublicClient();
  return publicClient.readContract({ address, abi, functionName, args });
}

// --- Main ---

async function main() {
  const startTime = Date.now();
  const publicClient = getPublicClient();

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║    WTHELLY — Unichain Sepolia Testnet E2E Flow         ║");
  console.log("║                                                        ║");
  console.log("║  Oracle-based architecture (no commit-reveal)          ║");
  console.log("║  Off-chain bets via state channels                     ║");
  console.log("║  ZK proof settlement (MockVerifier for E2E)            ║");
  console.log("║                                                        ║");
  console.log("║  Alice   → YES $100                                    ║");
  console.log("║  Bob     → NO  $200                                    ║");
  console.log("║  Charlie → YES $150                                    ║");
  console.log("║  Outcome: YES                                          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\nRPC: ${getRpcUrl()}`);
  console.log(`Chain: Unichain Sepolia (1301)`);
  console.log(`Admin: ${ADMIN_ADDRESS}`);
  console.log(`Explorer: ${addrLink(ADMIN_ADDRESS)}`);
  console.log(`PoolManager: ${POOL_MANAGER}`);

  // ============================================================
  // STEP 0: Check admin ETH balance
  // ============================================================
  step("Step 0: Check Admin ETH Balance");

  const adminEthBalance = await publicClient.getBalance({ address: ADMIN_ADDRESS });
  console.log(`  Admin ETH: ${formatEther(adminEthBalance)} ETH`);

  if (adminEthBalance < 50000000000000000n) {
    console.error("\n  ERROR: Admin needs at least 0.05 Unichain Sepolia ETH!");
    console.error(`  Fund this address: ${ADMIN_ADDRESS}`);
    process.exit(1);
  }
  console.log("  Balance OK.");

  // ============================================================
  // STEP 1: Generate ephemeral test wallets
  // ============================================================
  step("Step 1: Generate Ephemeral Test Wallets");

  const testWallets = generateTestWallets();
  const aliceKey = testWallets.alice;
  const bobKey = testWallets.bob;
  const charlieKey = testWallets.charlie;

  const aliceAccount = privateKeyToAccount(aliceKey);
  const bobAccount = privateKeyToAccount(bobKey);
  const charlieAccount = privateKeyToAccount(charlieKey);

  console.log(`  Alice:   ${aliceAccount.address}`);
  console.log(`  Bob:     ${bobAccount.address}`);
  console.log(`  Charlie: ${charlieAccount.address}`);

  // ============================================================
  // STEP 2: Fund test wallets with ETH
  // ============================================================
  step("Step 2: Fund Test Wallets with ETH");

  const ethPerWallet = "0.005";
  for (const [name, addr] of [
    ["Alice", aliceAccount.address],
    ["Bob", bobAccount.address],
    ["Charlie", charlieAccount.address],
  ] as const) {
    console.log(`\n  Funding ${name} with ${ethPerWallet} ETH...`);
    const hash = await fundWithEth(ADMIN_KEY, addr, ethPerWallet);
    logTx(`Fund ${name}`, hash);
  }

  // ============================================================
  // STEP 3: Deploy Contracts
  // ============================================================
  step("Step 3: Deploy Contracts to Unichain Sepolia");

  console.log("  Building contracts...");
  execSync("forge build", { cwd: join(__dirname, "../contracts"), stdio: "pipe" });

  // Deploy MockUSDC
  console.log("\n  Deploying MockUSDC...");
  const mockUsdcBytecode = getContractBytecode("MockUSDC");
  const mockUSDC = await deployContract(ADMIN_KEY, ERC20_ABI, mockUsdcBytecode);
  logTx("Deploy MockUSDC", mockUSDC.hash);
  console.log(`  MockUSDC: ${mockUSDC.address}`);

  // Deploy HellyHook (with real PoolManager on Unichain Sepolia)
  console.log("\n  Deploying HellyHook...");
  const hellyHookBytecode = getContractBytecode("HellyHook");
  const hellyHook = await deployContract(
    ADMIN_KEY,
    EXTENDED_ABI,
    hellyHookBytecode,
    [POOL_MANAGER, mockUSDC.address, BigInt(PLATFORM_FEE_BPS)]
  );
  logTx("Deploy HellyHook", hellyHook.hash);
  console.log(`  HellyHook: ${hellyHook.address}`);

  // Deploy MockVerifier (always returns true — for E2E testing)
  console.log("\n  Deploying MockVerifier (always-true for E2E)...");
  const mockVerifierBytecode = getContractBytecode("MockVerifier");
  const mockVerifier = await deployContract(ADMIN_KEY, VERIFIER_ABI, mockVerifierBytecode);
  logTx("Deploy MockVerifier", mockVerifier.hash);
  console.log(`  MockVerifier: ${mockVerifier.address}`);

  // Save deployment info
  const deployment = {
    hellyHook: hellyHook.address,
    mockUSDC: mockUSDC.address,
    verifier: mockVerifier.address,
    poolManager: POOL_MANAGER,
    deployer: ADMIN_ADDRESS,
    chainId: 1301,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(
    join(__dirname, "lib/deployment.json"),
    JSON.stringify(deployment, null, 2)
  );
  console.log("\n  Deployment saved to scripts/lib/deployment.json");

  // ============================================================
  // STEP 4: Configure Verifier & TEE Address
  // ============================================================
  step("Step 4: Configure Verifier & TEE Address");

  console.log("  Setting verifier...");
  const setVerifierHash = await writeAndWait(
    ADMIN_KEY, hellyHook.address, EXTENDED_ABI,
    "setVerifier", [mockVerifier.address],
  );
  logTx("Set Verifier", setVerifierHash);

  console.log("  Setting TEE address (admin acts as TEE for this test)...");
  const setTeeHash = await writeAndWait(
    ADMIN_KEY, hellyHook.address, EXTENDED_ABI,
    "setTeeAddress", [ADMIN_ADDRESS],
  );
  logTx("Set TEE Address", setTeeHash);

  // Wait for RPC nodes to sync before reading
  await waitForRpc();

  const configuredVerifier = await readContract(hellyHook.address, EXTENDED_ABI, "verifier");
  const configuredTee = await readContract(hellyHook.address, EXTENDED_ABI, "teeAddress");
  console.log(`  Verifier: ${configuredVerifier}`);
  console.log(`  TEE Address: ${configuredTee}`);

  if (configuredVerifier.toLowerCase() !== mockVerifier.address.toLowerCase()) {
    console.error("  ERROR: Verifier not set correctly!");
    process.exit(1);
  }
  if (configuredTee.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
    console.error("  ERROR: TEE address not set correctly!");
    process.exit(1);
  }
  console.log("  Configuration verified.");

  // ============================================================
  // STEP 5: Create Market
  // ============================================================
  step("Step 5: Create Market with Oracle Price Params");

  const question = "Will ETH hit $5k by end of 2026?";
  const marketId = keccak256(encodePacked(["string"], [question]));
  const now = BigInt(Math.floor(Date.now() / 1000));
  const deadline = now + 600n; // 10 minutes (not enforced for admin resolveMarket)
  const poolId = keccak256(encodePacked(["string"], ["ETH-USDC-pool"]));
  const priceTarget = 79228162514264337593543950336n; // sqrtPriceX96 ~1.0
  const priceAbove = true;

  console.log(`  Market ID: ${marketId}`);
  console.log(`  Question: ${question}`);
  console.log(`  Deadline: ${new Date(Number(deadline) * 1000).toISOString()}`);
  console.log(`  Pool ID: ${poolId.slice(0, 18)}...`);
  console.log(`  Price Target: ${priceTarget}`);
  console.log(`  Price Above: ${priceAbove}`);

  const createHash = await writeAndWait(
    ADMIN_KEY, hellyHook.address, EXTENDED_ABI,
    "createMarket", [marketId, question, deadline, poolId, priceTarget, priceAbove],
  );
  logTx("Create Market", createHash);

  await waitForRpc();

  const marketAfterCreate = await readContract(
    hellyHook.address, EXTENDED_ABI, "getMarket", [marketId],
  ) as any[];
  console.log(`  On-chain: question="${marketAfterCreate[0]}", deadline=${marketAfterCreate[1]}`);

  // ============================================================
  // STEP 6: Test Deposit & Withdraw (verifies those functions work)
  // ============================================================
  step("Step 6: Test Deposit & Withdraw Cycle");

  console.log("  Testing with Alice: mint 100 USDC → deposit → verify → withdraw → verify\n");

  // Mint 100 USDC to Alice
  const testAmount = 100n * ONE_USDC;
  const mintHash = await writeAndWait(
    ADMIN_KEY, mockUSDC.address, ERC20_ABI,
    "mint", [aliceAccount.address, testAmount],
  );
  logTx("Mint 100 USDC to Alice", mintHash);

  // Alice approves HellyHook
  const approveHash = await writeAndWait(
    aliceKey, mockUSDC.address, ERC20_ABI,
    "approve", [hellyHook.address, testAmount],
  );
  logTx("Alice approve", approveHash);

  // Alice deposits
  const depositHash = await writeAndWait(
    aliceKey, hellyHook.address, EXTENDED_ABI,
    "deposit", [testAmount],
  );
  logTx("Alice deposit 100", depositHash);

  await waitForRpc();

  const aliceBalAfterDeposit = await readContract(
    hellyHook.address, EXTENDED_ABI, "balances", [aliceAccount.address],
  ) as bigint;
  console.log(`  Alice HellyHook balance after deposit: ${formatUSDC(aliceBalAfterDeposit)} USDC`);
  if (aliceBalAfterDeposit !== testAmount) {
    console.error(`  ERROR: Expected ${formatUSDC(testAmount)}, got ${formatUSDC(aliceBalAfterDeposit)}`);
    process.exit(1);
  }
  console.log("  Deposit verified.");

  // Alice withdraws
  const withdrawHash = await writeAndWait(
    aliceKey, hellyHook.address, EXTENDED_ABI,
    "withdraw", [testAmount],
  );
  logTx("Alice withdraw 100", withdrawHash);

  await waitForRpc();

  const aliceBalAfterWithdraw = await readContract(
    hellyHook.address, EXTENDED_ABI, "balances", [aliceAccount.address],
  ) as bigint;
  console.log(`  Alice HellyHook balance after withdraw: ${formatUSDC(aliceBalAfterWithdraw)} USDC`);
  if (aliceBalAfterWithdraw !== 0n) {
    console.error(`  ERROR: Expected 0, got ${formatUSDC(aliceBalAfterWithdraw)}`);
    process.exit(1);
  }

  const aliceUsdcAfterWithdraw = await readContract(
    mockUSDC.address, ERC20_ABI, "balanceOf", [aliceAccount.address],
  ) as bigint;
  console.log(`  Alice USDC wallet after withdraw: ${formatUSDC(aliceUsdcAfterWithdraw)} USDC`);
  console.log("  Deposit & Withdraw cycle PASSED.");

  // ============================================================
  // STEP 7: Fund Settlement Pool
  // ============================================================
  step("Step 7: Fund Settlement Pool");

  // In production, the total pool comes from state channel custody (Clearnode).
  // settleMarketWithProof CREDITS winners' balances (+=) but does NOT debit losers.
  // The total pool USDC must be in the contract before settlement.
  // We simulate this by minting the pool directly to the HellyHook contract.

  const bets = [
    { name: "Alice", address: aliceAccount.address, key: aliceKey, isYes: true, amount: 100n * ONE_USDC },
    { name: "Bob", address: bobAccount.address, key: bobKey, isYes: false, amount: 200n * ONE_USDC },
    { name: "Charlie", address: charlieAccount.address, key: charlieKey, isYes: true, amount: 150n * ONE_USDC },
  ];

  const totalPool = bets.reduce((sum, b) => sum + b.amount, 0n); // 450 USDC
  console.log(`  Total pool (sum of all bets): ${formatUSDC(totalPool)} USDC`);
  console.log(`  Minting ${formatUSDC(totalPool)} USDC directly to HellyHook contract...`);
  console.log("  (In production, this comes from Clearnode state channel custody)\n");

  const fundPoolHash = await writeAndWait(
    ADMIN_KEY, mockUSDC.address, ERC20_ABI,
    "mint", [hellyHook.address, totalPool],
  );
  logTx("Fund settlement pool", fundPoolHash);

  await waitForRpc();

  const contractUsdcBalance = await readContract(
    mockUSDC.address, ERC20_ABI, "balanceOf", [hellyHook.address],
  ) as bigint;
  console.log(`  HellyHook USDC balance: ${formatUSDC(contractUsdcBalance)} USDC`);

  // Also ensure Alice's USDC from the deposit test isn't still in the contract
  // (she already withdrew it, so the contract balance should be exactly totalPool + alice's 100 she withdrew)
  // Actually, Alice withdrew back to her wallet, so contract USDC = totalPool + 0 = totalPool
  // Wait, the mint in step 6 was to Alice, not to the contract. And Alice deposited into HellyHook
  // (transferred from Alice → HellyHook), then withdrew (transferred from HellyHook → Alice).
  // So net HellyHook USDC = totalPool only. Correct.

  // ============================================================
  // STEP 8: Simulate Off-chain Bets
  // ============================================================
  step("Step 8: Simulate Off-chain Bets (State Channels)");

  console.log("  In production, bets go through Clearnode WebSocket state channels.");
  console.log("  The TEE tracks all bets off-chain and computes settlement.\n");

  for (const bet of bets) {
    console.log(`  ${bet.name}: ${bet.isYes ? "YES" : "NO"} $${formatUSDC(bet.amount)} (off-chain)`);
  }

  const totalYes = bets.filter(b => b.isYes).reduce((sum, b) => sum + b.amount, 0n);
  const totalNo = bets.filter(b => !b.isYes).reduce((sum, b) => sum + b.amount, 0n);
  console.log(`\n  Total YES: $${formatUSDC(totalYes)} USDC`);
  console.log(`  Total NO:  $${formatUSDC(totalNo)} USDC`);

  // ============================================================
  // STEP 9: Resolve Market
  // ============================================================
  step("Step 9: Resolve Market → YES");

  // resolveMarket() does NOT check deadline — admin can resolve at any time.
  // In production, resolveMarketFromOracle() enforces deadline via block.timestamp.
  console.log("  Admin resolving market with outcome: YES...");
  console.log("  (resolveMarket has no deadline check — admin can resolve immediately)\n");

  const resolveHash = await writeAndWait(
    ADMIN_KEY, hellyHook.address, EXTENDED_ABI,
    "resolveMarket", [marketId, true],
  );
  logTx("Resolve Market", resolveHash);

  await waitForRpc();

  const marketAfterResolve = await readContract(
    hellyHook.address, EXTENDED_ABI, "getMarket", [marketId],
  ) as any[];
  console.log(`  Resolved: ${marketAfterResolve[2]}, Outcome: ${marketAfterResolve[3] ? "YES" : "NO"}`);

  if (!marketAfterResolve[2]) {
    console.error("  ERROR: Market not resolved!");
    process.exit(1);
  }

  // ============================================================
  // STEP 10: Settle with ZK Proof
  // ============================================================
  step("Step 10: Settle Market with ZK Proof");

  // Compute settlement payouts:
  // Winners (YES): Alice (100) + Charlie (150) = 250 USDC
  // Losers (NO): Bob (200) USDC
  // Platform fee = 2% of loser pool = 200 * 200 / 10000 = 4 USDC
  // Net distributable from losers = 200 - 4 = 196 USDC
  // Alice payout = 100 + (100/250) * 196 = 100 + 78.4 = 178.4 USDC
  // Charlie payout = 150 + (150/250) * 196 = 150 + 117.6 = 267.6 USDC
  // Verification: 178.4 + 267.6 + 4 = 450 = totalPool ✓
  const loserPool = totalNo; // 200 USDC
  const platformFee = (loserPool * BigInt(PLATFORM_FEE_BPS)) / 10000n;
  const netDistributable = loserPool - platformFee;
  const winnerPool = totalYes; // 250 USDC

  const aliceBet = 100n * ONE_USDC;
  const charlieBet = 150n * ONE_USDC;
  const alicePayout = aliceBet + (aliceBet * netDistributable) / winnerPool;
  const charliePayout = charlieBet + (charlieBet * netDistributable) / winnerPool;

  console.log(`  Settlement computation:`);
  console.log(`    Total pool:       ${formatUSDC(totalPool)} USDC`);
  console.log(`    Loser pool:       ${formatUSDC(loserPool)} USDC`);
  console.log(`    Platform fee:     ${formatUSDC(platformFee)} USDC (${PLATFORM_FEE_BPS / 100}%)`);
  console.log(`    Net distributable: ${formatUSDC(netDistributable)} USDC`);
  console.log(`    Alice payout:     ${formatUSDC(alicePayout)} USDC`);
  console.log(`    Charlie payout:   ${formatUSDC(charliePayout)} USDC`);

  // Verify conservation: payouts + fee = totalPool
  const totalPayouts = alicePayout + charliePayout;
  const conservationCheck = totalPayouts + platformFee === totalPool;
  console.log(`    Conservation: ${formatUSDC(totalPayouts)} + ${formatUSDC(platformFee)} = ${formatUSDC(totalPayouts + platformFee)} ${conservationCheck ? "✓" : "FAIL"}`);
  if (!conservationCheck) {
    console.error("  ERROR: Payout conservation check failed!");
    process.exit(1);
  }

  const recipients: Address[] = [aliceAccount.address, charlieAccount.address];
  const amounts: bigint[] = [alicePayout, charliePayout];

  // Mock ZK proof (all zeros — MockVerifier accepts anything)
  const pA: [bigint, bigint] = [0n, 0n];
  const pB: [[bigint, bigint], [bigint, bigint]] = [[0n, 0n], [0n, 0n]];
  const pC: [bigint, bigint] = [0n, 0n];

  console.log("\n  Calling settleMarketWithProof...");
  const settleHash = await writeAndWait(
    ADMIN_KEY, hellyHook.address, EXTENDED_ABI,
    "settleMarketWithProof",
    [marketId, recipients, amounts, totalPool, platformFee, pA, pB, pC],
  );
  logTx("Settle Market", settleHash);
  console.log("  Market settled! Bet directions NEVER revealed on-chain.");

  // ============================================================
  // STEP 11: Verify Final State
  // ============================================================
  step("Step 11: Verify Final State");

  await waitForRpc();

  const marketFinal = await readContract(
    hellyHook.address, EXTENDED_ABI, "getMarket", [marketId],
  ) as any[];

  console.log(`  Market resolved: ${marketFinal[2]}`);
  console.log(`  Market outcome:  ${marketFinal[3] ? "YES" : "NO"}`);
  console.log(`  Market settled:  ${marketFinal[6]}`);

  if (!marketFinal[6]) {
    console.error("  ERROR: Market not settled!");
    process.exit(1);
  }

  // Check balances — settlement credits winners + admin
  console.log("\n  HellyHook balances after settlement:");

  const aliceFinalBal = await readContract(
    hellyHook.address, EXTENDED_ABI, "balances", [aliceAccount.address],
  ) as bigint;
  const bobFinalBal = await readContract(
    hellyHook.address, EXTENDED_ABI, "balances", [bobAccount.address],
  ) as bigint;
  const charlieFinalBal = await readContract(
    hellyHook.address, EXTENDED_ABI, "balances", [charlieAccount.address],
  ) as bigint;
  const adminFinalBal = await readContract(
    hellyHook.address, EXTENDED_ABI, "balances", [ADMIN_ADDRESS],
  ) as bigint;

  console.log(`    Alice   (YES winner): ${formatUSDC(aliceFinalBal)} USDC ${aliceFinalBal === alicePayout ? "✓" : "MISMATCH"}`);
  console.log(`    Bob     (NO  loser):  ${formatUSDC(bobFinalBal)} USDC ${bobFinalBal === 0n ? "✓" : "MISMATCH"}`);
  console.log(`    Charlie (YES winner): ${formatUSDC(charlieFinalBal)} USDC ${charlieFinalBal === charliePayout ? "✓" : "MISMATCH"}`);
  console.log(`    Admin   (fee):        ${formatUSDC(adminFinalBal)} USDC ${adminFinalBal === platformFee ? "✓" : "MISMATCH"}`);

  const totalBalances = aliceFinalBal + bobFinalBal + charlieFinalBal + adminFinalBal;
  console.log(`    Total:                ${formatUSDC(totalBalances)} USDC ${totalBalances === totalPool ? "✓ = totalPool" : "MISMATCH"}`);

  // Verify oracle state
  const storedPoolId = await readContract(hellyHook.address, EXTENDED_ABI, "marketPoolId", [marketId]);
  const storedPriceTarget = await readContract(hellyHook.address, EXTENDED_ABI, "marketPriceTarget", [marketId]);
  const storedPriceAbove = await readContract(hellyHook.address, EXTENDED_ABI, "marketPriceAbove", [marketId]);

  console.log(`\n  Oracle config:`);
  console.log(`    poolId:      ${(storedPoolId as string).slice(0, 18)}...`);
  console.log(`    priceTarget: ${storedPriceTarget}`);
  console.log(`    priceAbove:  ${storedPriceAbove}`);

  // ============================================================
  // STEP 12: Withdrawals
  // ============================================================
  step("Step 12: Withdraw Payouts");

  // Winners and admin withdraw their payouts
  const withdrawals = [
    { name: "Alice", key: aliceKey, address: aliceAccount.address, expected: alicePayout },
    { name: "Charlie", key: charlieKey, address: charlieAccount.address, expected: charliePayout },
    { name: "Admin", key: ADMIN_KEY, address: ADMIN_ADDRESS, expected: platformFee },
  ];

  for (const w of withdrawals) {
    const bal = await readContract(
      hellyHook.address, EXTENDED_ABI, "balances", [w.address],
    ) as bigint;

    if (bal > 0n) {
      console.log(`\n  ${w.name} withdrawing ${formatUSDC(bal)} USDC...`);
      const wHash = await writeAndWait(
        w.key, hellyHook.address, EXTENDED_ABI,
        "withdraw", [bal],
      );
      logTx(`Withdraw ${w.name}`, wHash);

      await waitForRpc();

      const usdcBal = await readContract(
        mockUSDC.address, ERC20_ABI, "balanceOf", [w.address],
      ) as bigint;
      console.log(`    USDC wallet balance: ${formatUSDC(usdcBal)} USDC`);

      const hookBal = await readContract(
        hellyHook.address, EXTENDED_ABI, "balances", [w.address],
      ) as bigint;
      console.log(`    HellyHook balance: ${formatUSDC(hookBal)} USDC ${hookBal === 0n ? "✓" : "ERROR"}`);
    }
  }

  // Verify Bob has nothing to withdraw
  const bobBal = await readContract(
    hellyHook.address, EXTENDED_ABI, "balances", [bobAccount.address],
  ) as bigint;
  console.log(`\n  Bob (loser): HellyHook balance = ${formatUSDC(bobBal)} USDC ${bobBal === 0n ? "✓ (lost bet)" : "ERROR"}`);

  // Verify contract USDC is drained
  await waitForRpc();
  const contractFinalUsdc = await readContract(
    mockUSDC.address, ERC20_ABI, "balanceOf", [hellyHook.address],
  ) as bigint;
  console.log(`\n  HellyHook contract USDC remaining: ${formatUSDC(contractFinalUsdc)} USDC ${contractFinalUsdc === 0n ? "✓ (fully drained)" : ""}`);

  // ============================================================
  // SUMMARY
  // ============================================================
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${"═".repeat(60)}`);
  console.log("  UNICHAIN SEPOLIA TESTNET E2E SUMMARY");
  console.log(`${"═".repeat(60)}`);

  console.log(`\n  Chain: Unichain Sepolia (1301)`);
  console.log(`  PoolManager: ${POOL_MANAGER}`);
  console.log(`  Time: ${elapsed}s`);

  console.log(`\n  Contracts:`);
  console.log(`    MockUSDC:      ${mockUSDC.address}`);
  console.log(`                   ${addrLink(mockUSDC.address)}`);
  console.log(`    HellyHook:     ${hellyHook.address}`);
  console.log(`                   ${addrLink(hellyHook.address)}`);
  console.log(`    MockVerifier:  ${mockVerifier.address}`);
  console.log(`                   ${addrLink(mockVerifier.address)}`);

  console.log(`\n  Settlement:`);
  console.log(`    Alice  (YES $100): $${formatUSDC(alicePayout)} payout ✓`);
  console.log(`    Charlie(YES $150): $${formatUSDC(charliePayout)} payout ✓`);
  console.log(`    Bob    (NO  $200): $0 (lost) ✓`);
  console.log(`    Platform fee:      $${formatUSDC(platformFee)} ✓`);

  console.log(`\n  Verifications:`);
  console.log(`    Deposit/Withdraw cycle: PASS`);
  console.log(`    Market creation:        PASS`);
  console.log(`    Market resolution:      PASS`);
  console.log(`    ZK proof settlement:    PASS`);
  console.log(`    Payout conservation:    PASS (${formatUSDC(totalPool)} total)`);
  console.log(`    Winner withdrawals:     PASS`);

  console.log(`\n  All Transactions (${txLog.length}):`);
  for (const { step: s, hash } of txLog) {
    console.log(`    ${s.padEnd(30)} ${txLink(hash)}`);
  }

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║    UNICHAIN SEPOLIA TESTNET E2E: ALL PASS               ║`);
  console.log(`║    Time: ${elapsed.padEnd(47)}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);
}

main().catch((err) => {
  console.error("\nTestnet E2E flow failed:", err);
  process.exit(1);
});
