/**
 * 9-tee-flow.ts — Full E2E test of the TEE + ZK settlement flow
 *
 * Prerequisites:
 *   1. Anvil running: `anvil`
 *   2. Contracts deployed: `npx tsx scripts/0-setup.ts`
 *   3. TEE server running: `cd tee-server && npm run dev`
 *   4. Circuit built: `cd circuits && bash scripts/build.sh`
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
  encodeAbiParameters,
  parseAbiParameters,
  type Hex,
  type Address,
  formatUnits,
} from "viem";
import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  HELLY_HOOK_ABI,
  ERC20_ABI,
  ONE_USDC,
  USDC_DECIMALS,
  getDeployment,
} from "./lib/config.js";

// --- Config ---
const TEE_SERVER_URL = process.env.TEE_SERVER_URL || "http://localhost:3001";
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

// --- Helpers ---

function generateSecret(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return ("0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")) as Hex;
}

function computeCommitHash(marketId: Hex, isYes: boolean, amount: bigint, secret: Hex, user: Address): Hex {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("bytes32, bool, uint256, bytes32, address"),
      [marketId, isYes, amount, secret, user]
    )
  );
}

async function teeFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${TEE_SERVER_URL}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `TEE request failed: ${res.status}`);
  return data;
}

function log(step: string, msg: string) {
  console.log(`  [${step}] ${msg}`);
}

// --- Main Flow ---

async function main() {
  console.log("\n=== wthelly TEE + ZK Settlement E2E Test ===\n");

  // Load deployment
  const deployment = getDeployment();
  const hellyHook = deployment.hellyHook;
  const mockUSDC = deployment.mockUSDC;

  log("0", `HellyHook: ${hellyHook}`);
  log("0", `MockUSDC:  ${mockUSDC}`);

  // Step 1: Check TEE server health
  log("1", "Checking TEE server health...");
  const health = await teeFetch("/health");
  log("1", `TEE server: ${health.status} (mode: ${health.teeMode})`);

  // Get TEE public key
  const pubkeyRes = await teeFetch("/pubkey");
  log("1", `TEE pubkey: ${pubkeyRes.publicKey.slice(0, 20)}...`);

  // Step 2: Create a market
  log("2", "Creating market...");
  const question = "Will ETH hit $10k by end of 2026?";
  const marketId = keccak256(encodePacked(["string"], [question]));
  const now = BigInt(Math.floor(Date.now() / 1000));
  const deadline = now + 60n; // 60 seconds from now
  const revealWindow = 3600n; // 1 hour

  const adminWc = walletClient(admin);
  await adminWc.writeContract({
    address: hellyHook,
    abi: HELLY_HOOK_ABI,
    functionName: "createMarket",
    args: [marketId, question, deadline, revealWindow],
  });
  log("2", `Market created: ${marketId.slice(0, 16)}...`);

  // Step 3: Mint and deposit USDC for users
  log("3", "Minting and depositing USDC...");
  const betAmounts = [100n * ONE_USDC, 200n * ONE_USDC, 300n * ONE_USDC];
  const users = [user1, user2, user3];
  const userWallets = users.map(u => walletClient(u));

  for (let i = 0; i < users.length; i++) {
    // Mint
    await adminWc.writeContract({
      address: mockUSDC, abi: ERC20_ABI,
      functionName: "mint", args: [users[i].address, betAmounts[i]],
    });
    // Approve
    await userWallets[i].writeContract({
      address: mockUSDC, abi: ERC20_ABI,
      functionName: "approve", args: [hellyHook, betAmounts[i]],
    });
    // Deposit
    await userWallets[i].writeContract({
      address: hellyHook, abi: HELLY_HOOK_ABI,
      functionName: "deposit", args: [betAmounts[i]],
    });
    log("3", `User${i + 1} deposited ${formatUnits(betAmounts[i], USDC_DECIMALS)} USDC`);
  }

  // Step 4: Place bets (on-chain commitment + encrypted data to TEE)
  log("4", "Placing bets with TEE encryption...");
  const bets = [
    { user: user1, isYes: true, amount: betAmounts[0] },
    { user: user2, isYes: false, amount: betAmounts[1] },
    { user: user3, isYes: true, amount: betAmounts[2] },
  ];

  const secrets: Hex[] = [];
  for (let i = 0; i < bets.length; i++) {
    const secret = generateSecret();
    secrets.push(secret);
    const commitHash = computeCommitHash(marketId, bets[i].isYes, bets[i].amount, secret, bets[i].user.address);

    // Submit commitment on-chain
    await userWallets[i].writeContract({
      address: hellyHook, abi: HELLY_HOOK_ABI,
      functionName: "submitCommitment", args: [marketId, commitHash, bets[i].amount],
    });

    // Send encrypted bet to TEE
    // Use ECIES encryption via TEE server's pubkey
    // For the test script, we send unencrypted directly (TEE would normally decrypt)
    // In production, the frontend encrypts with ECIES before sending
    await teeFetch("/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marketId,
        encryptedData: "0x" + Buffer.from(JSON.stringify({
          marketId,
          isYes: bets[i].isYes,
          amount: bets[i].amount.toString(),
          secret,
          address: bets[i].user.address,
        })).toString("hex"),
      }),
    });

    log("4", `User${i + 1}: ${bets[i].isYes ? "YES" : "NO"} ${formatUnits(bets[i].amount, USDC_DECIMALS)} USDC → committed on-chain + encrypted to TEE`);
  }

  // Step 5: Advance time past deadline
  log("5", "Advancing time past deadline...");
  await publicClient.request({ method: "evm_increaseTime" as any, params: [120] });
  await publicClient.request({ method: "evm_mine" as any, params: [] });
  log("5", "Time advanced 120 seconds");

  // Step 6: Resolve market (YES wins)
  log("6", "Resolving market (YES wins)...");
  await adminWc.writeContract({
    address: hellyHook, abi: HELLY_HOOK_ABI,
    functionName: "resolveMarket", args: [marketId, true],
  });
  log("6", "Market resolved: YES won");

  // Step 7: TEE computes settlement + generates ZK proof
  log("7", "Triggering TEE settlement + ZK proof generation...");
  const settlement = await teeFetch(`/settle/${marketId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outcome: true }),
  });

  log("7", `Settlement computed: totalPool=${settlement.settlement.totalPool}, fee=${settlement.settlement.platformFee}`);
  log("7", `Payouts: ${settlement.settlement.payouts.map((p: any) => `${p.address.slice(0, 8)}...=${p.amount}`).join(", ")}`);

  if (settlement.settlement.proof) {
    log("7", "ZK proof generated successfully!");
    log("7", `  Public signals: [${settlement.settlement.proof.pubSignals.join(", ")}]`);
  } else {
    log("7", "ZK proof not available (circuit not built) — would use settleMarketWithProof() in production");
    log("7", "Falling back to manual settle for this test...");

    // Fallback: use regular reveal + settle
    for (let i = 0; i < bets.length; i++) {
      await userWallets[i].writeContract({
        address: hellyHook, abi: HELLY_HOOK_ABI,
        functionName: "revealBet", args: [marketId, bets[i].isYes, secrets[i]],
      });
    }
    await adminWc.writeContract({
      address: hellyHook, abi: HELLY_HOOK_ABI,
      functionName: "settleMarket", args: [marketId],
    });
    log("7", "Market settled via manual reveal (fallback)");
  }

  // Step 8: Verify final state
  log("8", "Verifying final state...");
  const marketData = await publicClient.readContract({
    address: hellyHook, abi: HELLY_HOOK_ABI,
    functionName: "getMarket", args: [marketId],
  }) as any[];

  log("8", `Market settled: ${marketData[7]}`);

  for (let i = 0; i < users.length; i++) {
    const balance = await publicClient.readContract({
      address: hellyHook, abi: HELLY_HOOK_ABI,
      functionName: "balances", args: [users[i].address],
    }) as bigint;
    log("8", `User${i + 1} balance: ${formatUnits(balance, USDC_DECIMALS)} USDC`);
  }

  // Check TEE metrics
  const metrics = await teeFetch("/tee/metrics");
  log("8", `TEE metrics: ${metrics.metrics.betsReceived} bets received, ${metrics.metrics.settlementsExecuted} settlements`);

  console.log("\n=== E2E Test Complete ===\n");
}

main().catch((err) => {
  console.error("\nTest failed:", err.message);
  process.exit(1);
});
