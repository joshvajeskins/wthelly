"use client";

import { useState } from "react";
import { type Abi } from "viem";
import { publicClient } from "@/config/viem";
import { useWalletClient } from "@/hooks/use-wallet-client";
import { HELLY_HOOK_ABI, ERC20_ABI } from "@/config/abis";
import { CONTRACTS } from "@/config/constants";

function useContractWrite() {
  const { getWalletClient } = useWalletClient();
  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const writeContractAsync = async ({
    address,
    abi,
    functionName,
    args,
  }: {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args?: unknown[];
  }) => {
    setIsPending(true);
    setIsConfirming(false);
    setIsSuccess(false);
    setError(null);
    setHash(undefined);

    try {
      const walletClient = await getWalletClient();
      const txHash = await walletClient.writeContract({
        address,
        abi,
        functionName,
        args,
      } as any);

      setHash(txHash);
      setIsPending(false);
      setIsConfirming(true);

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      setIsConfirming(false);
      setIsSuccess(true);

      return txHash;
    } catch (err) {
      setIsPending(false);
      setIsConfirming(false);
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    }
  };

  return { writeContractAsync, hash, isPending, isConfirming, isSuccess, error };
}

export function useApproveUsdc() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const approve = async (amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.usdc,
      abi: ERC20_ABI as Abi,
      functionName: "approve",
      args: [CONTRACTS.hellyHook, amount],
    });
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}

export function useDeposit() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const deposit = async (amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI as Abi,
      functionName: "deposit",
      args: [amount],
    });
  };

  return { deposit, hash, isPending, isConfirming, isSuccess, error };
}

export function useWithdraw() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const withdraw = async (amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI as Abi,
      functionName: "withdraw",
      args: [amount],
    });
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
      abi: HELLY_HOOK_ABI as Abi,
      functionName: "submitCommitment",
      args: [marketId, commitHash, amount],
    });
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
      abi: HELLY_HOOK_ABI as Abi,
      functionName: "createMarket",
      args: [marketId, question, deadline, revealWindow],
    });
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
      abi: HELLY_HOOK_ABI as Abi,
      functionName: "revealBet",
      args: [marketId, isYes, secret],
    });
  };

  return { revealBet, hash, isPending, isConfirming, isSuccess, error };
}

export function useResolveMarket() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const resolveMarket = async (marketId: `0x${string}`, outcome: boolean) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI as Abi,
      functionName: "resolveMarket",
      args: [marketId, outcome],
    });
  };

  return { resolveMarket, hash, isPending, isConfirming, isSuccess, error };
}

export function useSettleMarket() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const settleMarket = async (marketId: `0x${string}`) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI as Abi,
      functionName: "settleMarket",
      args: [marketId],
    });
  };

  return { settleMarket, hash, isPending, isConfirming, isSuccess, error };
}

export function useMintTestUsdc() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const mint = async (to: `0x${string}`, amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.usdc,
      abi: ERC20_ABI as Abi,
      functionName: "mint",
      args: [to, amount],
    });
  };

  return { mint, hash, isPending, isConfirming, isSuccess, error };
}
