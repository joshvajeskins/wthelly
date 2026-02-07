/**
 * Polls for MarketResolved events on-chain and auto-triggers
 * full on-chain settlement when the TEE has bets for that market.
 */

import type { ChainClient } from './chain-client.js';
import type { BetStore } from './bet-store.js';
import type { ClearnodeBridge } from './clearnode-bridge.js';
import type { BalanceTracker } from './balance-tracker.js';
import { settleOnChain } from './settlement.js';
import type { config as Config } from './config.js';

export class MarketWatcher {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastBlock: bigint = 0n;
  private settledMarkets: Set<string> = new Set();

  constructor(
    private chainClient: ChainClient,
    private betStore: BetStore,
    private bridge: ClearnodeBridge | null,
    private balanceTracker: BalanceTracker | null,
    private config: typeof Config
  ) {}

  async start(): Promise<void> {
    // Start from current block so we don't replay old events
    try {
      this.lastBlock = await this.chainClient.getBlockNumber();
    } catch (error) {
      console.error('[MarketWatcher] Failed to get initial block number:', error);
      this.lastBlock = 0n;
    }

    console.log(`[MarketWatcher] Starting from block ${this.lastBlock}, polling every ${this.config.marketWatcherIntervalMs}ms`);

    this.intervalId = setInterval(() => {
      this.poll().catch(err => {
        console.error('[MarketWatcher] Poll error:', err);
      });
    }, this.config.marketWatcherIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[MarketWatcher] Stopped');
    }
  }

  private async poll(): Promise<void> {
    const currentBlock = await this.chainClient.getBlockNumber();
    if (currentBlock <= this.lastBlock) return;

    const events = await this.chainClient.getResolvedMarkets(this.lastBlock + 1n);
    this.lastBlock = currentBlock;

    for (const event of events) {
      const marketId = event.marketId;

      // Skip already-settled markets
      if (this.settledMarkets.has(marketId)) continue;
      if (this.betStore.getSettlement(marketId)) {
        this.settledMarkets.add(marketId);
        continue;
      }

      // Only settle if we have bets for this market
      const betCount = this.betStore.getBetCount(marketId);
      if (betCount === 0) continue;

      console.log(
        `[MarketWatcher] Market ${marketId.slice(0, 10)}... resolved (outcome=${event.outcome ? 'YES' : 'NO'}), ${betCount} bets — auto-settling`
      );

      try {
        const result = await settleOnChain(
          marketId,
          event.outcome,
          this.betStore,
          this.chainClient,
          this.bridge,
          this.balanceTracker
        );
        this.settledMarkets.add(marketId);
        console.log(
          `[MarketWatcher] Auto-settlement complete for ${marketId.slice(0, 10)}... txHash=${result.txHash ?? 'none'}`
        );
      } catch (error) {
        console.error(`[MarketWatcher] Auto-settlement failed for ${marketId.slice(0, 10)}...:`, error);
        // Will retry on next poll cycle since settledMarkets wasn't updated
      }
    }
  }
}
