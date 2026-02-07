/**
 * Script 8: Unichain Sepolia Testnet E2E Flow
 *
 * Self-contained testnet deployment + full prediction market lifecycle
 * using the ERC-7824 Custody architecture.
 *
 * Flow:
 *   1. Check admin ETH balance
 *   2. Generate ephemeral wallets (Alice, Bob, Charlie)
 *   3. Fund wallets with ETH
 *   4. Deploy contracts (MockUSDC, HellyHook, MockVerifier, Custody, Dummy)
 *   5. Configure (setVerifier, setTeeAddress)
 *   6. Create market with oracle price params
 *   7. Test Custody deposit & withdraw cycle
 *   8. Fund the settlement pool (mint USDC directly to HellyHook)
 *   9. Simulate off-chain bets (state channels)
 *  10. Resolve market (admin resolves with YES outcome)
 *  11. Settle with ZK proof (MockVerifier for E2E)
 *  12. Verify final state (market status, oracle params)
 *  13. Print summary
 *
 * Settlement model:
 *   In production, bets happen off-chain via Clearnode state channels.
 *   The TEE computes settlement and calls settleMarketWithProof which
 *   verifies the ZK proof and records the settlement. It does NOT credit
 *   balances — funds are managed by Custody.sol (ERC-7824).
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
  CUSTODY_ABI,
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

function getContractBytecode(name: string, baseDir: string = "contracts"): Hex {
  const dir = join(__dirname, `../${baseDir}`);
  const artifactPath = join(dir, `out/${name}.sol/${name}.json`);
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  return artifact.bytecode.object as Hex;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RPC_SETTLE_DELAY = 3000;

async function waitForRpc(): Promise<void> {
  await sleep(RPC_SETTLE_DELAY);
}

const txLog: { step: string; hash: Hex }[] = [];

function logTx(stepName: string, hash: Hex) {
  txLog.push({ step: stepName, hash });
  console.log(`  TX: ${hash}`);
  console.log(`  Explorer: ${txLink(hash)}`);
}

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
  console.log("║  ERC-7824 Custody + Oracle-based architecture          ║");
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

  console.log("  Building HellyHook contracts...");
  execSync("forge build", { cwd: join(__dirname, "../contracts"), stdio: "pipe" });

  console.log("  Building Nitrolite contracts (via_ir)...");
  execSync("forge build", { cwd: join(__dirname, "../nitrolite/contract"), stdio: "pipe" });

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

  // Deploy Custody (ERC-7824)
  console.log("\n  Deploying Custody (ERC-7824)...");
  const custodyBytecode = getContractBytecode("Custody", "nitrolite/contract");
  const custody = await deployContract(ADMIN_KEY, [], custodyBytecode);
  logTx("Deploy Custody", custody.hash);
  console.log(`  Custody: ${custody.address}`);

  // Deploy Dummy Adjudicator
  console.log("\n  Deploying Dummy Adjudicator...");
  const dummyBytecode = getContractBytecode("Dummy", "nitrolite/contract");
  const dummy = await deployContract(ADMIN_KEY, [], dummyBytecode);
  logTx("Deploy Dummy", dummy.hash);
  console.log(`  Dummy Adjudicator: ${dummy.address}`);

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

  // Save custody deployment
  const custodyDeployment = {
    custody: custody.address,
    adjudicator: dummy.address,
    balanceChecker: null,
    broker: null,
    usdc: mockUSDC.address,
    deployer: ADMIN_ADDRESS,
    chainId: 1301,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(
    join(__dirname, "lib/custody-deployment.json"),
    JSON.stringify(custodyDeployment, null, 2)
  );
  console.log("\n  Deployments saved to scripts/lib/");

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
  const deadline = now + 600n; // 10 minutes
  const poolId = keccak256(encodePacked(["string"], ["ETH-USDC-pool"]));
  const priceTarget = 79228162514264337593543950336n;
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
  // STEP 6: Test Custody Deposit & Withdraw Cycle
  // ============================================================
  step("Step 6: Test Custody Deposit & Withdraw Cycle");

  console.log("  Testing with Alice: mint 100 USDC → approve Custody → deposit → verify → withdraw → verify\n");

  const testAmount = 100n * ONE_USDC;

  // Mint 100 USDC to Alice
  const mintHash = await writeAndWait(
    ADMIN_KEY, mockUSDC.address, ERC20_ABI,
    "mint", [aliceAccount.address, testAmount],
  );
  logTx("Mint 100 USDC to Alice", mintHash);

  // Alice approves Custody
  const approveHash = await writeAndWait(
    aliceKey, mockUSDC.address, ERC20_ABI,
    "approve", [custody.address, testAmount],
  );
  logTx("Alice approve Custody", approveHash);

  // Alice deposits to Custody
  const depositHash = await writeAndWait(
    aliceKey, custody.address, CUSTODY_ABI,
    "deposit", [aliceAccount.address, mockUSDC.address, testAmount],
  );
  logTx("Alice deposit to Custody", depositHash);

  await waitForRpc();

  // Verify Custody balance
  const aliceCustodyBal = await readContract(
    custody.address, CUSTODY_ABI, "getAccountsBalances",
    [[aliceAccount.address], [mockUSDC.address]],
  ) as bigint[][];
  const aliceBalAfterDeposit = aliceCustodyBal[0]?.[0] ?? 0n;
  console.log(`  Alice Custody balance after deposit: ${formatUSDC(aliceBalAfterDeposit)} USDC`);
  if (aliceBalAfterDeposit !== testAmount) {
    console.error(`  ERROR: Expected ${formatUSDC(testAmount)}, got ${formatUSDC(aliceBalAfterDeposit)}`);
    process.exit(1);
  }
  console.log("  Custody deposit verified.");

  // Alice withdraws from Custody
  const withdrawHash = await writeAndWait(
    aliceKey, custody.address, CUSTODY_ABI,
    "withdraw", [mockUSDC.address, testAmount],
  );
  logTx("Alice withdraw from Custody", withdrawHash);

  await waitForRpc();

  const aliceCustodyBal2 = await readContract(
    custody.address, CUSTODY_ABI, "getAccountsBalances",
    [[aliceAccount.address], [mockUSDC.address]],
  ) as bigint[][];
  const aliceBalAfterWithdraw = aliceCustodyBal2[0]?.[0] ?? 0n;
  console.log(`  Alice Custody balance after withdraw: ${formatUSDC(aliceBalAfterWithdraw)} USDC`);
  if (aliceBalAfterWithdraw !== 0n) {
    console.error(`  ERROR: Expected 0, got ${formatUSDC(aliceBalAfterWithdraw)}`);
    process.exit(1);
  }

  const aliceUsdcAfterWithdraw = await readContract(
    mockUSDC.address, ERC20_ABI, "balanceOf", [aliceAccount.address],
  ) as bigint;
  console.log(`  Alice USDC wallet after withdraw: ${formatUSDC(aliceUsdcAfterWithdraw)} USDC`);
  console.log("  Custody Deposit & Withdraw cycle PASSED.");

  // ============================================================
  // STEP 7: Simulate Off-chain Bets
  // ============================================================
  step("Step 7: Simulate Off-chain Bets (State Channels)");

  const bets = [
    { name: "Alice", address: aliceAccount.address, key: aliceKey, isYes: true, amount: 100n * ONE_USDC },
    { name: "Bob", address: bobAccount.address, key: bobKey, isYes: false, amount: 200n * ONE_USDC },
    { name: "Charlie", address: charlieAccount.address, key: charlieKey, isYes: true, amount: 150n * ONE_USDC },
  ];

  console.log("  In production, bets go through Clearnode WebSocket state channels.");
  console.log("  Funds are custodied by Custody.sol (ERC-7824), not HellyHook.\n");

  for (const bet of bets) {
    console.log(`  ${bet.name}: ${bet.isYes ? "YES" : "NO"} $${formatUSDC(bet.amount)} (off-chain)`);
  }

  const totalPool = bets.reduce((sum, b) => sum + b.amount, 0n);
  const totalYes = bets.filter(b => b.isYes).reduce((sum, b) => sum + b.amount, 0n);
  const totalNo = bets.filter(b => !b.isYes).reduce((sum, b) => sum + b.amount, 0n);
  console.log(`\n  Total YES: $${formatUSDC(totalYes)} USDC`);
  console.log(`  Total NO:  $${formatUSDC(totalNo)} USDC`);
  console.log(`  Total pool: $${formatUSDC(totalPool)} USDC`);

  // ============================================================
  // STEP 8: Resolve Market
  // ============================================================
  step("Step 8: Resolve Market → YES");

  console.log("  Admin resolving market with outcome: YES...\n");

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
  // STEP 9: Settle with ZK Proof
  // ============================================================
  step("Step 9: Settle Market with ZK Proof (Record-Only)");

  const loserPool = totalNo;
  const platformFee = (loserPool * BigInt(PLATFORM_FEE_BPS)) / 10000n;
  const netDistributable = loserPool - platformFee;
  const winnerPool = totalYes;

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

  console.log("\n  Calling settleMarketWithProof (record-only — no balance credits)...");
  const settleHash = await writeAndWait(
    ADMIN_KEY, hellyHook.address, EXTENDED_ABI,
    "settleMarketWithProof",
    [marketId, recipients, amounts, totalPool, platformFee, pA, pB, pC],
  );
  logTx("Settle Market", settleHash);
  console.log("  Market settled! Proof verified. Bet directions NEVER revealed on-chain.");
  console.log("  NOTE: Payouts are handled off-chain via Custody.sol state channels.");

  // ============================================================
  // STEP 10: Verify Final State
  // ============================================================
  step("Step 10: Verify Final State");

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

  // Verify oracle state
  const storedPoolId = await readContract(hellyHook.address, EXTENDED_ABI, "marketPoolId", [marketId]);
  const storedPriceTarget = await readContract(hellyHook.address, EXTENDED_ABI, "marketPriceTarget", [marketId]);
  const storedPriceAbove = await readContract(hellyHook.address, EXTENDED_ABI, "marketPriceAbove", [marketId]);

  console.log(`\n  Oracle config:`);
  console.log(`    poolId:      ${(storedPoolId as string).slice(0, 18)}...`);
  console.log(`    priceTarget: ${storedPriceTarget}`);
  console.log(`    priceAbove:  ${storedPriceAbove}`);

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
  console.log(`    Custody:       ${custody.address}`);
  console.log(`                   ${addrLink(custody.address)}`);
  console.log(`    Adjudicator:   ${dummy.address}`);
  console.log(`                   ${addrLink(dummy.address)}`);

  console.log(`\n  Settlement (record-only — payouts via Custody):`);
  console.log(`    Alice  (YES $100): $${formatUSDC(alicePayout)} payout ✓`);
  console.log(`    Charlie(YES $150): $${formatUSDC(charliePayout)} payout ✓`);
  console.log(`    Bob    (NO  $200): $0 (lost) ✓`);
  console.log(`    Platform fee:      $${formatUSDC(platformFee)} ✓`);

  console.log(`\n  Verifications:`);
  console.log(`    Custody deposit/withdraw:  PASS`);
  console.log(`    Market creation:           PASS`);
  console.log(`    Market resolution:         PASS`);
  console.log(`    ZK proof settlement:       PASS`);
  console.log(`    Payout conservation:       PASS (${formatUSDC(totalPool)} total)`);

  console.log(`\n  All Transactions (${txLog.length}):`);
  for (const { step: s, hash } of txLog) {
    console.log(`    ${s.padEnd(30)} ${txLink(hash)}`);
  }

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║    UNICHAIN SEPOLIA TESTNET E2E: ALL PASS               ║`);
  console.log(`║    ERC-7824 Custody Architecture                        ║`);
  console.log(`║    Time: ${elapsed.padEnd(47)}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);
}

main().catch((err) => {
  console.error("\nTestnet E2E flow failed:", err);
  process.exit(1);
});
