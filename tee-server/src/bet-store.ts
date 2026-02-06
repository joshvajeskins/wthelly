export interface DecryptedBet {
  marketId: string;
  isYes: boolean;
  amount: bigint;
  secret: string;
  address: string;
  commitHash: string;
  timestamp: number;
}

export interface SettlementResult {
  marketId: string;
  outcome: boolean;
  payouts: Array<{ address: string; amount: bigint }>;
  platformFee: bigint;
  totalPool: bigint;
  proof: {
    pA: [string, string];
    pB: [[string, string], [string, string]];
    pC: [string, string];
    pubSignals: [string, string, string, string];
  } | null;
  settledAt: number;
}

export class BetStore {
  // marketId => DecryptedBet[]
  private bets: Map<string, DecryptedBet[]> = new Map();
  // marketId => SettlementResult
  private settlements: Map<string, SettlementResult> = new Map();

  addBet(bet: DecryptedBet): void {
    const bets = this.bets.get(bet.marketId) || [];

    // Check for duplicate (same address + market)
    const existing = bets.findIndex(b =>
      b.address.toLowerCase() === bet.address.toLowerCase()
    );
    if (existing !== -1) {
      console.log(`[BetStore] Replacing bet from ${bet.address} on market ${bet.marketId}`);
      bets[existing] = bet;
    } else {
      bets.push(bet);
    }

    this.bets.set(bet.marketId, bets);
  }

  getBets(marketId: string): DecryptedBet[] {
    return this.bets.get(marketId) || [];
  }

  getBetCount(marketId: string): number {
    return this.getBets(marketId).length;
  }

  getAllMarketIds(): string[] {
    return Array.from(this.bets.keys());
  }

  setSettlement(marketId: string, result: SettlementResult): void {
    this.settlements.set(marketId, result);
  }

  getSettlement(marketId: string): SettlementResult | undefined {
    return this.settlements.get(marketId);
  }

  getTotalBetCount(): number {
    let total = 0;
    for (const bets of this.bets.values()) {
      total += bets.length;
    }
    return total;
  }
}
