/**
 * TEE Server Client — fetches public key, submits encrypted bets, triggers settlement
 */

import { encryptBetData, type BetData } from "./ecies-browser";

const DEFAULT_TEE_URL = "http://localhost:3001";

export interface TeeStatus {
  teeMode: string;
  publicKey: string;
  chainId: number;
  hellyHookAddress: string;
  feeBps: number;
  maxBets: number;
  markets: Array<{
    marketId: string;
    betCount: number;
    settled: boolean;
  }>;
  metrics: {
    betsReceived: number;
    betsDecrypted: number;
    betsFailed: number;
    settlementsExecuted: number;
    proofsGenerated: number;
    attestationCount: number;
  };
}

export interface SettlementResult {
  marketId: string;
  outcome: boolean;
  payouts: Array<{ address: string; amount: string }>;
  platformFee: string;
  totalPool: string;
  proof: {
    pA: [string, string];
    pB: [[string, string], [string, string]];
    pC: [string, string];
    pubSignals: [string, string, string, string];
  } | null;
  settledAt: number;
}

export class TeeClient {
  private baseUrl: string;
  private cachedPubKey: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || DEFAULT_TEE_URL;
  }

  async health(): Promise<{ status: string; teeMode: string; timestamp: number }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error("TEE server unreachable");
    return res.json();
  }

  async getStatus(): Promise<TeeStatus> {
    const res = await fetch(`${this.baseUrl}/status`);
    if (!res.ok) throw new Error("Failed to fetch TEE status");
    return res.json();
  }

  async getPubKey(): Promise<string> {
    if (this.cachedPubKey) return this.cachedPubKey;

    const res = await fetch(`${this.baseUrl}/pubkey`);
    if (!res.ok) throw new Error("Failed to fetch TEE public key");
    const data = await res.json();
    this.cachedPubKey = data.publicKey;
    return data.publicKey;
  }

  /**
   * Encrypt and submit a bet to the TEE server
   */
  async submitEncryptedBet(betData: BetData): Promise<{ success: boolean; betCount: number }> {
    const pubKey = await this.getPubKey();
    const encryptedData = encryptBetData(pubKey, betData);

    const res = await fetch(`${this.baseUrl}/bet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marketId: betData.marketId,
        encryptedData,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || "Failed to submit bet to TEE");
    }

    return res.json();
  }

  /**
   * Trigger settlement + ZK proof generation for a market
   */
  async settleMarket(
    marketId: string,
    outcome: boolean
  ): Promise<SettlementResult> {
    const res = await fetch(`${this.baseUrl}/settle/${marketId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || "Failed to settle market via TEE");
    }

    const data = await res.json();
    return data.settlement;
  }

  /**
   * Get settlement result for a market (if already settled)
   */
  async getSettlement(marketId: string): Promise<SettlementResult | null> {
    const res = await fetch(`${this.baseUrl}/settlement/${marketId}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed to fetch settlement");
    const data = await res.json();
    return data.settlement;
  }

  clearPubKeyCache(): void {
    this.cachedPubKey = null;
  }
}
