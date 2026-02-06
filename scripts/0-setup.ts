/**
 * Script 0: Setup
 * - Verify Anvil is running
 * - Deploy MockUSDC + HellyHook to Anvil
 * - Initialize database schema
 * - Save deployment info
 */

import { createPublicClient, http, type Hex } from "viem";
import { foundry } from "viem/chains";
import { execSync, execFileSync } from "child_process";
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ANVIL_RPC_URL, HELLY_HOOK_ABI, ERC20_ABI, PLATFORM_FEE_BPS } from "./lib/config.js";
import { ADMIN_KEY, ADMIN_ADDRESS } from "./lib/accounts.js";
import { getPublicClient, deployContract } from "./lib/contracts.js";
import { initSchema, closePool } from "./lib/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getContractBytecode(contractName: string): Hex {
  const contractsDir = join(__dirname, "../contracts");
  try {
    execSync("forge build", { cwd: contractsDir, stdio: "pipe" });
  } catch {
    // Already built
  }

  const artifactPath = join(contractsDir, `out/${contractName}.sol/${contractName}.json`);
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  return artifact.bytecode.object as Hex;
}

async function main() {
  console.log("=== WTHELLY Setup ===\n");

  // Step 1: Verify Anvil
  console.log("1. Verifying Anvil is running...");
  const publicClient = getPublicClient();

  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`  Anvil is running at ${ANVIL_RPC_URL}, block #${blockNumber}`);
  } catch {
    console.error("  ERROR: Anvil is not running. Start it with: cd nitrolite && docker-compose up -d");
    process.exit(1);
  }

  // Step 2: Deploy contracts
  console.log("\n2. Deploying contracts...");

  console.log("  Deploying MockUSDC...");
  const mockUSDC = await deployContract(ADMIN_KEY, ERC20_ABI, getContractBytecode("MockUSDC"));
  console.log(`  MockUSDC deployed at: ${mockUSDC.address}`);

  console.log("  Deploying HellyHook...");
  const hellyHook = await deployContract(
    ADMIN_KEY,
    HELLY_HOOK_ABI,
    getContractBytecode("HellyHook"),
    [mockUSDC.address, BigInt(PLATFORM_FEE_BPS)]
  );
  console.log(`  HellyHook deployed at: ${hellyHook.address}`);

  // Step 3: Initialize database schema
  console.log("\n3. Initializing database schema...");
  try {
    await initSchema();
    console.log("  Database schema initialized successfully");
  } catch (err: any) {
    console.warn(`  Database warning: ${err.message}`);
    console.warn("  (This is OK if Postgres is not running — DB is optional for contract-only testing)");
  }

  // Step 4: Save deployment info
  console.log("\n4. Saving deployment info...");
  const deployment = {
    hellyHook: hellyHook.address,
    mockUSDC: mockUSDC.address,
    deployer: ADMIN_ADDRESS,
    chainId: 31337,
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = join(__dirname, "lib/deployment.json");
  writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`  Saved to ${deploymentPath}`);

  // Step 5: Verify deployment
  console.log("\n5. Verifying deployment...");
  const admin = await publicClient.readContract({
    address: hellyHook.address,
    abi: HELLY_HOOK_ABI,
    functionName: "admin",
  });
  const usdc = await publicClient.readContract({
    address: hellyHook.address,
    abi: HELLY_HOOK_ABI,
    functionName: "usdc",
  });
  const feeBps = await publicClient.readContract({
    address: hellyHook.address,
    abi: HELLY_HOOK_ABI,
    functionName: "platformFeeBps",
  });

  console.log(`  Admin: ${admin}`);
  console.log(`  USDC: ${usdc}`);
  console.log(`  Platform Fee: ${feeBps} bps (${Number(feeBps as bigint) / 100}%)`);

  console.log("\n=== Setup Complete ===");

  await closePool();
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});

