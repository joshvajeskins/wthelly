"use client";

import { useState, useMemo } from "react";
import { mockBets, mockBetHistory, mockUser } from "@/lib/mock-data";
import { Bet, BetStatus } from "@/types";

export function useBets(userAddress?: string) {
  const address = userAddress || mockUser.address;

  const activeBets = useMemo(() => {
    return mockBets.filter(
      (b) =>
        b.userAddress === address &&
        ["pending", "active", "revealing"].includes(b.status)
    );
  }, [address]);

  const betHistory = useMemo(() => {
    return mockBetHistory.filter((b) => b.userAddress === address);
  }, [address]);

  const allBets = useMemo(() => {
    return [...activeBets, ...betHistory];
  }, [activeBets, betHistory]);

  return {
    activeBets,
    betHistory,
    allBets,
    isLoading: false,
  };
}

export function useMarketBets(marketId: string) {
  const bets = useMemo(() => {
    return mockBets.filter((b) => b.marketId === marketId);
  }, [marketId]);

  const userBets = useMemo(() => {
    return bets.filter((b) => b.userAddress === mockUser.address);
  }, [bets]);

  return {
    bets,
    userBets,
    isLoading: false,
  };
}

export interface PlaceBetParams {
  marketId: string;
  direction: "yes" | "no";
  amount: number;
}

export function usePlaceBet() {
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeBet = async (params: PlaceBetParams): Promise<Bet | null> => {
    setIsPlacing(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock success
      const newBet: Bet = {
        id: `bet-${Date.now()}`,
        marketId: params.marketId,
        userAddress: mockUser.address,
        commitmentHash: `0x${Math.random().toString(16).slice(2)}`,
        amount: params.amount,
        direction: params.direction,
        status: "active",
        revealed: false,
        createdAt: new Date(),
      };

      return newBet;
    } catch (err) {
      setError("Failed to place bet");
      return null;
    } finally {
      setIsPlacing(false);
    }
  };

  return {
    placeBet,
    isPlacing,
    error,
  };
}

