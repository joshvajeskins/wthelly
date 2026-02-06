/**
 * 9-tee-flow.ts — Full E2E test of the TEE + ZK settlement flow
 *
 * Prerequisites:
 *   1. Anvil running: `anvil` (or docker-compose up)
 *   2. TEE server running: `cd tee-server && npx tsx src/index.ts`
 *   3. Circuit built: `cd circuits && bash scripts/build.sh`
 *   4. Contracts built: `cd contracts && forge build`
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
import { secp256k1 } from "@noble/curves/secp256k1";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { gcm } from "@noble/ciphers/aes";
import { randomBytes } from "@noble/ciphers/webcrypto";
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

// Extended ABI for ZK settlement functions
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
    name: "settleMarketWithProof",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "payoutRecipients", type: "address[]" },
      { name: "payoutAmounts", type: "uint256[]" },
      { name: "platformFeeAmount", type: "uint256" },
      { name: "_pA", type: "uint256[2]" },
      { name: "_pB", type: "uint256[2][2]" },
      { name: "_pC", type: "uint256[2]" },
    ],
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

// Groth16Verifier ABI (minimal — just verifyProof)
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

// --- ECIES Helpers ---

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function eciesEncrypt(recipientPubKeyHex: string, plaintext: Uint8Array): string {
  const recipientPubKey = hexToBytes(recipientPubKeyHex);
  const ephemeralPrivKey = secp256k1.utils.randomPrivateKey();
  const ephemeralPubKey = secp256k1.getPublicKey(ephemeralPrivKey, false);
  const sharedPoint = secp256k1.getSharedSecret(ephemeralPrivKey, recipientPubKey);
  const sharedSecret = sharedPoint.slice(1, 33);
  const aesKey = hkdf(sha256, sharedSecret, undefined, "wthelly-ecies-v1", 32);
  const nonce = randomBytes(12);
  const cipher = gcm(aesKey, nonce);
  const ciphertext = cipher.encrypt(plaintext);
  const result = new Uint8Array(65 + 12 + ciphertext.length);
  result.set(ephemeralPubKey, 0);
  result.set(nonce, 65);
  result.set(ciphertext, 77);
  return bytesToHex(result);
}

// --- Other Helpers ---

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

function getContractBytecode(name: string): Hex {
  const contractsDir = join(__dirname, "../contracts");
  const artifactPath = join(contractsDir, `out/${name}.sol/${name}.json`);
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  return artifact.bytecode.object as Hex;
}

// --- Main Flow ---

async function main() {
  console.log("\n=== wthelly TEE + ZK Settlement E2E Test ===\n");

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

  // Deploy HellyHook
  const hookHash = await adminWc.deployContract({
    abi: EXTENDED_ABI, bytecode: getContractBytecode("HellyHook"),
    args: [mockUSDC, BigInt(PLATFORM_FEE_BPS)],
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

  // Step 1: Check TEE server health
  log("1", "Checking TEE server health...");
  const health = await teeFetch("/health");
  log("1", `TEE server: ${health.status} (mode: ${health.teeMode})`);

  const pubkeyRes = await teeFetch("/pubkey");
  const teePubKey = pubkeyRes.publicKey;
  log("1", `TEE pubkey: ${teePubKey.slice(0, 20)}...`);

  // Step 2: Create a market
  log("2", "Creating market...");
  const question = "Will ETH hit $10k by end of 2026?";
  const marketId = keccak256(encodePacked(["string"], [question]));
  // Use block timestamp (not Date.now) since Anvil time may drift from evm_increaseTime
  const block = await publicClient.getBlock();
  const now = block.timestamp;
  const deadline = now + 120n; // 2 minutes from block time
  const revealWindow = 3600n;

  await adminWc.writeContract({
    address: hellyHook, abi: EXTENDED_ABI,
    functionName: "createMarket", args: [marketId, question, deadline, revealWindow],
  });
  log("2", `Market created: ${marketId.slice(0, 16)}...`);

  // Step 3: Mint and deposit USDC for users
  log("3", "Minting and depositing USDC...");
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
    log("3", `User${i + 1} deposited ${formatUnits(betAmounts[i], USDC_DECIMALS)} USDC`);
  }

  // Step 4: Place bets (on-chain commitment + ECIES-encrypted data to TEE)
  log("4", "Placing bets with ECIES encryption...");
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
      address: hellyHook, abi: EXTENDED_ABI,
      functionName: "submitCommitment", args: [marketId, commitHash, bets[i].amount],
    });

    // ECIES-encrypt bet data and send to TEE
    const betPayload = JSON.stringify({
      marketId,
      isYes: bets[i].isYes,
      amount: bets[i].amount.toString(),
      secret,
      address: bets[i].user.address,
    });
    const encryptedData = eciesEncrypt(teePubKey, new TextEncoder().encode(betPayload));

    await teeFetch("/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketId, encryptedData }),
    });

    log("4", `User${i + 1}: ${bets[i].isYes ? "YES" : "NO"} ${formatUnits(bets[i].amount, USDC_DECIMALS)} USDC → committed on-chain + ECIES-encrypted to TEE`);
  }

  // Step 5: Advance time past deadline
  log("5", "Advancing time past deadline...");
  await publicClient.request({ method: "evm_increaseTime" as any, params: [120] });
  await publicClient.request({ method: "evm_mine" as any, params: [] });
  log("5", "Time advanced 120 seconds");

  // Step 6: Resolve market (YES wins)
  log("6", "Resolving market (YES wins)...");
  await adminWc.writeContract({
    address: hellyHook, abi: EXTENDED_ABI,
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

  const s = settlement.settlement;
  log("7", `Settlement computed: totalPool=${s.totalPool}, fee=${s.platformFee}`);
  log("7", `Payouts: ${s.payouts.map((p: any) => `${p.address.slice(0, 8)}...=${p.amount}`).join(", ")}`);

  if (s.proof) {
    log("7", "ZK proof generated! Submitting settleMarketWithProof on-chain...");
    log("7", `  Public signals: [${s.proof.pubSignals.join(", ")}]`);

    // Build proof parameters for on-chain settlement
    const recipients = s.payouts
      .filter((p: any) => BigInt(p.amount) > 0n)
      .map((p: any) => p.address as Address);
    const amounts = s.payouts
      .filter((p: any) => BigInt(p.amount) > 0n)
      .map((p: any) => BigInt(p.amount));

    const pA: [bigint, bigint] = [BigInt(s.proof.pA[0]), BigInt(s.proof.pA[1])];
    const pB: [[bigint, bigint], [bigint, bigint]] = [
      [BigInt(s.proof.pB[0][0]), BigInt(s.proof.pB[0][1])],
      [BigInt(s.proof.pB[1][0]), BigInt(s.proof.pB[1][1])],
    ];
    const pC: [bigint, bigint] = [BigInt(s.proof.pC[0]), BigInt(s.proof.pC[1])];

    // Submit on-chain — admin acts as TEE
    const txHash = await adminWc.writeContract({
      address: hellyHook, abi: EXTENDED_ABI,
      functionName: "settleMarketWithProof",
      args: [marketId, recipients, amounts, BigInt(s.platformFee), pA, pB, pC],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    log("7", `settleMarketWithProof TX: ${txHash.slice(0, 16)}...`);
    log("7", "Market settled with ZK proof — bet directions NEVER revealed on-chain!");
  } else {
    log("7", "ZK proof not available (circuit not built) — falling back to manual settle...");

    for (let i = 0; i < bets.length; i++) {
      await userWallets[i].writeContract({
        address: hellyHook, abi: EXTENDED_ABI,
        functionName: "revealBet", args: [marketId, bets[i].isYes, secrets[i]],
      });
    }
    await adminWc.writeContract({
      address: hellyHook, abi: EXTENDED_ABI,
      functionName: "settleMarket", args: [marketId],
    });
    log("7", "Market settled via manual reveal (fallback)");
  }

  // Step 8: Verify final state
  log("8", "Verifying final state...");
  const marketData = await publicClient.readContract({
    address: hellyHook, abi: EXTENDED_ABI,
    functionName: "getMarket", args: [marketId],
  }) as any[];

  log("8", `Market settled: ${marketData[7]}`);

  for (let i = 0; i < users.length; i++) {
    const balance = await publicClient.readContract({
      address: hellyHook, abi: EXTENDED_ABI,
      functionName: "balances", args: [users[i].address],
    }) as bigint;
    const won = bets[i].isYes ? "WINNER" : "LOSER";
    log("8", `User${i + 1} (${won}): ${formatUnits(balance, USDC_DECIMALS)} USDC`);
  }

  // Verify admin fee
  const adminBalance = await publicClient.readContract({
    address: hellyHook, abi: EXTENDED_ABI,
    functionName: "balances", args: [admin.address],
  }) as bigint;
  log("8", `Admin (platform fee): ${formatUnits(adminBalance, USDC_DECIMALS)} USDC`);

  // Check TEE metrics
  const metrics = await teeFetch("/tee/metrics");
  log("8", `TEE metrics: ${metrics.metrics.betsReceived} bets received, ${metrics.metrics.betsDecrypted} decrypted, ${metrics.metrics.settlementsExecuted} settlements, ${metrics.metrics.proofsGenerated} proofs`);

  console.log("\n=== TEE + ZK E2E Test Complete ===\n");
}

main().catch((err) => {
  console.error("\nTest failed:", err.message || err);
  process.exit(1);
});
