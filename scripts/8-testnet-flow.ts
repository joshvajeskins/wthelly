/**
 * Script 8: Testnet E2E Flow (Sepolia)
 *
 * Self-contained testnet deployment + full prediction market lifecycle.
 * Generates ephemeral wallets, funds them, deploys contracts, runs the full flow.
 *
 * Run: npx tsx scripts/8-testnet-flow.ts
 * Prerequisites:
 *   - .env with EVM_PRIVATE_KEY and SEPOLIA_RPC_URL
 *   - Admin account has >= 0.05 Base Sepolia ETH
 */

import "dotenv/config";

// Set testnet mode BEFORE any lib imports
process.env.TESTNET = "true";

import {
  type Hex,
  type Address,
  formatEther,
  formatUnits,
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
  EXPLORER_BASE_URL,
  getRpcUrl,
} from "./lib/config.js";
import {
  getPublicClient,
  getWalletClient,
  deployContract,
  fundWithEth,
  mintUSDC,
  depositToHook,
  submitCommitment,
  revealBet,
  resolveMarket,
  settleMarket,
  withdrawFromHook,
  getMarket,
  getBalance,
  getUSDCBalance,
  getCommitmentHash,
  formatUSDC,
  getExplorerTxUrl,
  getExplorerAddressUrl,
} from "./lib/contracts.js";
import { generateSecret, computeCommitmentHash, generateMarketId } from "./lib/commitment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  execSync("forge build", { cwd: contractsDir, stdio: "pipe" });
  const artifact = JSON.parse(
    readFileSync(join(contractsDir, `out/${name}.sol/${name}.json`), "utf-8")
  );
  return artifact.bytecode.object as Hex;
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
  console.log("║       WTHELLY — Base Sepolia Testnet E2E Flow                ║");
  console.log("║                                                          ║");
  console.log("║  Alice   → YES $100                                      ║");
  console.log("║  Bob     → NO  $200                                      ║");
  console.log("║  Charlie → YES $150                                      ║");
  console.log("║  Outcome: YES                                            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\nRPC: ${getRpcUrl()}`);
  console.log(`Admin: ${ADMIN_ADDRESS}`);
  console.log(`Explorer: ${addrLink(ADMIN_ADDRESS)}`);

  // ============================================================
  // STEP 0: Check admin ETH balance
  // ============================================================
  step("Step 0: Check Admin ETH Balance");

  const adminEthBalance = await publicClient.getBalance({ address: ADMIN_ADDRESS });
  console.log(`  Admin ETH: ${formatEther(adminEthBalance)} ETH`);

  if (adminEthBalance < 50000000000000000n) { // 0.05 ETH
    console.error("\n  ERROR: Admin needs at least 0.05 Base Sepolia ETH for gas!");
    console.error(`  Fund this address: ${ADMIN_ADDRESS}`);
    console.error("  Get testnet ETH from: https://faucet.base.org/");
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

  const ethPerWallet = "0.01";
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
  step("Step 3: Deploy Contracts to Base Sepolia");

  console.log("  Building contracts...");
  const mockUsdcBytecode = getContractBytecode("MockUSDC");
  const hellyHookBytecode = getContractBytecode("HellyHook");

  console.log("\n  Deploying MockUSDC...");
  const mockUSDC = await deployContract(ADMIN_KEY, ERC20_ABI, mockUsdcBytecode);
  logTx("Deploy MockUSDC", mockUSDC.hash);
  console.log(`  MockUSDC address: ${mockUSDC.address}`);
  console.log(`  ${addrLink(mockUSDC.address)}`);

  console.log("\n  Deploying HellyHook...");
  const hellyHook = await deployContract(
    ADMIN_KEY,
    HELLY_HOOK_ABI,
    hellyHookBytecode,
    [mockUSDC.address, BigInt(PLATFORM_FEE_BPS)]
  );
  logTx("Deploy HellyHook", hellyHook.hash);
  console.log(`  HellyHook address: ${hellyHook.address}`);
  console.log(`  ${addrLink(hellyHook.address)}`);

  // Save deployment info
  const deployment = {
    hellyHook: hellyHook.address,
    mockUSDC: mockUSDC.address,
    deployer: ADMIN_ADDRESS,
    chainId: 84532,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(
    join(__dirname, "lib/deployment.json"),
    JSON.stringify(deployment, null, 2)
  );
  console.log("\n  Deployment saved to scripts/lib/deployment.json");

  // ============================================================
  // STEP 4: Create Market
  // ============================================================
  step("Step 4: Create Market");

  const question = "Will ETH hit $5k by end of 2026?";
  const marketId = generateMarketId(question);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const deadline = now + 7200n; // 2 hour betting window
  const revealWindow = 3600n; // 1 hour reveal window

  console.log(`  Market ID: ${marketId}`);
  console.log(`  Question: ${question}`);
  console.log(`  Deadline: ${new Date(Number(deadline) * 1000).toISOString()}`);
  console.log(`  Reveal window: 3600s (1 hour after resolution)`);

  console.log("\n  Creating market on-chain...");
  const createHash = await (async () => {
    const account = privateKeyToAccount(ADMIN_KEY);
    const client = getWalletClient(ADMIN_KEY);
    const hash = await client.writeContract({
      address: hellyHook.address,
      abi: HELLY_HOOK_ABI,
      functionName: "createMarket",
      args: [marketId, question, deadline, revealWindow],
      chain: (await import("viem/chains")).baseSepolia,
      account,
    } as any);
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  })();
  logTx("Create Market", createHash);

  const market = await getMarket(marketId);
  console.log(`\n  On-chain: question="${market.question}", resolved=${market.resolved}`);

  // ============================================================
  // STEP 5: Mint USDC & Deposit for all users
  // ============================================================
  step("Step 5: Mint USDC & Deposit");

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
    const mintHash = await (async () => {
      const account = privateKeyToAccount(ADMIN_KEY);
      const client = getWalletClient(ADMIN_KEY);
      const hash = await client.writeContract({
        address: mockUSDC.address,
        abi: ERC20_ABI,
        functionName: "mint",
        args: [addr, mintAmount],
        chain: (await import("viem/chains")).baseSepolia,
        account,
      } as any);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    })();
    logTx(`Mint USDC to ${name}`, mintHash);

    // Approve + Deposit
    console.log(`  Approving ${formatUSDC(depositAmount)} USDC...`);
    const approveHash = await (async () => {
      const account = privateKeyToAccount(key);
      const client = getWalletClient(key);
      const hash = await client.writeContract({
        address: mockUSDC.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [hellyHook.address, depositAmount],
        chain: (await import("viem/chains")).baseSepolia,
        account,
      } as any);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    })();
    logTx(`Approve ${name}`, approveHash);

    console.log(`  Depositing ${formatUSDC(depositAmount)} USDC...`);
    const depositHash = await (async () => {
      const account = privateKeyToAccount(key);
      const client = getWalletClient(key);
      const hash = await client.writeContract({
        address: hellyHook.address,
        abi: HELLY_HOOK_ABI,
        functionName: "deposit",
        args: [depositAmount],
        chain: (await import("viem/chains")).baseSepolia,
        account,
      } as any);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    })();
    logTx(`Deposit ${name}`, depositHash);

    const hookBal = await getBalance(addr);
    console.log(`  HellyHook balance: ${formatUSDC(hookBal)} USDC`);
  }

  // ============================================================
  // STEP 6: Place Bets
  // ============================================================
  step("Step 6: Place Bets");

  interface BetInfo {
    name: string;
    key: Hex;
    address: Address;
    isYes: boolean;
    amount: bigint;
    secret: Hex;
    commitHash: Hex;
  }

  const bets: BetInfo[] = [];

  for (const [name, key, addr, isYes, amount] of [
    ["Alice", aliceKey, aliceAccount.address, true, 100n * ONE_USDC],
    ["Bob", bobKey, bobAccount.address, false, 200n * ONE_USDC],
    ["Charlie", charlieKey, charlieAccount.address, true, 150n * ONE_USDC],
  ] as const) {
    console.log(`\n  --- ${name}: ${isYes ? "YES" : "NO"} $${formatUSDC(amount)} ---`);

    const secret = generateSecret();
    const commitHash = computeCommitmentHash(marketId, isYes, amount, secret, addr);

    // Verify hash matches on-chain
    const onChainHash = await getCommitmentHash(marketId, isYes, amount, secret, addr);
    if (commitHash !== onChainHash) {
      throw new Error(`Commitment hash mismatch for ${name}!`);
    }
    console.log(`  Hash verified (off-chain == on-chain)`);

    // Submit commitment
    console.log(`  Submitting commitment...`);
    const commitTxHash = await (async () => {
      const account = privateKeyToAccount(key);
      const client = getWalletClient(key);
      const hash = await client.writeContract({
        address: hellyHook.address,
        abi: HELLY_HOOK_ABI,
        functionName: "submitCommitment",
        args: [marketId, commitHash, amount],
        chain: (await import("viem/chains")).baseSepolia,
        account,
      } as any);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    })();
    logTx(`Bet ${name}`, commitTxHash);

    const hookBal = await getBalance(addr);
    console.log(`  Remaining balance: ${formatUSDC(hookBal)} USDC`);

    bets.push({ name, key, address: addr, isYes, amount, secret, commitHash });
  }

  const marketAfterBets = await getMarket(marketId);
  console.log(`\n  Market commit count: ${marketAfterBets.commitCount}`);

  // ============================================================
  // STEP 7: Resolve Market (YES wins)
  // ============================================================
  step("Step 7: Resolve Market → YES");

  console.log("  Resolving market with outcome: YES...");
  const resolveHash = await (async () => {
    const account = privateKeyToAccount(ADMIN_KEY);
    const client = getWalletClient(ADMIN_KEY);
    const hash = await client.writeContract({
      address: hellyHook.address,
      abi: HELLY_HOOK_ABI,
      functionName: "resolveMarket",
      args: [marketId, true],
      chain: (await import("viem/chains")).baseSepolia,
      account,
    } as any);
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  })();
  logTx("Resolve Market", resolveHash);

  const marketAfterResolve = await getMarket(marketId);
  console.log(`  Resolved: ${marketAfterResolve.resolved}, Outcome: ${marketAfterResolve.outcome ? "YES" : "NO"}`);

  // ============================================================
  // STEP 8: Reveal All Bets
  // ============================================================
  step("Step 8: Reveal All Bets");

  for (const bet of bets) {
    console.log(`\n  Revealing ${bet.name} (${bet.isYes ? "YES" : "NO"} $${formatUSDC(bet.amount)})...`);
    const revealHash = await (async () => {
      const account = privateKeyToAccount(bet.key);
      const client = getWalletClient(bet.key);
      const hash = await client.writeContract({
        address: hellyHook.address,
        abi: HELLY_HOOK_ABI,
        functionName: "revealBet",
        args: [marketId, bet.isYes, bet.secret],
        chain: (await import("viem/chains")).baseSepolia,
        account,
      } as any);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    })();
    logTx(`Reveal ${bet.name}`, revealHash);
  }

  const marketAfterReveal = await getMarket(marketId);
  console.log(`\n  Total YES: ${formatUSDC(marketAfterReveal.totalYes)} USDC`);
  console.log(`  Total NO: ${formatUSDC(marketAfterReveal.totalNo)} USDC`);

  // ============================================================
  // STEP 9: Settle Market
  // ============================================================
  step("Step 9: Settle Market");

  // Pre-settlement balances
  console.log("  Pre-settlement balances:");
  const preBals = new Map<Address, bigint>();
  for (const bet of bets) {
    const bal = await getBalance(bet.address);
    preBals.set(bet.address, bal);
    console.log(`    ${bet.name}: ${formatUSDC(bal)} USDC`);
  }
  const adminPreBal = await getBalance(ADMIN_ADDRESS);
  console.log(`    Admin: ${formatUSDC(adminPreBal)} USDC`);

  console.log("\n  Settling market...");
  const settleHash = await (async () => {
    const account = privateKeyToAccount(ADMIN_KEY);
    const client = getWalletClient(ADMIN_KEY);
    const hash = await client.writeContract({
      address: hellyHook.address,
      abi: HELLY_HOOK_ABI,
      functionName: "settleMarket",
      args: [marketId],
      chain: (await import("viem/chains")).baseSepolia,
      account,
    } as any);
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  })();
  logTx("Settle Market", settleHash);

  // Post-settlement balances
  console.log("\n  Post-settlement balances:");
  const winnerPayouts = new Map<Address, bigint>();
  for (const bet of bets) {
    const postBal = await getBalance(bet.address);
    const preBal = preBals.get(bet.address)!;
    const diff = postBal - preBal;
    console.log(
      `    ${bet.name}: ${formatUSDC(postBal)} USDC` +
        (diff > 0n ? ` (+${formatUSDC(diff)} winnings)` : " (lost)")
    );
    if (diff > 0n) winnerPayouts.set(bet.address, diff);
  }
  const adminPostBal = await getBalance(ADMIN_ADDRESS);
  const platformFee = adminPostBal - adminPreBal;
  console.log(`    Admin fee: +${formatUSDC(platformFee)} USDC`);

  // ============================================================
  // STEP 10: Withdrawals
  // ============================================================
  step("Step 10: Withdraw All Balances");

  for (const bet of bets) {
    const bal = await getBalance(bet.address);
    if (bal > 0n) {
      console.log(`\n  ${bet.name} withdrawing ${formatUSDC(bal)} USDC...`);
      const wHash = await (async () => {
        const account = privateKeyToAccount(bet.key);
        const client = getWalletClient(bet.key);
        const hash = await client.writeContract({
          address: hellyHook.address,
          abi: HELLY_HOOK_ABI,
          functionName: "withdraw",
          args: [bal],
          chain: (await import("viem/chains")).baseSepolia,
          account,
        } as any);
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      })();
      logTx(`Withdraw ${bet.name}`, wHash);
      const usdcBal = await getUSDCBalance(bet.address);
      console.log(`    USDC wallet balance: ${formatUSDC(usdcBal)}`);
    }
  }

  // Admin withdraws fee
  if (platformFee > 0n) {
    console.log(`\n  Admin withdrawing ${formatUSDC(platformFee)} fee...`);
    const adminWHash = await (async () => {
      const account = privateKeyToAccount(ADMIN_KEY);
      const client = getWalletClient(ADMIN_KEY);
      const hash = await client.writeContract({
        address: hellyHook.address,
        abi: HELLY_HOOK_ABI,
        functionName: "withdraw",
        args: [platformFee],
        chain: (await import("viem/chains")).baseSepolia,
        account,
      } as any);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    })();
    logTx("Withdraw Admin Fee", adminWHash);
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${"═".repeat(60)}`);
  console.log("  TESTNET E2E SUMMARY");
  console.log(`${"═".repeat(60)}`);

  console.log(`\n  Chain: Base Sepolia (84532)`);
  console.log(`  Time: ${elapsed}s`);
  console.log(`\n  Contracts:`);
  console.log(`    MockUSDC:  ${mockUSDC.address}`);
  console.log(`               ${addrLink(mockUSDC.address)}`);
  console.log(`    HellyHook: ${hellyHook.address}`);
  console.log(`               ${addrLink(hellyHook.address)}`);

  console.log(`\n  Expected payouts:`);
  const loserPool = 200n * ONE_USDC;
  const fee = (loserPool * BigInt(PLATFORM_FEE_BPS)) / 10000n;
  const net = loserPool - fee;
  const winnerPool = 250n * ONE_USDC;
  console.log(`    Alice  (YES $100): $${formatUSDC(100n * ONE_USDC + (100n * ONE_USDC * net) / winnerPool)}`);
  console.log(`    Charlie(YES $150): $${formatUSDC(150n * ONE_USDC + (150n * ONE_USDC * net) / winnerPool)}`);
  console.log(`    Bob    (NO  $200): $0 (lost)`);
  console.log(`    Platform fee: $${formatUSDC(fee)}`);

  const feeOK = platformFee === fee;
  console.log(`\n  Platform fee check: ${feeOK ? "PASS" : "FAIL"} (expected ${formatUSDC(fee)}, got ${formatUSDC(platformFee)})`);

  console.log(`\n  All Transactions:`);
  for (const { step: s, hash } of txLog) {
    console.log(`    ${s.padEnd(25)} ${txLink(hash)}`);
  }

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║          BASE SEPOLIA TESTNET E2E COMPLETE                    ║`);
  console.log(`║          Time: ${elapsed}s                                     ║`);
  console.log(`║          Fee check: ${feeOK ? "PASS" : "FAIL"}                                  ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);
}

main().catch((err) => {
  console.error("\nTestnet E2E flow failed:", err);
  process.exit(1);
});
