"use client";

import { useState, useEffect, useCallback } from "react";
import { parseAbiItem } from "viem";
import { publicClient } from "@/config/viem";
import { HELLY_HOOK_ABI } from "@/config/abis";
import { CONTRACTS, HELLY_HOOK_DEPLOY_BLOCK } from "@/config/constants";

export interface OnChainMarket {
  id: `0x${string}`;
  question: string;
  deadline: bigint;
  resolved: boolean;
  outcome: boolean;
  totalYes: bigint;
  totalNo: bigint;
  settled: boolean;
  createdAtTimestamp: number; // unix ms from block timestamp
}

export function useOnChainMarkets() {
  const [markets, setMarkets] = useState<OnChainMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch MarketCreated events
      const logs = await publicClient.getLogs({
        address: CONTRACTS.hellyHook,
        event: parseAbiItem(
          "event MarketCreated(bytes32 indexed marketId, string question, uint256 deadline, bytes32 poolId, uint160 priceTarget, bool priceAbove)"
        ),
        fromBlock: HELLY_HOOK_DEPLOY_BLOCK,
        toBlock: "latest",
      });

      // Fetch block timestamps for createdAt
      const uniqueBlocks = [...new Set(logs.map((l) => l.blockNumber))];
      const blocks = await Promise.all(
        uniqueBlocks.map((bn) => publicClient.getBlock({ blockNumber: bn }))
      );
      const blockTimestamps = new Map(
        blocks.map((b) => [b.number, Number(b.timestamp) * 1000])
      );

      // Batch-read current state for each market
      const marketPromises = logs.map(async (log) => {
        const marketId = log.args.marketId as `0x${string}`;
        const data = await publicClient.readContract({
          address: CONTRACTS.hellyHook,
          abi: HELLY_HOOK_ABI,
          functionName: "getMarket",
          args: [marketId],
        });

        const [
          question,
          deadline,
          resolved,
          outcome,
          totalYes,
          totalNo,
          settled,
        ] = data as [string, bigint, boolean, boolean, bigint, bigint, boolean];

        return {
          id: marketId,
          question,
          deadline,
          resolved,
          outcome,
          totalYes,
          totalNo,
          settled,
          createdAtTimestamp: blockTimestamps.get(log.blockNumber) || Date.now(),
        };
      });

      const results = await Promise.all(marketPromises);
      setMarkets(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch markets");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  return { markets, isLoading, error, refetch: fetchMarkets };
}
