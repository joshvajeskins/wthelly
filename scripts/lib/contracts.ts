/**
 * Contract interaction helpers using viem.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  type Address,
  type Hex,
  type PublicClient,
  type Chain,
  type Transport,
  formatUnits,
} from "viem";
import { foundry, baseSepolia } from "viem/chains";
import { type PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import {
  ANVIL_RPC_URL,
  HELLY_HOOK_ABI,
  ERC20_ABI,
  USDC_DECIMALS,
  EXPLORER_BASE_URL,
  isTestnet,
  getRpcUrl,
  getDeployment,
} from "./config.js";

// --- Chain Helper ---

export function getChain(): Chain {
  return isTestnet() ? baseSepolia : foundry;
}

export function getExplorerTxUrl(hash: Hex): string {
  return `${EXPLORER_BASE_URL}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: Address): string {
  return `${EXPLORER_BASE_URL}/address/${address}`;
}

// --- Client Factories ---

let _publicClient: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: getChain(),
      transport: http(getRpcUrl()),
    });
  }
  return _publicClient;
}

// Cache wallet clients per private key to avoid nonce issues with Anvil automining
const _walletClients = new Map<string, ReturnType<typeof createWalletClient>>();

export function getWalletClient(privateKey: Hex) {
  if (!_walletClients.has(privateKey)) {
    const account = privateKeyToAccount(privateKey);
    _walletClients.set(
      privateKey,
      createWalletClient({
        account,
        chain: getChain(),
        transport: http(getRpcUrl()),
      })
    );
  }
  return _walletClients.get(privateKey)!;
}

// Helper to write contract and wait for receipt
async function writeAndWait(
  privateKey: Hex,
  params: {
    address: Address;
    abi: any;
    functionName: string;
    args?: any[];
  }
): Promise<Hex> {
  const account = privateKeyToAccount(privateKey);
  const client = getWalletClient(privateKey);
  const publicClient = getPublicClient();

  const hash = await client.writeContract({
    ...params,
    chain: getChain(),
    account,
  } as any);

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// --- HellyHook Interactions ---

export async function createMarket(
  adminKey: Hex,
  marketId: Hex,
  question: string,
  deadline: bigint,
  poolId: Hex,
  priceTarget: bigint,
  priceAbove: boolean
): Promise<Hex> {
  const { hellyHook } = getDeployment();
  return writeAndWait(adminKey, {
    address: hellyHook,
    abi: HELLY_HOOK_ABI,
    functionName: "createMarket",
    args: [marketId, question, deadline, poolId, priceTarget, priceAbove],
  });
}

export async function depositToHook(
  userKey: Hex,
  amount: bigint
): Promise<Hex> {
  const { hellyHook, mockUSDC } = getDeployment();

  // Approve
  await writeAndWait(userKey, {
    address: mockUSDC,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [hellyHook, amount],
  });

  // Deposit
  return writeAndWait(userKey, {
    address: hellyHook,
    abi: HELLY_HOOK_ABI,
    functionName: "deposit",
    args: [amount],
  });
}

export async function resolveMarket(
  adminKey: Hex,
  marketId: Hex,
  outcome: boolean
): Promise<Hex> {
  const { hellyHook } = getDeployment();
  return writeAndWait(adminKey, {
    address: hellyHook,
    abi: HELLY_HOOK_ABI,
    functionName: "resolveMarket",
    args: [marketId, outcome],
  });
}

export async function withdrawFromHook(
  userKey: Hex,
  amount: bigint
): Promise<Hex> {
  const { hellyHook } = getDeployment();
  return writeAndWait(userKey, {
    address: hellyHook,
    abi: HELLY_HOOK_ABI,
    functionName: "withdraw",
    args: [amount],
  });
}

// --- Read Functions ---

export async function getMarket(marketId: Hex) {
  const { hellyHook } = getDeployment();
  const client = getPublicClient();

  const result = await client.readContract({
    address: hellyHook,
    abi: HELLY_HOOK_ABI,
    functionName: "getMarket",
    args: [marketId],
  });

  const [
    question,
    deadline,
    resolved,
    outcome,
    totalYes,
    totalNo,
    settled,
  ] = result as [string, bigint, boolean, boolean, bigint, bigint, boolean];

  return {
    question,
    deadline,
    resolved,
    outcome,
    totalYes,
    totalNo,
    settled,
  };
}

export async function getBalance(user: Address): Promise<bigint> {
  const { hellyHook } = getDeployment();
  const client = getPublicClient();

  return (await client.readContract({
    address: hellyHook,
    abi: HELLY_HOOK_ABI,
    functionName: "balances",
    args: [user],
  })) as bigint;
}

export async function getUSDCBalance(user: Address): Promise<bigint> {
  const { mockUSDC } = getDeployment();
  const client = getPublicClient();

  return (await client.readContract({
    address: mockUSDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [user],
  })) as bigint;
}

export async function mintUSDC(
  adminKey: Hex,
  to: Address,
  amount: bigint
): Promise<Hex> {
  const { mockUSDC } = getDeployment();
  return writeAndWait(adminKey, {
    address: mockUSDC,
    abi: ERC20_ABI,
    functionName: "mint",
    args: [to, amount],
  });
}

// --- Deploy Helper ---

export async function deployContract(
  privateKey: Hex,
  abi: any,
  bytecode: Hex,
  args: any[] = []
): Promise<{ hash: Hex; address: Address }> {
  const account = privateKeyToAccount(privateKey);
  const client = getWalletClient(privateKey);
  const publicClient = getPublicClient();

  const hash = await client.deployContract({
    abi,
    bytecode,
    args,
    chain: getChain(),
    account,
  } as any);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, address: receipt.contractAddress! };
}

// --- ETH Transfer ---

export async function fundWithEth(
  fromKey: Hex,
  toAddress: Address,
  ethAmount: string
): Promise<Hex> {
  const account = privateKeyToAccount(fromKey);
  const client = getWalletClient(fromKey);
  const publicClient = getPublicClient();

  const hash = await client.sendTransaction({
    to: toAddress,
    value: parseEther(ethAmount),
    chain: getChain(),
    account,
  } as any);

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// --- Formatting ---

export function formatUSDC(amount: bigint): string {
  return formatUnits(amount, USDC_DECIMALS);
}
