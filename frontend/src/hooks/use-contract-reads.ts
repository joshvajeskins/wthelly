"use client";

import { useState, useEffect, useCallback } from "react";
import { type Abi } from "viem";
import { publicClient } from "@/config/viem";
import { HELLY_HOOK_ABI, ERC20_ABI } from "@/config/abis";
import { CONTRACTS } from "@/config/constants";

function useContractRead<T = unknown>({
  address,
  abi,
  functionName,
  args,
  enabled = true,
}: {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: unknown[];
  enabled?: boolean;
}) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await publicClient.readContract({
        address,
        abi,
        functionName,
        args,
      } as any);
      setData(result as T);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [address, abi, functionName, JSON.stringify(args), enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

export function useHellyBalance(address: `0x${string}` | undefined) {
  return useContractRead({
    address: CONTRACTS.hellyHook,
    abi: HELLY_HOOK_ABI as Abi,
    functionName: "balances",
    args: address ? [address] : undefined,
    enabled: !!address,
  });
}

export function useMarketData(marketId: `0x${string}` | undefined) {
  return useContractRead({
    address: CONTRACTS.hellyHook,
    abi: HELLY_HOOK_ABI as Abi,
    functionName: "getMarket",
    args: marketId ? [marketId] : undefined,
    enabled: !!marketId,
  });
}

export function useUsdcBalance(address: `0x${string}` | undefined) {
  return useContractRead({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI as Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    enabled: !!address,
  });
}

export function useUsdcAllowance(owner: `0x${string}` | undefined) {
  return useContractRead({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI as Abi,
    functionName: "allowance",
    args: owner ? [owner, CONTRACTS.hellyHook] : undefined,
    enabled: !!owner,
  });
}

export function useContractAdmin() {
  return useContractRead({
    address: CONTRACTS.hellyHook,
    abi: HELLY_HOOK_ABI as Abi,
    functionName: "admin",
  });
}

export function useCommitment(
  marketId: `0x${string}` | undefined,
  index: bigint | undefined
) {
  return useContractRead({
    address: CONTRACTS.hellyHook,
    abi: HELLY_HOOK_ABI as Abi,
    functionName: "getCommitment",
    args: marketId && index !== undefined ? [marketId, index] : undefined,
    enabled: !!marketId && index !== undefined,
  });
}

export function useBettorCommitIndex(
  marketId: `0x${string}` | undefined,
  bettor: `0x${string}` | undefined
) {
  return useContractRead({
    address: CONTRACTS.hellyHook,
    abi: HELLY_HOOK_ABI as Abi,
    functionName: "getBettorCommitIndex",
    args: marketId && bettor ? [marketId, bettor] : undefined,
    enabled: !!marketId && !!bettor,
  });
}
