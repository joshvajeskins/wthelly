/**
 * Shadow balance tracker for the TEE server.
 *
 * Tracks how much of each user's Clearnode balance is locked in
 * unresolved market bets so we can reject bets that exceed available
 * liquidity before co-signing.
 */

export class BalanceTracker {
  // address (lowercase) → marketId → locked amount
  private locks: Map<string, Map<string, bigint>> = new Map();

  /**
   * Lock funds for a bet. Replaces any existing lock for the same
   * address + market (user can only have one bet per market).
   */
  lockBet(address: string, marketId: string, amount: bigint): void {
    const key = address.toLowerCase();
    let userLocks = this.locks.get(key);
    if (!userLocks) {
      userLocks = new Map();
      this.locks.set(key, userLocks);
    }
    userLocks.set(marketId, amount);
  }

  /**
   * Release all locks for a settled market across every user.
   */
  unlockMarket(marketId: string): void {
    for (const userLocks of this.locks.values()) {
      userLocks.delete(marketId);
    }
  }

  /**
   * Total amount locked across all unresolved markets for a user.
   */
  getLockedAmount(address: string): bigint {
    const userLocks = this.locks.get(address.toLowerCase());
    if (!userLocks) return 0n;
    let total = 0n;
    for (const amount of userLocks.values()) {
      total += amount;
    }
    return total;
  }

  /**
   * Check whether a user can afford a new bet given their Clearnode
   * balance and existing locks.
   */
  canPlaceBet(address: string, clearnodeBalance: bigint, betAmount: bigint): boolean {
    const locked = this.getLockedAmount(address);
    return clearnodeBalance - locked >= betAmount;
  }
}
