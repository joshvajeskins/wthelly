"use client";

import { useReadContract } from "wagmi";
import { HELLY_HOOK_ABI, ERC20_ABI } from "@/config/abis";
import { CONTRACTS } from "@/config/constants";

export function useHellyBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.hellyHook,
    abi: HELLY_HOOK_ABI,
    functionName: "balances",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useMarketData(marketId: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.hellyHook,
    abi: HELLY_HOOK_ABI,
    functionName: "getMarket",
    args: marketId ? [marketId] : undefined,
    query: { enabled: !!marketId },
  });
}

export function useUsdcBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useUsdcAllowance(owner: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: owner ? [owner, CONTRACTS.hellyHook] : undefined,
    query: { enabled: !!owner },
  });
}

export function useContractAdmin() {
  return useReadContract({
    address: CONTRACTS.hellyHook,
    abi: HELLY_HOOK_ABI,
    functionName: "admin",
  });
}

export function useCommitment(
  marketId: `0x${string}` | undefined,
  index: bigint | undefined
) {
  return useReadContract({
    address: CONTRACTS.hellyHook,
    abi: HELLY_HOOK_ABI,
    functionName: "getCommitment",
    args: marketId && index !== undefined ? [marketId, index] : undefined,
    query: { enabled: !!marketId && index !== undefined },
  });
}

export function useBettorCommitIndex(
  marketId: `0x${string}` | undefined,
  bettor: `0x${string}` | undefined
) {
  return useReadContract({
    address: CONTRACTS.hellyHook,
    abi: HELLY_HOOK_ABI,
    functionName: "getBettorCommitIndex",
    args: marketId && bettor ? [marketId, bettor] : undefined,
    query: { enabled: !!marketId && !!bettor },
  });
}
