"use client";

import { useState, useEffect, useCallback } from "react";
import { type Abi } from "viem";
import { publicClient } from "@/config/viem";
import { HELLY_HOOK_ABI, ERC20_ABI, CUSTODY_ABI } from "@/config/abis";
import { CONTRACTS, CLEARNODE_CONTRACTS } from "@/config/constants";

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

export function useCustodyBalance(address: `0x${string}` | undefined) {
  const [balance, setBalance] = useState<bigint | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await publicClient.readContract({
        address: CLEARNODE_CONTRACTS.custody,
        abi: CUSTODY_ABI as Abi,
        functionName: "getAccountsBalances",
        args: [[address], [CLEARNODE_CONTRACTS.usdc]],
      });
      // Result is uint256[][] — extract [0][0]
      const balances = result as bigint[][];
      setBalance(balances[0]?.[0] ?? 0n);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data: balance, isLoading, error, refetch: fetch };
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
    args: owner ? [owner, CLEARNODE_CONTRACTS.custody] : undefined,
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
