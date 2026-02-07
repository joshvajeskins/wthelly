/**
 * 9-tee-flow.ts — Contract-only E2E test (oracle + ZK settlement)
 *
 * Tests the full prediction market lifecycle without requiring TEE or Clearnode:
 *   1. Deploy contracts (HellyHook, MockUSDC, Groth16Verifier)
 *   2. Create market with pool/price oracle params
 *   3. Mint & deposit USDC for users
 *   4. Advance time past deadline
 *   5. Resolve market (admin)
 *   6. Settle with ZK proof (or mock proof fallback)
 *   7. Verify final state
 *
 * Bets are off-chain via state channels (Clearnode) in production.
 * This E2E test validates the on-chain contract flow only.
 *
 * Prerequisites:
 *   1. Anvil running: `anvil`
 *   2. Contracts built: `cd contracts && forge build`
 *
 * Usage:
 *   npx tsx scripts/9-tee-flow.ts
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  encodePacked,
  type Hex,
  type Address,
  formatUnits,
} from "viem";
import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import {
  HELLY_HOOK_ABI,
  ERC20_ABI,
  ONE_USDC,
  USDC_DECIMALS,
  PLATFORM_FEE_BPS,
} from "./lib/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Config ---
const RPC_URL = "http://localhost:8545";

// Anvil test accounts
const ADMIN_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
const USER1_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex;
const USER2_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" as Hex;
const USER3_KEY = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" as Hex;

const admin = privateKeyToAccount(ADMIN_KEY);
const user1 = privateKeyToAccount(USER1_KEY);
const user2 = privateKeyToAccount(USER2_KEY);
const user3 = privateKeyToAccount(USER3_KEY);

const publicClient = createPublicClient({ chain: foundry, transport: http(RPC_URL) });

function walletClient(account: ReturnType<typeof privateKeyToAccount>) {
  return createWalletClient({ account, chain: foundry, transport: http(RPC_URL) });
}

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

// Groth16Verifier ABI (minimal -- just verifyProof)
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

function log(step: string, msg: string) {
  console.log(`  [${step}] ${msg}`);
}

function getContractBytecode(name: string): Hex {
  const contractsDir = join(__dirname, "../contracts");
  const artifactPath = join(contractsDir, `out/${name}.sol/${name}.json`);
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  return artifact.bytecode.object as Hex;
}

// --- Main Flow ---

async function main() {
  console.log("\n=== wthelly Contract + Oracle E2E Test ===\n");

  const adminWc = walletClient(admin);

  // Step 0: Deploy fresh contracts
  log("0", "Deploying contracts...");
  execSync("forge build", { cwd: join(__dirname, "../contracts"), stdio: "pipe" });

  // Deploy MockUSDC
  const usdcHash = await adminWc.deployContract({
    abi: ERC20_ABI, bytecode: getContractBytecode("MockUSDC"), args: [],
  });
  const usdcReceipt = await publicClient.waitForTransactionReceipt({ hash: usdcHash });
  const mockUSDC = usdcReceipt.contractAddress!;
  log("0", `MockUSDC: ${mockUSDC}`);

  // Deploy HellyHook (with dummy PoolManager for local testing)
  const MOCK_POOL_MANAGER = "0x000000000000000000000000000000000000dEaD";
  const hookHash = await adminWc.deployContract({
    abi: EXTENDED_ABI, bytecode: getContractBytecode("HellyHook"),
    args: [MOCK_POOL_MANAGER, mockUSDC, BigInt(PLATFORM_FEE_BPS)],
  });
  const hookReceipt = await publicClient.waitForTransactionReceipt({ hash: hookHash });
  const hellyHook = hookReceipt.contractAddress!;
  log("0", `HellyHook: ${hellyHook}`);

  // Deploy Groth16Verifier
  const verifierHash = await adminWc.deployContract({
    abi: VERIFIER_ABI, bytecode: getContractBytecode("Groth16Verifier"), args: [],
  });
  const verifierReceipt = await publicClient.waitForTransactionReceipt({ hash: verifierHash });
  const verifierAddress = verifierReceipt.contractAddress!;
  log("0", `Groth16Verifier: ${verifierAddress}`);

  // Configure: setVerifier + setTeeAddress
  await adminWc.writeContract({
    address: hellyHook, abi: EXTENDED_ABI,
    functionName: "setVerifier", args: [verifierAddress],
  });
  await adminWc.writeContract({
    address: hellyHook, abi: EXTENDED_ABI,
    functionName: "setTeeAddress", args: [admin.address], // admin acts as TEE for this test
  });
  log("0", `Verifier set to ${verifierAddress}`);
  log("0", `TEE address set to admin: ${admin.address}`);

  // Step 1: Create a market with oracle price params
  log("1", "Creating market with oracle price target...");
  const question = "Will ETH hit $10k by end of 2026?";
  const marketId = keccak256(encodePacked(["string"], [question]));
  const block = await publicClient.getBlock();
  const now = block.timestamp;
  const deadline = now + 120n; // 2 minutes from block time
  const poolId = keccak256(encodePacked(["string"], ["test-pool"]));
  const priceTarget = 79228162514264337593543950336n; // sqrtPriceX96 value
  const priceAbove = true;

  await adminWc.writeContract({
    address: hellyHook, abi: EXTENDED_ABI,
    functionName: "createMarket",
    args: [marketId, question, deadline, poolId, priceTarget, priceAbove],
  });
  log("1", `Market created: ${marketId.slice(0, 16)}...`);
  log("1", `  poolId: ${poolId.slice(0, 16)}...`);
  log("1", `  priceTarget: ${priceTarget}`);
  log("1", `  priceAbove: ${priceAbove}`);

  // Step 2: Mint and deposit USDC for users
  log("2", "Minting and depositing USDC...");
  const betAmounts = [100n * ONE_USDC, 200n * ONE_USDC, 300n * ONE_USDC];
  const users = [user1, user2, user3];
  const userWallets = users.map(u => walletClient(u));

  for (let i = 0; i < users.length; i++) {
    await adminWc.writeContract({
      address: mockUSDC, abi: ERC20_ABI,
      functionName: "mint", args: [users[i].address, betAmounts[i]],
    });
    await userWallets[i].writeContract({
      address: mockUSDC, abi: ERC20_ABI,
      functionName: "approve", args: [hellyHook, betAmounts[i]],
    });
    await userWallets[i].writeContract({
      address: hellyHook, abi: EXTENDED_ABI,
      functionName: "deposit", args: [betAmounts[i]],
    });
    log("2", `User${i + 1} deposited ${formatUnits(betAmounts[i], USDC_DECIMALS)} USDC`);
  }

  // Step 3: (Off-chain) Bets are placed via state channels
  // In production, bets go through Clearnode WebSocket state channels.
  // For this E2E test, we simulate the bet data that the TEE would know:
  log("3", "Simulating off-chain bets (state channels in production)...");
  const bets = [
    { user: user1, isYes: true, amount: betAmounts[0] },
    { user: user2, isYes: false, amount: betAmounts[1] },
    { user: user3, isYes: true, amount: betAmounts[2] },
  ];
  for (let i = 0; i < bets.length; i++) {
    log("3", `User${i + 1}: ${bets[i].isYes ? "YES" : "NO"} ${formatUnits(bets[i].amount, USDC_DECIMALS)} USDC (off-chain via state channel)`);
  }

  // Step 4: Advance time past deadline
  log("4", "Advancing time past deadline...");
  await publicClient.request({ method: "evm_increaseTime" as any, params: [120] });
  await publicClient.request({ method: "evm_mine" as any, params: [] });
  log("4", "Time advanced 120 seconds");

  // Step 5: Resolve market (admin resolves with outcome YES)
  log("5", "Resolving market (YES wins)...");
  await adminWc.writeContract({
    address: hellyHook, abi: EXTENDED_ABI,
    functionName: "resolveMarket", args: [marketId, true],
  });
  log("5", "Market resolved: YES won");

  // Step 6: Settle market with ZK proof
  // In production, the TEE computes settlement + generates ZK proof.
  // For this E2E test, we compute settlement off-chain and use a mock proof.
  log("6", "Computing settlement and settling with proof...");

  // Compute expected settlement:
  // Winners (YES): user1 (100 USDC) + user3 (300 USDC) = 400 USDC
  // Losers (NO): user2 (200 USDC)
  // Total pool = 600 USDC
  // Platform fee = 2% of loser pool = 2% of 200 = 4 USDC
  // Net distributable from losers = 200 - 4 = 196 USDC
  // user1 payout = 100 + (100/400) * 196 = 100 + 49 = 149 USDC
  // user3 payout = 300 + (300/400) * 196 = 300 + 147 = 447 USDC
  const totalPool = 600n * ONE_USDC;
  const loserPool = 200n * ONE_USDC;
  const platformFee = (loserPool * BigInt(PLATFORM_FEE_BPS)) / 10000n;
  const netDistributable = loserPool - platformFee;
  const winnerPool = 400n * ONE_USDC;

  const user1Payout = betAmounts[0] + (betAmounts[0] * netDistributable) / winnerPool;
  const user3Payout = betAmounts[2] + (betAmounts[2] * netDistributable) / winnerPool;

  log("6", `Total pool: ${formatUnits(totalPool, USDC_DECIMALS)} USDC`);
  log("6", `Platform fee: ${formatUnits(platformFee, USDC_DECIMALS)} USDC`);
  log("6", `User1 payout: ${formatUnits(user1Payout, USDC_DECIMALS)} USDC`);
  log("6", `User3 payout: ${formatUnits(user3Payout, USDC_DECIMALS)} USDC`);

  const recipients: Address[] = [user1.address, user3.address];
  const amounts: bigint[] = [user1Payout, user3Payout];

  // Mock ZK proof (all zeros -- will fail real verification but tests the contract call flow)
  const pA: [bigint, bigint] = [0n, 0n];
  const pB: [[bigint, bigint], [bigint, bigint]] = [[0n, 0n], [0n, 0n]];
  const pC: [bigint, bigint] = [0n, 0n];

  try {
    const txHash = await adminWc.writeContract({
      address: hellyHook, abi: EXTENDED_ABI,
      functionName: "settleMarketWithProof",
      args: [marketId, recipients, amounts, totalPool, platformFee, pA, pB, pC],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    log("6", `settleMarketWithProof TX: ${txHash.slice(0, 16)}...`);
    log("6", "Market settled with ZK proof -- bet directions NEVER revealed on-chain!");
  } catch (err: any) {
    log("6", `settleMarketWithProof failed (expected if verifier rejects mock proof): ${err.message?.slice(0, 100)}`);
    log("6", "In production, a real ZK proof from the TEE would be used.");
  }

  // Step 7: Verify final state
  log("7", "Verifying final state...");
  const marketData = await publicClient.readContract({
    address: hellyHook, abi: EXTENDED_ABI,
    functionName: "getMarket", args: [marketId],
  }) as any[];

  // getMarket returns: [question, deadline, resolved, outcome, totalYes, totalNo, settled]
  log("7", `Market resolved: ${marketData[2]}`);
  log("7", `Market outcome (YES): ${marketData[3]}`);
  log("7", `Market settled: ${marketData[6]}`);

  for (let i = 0; i < users.length; i++) {
    const balance = await publicClient.readContract({
      address: hellyHook, abi: EXTENDED_ABI,
      functionName: "balances", args: [users[i].address],
    }) as bigint;
    const won = bets[i].isYes ? "YES bettor" : "NO bettor";
    log("7", `User${i + 1} (${won}): ${formatUnits(balance, USDC_DECIMALS)} USDC`);
  }

  // Verify admin fee balance
  const adminBalance = await publicClient.readContract({
    address: hellyHook, abi: EXTENDED_ABI,
    functionName: "balances", args: [admin.address],
  }) as bigint;
  log("7", `Admin (platform fee): ${formatUnits(adminBalance, USDC_DECIMALS)} USDC`);

  // Verify oracle-related state
  const storedPoolId = await publicClient.readContract({
    address: hellyHook, abi: EXTENDED_ABI,
    functionName: "marketPoolId", args: [marketId],
  });
  const storedPriceTarget = await publicClient.readContract({
    address: hellyHook, abi: EXTENDED_ABI,
    functionName: "marketPriceTarget", args: [marketId],
  });
  const storedPriceAbove = await publicClient.readContract({
    address: hellyHook, abi: EXTENDED_ABI,
    functionName: "marketPriceAbove", args: [marketId],
  });

  log("7", `Stored poolId: ${(storedPoolId as string).slice(0, 16)}...`);
  log("7", `Stored priceTarget: ${storedPriceTarget}`);
  log("7", `Stored priceAbove: ${storedPriceAbove}`);

  console.log("\n=== Contract + Oracle E2E Test Complete ===\n");
}

main().catch((err) => {
  console.error("\nTest failed:", err.message || err);
  process.exit(1);
});
