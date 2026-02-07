/**
 * Deploy ERC-7824 Custody + Dummy Adjudicator on Unichain Sepolia
 *
 * Reads compiled artifacts from nitrolite/contract/out/ and deploys via viem.
 * Saves deployed addresses to scripts/lib/custody-deployment.json.
 *
 * Run: npx tsx scripts/deploy-custody.ts
 * Prerequisites:
 *   - forge build in nitrolite/contract/
 *   - .env with EVM_PRIVATE_KEY and TESTNET_RPC_URL
 *   - Optional: BROKER_PRIVATE_KEY for Clearnode broker funding
 */

import "dotenv/config";

process.env.TESTNET = "true";

import {
  type Hex,
  type Address,
  formatEther,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { execSync } from "child_process";
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { ADMIN_KEY, ADMIN_ADDRESS } from "./lib/accounts.js";
import { getRpcUrl, EXPLORER_BASE_URL } from "./lib/config.js";
import {
  getPublicClient,
  getWalletClient,
  deployContract,
  fundWithEth,
  getExplorerTxUrl,
  getExplorerAddressUrl,
} from "./lib/contracts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getNitroliteContractBytecode(contractName: string, solFile: string): Hex {
  const artifactPath = join(
    __dirname,
    `../nitrolite/contract/out/${solFile}/${contractName}.json`
  );
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  return artifact.bytecode.object as Hex;
}

async function main() {
  const publicClient = getPublicClient();

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Deploy ERC-7824 Custody + Dummy Adjudicator            ║");
  console.log("║  Chain: Unichain Sepolia (1301)                         ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\nRPC: ${getRpcUrl()}`);
  console.log(`Admin: ${ADMIN_ADDRESS}`);

  // Check balance
  const adminBalance = await publicClient.getBalance({ address: ADMIN_ADDRESS });
  console.log(`Admin ETH: ${formatEther(adminBalance)}`);
  if (adminBalance < parseEther("0.02")) {
    console.error("ERROR: Need at least 0.02 ETH for deployment");
    process.exit(1);
  }

  // Build nitrolite contracts
  console.log("\n  Building nitrolite contracts (via_ir=true)...");
  execSync("forge build", {
    cwd: join(__dirname, "../nitrolite/contract"),
    stdio: "pipe",
  });
  console.log("  Build complete.");

  // Deploy Custody
  console.log("\n  Deploying Custody.sol...");
  const custodyBytecode = getNitroliteContractBytecode("Custody", "Custody.sol");
  const custody = await deployContract(ADMIN_KEY, [], custodyBytecode);
  console.log(`  Custody: ${custody.address}`);
  console.log(`  TX: ${getExplorerTxUrl(custody.hash)}`);

  // Deploy Dummy Adjudicator
  console.log("\n  Deploying Dummy Adjudicator...");
  const dummyBytecode = getNitroliteContractBytecode("Dummy", "Dummy.sol");
  const dummy = await deployContract(ADMIN_KEY, [], dummyBytecode);
  console.log(`  Dummy Adjudicator: ${dummy.address}`);
  console.log(`  TX: ${getExplorerTxUrl(dummy.hash)}`);

  // Optionally deploy BalanceChecker
  console.log("\n  Deploying BalanceChecker...");
  const balanceCheckerBytecode = getNitroliteContractBytecode("BalanceChecker", "BalanceChecker.sol");
  const balanceChecker = await deployContract(ADMIN_KEY, [], balanceCheckerBytecode);
  console.log(`  BalanceChecker: ${balanceChecker.address}`);
  console.log(`  TX: ${getExplorerTxUrl(balanceChecker.hash)}`);

  // Broker uses same key as admin (EVM_PRIVATE_KEY)
  const brokerAddress = ADMIN_ADDRESS;
  console.log(`\n  Broker wallet (same as admin): ${brokerAddress}`);

  // Save deployment
  const deployment = {
    custody: custody.address,
    adjudicator: dummy.address,
    balanceChecker: balanceChecker.address,
    broker: brokerAddress || null,
    usdc: "0xd8f50a509efe389574dd378b0ef03e33558222ea",
    deployer: ADMIN_ADDRESS,
    chainId: 1301,
    timestamp: new Date().toISOString(),
  };

  const outputPath = join(__dirname, "lib/custody-deployment.json");
  writeFileSync(outputPath, JSON.stringify(deployment, null, 2));
  console.log(`\n  Deployment saved to ${outputPath}`);

  // Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log("  ERC-7824 DEPLOYMENT SUMMARY");
  console.log(`${"═".repeat(60)}`);
  console.log(`  Custody:        ${custody.address}`);
  console.log(`                  ${getExplorerAddressUrl(custody.address)}`);
  console.log(`  Adjudicator:    ${dummy.address}`);
  console.log(`                  ${getExplorerAddressUrl(dummy.address)}`);
  console.log(`  BalanceChecker: ${balanceChecker.address}`);
  console.log(`                  ${getExplorerAddressUrl(balanceChecker.address)}`);
  if (brokerAddress) {
    console.log(`  Broker:         ${brokerAddress}`);
    console.log(`                  ${getExplorerAddressUrl(brokerAddress)}`);
  }
  console.log(`\n  Update these addresses in:`);
  console.log(`    - nitrolite/clearnode/config/compose/unichain-sepolia/blockchains.yaml`);
  console.log(`    - frontend/src/config/constants.ts`);
}

main().catch((err) => {
  console.error("\nDeployment failed:", err);
  process.exit(1);
});
