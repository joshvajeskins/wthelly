/**
 * Script 8: Unichain Sepolia Testnet E2E Flow — REAL ZK PROOFS
 *
 * Self-contained testnet deployment + full prediction market lifecycle
 * using the ERC-7824 Custody architecture with real Groth16 verification.
 *
 * Flow:
 *   1. Check admin ETH balance
 *   2. Generate ephemeral wallets (Alice, Bob, Charlie)
 *   3. Fund wallets with ETH
 *   4. Deploy contracts (MockUSDC, HellyHook, Groth16Verifier, Custody, Dummy)
 *   5. Configure (setVerifier, setTeeAddress)
 *   6. Create market with oracle price params
 *   7. Test Custody deposit & withdraw cycle
 *   8. Simulate off-chain bets (state channels)
 *   9. Resolve market (admin resolves with YES outcome)
 *  10. Generate REAL Groth16 ZK proof via snarkjs
 *  11. Settle with real proof verification on-chain
 *  12. Verify final state
 *  13. Test invalid proof rejection
 *  14. Print summary
 *
 * Run: npx tsx scripts/8-testnet-flow.ts
 * Prerequisites:
 *   - .env with EVM_PRIVATE_KEY and TESTNET_RPC_URL
 *   - Admin account has >= 0.05 Unichain Sepolia ETH
 *   - circuits/build/ contains compiled circuit artifacts
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
import { writeFileSync, readFileSync, existsSync } from "fs";
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

// Circuit artifacts paths
const CIRCUITS_DIR = join(__dirname, "../circuits");
const WASM_PATH = join(CIRCUITS_DIR, "build/settlement_verify_js/settlement_verify.wasm");
const ZKEY_PATH = join(CIRCUITS_DIR, "build/settlement_verify.zkey");
const VKEY_PATH = join(CIRCUITS_DIR, "build/settlement_verify_vkey.json");
const MAX_BETS = 32;

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

// Groth16Verifier ABI
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

const RPC_SETTLE_DELAY = 6000;

async function waitForRpc(): Promise<void> {
  await sleep(RPC_SETTLE_DELAY);
}

async function readContractWithRetry(
  address: Address,
  abi: any,
  functionName: string,
  args: any[] = [],
  retries: number = 3,
  delayMs: number = 4000,
): Promise<any> {
  for (let i = 0; i < retries; i++) {
    const result = await readContract(address, abi, functionName, args);
    if (result !== undefined) return result;
    if (i < retries - 1) await sleep(delayMs);
  }
  return readContract(address, abi, functionName, args);
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

// --- ZK Proof Generation ---

interface BetData {
  address: string;
  isYes: boolean;
  amount: bigint;
}

interface ZkProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  publicSignals: [bigint, bigint, bigint, bigint];
}

async function generateSettlementProof(
  outcome: boolean,
  feeBps: number,
  bets: BetData[],
): Promise<{ proof: ZkProof; payouts: bigint[]; totalPool: bigint; platformFee: bigint }> {
  // Dynamic import for snarkjs (ESM)
  const snarkjs = await import("snarkjs");

  const outcomeNum = outcome ? 1 : 0;

  // Classify bets
  let winnerPool = 0n;
  let loserPool = 0n;
  const payouts: bigint[] = [];

  for (const bet of bets) {
    const isWinner = bet.isYes === outcome;
    if (isWinner) {
      winnerPool += bet.amount;
    } else {
      loserPool += bet.amount;
    }
  }

  const totalPool = winnerPool + loserPool;
  const platformFee = (loserPool * BigInt(feeBps)) / 10000n;
  const netDistributable = loserPool - platformFee;

  // Compute payouts
  for (const bet of bets) {
    const isWinner = bet.isYes === outcome;
    if (isWinner && winnerPool > 0n) {
      const share = (bet.amount * netDistributable) / winnerPool;
      payouts.push(bet.amount + share);
    } else {
      payouts.push(0n);
    }
  }

  // Verify conservation before proving
  const sumPayouts = payouts.reduce((a, b) => a + b, 0n);
  if (sumPayouts + platformFee !== totalPool) {
    throw new Error(
      `Conservation check failed: ${sumPayouts} + ${platformFee} != ${totalPool}`
    );
  }

  // Pad arrays to MAX_BETS
  const directions = new Array(MAX_BETS).fill("0");
  const amounts = new Array(MAX_BETS).fill("0");
  const payoutsArr = new Array(MAX_BETS).fill("0");
  const active = new Array(MAX_BETS).fill("0");

  for (let i = 0; i < bets.length; i++) {
    directions[i] = bets[i].isYes ? "1" : "0";
    amounts[i] = bets[i].amount.toString();
    payoutsArr[i] = payouts[i].toString();
    active[i] = "1";
  }

  const circuitInput = {
    outcome: outcomeNum.toString(),
    feeBps: feeBps.toString(),
    totalPool: totalPool.toString(),
    platformFee: platformFee.toString(),
    numBets: bets.length.toString(),
    directions,
    amounts,
    payouts: payoutsArr,
    active,
  };

  console.log("    Generating Groth16 proof via snarkjs...");
  const startTime = Date.now();

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    circuitInput,
    WASM_PATH,
    ZKEY_PATH,
  );

  const duration = Date.now() - startTime;
  console.log(`    Proof generated in ${duration}ms`);
  console.log(`    Public signals: [${publicSignals.join(", ")}]`);

  // Verify locally before submitting on-chain
  const vkey = JSON.parse(readFileSync(VKEY_PATH, "utf-8"));
  const localValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
  console.log(`    Local verification: ${localValid ? "PASS" : "FAIL"}`);
  if (!localValid) {
    throw new Error("ZK proof failed local verification!");
  }

  // Format for Solidity (NOTE: snarkjs pB coordinates are swapped for bn128 pairing)
  const formattedProof: ZkProof = {
    pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    pB: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],
    pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
    publicSignals: [
      BigInt(publicSignals[0]),
      BigInt(publicSignals[1]),
      BigInt(publicSignals[2]),
      BigInt(publicSignals[3]),
    ],
  };

  return { proof: formattedProof, payouts, totalPool, platformFee };
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
  console.log("║  REAL Groth16 ZK proof settlement                      ║");
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

  // Verify circuit artifacts exist
  if (!existsSync(WASM_PATH) || !existsSync(ZKEY_PATH) || !existsSync(VKEY_PATH)) {
    console.error("\n  ERROR: Circuit build artifacts not found!");
    console.error("  Run: cd circuits && npm run build");
    process.exit(1);
  }
  console.log(`\nCircuit artifacts verified:`);
  console.log(`  WASM: ${WASM_PATH}`);
  console.log(`  zkey: ${ZKEY_PATH}`);

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

  // Deploy REAL Groth16Verifier (generated from settlement_verify circuit)
  console.log("\n  Deploying Groth16Verifier (REAL ZK verifier)...");
  const groth16VerifierBytecode = getContractBytecode("Groth16Verifier");
  const groth16Verifier = await deployContract(ADMIN_KEY, VERIFIER_ABI, groth16VerifierBytecode);
  logTx("Deploy Groth16Verifier", groth16Verifier.hash);
  console.log(`  Groth16Verifier: ${groth16Verifier.address}`);

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
    verifier: groth16Verifier.address,
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

  console.log("  Setting Groth16Verifier as the on-chain verifier...");
  const setVerifierHash = await writeAndWait(
    ADMIN_KEY, hellyHook.address, EXTENDED_ABI,
    "setVerifier", [groth16Verifier.address],
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

  if (configuredVerifier.toLowerCase() !== groth16Verifier.address.toLowerCase()) {
    console.error("  ERROR: Verifier not set correctly!");
    process.exit(1);
  }
  if (configuredTee.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
    console.error("  ERROR: TEE address not set correctly!");
    process.exit(1);
  }
  console.log("  Configuration verified.");

  // ============================================================
  // STEP 5: Verify Groth16Verifier on-chain (standalone test)
  // ============================================================
  step("Step 5: Verify Groth16Verifier On-Chain (Standalone)");

  console.log("  Testing verifier contract with pre-built test proof...");
  const testProof = JSON.parse(readFileSync(join(CIRCUITS_DIR, "build/settlement_verify_proof.json"), "utf-8"));
  const testPublic = JSON.parse(readFileSync(join(CIRCUITS_DIR, "build/settlement_verify_public.json"), "utf-8"));

  const testPA: [bigint, bigint] = [BigInt(testProof.pi_a[0]), BigInt(testProof.pi_a[1])];
  const testPB: [[bigint, bigint], [bigint, bigint]] = [
    [BigInt(testProof.pi_b[0][1]), BigInt(testProof.pi_b[0][0])],
    [BigInt(testProof.pi_b[1][1]), BigInt(testProof.pi_b[1][0])],
  ];
  const testPC: [bigint, bigint] = [BigInt(testProof.pi_c[0]), BigInt(testProof.pi_c[1])];
  const testSignals: [bigint, bigint, bigint, bigint] = [
    BigInt(testPublic[0]), BigInt(testPublic[1]), BigInt(testPublic[2]), BigInt(testPublic[3]),
  ];

  console.log(`  Public signals: [${testSignals.join(", ")}]`);

  const onChainValid = await readContract(
    groth16Verifier.address, VERIFIER_ABI, "verifyProof",
    [testPA, testPB, testPC, testSignals],
  );
  console.log(`  On-chain verification: ${onChainValid ? "PASS" : "FAIL"}`);

  if (!onChainValid) {
    console.error("  ERROR: Groth16Verifier rejected a valid proof!");
    process.exit(1);
  }

  // Test with tampered signals (flip outcome from 1 to 0)
  console.log("\n  Testing verifier rejects tampered proof...");
  const tamperedSignals: [bigint, bigint, bigint, bigint] = [0n, testSignals[1], testSignals[2], testSignals[3]];
  const tamperedValid = await readContract(
    groth16Verifier.address, VERIFIER_ABI, "verifyProof",
    [testPA, testPB, testPC, tamperedSignals],
  );
  console.log(`  Tampered signal verification: ${tamperedValid ? "FAIL (accepted!)" : "PASS (rejected)"}`);

  if (tamperedValid) {
    console.error("  ERROR: Groth16Verifier accepted a tampered proof!");
    process.exit(1);
  }

  console.log("  Groth16Verifier on-chain tests PASSED.");

  // ============================================================
  // STEP 6: Create Market
  // ============================================================
  step("Step 6: Create Market with Oracle Price Params");

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
  // STEP 7: Test Custody Deposit & Withdraw Cycle
  // ============================================================
  step("Step 7: Test Custody Deposit & Withdraw Cycle");

  console.log("  Testing with Alice: mint 100 USDC -> approve Custody -> deposit -> verify -> withdraw -> verify\n");

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

  // Wait longer for RPC state to catch up after withdraw
  console.log("  Waiting for RPC state to sync...");
  await sleep(8000);

  const aliceCustodyBal2 = await readContract(
    custody.address, CUSTODY_ABI, "getAccountsBalances",
    [[aliceAccount.address], [mockUSDC.address]],
  ) as bigint[][];
  const aliceBalAfterWithdraw = aliceCustodyBal2[0]?.[0] ?? 0n;
  console.log(`  Alice Custody balance after withdraw: ${formatUSDC(aliceBalAfterWithdraw)} USDC`);
  if (aliceBalAfterWithdraw !== 0n) {
    // Double-check: the withdraw TX succeeded, this might be RPC lag
    console.warn(`  WARNING: Balance shows ${formatUSDC(aliceBalAfterWithdraw)} (may be RPC lag). Withdraw TX confirmed.`);
    await sleep(5000);
    const recheck = await readContract(
      custody.address, CUSTODY_ABI, "getAccountsBalances",
      [[aliceAccount.address], [mockUSDC.address]],
    ) as bigint[][];
    const recheckBal = recheck[0]?.[0] ?? 0n;
    console.log(`  Recheck balance: ${formatUSDC(recheckBal)} USDC`);
    if (recheckBal !== 0n) {
      console.error(`  ERROR: Expected 0 after recheck, got ${formatUSDC(recheckBal)}`);
      process.exit(1);
    }
  }

  const aliceUsdcAfterWithdraw = await readContract(
    mockUSDC.address, ERC20_ABI, "balanceOf", [aliceAccount.address],
  ) as bigint;
  console.log(`  Alice USDC wallet after withdraw: ${formatUSDC(aliceUsdcAfterWithdraw)} USDC`);
  console.log("  Custody Deposit & Withdraw cycle PASSED.");

  // ============================================================
  // STEP 8: Simulate Off-chain Bets
  // ============================================================
  step("Step 8: Simulate Off-chain Bets (State Channels)");

  const bets: BetData[] = [
    { address: aliceAccount.address, isYes: true, amount: 100n * ONE_USDC },
    { address: bobAccount.address, isYes: false, amount: 200n * ONE_USDC },
    { address: charlieAccount.address, isYes: true, amount: 150n * ONE_USDC },
  ];

  const betNames = ["Alice", "Bob", "Charlie"];

  console.log("  In production, bets go through Clearnode WebSocket state channels.");
  console.log("  Funds are custodied by Custody.sol (ERC-7824), not HellyHook.\n");

  for (let i = 0; i < bets.length; i++) {
    console.log(`  ${betNames[i]}: ${bets[i].isYes ? "YES" : "NO"} $${formatUSDC(bets[i].amount)} (off-chain)`);
  }

  const totalPool = bets.reduce((sum, b) => sum + b.amount, 0n);
  const totalYes = bets.filter(b => b.isYes).reduce((sum, b) => sum + b.amount, 0n);
  const totalNo = bets.filter(b => !b.isYes).reduce((sum, b) => sum + b.amount, 0n);
  console.log(`\n  Total YES: $${formatUSDC(totalYes)} USDC`);
  console.log(`  Total NO:  $${formatUSDC(totalNo)} USDC`);
  console.log(`  Total pool: $${formatUSDC(totalPool)} USDC`);

  // ============================================================
  // STEP 9: Resolve Market
  // ============================================================
  step("Step 9: Resolve Market -> YES");

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
  // STEP 10: Generate REAL ZK Proof & Settle
  // ============================================================
  step("Step 10: Generate Real ZK Proof & Settle Market");

  console.log("  Computing settlement with REAL Groth16 proof...\n");

  const settlement = await generateSettlementProof(true, PLATFORM_FEE_BPS, bets);

  console.log(`\n  Settlement computation:`);
  console.log(`    Total pool:       ${formatUSDC(settlement.totalPool)} USDC`);
  console.log(`    Platform fee:     ${formatUSDC(settlement.platformFee)} USDC (${PLATFORM_FEE_BPS / 100}%)`);

  const winners = bets.filter(b => b.isYes);
  const losers = bets.filter(b => !b.isYes);
  for (let i = 0; i < bets.length; i++) {
    const name = betNames[i];
    const payout = settlement.payouts[i];
    console.log(`    ${name} payout:    ${formatUSDC(payout)} USDC ${payout > 0n ? "(winner)" : "(loser)"}`);
  }

  const sumPayouts = settlement.payouts.reduce((a, b) => a + b, 0n);
  const conservation = sumPayouts + settlement.platformFee === settlement.totalPool;
  console.log(`    Conservation:     ${formatUSDC(sumPayouts)} + ${formatUSDC(settlement.platformFee)} = ${formatUSDC(sumPayouts + settlement.platformFee)} ${conservation ? "OK" : "FAIL"}`);

  // Only include addresses with non-zero payouts for the on-chain call
  const recipients: Address[] = [];
  const amounts: bigint[] = [];
  for (let i = 0; i < bets.length; i++) {
    if (settlement.payouts[i] > 0n) {
      recipients.push(bets[i].address as Address);
      amounts.push(settlement.payouts[i]);
    }
  }

  console.log("\n  Calling settleMarketWithProof with REAL Groth16 proof...");
  const settleHash = await writeAndWait(
    ADMIN_KEY, hellyHook.address, EXTENDED_ABI,
    "settleMarketWithProof",
    [
      marketId,
      recipients,
      amounts,
      settlement.totalPool,
      settlement.platformFee,
      settlement.proof.pA,
      settlement.proof.pB,
      settlement.proof.pC,
    ],
  );
  logTx("Settle Market (Real ZK Proof)", settleHash);
  console.log("  Market settled with REAL Groth16 proof! Bet directions NEVER revealed on-chain.");

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

  // Verify oracle state
  const storedPoolId = await readContract(hellyHook.address, EXTENDED_ABI, "marketPoolId", [marketId]);
  const storedPriceTarget = await readContract(hellyHook.address, EXTENDED_ABI, "marketPriceTarget", [marketId]);
  const storedPriceAbove = await readContract(hellyHook.address, EXTENDED_ABI, "marketPriceAbove", [marketId]);

  console.log(`\n  Oracle config:`);
  console.log(`    poolId:      ${(storedPoolId as string).slice(0, 18)}...`);
  console.log(`    priceTarget: ${storedPriceTarget}`);
  console.log(`    priceAbove:  ${storedPriceAbove}`);

  // ============================================================
  // STEP 12: Test Invalid Proof Rejection
  // ============================================================
  step("Step 12: Test Invalid Proof Rejection");

  console.log("  Creating a second market to test invalid proof rejection...\n");

  const question2 = "Will BTC hit $200k in 2026?";
  const marketId2 = keccak256(encodePacked(["string"], [question2]));
  const deadline2 = now + 600n;

  const createHash2 = await writeAndWait(
    ADMIN_KEY, hellyHook.address, EXTENDED_ABI,
    "createMarket", [marketId2, question2, deadline2, poolId, priceTarget, priceAbove],
  );
  logTx("Create Market 2", createHash2);

  const resolveHash2 = await writeAndWait(
    ADMIN_KEY, hellyHook.address, EXTENDED_ABI,
    "resolveMarket", [marketId2, false], // NO outcome
  );
  logTx("Resolve Market 2 (NO)", resolveHash2);

  await waitForRpc();

  // Try to settle with the proof from the first market (wrong outcome: proof says YES, market says NO)
  console.log("  Attempting settlement with proof from wrong market (YES proof on NO market)...");
  let invalidProofRejected = false;
  try {
    await writeAndWait(
      ADMIN_KEY, hellyHook.address, EXTENDED_ABI,
      "settleMarketWithProof",
      [
        marketId2,
        recipients,
        amounts,
        settlement.totalPool,
        settlement.platformFee,
        settlement.proof.pA,
        settlement.proof.pB,
        settlement.proof.pC,
      ],
    );
    console.log("  ERROR: Invalid proof was accepted! This should not happen.");
  } catch (err: any) {
    invalidProofRejected = true;
    console.log("  Invalid proof correctly REJECTED.");
    console.log(`  Revert reason: ${err.message?.slice(0, 100)}...`);
  }

  if (!invalidProofRejected) {
    console.error("  CRITICAL: Groth16Verifier did not reject an invalid proof!");
    process.exit(1);
  }

  // Also test with all-zero proof (should be rejected)
  console.log("\n  Attempting settlement with all-zero proof...");
  let zeroProofRejected = false;
  try {
    await writeAndWait(
      ADMIN_KEY, hellyHook.address, EXTENDED_ABI,
      "settleMarketWithProof",
      [
        marketId2,
        [bobAccount.address],
        [200n * ONE_USDC],
        200n * ONE_USDC,
        0n,
        [0n, 0n],
        [[0n, 0n], [0n, 0n]],
        [0n, 0n],
      ],
    );
    console.log("  ERROR: Zero proof was accepted! This should not happen.");
  } catch (err: any) {
    zeroProofRejected = true;
    console.log("  All-zero proof correctly REJECTED.");
    console.log(`  Revert reason: ${err.message?.slice(0, 100)}...`);
  }

  if (!zeroProofRejected) {
    console.error("  CRITICAL: Groth16Verifier did not reject an all-zero proof!");
    process.exit(1);
  }

  console.log("\n  Invalid proof rejection tests PASSED.");

  // ============================================================
  // SUMMARY
  // ============================================================
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${"=".repeat(60)}`);
  console.log("  UNICHAIN SEPOLIA TESTNET E2E SUMMARY");
  console.log(`${"=".repeat(60)}`);

  console.log(`\n  Chain: Unichain Sepolia (1301)`);
  console.log(`  PoolManager: ${POOL_MANAGER}`);
  console.log(`  Time: ${elapsed}s`);

  console.log(`\n  Contracts:`);
  console.log(`    MockUSDC:         ${mockUSDC.address}`);
  console.log(`                      ${addrLink(mockUSDC.address)}`);
  console.log(`    HellyHook:        ${hellyHook.address}`);
  console.log(`                      ${addrLink(hellyHook.address)}`);
  console.log(`    Groth16Verifier:  ${groth16Verifier.address}`);
  console.log(`                      ${addrLink(groth16Verifier.address)}`);
  console.log(`    Custody:          ${custody.address}`);
  console.log(`                      ${addrLink(custody.address)}`);
  console.log(`    Adjudicator:      ${dummy.address}`);
  console.log(`                      ${addrLink(dummy.address)}`);

  console.log(`\n  Settlement (record-only — payouts via Custody):`);
  for (let i = 0; i < bets.length; i++) {
    const name = betNames[i];
    const dir = bets[i].isYes ? "YES" : "NO ";
    const amt = formatUSDC(bets[i].amount);
    const payout = formatUSDC(settlement.payouts[i]);
    console.log(`    ${name.padEnd(8)}(${dir} $${amt}): $${payout} payout`);
  }
  console.log(`    Platform fee:       $${formatUSDC(settlement.platformFee)}`);

  console.log(`\n  Verifications:`);
  console.log(`    Groth16Verifier on-chain:   PASS (valid proof accepted)`);
  console.log(`    Tampered proof rejection:    PASS (modified signal rejected)`);
  console.log(`    Custody deposit/withdraw:    PASS`);
  console.log(`    Market creation:             PASS`);
  console.log(`    Market resolution:           PASS`);
  console.log(`    Real ZK proof settlement:    PASS`);
  console.log(`    Invalid proof rejection:     PASS`);
  console.log(`    Zero proof rejection:        PASS`);
  console.log(`    Payout conservation:         PASS (${formatUSDC(settlement.totalPool)} total)`);

  console.log(`\n  All Transactions (${txLog.length}):`);
  for (const { step: s, hash } of txLog) {
    console.log(`    ${s.padEnd(35)} ${txLink(hash)}`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  UNICHAIN SEPOLIA TESTNET E2E: ALL PASS`);
  console.log(`  REAL Groth16 ZK Proofs — No MockVerifier`);
  console.log(`  Time: ${elapsed}s`);
  console.log(`${"=".repeat(60)}`);
}

main().catch((err) => {
  console.error("\nTestnet E2E flow failed:", err);
  process.exit(1);
});
