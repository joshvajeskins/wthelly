/**
 * Configuration — addresses, ABIs, constants.
 * HellyHook and MockUSDC addresses are populated by the setup script.
 */

import { type Hex, type Address } from "viem";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Deployment Info (written by 0-setup.ts) ---
export interface DeploymentInfo {
  hellyHook: Address;
  mockUSDC: Address;
  deployer: Address;
  chainId: number;
  timestamp: string;
}

const DEPLOYMENT_FILE = join(__dirname, "deployment.json");

export function getDeployment(): DeploymentInfo {
  if (!existsSync(DEPLOYMENT_FILE)) {
    throw new Error(
      "Deployment not found. Run `npx tsx scripts/0-setup.ts` first."
    );
  }
  return JSON.parse(readFileSync(DEPLOYMENT_FILE, "utf-8"));
}

// --- Custody Deployment Info (written by deploy-custody.ts) ---
export interface CustodyDeploymentInfo {
  custody: Address;
  adjudicator: Address;
  balanceChecker: Address;
  broker: Address | null;
  usdc: Address;
  deployer: Address;
  chainId: number;
  timestamp: string;
}

const CUSTODY_DEPLOYMENT_FILE = join(__dirname, "custody-deployment.json");

export function getCustodyDeployment(): CustodyDeploymentInfo {
  if (!existsSync(CUSTODY_DEPLOYMENT_FILE)) {
    throw new Error(
      "Custody deployment not found. Run `npx tsx scripts/deploy-custody.ts` first."
    );
  }
  return JSON.parse(readFileSync(CUSTODY_DEPLOYMENT_FILE, "utf-8"));
}

// --- ERC-7824 Contracts (deployed on Unichain Sepolia) ---
export const CUSTODY_CONTRACTS = {
  Custody: "0xbc971a5be98ee37bdb82ca3e79f8e592dfcf0865" as Address,
  Adjudicator: "0xc3a95ef6a26d309e4fa40f211d0892571a92096f" as Address,
  BalanceChecker: "0x87da1de8bedc98bfe27eddf3dcfca8bebc2425b3" as Address,
  USDC: "0xd8f50a509efe389574dd378b0ef03e33558222ea" as Address,
} as const;

// --- Environment Helpers ---
export function isTestnet(): boolean {
  return process.env.TESTNET === "true";
}

export function getRpcUrl(): string {
  if (isTestnet()) {
    const url = process.env.TESTNET_RPC_URL;
    if (!url) throw new Error("TESTNET_RPC_URL not set in .env");
    return url;
  }
  return "http://localhost:8545";
}

export function getChainId(): number {
  return isTestnet() ? 1301 : 31337;
}

export const EXPLORER_BASE_URL = "https://sepolia.uniscan.xyz";

// --- Chain Config (backward compatible defaults) ---
export const ANVIL_RPC_URL = "http://localhost:8545";
export const ANVIL_WS_URL = "ws://localhost:8545";
export const CLEARNODE_WS_URL = "ws://localhost:8000/ws";
export const POSTGRES_URL =
  "postgresql://postgres:postgres@localhost:5432/postgres";
export const CHAIN_ID = 31337;

// --- Platform Constants ---
export const PLATFORM_FEE_BPS = 200; // 2%
export const USDC_DECIMALS = 6;
export const ONE_USDC = BigInt(1e6);

// --- HellyHook ABI ---
export const HELLY_HOOK_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_poolManager", type: "address" },
      { name: "_usdc", type: "address" },
      { name: "_platformFeeBps", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "admin",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "usdc",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "platformFeeBps",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "marketExists",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createMarket",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "question", type: "string" },
      { name: "deadline", type: "uint256" },
      { name: "poolId", type: "bytes32" },
      { name: "priceTarget", type: "uint160" },
      { name: "priceAbove", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolveMarket",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "outcome", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolveMarketFromOracle",
    inputs: [{ name: "marketId", type: "bytes32" }],
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
      { name: "totalPool", type: "uint256" },
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
    name: "getMarket",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [
      { name: "question", type: "string" },
      { name: "deadline", type: "uint256" },
      { name: "resolved", type: "bool" },
      { name: "outcome", type: "bool" },
      { name: "totalYes", type: "uint256" },
      { name: "totalNo", type: "uint256" },
      { name: "settled", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lastSqrtPriceX96",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ type: "uint160" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "marketPoolId",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "marketPriceTarget",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ type: "uint160" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "marketPriceAbove",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lastPriceTimestamp",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  // Events
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "question", type: "string", indexed: false },
      { name: "deadline", type: "uint256", indexed: false },
      { name: "poolId", type: "bytes32", indexed: false },
      { name: "priceTarget", type: "uint160", indexed: false },
      { name: "priceAbove", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MarketResolved",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "outcome", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MarketSettled",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "totalPayout", type: "uint256", indexed: false },
      { name: "platformFee", type: "uint256", indexed: false },
      { name: "winners", type: "uint256", indexed: false },
      { name: "losers", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PriceUpdated",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "sqrtPriceX96", type: "uint160", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MarketSettledWithProof",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "totalPool", type: "uint256", indexed: false },
      { name: "platformFee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PayoutClaimed",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "bettor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

// --- MockUSDC / ERC20 ABI (minimal) ---
export const ERC20_ABI = [
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
] as const;

// --- Custody ABI (ERC-7824) ---
export const CUSTODY_ABI = [
  {
    type: "function",
    name: "deposit",
    inputs: [
      { name: "account", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAccountsBalances",
    inputs: [
      { name: "accounts", type: "address[]" },
      { name: "tokens", type: "address[]" },
    ],
    outputs: [{ type: "uint256[][]" }],
    stateMutability: "view",
  },
] as const;
