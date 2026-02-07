import { config } from './config.js';
import { BetStore, DecryptedBet, SettlementResult } from './bet-store.js';
import type { ClearnodeBridge } from './clearnode-bridge.js';
import type { ChainClient } from './chain-client.js';
import type { BalanceTracker } from './balance-tracker.js';

// Dynamic import for snarkjs (ESM)
let snarkjs: any;
async function getSnarkjs() {
  if (!snarkjs) {
    snarkjs = await import('snarkjs');
  }
  return snarkjs;
}

interface PayoutInfo {
  address: string;
  amount: bigint;
  isWinner: boolean;
  betAmount: bigint;
}

export async function computeSettlement(
  marketId: string,
  outcome: boolean, // true = YES won
  betStore: BetStore
): Promise<SettlementResult> {
  const bets = betStore.getBets(marketId);

  if (bets.length === 0) {
    throw new Error(`No bets found for market ${marketId}`);
  }

  if (bets.length > config.maxBets) {
    throw new Error(`Too many bets (${bets.length} > ${config.maxBets})`);
  }

  const outcomeNum = outcome ? 1 : 0;

  // Classify bets
  let winnerPool = 0n;
  let loserPool = 0n;
  const payoutInfos: PayoutInfo[] = [];

  for (const bet of bets) {
    const isWinner = bet.isYes === outcome;
    if (isWinner) {
      winnerPool += bet.amount;
    } else {
      loserPool += bet.amount;
    }
    payoutInfos.push({
      address: bet.address,
      amount: bet.amount,
      isWinner,
      betAmount: bet.amount,
    });
  }

  const totalPool = winnerPool + loserPool;

  // Edge case: nobody bet on the winning side — refund everyone, no fee.
  // ZK proof cannot be generated here because the circuit enforces
  // (1 - isWinner[i]) * payouts[i] === 0, and all bettors are "losers".
  // Settlement proceeds off-chain only (Clearnode channel close + balance unlock).
  if (winnerPool === 0n) {
    console.log(`[Settlement] No winners for market ${marketId} — refunding all bettors (off-chain only, no ZK proof)`);
    const payouts: Array<{ address: string; amount: bigint }> = [];

    for (const info of payoutInfos) {
      payouts.push({ address: info.address, amount: info.betAmount });
    }

    const result: SettlementResult = {
      marketId,
      outcome,
      payouts,
      platformFee: 0n,
      totalPool,
      proof: null,
      settledAt: Date.now(),
    };

    betStore.setSettlement(marketId, result);
    return result;
  }

  // Platform fee from loser pool
  const platformFee = (loserPool * BigInt(config.feeBps)) / 10000n;
  const netDistributable = loserPool - platformFee;

  // Compute payouts for winners
  const payouts: Array<{ address: string; amount: bigint }> = [];
  const payoutAmounts: bigint[] = [];

  for (const info of payoutInfos) {
    if (info.isWinner) {
      // Winner gets original bet + proportional share of net distributable
      const share = (info.amount * netDistributable) / winnerPool;
      const payout = info.amount + share;
      payouts.push({ address: info.address, amount: payout });
      payoutAmounts.push(payout);
    } else {
      payouts.push({ address: info.address, amount: 0n });
      payoutAmounts.push(0n);
    }
  }

  // Generate ZK proof
  let proof = null;
  try {
    proof = await generateSettlementProof(
      outcomeNum,
      config.feeBps,
      totalPool,
      platformFee,
      bets,
      payoutAmounts
    );
    console.log(`[Settlement] ZK proof generated for market ${marketId}`);
  } catch (error) {
    console.error(`[Settlement] ZK proof generation failed:`, error);
    console.log(`[Settlement] Settlement will proceed without proof (fallback mode)`);
  }

  const result: SettlementResult = {
    marketId,
    outcome,
    payouts,
    platformFee,
    totalPool,
    proof,
    settledAt: Date.now(),
  };

  betStore.setSettlement(marketId, result);
  return result;
}

async function generateSettlementProof(
  outcome: number,
  feeBps: number,
  totalPool: bigint,
  platformFee: bigint,
  bets: DecryptedBet[],
  payoutAmounts: bigint[]
): Promise<SettlementResult['proof']> {
  const sj = await getSnarkjs();

  // Pad arrays to MAX_BETS
  const directions = new Array(config.maxBets).fill('0');
  const amounts = new Array(config.maxBets).fill('0');
  const payoutsArr = new Array(config.maxBets).fill('0');
  const active = new Array(config.maxBets).fill('0');

  for (let i = 0; i < bets.length; i++) {
    directions[i] = bets[i].isYes ? '1' : '0';
    amounts[i] = bets[i].amount.toString();
    payoutsArr[i] = payoutAmounts[i].toString();
    active[i] = '1';
  }

  const input = {
    outcome: outcome.toString(),
    feeBps: feeBps.toString(),
    totalPool: totalPool.toString(),
    platformFee: platformFee.toString(),
    numBets: bets.length.toString(),
    directions,
    amounts,
    payouts: payoutsArr,
    active,
  };

  const { proof, publicSignals } = await sj.groth16.fullProve(
    input,
    config.wasmPath,
    config.zkeyPath
  );

  // Format proof for Solidity verifier
  return {
    pA: [proof.pi_a[0], proof.pi_a[1]] as [string, string],
    pB: [
      [proof.pi_b[0][1], proof.pi_b[0][0]] as [string, string],
      [proof.pi_b[1][1], proof.pi_b[1][0]] as [string, string],
    ] as [[string, string], [string, string]],
    pC: [proof.pi_c[0], proof.pi_c[1]] as [string, string],
    pubSignals: publicSignals as [string, string, string, string],
  };
}

// ============================================
// State Channel Settlement
// ============================================

export async function settleViaStateChannel(
  marketId: string,
  outcome: boolean,
  betStore: BetStore,
  bridge: ClearnodeBridge
): Promise<SettlementResult> {
  // Step 1: Compute payouts (reuse existing logic)
  const result = await computeSettlement(marketId, outcome, betStore);

  // Step 2: Close app sessions via Clearnode
  try {
    await bridge.closeAppSession([{
      app_session_id: `0x${marketId}` as `0x${string}`,
      allocations: result.payouts.map(p => ({
        participant: p.address as `0x${string}`,
        asset: 'USDC',
        amount: p.amount.toString(),
      })),
    }]);
    console.log(`[Settlement] App sessions closed for market ${marketId}`);
  } catch (error) {
    console.error(`[Settlement] Failed to close app sessions:`, error);
    // Continue with on-chain settlement even if channel close fails
  }

  return result;
}

// ============================================
// Full On-Chain Settlement
// ============================================

export interface OnChainSettlementResult extends SettlementResult {
  txHash: `0x${string}` | null;
}

export async function settleOnChain(
  marketId: string,
  outcome: boolean,
  betStore: BetStore,
  chainClient: ChainClient,
  bridge: ClearnodeBridge | null,
  balanceTracker: BalanceTracker | null
): Promise<OnChainSettlementResult> {
  // Step 1: Compute payouts + generate ZK proof
  const result = await computeSettlement(marketId, outcome, betStore);

  let txHash: `0x${string}` | null = null;

  // Step 2: Submit proof on-chain (requires valid proof)
  if (result.proof) {
    try {
      const recipients = result.payouts.map(p => p.address);
      const amounts = result.payouts.map(p => p.amount);
      txHash = await chainClient.submitSettlement(
        marketId,
        recipients,
        amounts,
        result.totalPool,
        result.platformFee,
        result.proof
      );
      console.log(`[Settlement] On-chain settlement tx: ${txHash}`);
    } catch (error) {
      console.error(`[Settlement] On-chain settlement failed:`, error);
    }
  } else if (result.platformFee === 0n && result.payouts.some(p => p.amount > 0n)) {
    // No-winners refund case: ZK circuit can't prove losers receiving payouts,
    // so on-chain proof submission is skipped. Settlement proceeds off-chain only.
    console.warn(`[Settlement] No-winners refund for ${marketId} — skipping on-chain proof (off-chain settlement only)`);
  } else {
    throw new Error(`[Settlement] ZK proof generation failed — cannot submit on-chain settlement for ${marketId}`);
  }

  // Step 3: Close Clearnode app sessions with final allocations
  if (bridge?.isAuthenticated) {
    try {
      await bridge.closeAppSession([{
        app_session_id: `0x${marketId}` as `0x${string}`,
        allocations: result.payouts.map(p => ({
          participant: p.address as `0x${string}`,
          asset: 'USDC',
          amount: p.amount.toString(),
        })),
      }]);
      console.log(`[Settlement] App sessions closed for market ${marketId}`);
    } catch (error) {
      console.error(`[Settlement] Failed to close app sessions:`, error);
    }
  }

  // Step 4: Release locked funds
  if (balanceTracker) {
    balanceTracker.unlockMarket(marketId);
    console.log(`[Settlement] Balance locks released for market ${marketId}`);
  }

  return { ...result, txHash };
}
