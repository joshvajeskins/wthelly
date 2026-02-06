"use client";

import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { type Log, parseAbiItem } from "viem";
import { HELLY_HOOK_ABI } from "@/config/abis";
import { CONTRACTS, HELLY_HOOK_DEPLOY_BLOCK } from "@/config/constants";

export interface OnChainMarket {
  id: `0x${string}`;
  question: string;
  deadline: bigint;
  revealDeadline: bigint;
  resolved: boolean;
  outcome: boolean;
  totalYes: bigint;
  totalNo: bigint;
  settled: boolean;
  commitCount: bigint;
}

export function useOnChainMarkets() {
  const publicClient = usePublicClient();
  const [markets, setMarkets] = useState<OnChainMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicClient) return;

    let cancelled = false;

    async function fetchMarkets() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch MarketCreated events
        const logs = await publicClient!.getLogs({
          address: CONTRACTS.hellyHook,
          event: parseAbiItem(
            "event MarketCreated(bytes32 indexed marketId, string question, uint256 deadline, uint256 revealDeadline)"
          ),
          fromBlock: HELLY_HOOK_DEPLOY_BLOCK,
          toBlock: "latest",
        });

        if (cancelled) return;

        // Batch-read current state for each market
        const marketPromises = logs.map(async (log) => {
          const marketId = log.args.marketId as `0x${string}`;
          const data = await publicClient!.readContract({
            address: CONTRACTS.hellyHook,
            abi: HELLY_HOOK_ABI,
            functionName: "getMarket",
            args: [marketId],
          });

          const [
            question,
            deadline,
            revealDeadline,
            resolved,
            outcome,
            totalYes,
            totalNo,
            settled,
            commitCount,
          ] = data as [string, bigint, bigint, boolean, boolean, bigint, bigint, boolean, bigint];

          return {
            id: marketId,
            question,
            deadline,
            revealDeadline,
            resolved,
            outcome,
            totalYes,
            totalNo,
            settled,
            commitCount,
          };
        });

        const results = await Promise.all(marketPromises);
        if (!cancelled) {
          setMarkets(results);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch markets");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchMarkets();

    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  return { markets, isLoading, error, refetch: () => {} };
}
