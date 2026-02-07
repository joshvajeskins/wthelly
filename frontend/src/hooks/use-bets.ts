"use client";

import { useState, useEffect, useMemo } from "react";
import { usePrivyAccount } from "@/hooks/use-privy-account";
import { USDC_DECIMALS } from "@/config/constants";
import { getBetSecrets, type BetSecret } from "./use-place-bet";
import type { Bet } from "@/types";

export function useBets(userAddress?: string) {
  const { address } = usePrivyAccount();
  const targetAddress = userAddress || address;

  const [activeBets, setActiveBets] = useState<Bet[]>([]);
  const [betHistory, setBetHistory] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!targetAddress) {
      setActiveBets([]);
      setBetHistory([]);
      setIsLoading(false);
      return;
    }

    // In pure state channel mode, bets are tracked locally via localStorage
    try {
      setIsLoading(true);

      const secrets = getBetSecrets();
      const active: Bet[] = [];
      const history: Bet[] = [];

      for (const secret of secrets) {
        const amount = Number(secret.amount) / 10 ** USDC_DECIMALS;

        const bet: Bet = {
          id: `${secret.marketId}-${secret.timestamp}`,
          marketId: secret.marketId,
          userAddress: targetAddress!,
          amount,
          direction: secret.isYes ? "yes" : "no",
          status: "active", // State channel bets are active until settlement
          createdAt: new Date(secret.timestamp),
        };

        if (secret.appSessionId) {
          active.push(bet);
        } else {
          history.push(bet);
        }
      }

      setActiveBets(active);
      setBetHistory(history);
    } catch (err) {
      console.error("Failed to fetch bets:", err);
    } finally {
      setIsLoading(false);
    }
  }, [targetAddress]);

  const allBets = useMemo(
    () => [...activeBets, ...betHistory],
    [activeBets, betHistory]
  );

  return {
    activeBets,
    betHistory,
    allBets,
    isLoading,
  };
}

export function useMarketBets(marketId: string) {
  const { activeBets, betHistory } = useBets();

  const bets = useMemo(
    () =>
      [...activeBets, ...betHistory].filter(
        (b) => b.marketId.toLowerCase() === marketId.toLowerCase()
      ),
    [activeBets, betHistory, marketId]
  );

  return {
    bets,
    userBets: bets,
    isLoading: false,
  };
}

export interface PlaceBetParams {
  marketId: string;
  direction: "yes" | "no";
  amount: number;
}

// Re-export usePlaceBet from dedicated module
export { usePlaceBet } from "./use-place-bet";
