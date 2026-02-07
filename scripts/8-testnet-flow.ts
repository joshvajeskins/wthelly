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
 *   4. Deploy contracts (MockUSDC, HellyHook, Groth16Verifier)
 *   5. Configure (setVerifier, setTeeAddress)
 *   6. Create market with oracle price params
 *   7. Mint USDC & deposit for all users
 *   8. Simulate off-chain bets (state channels)
 *   9. Resolve market (admin resolves with YES outcome)
 *  10. Settle with ZK proof (mock proof)
 *  11. Verify final state
 *  12. Withdrawals
 *  13. Print summary
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
  formatUnits,
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

// Extended ABI for ZK settlement + oracle functions (same as 9-tee-flow.ts)
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

// Groth16Verifier ABI (minimal)
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

// Track all TX hashes for summary
const txLog: { step: string; hash: Hex }[] = [];

function logTx(stepName: string, hash: Hex) {
  txLog.push({ step: stepName, hash });
  console.log(`  TX: ${hash}`);
  console.log(`  Explorer: ${txLink(hash)}`);
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
  console.log("║  ZK proof settlement                                   ║");
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

  if (adminEthBalance < 50000000000000000n) { // 0.05 ETH
    console.error("\n  ERROR: Admin needs at least 0.05 Unichain Sepolia ETH for gas!");
    console.error(`  Fund this address: ${ADMIN_ADDRESS}`);
    console.error("  Get testnet ETH from the Unichain Sepolia faucet");
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
  console.log(`\n  (ephemeral — private keys logged below for debugging)`);
  console.log(`  Alice key:   ${aliceKey}`);
  console.log(`  Bob key:     ${bobKey}`);
  console.log(`  Charlie key: ${charlieKey}`);

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
  console.log(`  MockUSDC address: ${mockUSDC.address}`);
  console.log(`  ${addrLink(mockUSDC.address)}`);

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
  console.log(`  HellyHook address: ${hellyHook.address}`);
  console.log(`  ${addrLink(hellyHook.address)}`);

  // Deploy Groth16Verifier
  console.log("\n  Deploying Groth16Verifier...");
  const verifierBytecode = getContractBytecode("Groth16Verifier");
  const verifier = await deployContract(ADMIN_KEY, VERIFIER_ABI, verifierBytecode);
  logTx("Deploy Groth16Verifier", verifier.hash);
  console.log(`  Groth16Verifier address: ${verifier.address}`);
  console.log(`  ${addrLink(verifier.address)}`);

  // Save deployment info
  const deployment = {
    hellyHook: hellyHook.address,
    mockUSDC: mockUSDC.address,
    verifier: verifier.address,
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
  // STEP 4: Configure (setVerifier + setTeeAddress)
  // ============================================================
  step("Step 4: Configure Verifier & TEE Address");

  const adminAccount = privateKeyToAccount(ADMIN_KEY);
  const adminWc = getWalletClient(ADMIN_KEY);

  console.log("  Setting verifier...");
  const setVerifierHash = await adminWc.writeContract({
    address: hellyHook.address,
    abi: EXTENDED_ABI,
    functionName: "setVerifier",
    args: [verifier.address],
    account: adminAccount,
  } as any);
  await publicClient.waitForTransactionReceipt({ hash: setVerifierHash });
  logTx("Set Verifier", setVerifierHash);

  console.log("  Setting TEE address (admin acts as TEE for this test)...");
  const setTeeHash = await adminWc.writeContract({
    address: hellyHook.address,
    abi: EXTENDED_ABI,
    functionName: "setTeeAddress",
    args: [ADMIN_ADDRESS],
    account: adminAccount,
  } as any);
  await publicClient.waitForTransactionReceipt({ hash: setTeeHash });
  logTx("Set TEE Address", setTeeHash);

  // Verify configuration
  const configuredVerifier = await publicClient.readContract({
    address: hellyHook.address,
    abi: EXTENDED_ABI,
    functionName: "verifier",
  });
  const configuredTee = await publicClient.readContract({
    address: hellyHook.address,
    abi: EXTENDED_ABI,
    functionName: "teeAddress",
  });
  console.log(`  Verifier: ${configuredVerifier}`);
  console.log(`  TEE Address: ${configuredTee}`);

  // ============================================================
  // STEP 5: Create Market
  // ============================================================
  step("Step 5: Create Market with Oracle Price Params");

  const question = "Will ETH hit $5k by end of 2026?";
  const marketId = keccak256(encodePacked(["string"], [question]));
  const now = BigInt(Math.floor(Date.now() / 1000));
  const deadline = now + 90n; // 90 seconds — short for live testnet
  const poolId = keccak256(encodePacked(["string"], ["ETH-USDC-pool"]));
  const priceTarget = 79228162514264337593543950336n; // sqrtPriceX96 ~1.0
  const priceAbove = true;

  console.log(`  Market ID: ${marketId}`);
  console.log(`  Question: ${question}`);
  console.log(`  Deadline: ${new Date(Number(deadline) * 1000).toISOString()}`);
  console.log(`  Pool ID: ${poolId}`);
  console.log(`  Price Target: ${priceTarget}`);
  console.log(`  Price Above: ${priceAbove}`);

  console.log("\n  Creating market on-chain...");
  const createHash = await adminWc.writeContract({
    address: hellyHook.address,
    abi: EXTENDED_ABI,
    functionName: "createMarket",
    args: [marketId, question, deadline, poolId, priceTarget, priceAbove],
    account: adminAccount,
  } as any);
  await publicClient.waitForTransactionReceipt({ hash: createHash });
  logTx("Create Market", createHash);

  // Verify market was created
  const marketAfterCreate = await publicClient.readContract({
    address: hellyHook.address,
    abi: EXTENDED_ABI,
    functionName: "getMarket",
    args: [marketId],
  }) as any[];
  console.log(`\n  On-chain: question="${marketAfterCreate[0]}", resolved=${marketAfterCreate[2]}`);

  // ============================================================
  // STEP 6: Mint USDC & Deposit for all users
  // ============================================================
  step("Step 6: Mint USDC & Deposit");

  const mintAmount = 1000n * ONE_USDC;
  const depositAmount = 500n * ONE_USDC;

  for (const [name, key, addr] of [
    ["Alice", aliceKey, aliceAccount.address],
    ["Bob", bobKey, bobAccount.address],
    ["Charlie", charlieKey, charlieAccount.address],
  ] as const) {
    console.log(`\n  --- ${name} ---`);

    // Mint USDC (admin mints to user)
    console.log(`  Minting ${formatUSDC(mintAmount)} USDC...`);
    const mintHash = await adminWc.writeContract({
      address: mockUSDC.address,
      abi: ERC20_ABI,
      functionName: "mint",
      args: [addr, mintAmount],
      account: adminAccount,
    } as any);
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    logTx(`Mint USDC to ${name}`, mintHash);

    // Approve
    const userAccount = privateKeyToAccount(key);
    const userWc = getWalletClient(key);

    console.log(`  Approving ${formatUSDC(depositAmount)} USDC...`);
    const approveHash = await userWc.writeContract({
      address: mockUSDC.address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [hellyHook.address, depositAmount],
      account: userAccount,
    } as any);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    logTx(`Approve ${name}`, approveHash);

    // Deposit
    console.log(`  Depositing ${formatUSDC(depositAmount)} USDC...`);
    const depositHash = await userWc.writeContract({
      address: hellyHook.address,
      abi: EXTENDED_ABI,
      functionName: "deposit",
      args: [depositAmount],
      account: userAccount,
    } as any);
    await publicClient.waitForTransactionReceipt({ hash: depositHash });
    logTx(`Deposit ${name}`, depositHash);

    const hookBal = await publicClient.readContract({
      address: hellyHook.address,
      abi: EXTENDED_ABI,
      functionName: "balances",
      args: [addr],
    }) as bigint;
    console.log(`  HellyHook balance: ${formatUSDC(hookBal)} USDC`);
  }

  // ============================================================
  // STEP 7: Simulate Off-chain Bets (State Channels)
  // ============================================================
  step("Step 7: Simulate Off-chain Bets (State Channels)");

  console.log("  In production, bets go through Clearnode WebSocket state channels.");
  console.log("  For this E2E test, we simulate the bet data that the TEE would know:\n");

  const bets = [
    { name: "Alice", address: aliceAccount.address, isYes: true, amount: 100n * ONE_USDC },
    { name: "Bob", address: bobAccount.address, isYes: false, amount: 200n * ONE_USDC },
    { name: "Charlie", address: charlieAccount.address, isYes: true, amount: 150n * ONE_USDC },
  ];

  for (const bet of bets) {
    console.log(`  ${bet.name}: ${bet.isYes ? "YES" : "NO"} $${formatUSDC(bet.amount)} (off-chain via state channel)`);
  }

  const totalYes = bets.filter(b => b.isYes).reduce((sum, b) => sum + b.amount, 0n);
  const totalNo = bets.filter(b => !b.isYes).reduce((sum, b) => sum + b.amount, 0n);
  console.log(`\n  Total YES: $${formatUSDC(totalYes)} USDC`);
  console.log(`  Total NO:  $${formatUSDC(totalNo)} USDC`);

  // ============================================================
  // STEP 8: Wait for Deadline, then Resolve Market
  // ============================================================
  step("Step 8: Wait for Deadline & Resolve Market → YES");

  // Check how long until deadline
  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const waitTime = deadline > currentTime ? Number(deadline - currentTime) : 0;

  if (waitTime > 0) {
    console.log(`  Deadline is ${waitTime}s from now. Waiting...`);
    // Poll every 10 seconds
    const pollInterval = 10;
    let elapsed = 0;
    while (elapsed < waitTime + 5) { // +5s buffer
      await sleep(pollInterval * 1000);
      elapsed += pollInterval;
      const remaining = waitTime - elapsed;
      if (remaining > 0) {
        console.log(`  ... ${remaining}s remaining`);
      } else {
        console.log("  Deadline passed!");
        break;
      }
    }
  } else {
    console.log("  Deadline already passed.");
  }

  console.log("\n  Resolving market with outcome: YES...");
  const resolveHash = await adminWc.writeContract({
    address: hellyHook.address,
    abi: EXTENDED_ABI,
    functionName: "resolveMarket",
    args: [marketId, true],
    account: adminAccount,
  } as any);
  await publicClient.waitForTransactionReceipt({ hash: resolveHash });
  logTx("Resolve Market", resolveHash);

  const marketAfterResolve = await publicClient.readContract({
    address: hellyHook.address,
    abi: EXTENDED_ABI,
    functionName: "getMarket",
    args: [marketId],
  }) as any[];
  console.log(`  Resolved: ${marketAfterResolve[2]}, Outcome: ${marketAfterResolve[3] ? "YES" : "NO"}`);

  // ============================================================
  // STEP 9: Settle with ZK Proof
  // ============================================================
  step("Step 9: Settle Market with ZK Proof");

  // Compute settlement payouts:
  // Winners (YES): Alice (100 USDC) + Charlie (150 USDC) = 250 USDC
  // Losers (NO): Bob (200 USDC)
  // Total pool = 450 USDC
  // Platform fee = 2% of loser pool = 2% of 200 = 4 USDC
  // Net distributable from losers = 200 - 4 = 196 USDC
  // Alice payout = 100 + (100/250) * 196 = 100 + 78.4 = 178.4 USDC
  // Charlie payout = 150 + (150/250) * 196 = 150 + 117.6 = 267.6 USDC
  const totalPool = 450n * ONE_USDC;
  const loserPool = 200n * ONE_USDC;
  const platformFee = (loserPool * BigInt(PLATFORM_FEE_BPS)) / 10000n;
  const netDistributable = loserPool - platformFee;
  const winnerPool = 250n * ONE_USDC;

  const alicePayout = 100n * ONE_USDC + (100n * ONE_USDC * netDistributable) / winnerPool;
  const charliePayout = 150n * ONE_USDC + (150n * ONE_USDC * netDistributable) / winnerPool;

  console.log(`  Total pool: ${formatUSDC(totalPool)} USDC`);
  console.log(`  Loser pool: ${formatUSDC(loserPool)} USDC`);
  console.log(`  Platform fee: ${formatUSDC(platformFee)} USDC`);
  console.log(`  Net distributable: ${formatUSDC(netDistributable)} USDC`);
  console.log(`  Alice payout: ${formatUSDC(alicePayout)} USDC`);
  console.log(`  Charlie payout: ${formatUSDC(charliePayout)} USDC`);

  const recipients: Address[] = [aliceAccount.address, charlieAccount.address];
  const amounts: bigint[] = [alicePayout, charliePayout];

  // Mock ZK proof (all zeros — will fail real verification but tests the contract call flow)
  const pA: [bigint, bigint] = [0n, 0n];
  const pB: [[bigint, bigint], [bigint, bigint]] = [[0n, 0n], [0n, 0n]];
  const pC: [bigint, bigint] = [0n, 0n];

  console.log("\n  Calling settleMarketWithProof...");
  try {
    const settleHash = await adminWc.writeContract({
      address: hellyHook.address,
      abi: EXTENDED_ABI,
      functionName: "settleMarketWithProof",
      args: [marketId, recipients, amounts, totalPool, platformFee, pA, pB, pC],
      account: adminAccount,
    } as any);
    await publicClient.waitForTransactionReceipt({ hash: settleHash });
    logTx("Settle Market", settleHash);
    console.log("  Market settled with ZK proof — bet directions NEVER revealed on-chain!");
  } catch (err: any) {
    console.log(`  settleMarketWithProof failed (expected if verifier rejects mock proof):`);
    console.log(`  ${err.message?.slice(0, 200)}`);
    console.log("  In production, a real ZK proof from the TEE would be used.");
  }

  // ============================================================
  // STEP 10: Verify Final State
  // ============================================================
  step("Step 10: Verify Final State");

  const marketFinal = await publicClient.readContract({
    address: hellyHook.address,
    abi: EXTENDED_ABI,
    functionName: "getMarket",
    args: [marketId],
  }) as any[];

  console.log(`  Market resolved: ${marketFinal[2]}`);
  console.log(`  Market outcome (YES): ${marketFinal[3]}`);
  console.log(`  Market settled: ${marketFinal[6]}`);

  // Check balances
  console.log("\n  User balances in HellyHook:");
  for (const bet of bets) {
    const bal = await publicClient.readContract({
      address: hellyHook.address,
      abi: EXTENDED_ABI,
      functionName: "balances",
      args: [bet.address],
    }) as bigint;
    console.log(`    ${bet.name}: ${formatUSDC(bal)} USDC`);
  }

  const adminBal = await publicClient.readContract({
    address: hellyHook.address,
    abi: EXTENDED_ABI,
    functionName: "balances",
    args: [ADMIN_ADDRESS],
  }) as bigint;
  console.log(`    Admin (platform fee): ${formatUSDC(adminBal)} USDC`);

  // Verify oracle-related state
  const storedPoolId = await publicClient.readContract({
    address: hellyHook.address,
    abi: EXTENDED_ABI,
    functionName: "marketPoolId",
    args: [marketId],
  });
  const storedPriceTarget = await publicClient.readContract({
    address: hellyHook.address,
    abi: EXTENDED_ABI,
    functionName: "marketPriceTarget",
    args: [marketId],
  });
  const storedPriceAbove = await publicClient.readContract({
    address: hellyHook.address,
    abi: EXTENDED_ABI,
    functionName: "marketPriceAbove",
    args: [marketId],
  });

  console.log(`\n  Oracle config:`);
  console.log(`    poolId: ${(storedPoolId as string).slice(0, 16)}...`);
  console.log(`    priceTarget: ${storedPriceTarget}`);
  console.log(`    priceAbove: ${storedPriceAbove}`);

  // ============================================================
  // STEP 11: Withdrawals
  // ============================================================
  step("Step 11: Withdraw All Balances");

  for (const bet of bets) {
    const bal = await publicClient.readContract({
      address: hellyHook.address,
      abi: EXTENDED_ABI,
      functionName: "balances",
      args: [bet.address],
    }) as bigint;

    if (bal > 0n) {
      const userAccount = privateKeyToAccount(
        bet.name === "Alice" ? aliceKey : bet.name === "Bob" ? bobKey : charlieKey
      );
      const userWc = getWalletClient(
        bet.name === "Alice" ? aliceKey : bet.name === "Bob" ? bobKey : charlieKey
      );

      console.log(`\n  ${bet.name} withdrawing ${formatUSDC(bal)} USDC...`);
      const wHash = await userWc.writeContract({
        address: hellyHook.address,
        abi: EXTENDED_ABI,
        functionName: "withdraw",
        args: [bal],
        account: userAccount,
      } as any);
      await publicClient.waitForTransactionReceipt({ hash: wHash });
      logTx(`Withdraw ${bet.name}`, wHash);

      const usdcBal = await publicClient.readContract({
        address: mockUSDC.address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [bet.address],
      }) as bigint;
      console.log(`    USDC wallet balance: ${formatUSDC(usdcBal)}`);
    } else {
      console.log(`\n  ${bet.name}: nothing to withdraw (balance = 0)`);
    }
  }

  // Admin withdraws fee if any
  if (adminBal > 0n) {
    console.log(`\n  Admin withdrawing ${formatUSDC(adminBal)} fee...`);
    const adminWHash = await adminWc.writeContract({
      address: hellyHook.address,
      abi: EXTENDED_ABI,
      functionName: "withdraw",
      args: [adminBal],
      account: adminAccount,
    } as any);
    await publicClient.waitForTransactionReceipt({ hash: adminWHash });
    logTx("Withdraw Admin Fee", adminWHash);
  }

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
  console.log(`    MockUSDC:        ${mockUSDC.address}`);
  console.log(`                     ${addrLink(mockUSDC.address)}`);
  console.log(`    HellyHook:       ${hellyHook.address}`);
  console.log(`                     ${addrLink(hellyHook.address)}`);
  console.log(`    Groth16Verifier: ${verifier.address}`);
  console.log(`                     ${addrLink(verifier.address)}`);

  console.log(`\n  Expected payouts (if ZK proof accepted):`);
  console.log(`    Alice  (YES $100): $${formatUSDC(alicePayout)}`);
  console.log(`    Charlie(YES $150): $${formatUSDC(charliePayout)}`);
  console.log(`    Bob    (NO  $200): $0 (lost)`);
  console.log(`    Platform fee: $${formatUSDC(platformFee)}`);

  console.log(`\n  All Transactions:`);
  for (const { step: s, hash } of txLog) {
    console.log(`    ${s.padEnd(30)} ${txLink(hash)}`);
  }

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║    UNICHAIN SEPOLIA TESTNET E2E COMPLETE                ║`);
  console.log(`║    Time: ${elapsed.padEnd(46)}║`);
  console.log(`║    Contracts deployed and configured                    ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);
}

main().catch((err) => {
  console.error("\nTestnet E2E flow failed:", err);
  process.exit(1);
});
