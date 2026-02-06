"use client";

import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { HELLY_HOOK_ABI, ERC20_ABI } from "@/config/abis";
import { CONTRACTS } from "@/config/constants";

function useContractWrite() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return { writeContractAsync, hash, isPending, isConfirming, isSuccess, error };
}

export function useApproveUsdc() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const approve = async (amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.usdc,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.hellyHook, amount],
    } as any);
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}

export function useDeposit() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const deposit = async (amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI,
      functionName: "deposit",
      args: [amount],
    } as any);
  };

  return { deposit, hash, isPending, isConfirming, isSuccess, error };
}

export function useWithdraw() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const withdraw = async (amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI,
      functionName: "withdraw",
      args: [amount],
    } as any);
  };

  return { withdraw, hash, isPending, isConfirming, isSuccess, error };
}

export function useSubmitCommitment() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const submitCommitment = async (
    marketId: `0x${string}`,
    commitHash: `0x${string}`,
    amount: bigint
  ) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI,
      functionName: "submitCommitment",
      args: [marketId, commitHash, amount],
    } as any);
  };

  return { submitCommitment, hash, isPending, isConfirming, isSuccess, error };
}

export function useCreateMarket() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const createMarket = async (
    marketId: `0x${string}`,
    question: string,
    deadline: bigint,
    revealWindow: bigint
  ) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI,
      functionName: "createMarket",
      args: [marketId, question, deadline, revealWindow],
    } as any);
  };

  return { createMarket, hash, isPending, isConfirming, isSuccess, error };
}

export function useRevealBet() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const revealBet = async (
    marketId: `0x${string}`,
    isYes: boolean,
    secret: `0x${string}`
  ) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI,
      functionName: "revealBet",
      args: [marketId, isYes, secret],
    } as any);
  };

  return { revealBet, hash, isPending, isConfirming, isSuccess, error };
}

export function useResolveMarket() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const resolveMarket = async (marketId: `0x${string}`, outcome: boolean) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI,
      functionName: "resolveMarket",
      args: [marketId, outcome],
    } as any);
  };

  return { resolveMarket, hash, isPending, isConfirming, isSuccess, error };
}

export function useSettleMarket() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const settleMarket = async (marketId: `0x${string}`) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI,
      functionName: "settleMarket",
      args: [marketId],
    } as any);
  };

  return { settleMarket, hash, isPending, isConfirming, isSuccess, error };
}

export function useMintTestUsdc() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const mint = async (to: `0x${string}`, amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.usdc,
      abi: ERC20_ABI,
      functionName: "mint",
      args: [to, amount],
    } as any);
  };

  return { mint, hash, isPending, isConfirming, isSuccess, error };
}
