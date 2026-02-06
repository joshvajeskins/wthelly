"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";
import { CONTRACTS, HELLY_HOOK_DEPLOY_BLOCK, USDC_DECIMALS } from "@/config/constants";
import { getBetSecrets, type BetSecret } from "./use-place-bet";
import type { Bet } from "@/types";

export function useBets(userAddress?: string) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const targetAddress = userAddress || address;

  const [activeBets, setActiveBets] = useState<Bet[]>([]);
  const [betHistory, setBetHistory] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!publicClient || !targetAddress) {
      setActiveBets([]);
      setBetHistory([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchBets() {
      try {
        setIsLoading(true);

        // Fetch CommitmentSubmitted events for this user
        const commitLogs = await publicClient!.getLogs({
          address: CONTRACTS.hellyHook,
          event: parseAbiItem(
            "event CommitmentSubmitted(bytes32 indexed marketId, address indexed bettor, bytes32 commitHash, uint256 amount)"
          ),
          args: { bettor: targetAddress as `0x${string}` },
          fromBlock: HELLY_HOOK_DEPLOY_BLOCK,
          toBlock: "latest",
        });

        // Fetch BetRevealed events for this user
        const revealLogs = await publicClient!.getLogs({
          address: CONTRACTS.hellyHook,
          event: parseAbiItem(
            "event BetRevealed(bytes32 indexed marketId, address indexed bettor, bool isYes, uint256 amount)"
          ),
          args: { bettor: targetAddress as `0x${string}` },
          fromBlock: HELLY_HOOK_DEPLOY_BLOCK,
          toBlock: "latest",
        });

        if (cancelled) return;

        // Get localStorage secrets for direction info
        const secrets = getBetSecrets();
        const secretMap = new Map<string, BetSecret>();
        for (const s of secrets) {
          secretMap.set(s.marketId.toLowerCase(), s);
        }

        // Map revealed bets
        const revealedMarkets = new Set(
          revealLogs.map((l) => (l.args.marketId as string).toLowerCase())
        );

        const active: Bet[] = [];
        const history: Bet[] = [];

        for (const log of commitLogs) {
          const marketId = log.args.marketId as `0x${string}`;
          const amount = Number(log.args.amount as bigint) / 10 ** USDC_DECIMALS;
          const isRevealed = revealedMarkets.has(marketId.toLowerCase());
          const secret = secretMap.get(marketId.toLowerCase());

          const bet: Bet = {
            id: `${marketId}-${log.transactionHash}`,
            marketId,
            userAddress: targetAddress!,
            amount,
            direction: secret ? (secret.isYes ? "yes" : "no") : undefined,
            status: isRevealed ? "settled" : "active",
            createdAt: new Date(), // Could fetch block timestamp but not critical
          };

          if (isRevealed) {
            history.push(bet);
          } else {
            active.push(bet);
          }
        }

        if (!cancelled) {
          setActiveBets(active);
          setBetHistory(history);
        }
      } catch (err) {
        console.error("Failed to fetch bets:", err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchBets();

    return () => {
      cancelled = true;
    };
  }, [publicClient, targetAddress]);

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
