/**
 * On-chain client for interacting with HellyHook on Unichain Sepolia.
 *
 * Wraps viem publicClient + walletClient using the TEE's private key
 * so the server can read market state and submit ZK-proof settlements.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type PublicClient,
  type WalletClient,
  type Chain,
  type Log,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bytesToHex } from '@noble/hashes/utils';
import type { TeeAttestationService } from './tee-attestation.js';
import { config } from './config.js';

// Minimal ABI fragments for HellyHook interaction
const hellyHookAbi = parseAbi([
  'function getMarket(bytes32 marketId) external view returns (string question, uint256 deadline, bool resolved, bool outcome, uint256 totalYes, uint256 totalNo, bool settled)',
  'function settleMarketWithProof(bytes32 marketId, address[] calldata payoutRecipients, uint256[] calldata payoutAmounts, uint256 totalPool, uint256 platformFeeAmount, uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC) external',
  'event MarketResolved(bytes32 indexed marketId, bool outcome)',
]);

export interface MarketState {
  question: string;
  deadline: bigint;
  resolved: boolean;
  outcome: boolean;
  totalYes: bigint;
  totalNo: bigint;
  settled: boolean;
}

export interface MarketResolvedEvent {
  marketId: `0x${string}`;
  outcome: boolean;
  blockNumber: bigint;
}

// Define the Unichain Sepolia chain
const unichainSepolia: Chain = {
  id: config.chainId,
  name: 'Unichain Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [config.rpcUrl] },
  },
};

export class ChainClient {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private contractAddress: `0x${string}`;

  constructor(teeService: TeeAttestationService) {
    const privateKeyHex = `0x${bytesToHex(teeService.getPrivateKey())}` as `0x${string}`;
    const account = privateKeyToAccount(privateKeyHex);

    this.publicClient = createPublicClient({
      chain: unichainSepolia,
      transport: http(config.rpcUrl),
    });

    this.walletClient = createWalletClient({
      account,
      chain: unichainSepolia,
      transport: http(config.rpcUrl),
    });

    this.contractAddress = config.hellyHookAddress as `0x${string}`;
  }

  /**
   * Read full market state from HellyHook.
   */
  async getMarket(marketId: string): Promise<MarketState> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: hellyHookAbi,
      functionName: 'getMarket',
      args: [marketId as `0x${string}`],
    });

    const [question, deadline, resolved, outcome, totalYes, totalNo, settled] = result as [
      string, bigint, boolean, boolean, bigint, bigint, boolean
    ];

    return { question, deadline, resolved, outcome, totalYes, totalNo, settled };
  }

  /**
   * Check if a market exists, is not resolved, and hasn't passed its deadline.
   */
  async isMarketOpen(marketId: string): Promise<boolean> {
    try {
      const market = await this.getMarket(marketId);
      if (market.resolved || market.settled) return false;
      // Market has no question → doesn't exist
      if (!market.question) return false;
      const now = BigInt(Math.floor(Date.now() / 1000));
      return now < market.deadline;
    } catch {
      return false;
    }
  }

  /**
   * Submit a ZK-proof settlement to HellyHook on-chain.
   */
  async submitSettlement(
    marketId: string,
    recipients: string[],
    amounts: bigint[],
    totalPool: bigint,
    platformFee: bigint,
    proof: {
      pA: [string, string];
      pB: [[string, string], [string, string]];
      pC: [string, string];
    }
  ): Promise<`0x${string}`> {
    const pA: [bigint, bigint] = [BigInt(proof.pA[0]), BigInt(proof.pA[1])];
    const pB: [[bigint, bigint], [bigint, bigint]] = [
      [BigInt(proof.pB[0][0]), BigInt(proof.pB[0][1])],
      [BigInt(proof.pB[1][0]), BigInt(proof.pB[1][1])],
    ];
    const pC: [bigint, bigint] = [BigInt(proof.pC[0]), BigInt(proof.pC[1])];

    const hash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: hellyHookAbi,
      functionName: 'settleMarketWithProof',
      args: [
        marketId as `0x${string}`,
        recipients as `0x${string}`[],
        amounts,
        totalPool,
        platformFee,
        pA,
        pB,
        pC,
      ],
    });

    console.log(`[ChainClient] Settlement tx submitted: ${hash}`);
    return hash;
  }

  /**
   * Fetch MarketResolved event logs from a given block to latest.
   */
  async getResolvedMarkets(fromBlock: bigint): Promise<MarketResolvedEvent[]> {
    const logs = await this.publicClient.getLogs({
      address: this.contractAddress,
      event: hellyHookAbi[2], // MarketResolved event
      fromBlock,
      toBlock: 'latest',
    });

    return (logs as Log<bigint, number, false, typeof hellyHookAbi[2], true>[]).map((log) => ({
      marketId: log.args.marketId as `0x${string}`,
      outcome: log.args.outcome as boolean,
      blockNumber: log.blockNumber,
    }));
  }

  /**
   * Get the current block number for polling.
   */
  async getBlockNumber(): Promise<bigint> {
    return await this.publicClient.getBlockNumber();
  }
}
