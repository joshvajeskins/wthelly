/**
 * Account management — Anvil keys for local, env-based keys for testnet.
 * Never use Anvil keys on mainnet!
 */

import { type Hex } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

// --- Anvil defaults ---

export const ANVIL_PRIVATE_KEYS: Hex[] = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Account 0
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Account 1
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Account 2
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // Account 3
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // Account 4
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba", // Account 5
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e", // Account 6
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356", // Account 7
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97", // Account 8
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6", // Account 9
];

// --- Testnet key helpers ---

function getTestnetAdminKey(): Hex {
  const key = process.env.EVM_PRIVATE_KEY;
  if (!key) throw new Error("EVM_PRIVATE_KEY not set in .env");
  return key as Hex;
}

/**
 * Generate ephemeral test wallets for testnet runs.
 * These are random keys — admin must fund them with ETH before use.
 */
export function generateTestWallets(): { alice: Hex; bob: Hex; charlie: Hex } {
  return {
    alice: generatePrivateKey(),
    bob: generatePrivateKey(),
    charlie: generatePrivateKey(),
  };
}

// --- Named accounts (env-aware) ---

const _isTestnet = process.env.TESTNET === "true";

export const ADMIN_KEY: Hex = _isTestnet
  ? getTestnetAdminKey()
  : ANVIL_PRIVATE_KEYS[0];
export const ALICE_KEY: Hex = _isTestnet
  ? ANVIL_PRIVATE_KEYS[1] // placeholder — overridden by 8-testnet-flow.ts
  : ANVIL_PRIVATE_KEYS[1];
export const BOB_KEY: Hex = _isTestnet
  ? ANVIL_PRIVATE_KEYS[2]
  : ANVIL_PRIVATE_KEYS[2];
export const CHARLIE_KEY: Hex = _isTestnet
  ? ANVIL_PRIVATE_KEYS[3]
  : ANVIL_PRIVATE_KEYS[3];

export const adminAccount = privateKeyToAccount(ADMIN_KEY);
export const aliceAccount = privateKeyToAccount(ALICE_KEY);
export const bobAccount = privateKeyToAccount(BOB_KEY);
export const charlieAccount = privateKeyToAccount(CHARLIE_KEY);

export const ADMIN_ADDRESS = adminAccount.address;
export const ALICE_ADDRESS = aliceAccount.address;
export const BOB_ADDRESS = bobAccount.address;
export const CHARLIE_ADDRESS = charlieAccount.address;
