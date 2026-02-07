"use client";

import { useState } from "react";
import { type Abi } from "viem";
import { publicClient } from "@/config/viem";
import { useWalletClient } from "@/hooks/use-wallet-client";
import { HELLY_HOOK_ABI, ERC20_ABI, CUSTODY_ABI } from "@/config/abis";
import { CONTRACTS, CLEARNODE_CONTRACTS } from "@/config/constants";
import { usePrivyAccount } from "@/hooks/use-privy-account";

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
      args: [CLEARNODE_CONTRACTS.custody, amount],
    });
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}

export function useDeposit() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();
  const { address } = usePrivyAccount();

  const deposit = async (amount: bigint) => {
    if (!address) throw new Error("Wallet not connected");
    return writeContractAsync({
      address: CLEARNODE_CONTRACTS.custody,
      abi: CUSTODY_ABI as Abi,
      functionName: "deposit",
      args: [address, CLEARNODE_CONTRACTS.usdc, amount],
    });
  };

  return { deposit, hash, isPending, isConfirming, isSuccess, error };
}

export function useWithdraw() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const withdraw = async (amount: bigint) => {
    return writeContractAsync({
      address: CLEARNODE_CONTRACTS.custody,
      abi: CUSTODY_ABI as Abi,
      functionName: "withdraw",
      args: [CLEARNODE_CONTRACTS.usdc, amount],
    });
  };

  return { withdraw, hash, isPending, isConfirming, isSuccess, error };
}

export function useCreateMarket() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const createMarket = async (
    marketId: `0x${string}`,
    question: string,
    deadline: bigint,
    poolId: `0x${string}`,
    priceTarget: bigint,
    priceAbove: boolean
  ) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI as Abi,
      functionName: "createMarket",
      args: [marketId, question, deadline, poolId, priceTarget, priceAbove],
    });
  };

  return { createMarket, hash, isPending, isConfirming, isSuccess, error };
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

export function useResolveMarketFromOracle() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const resolveFromOracle = async (marketId: `0x${string}`) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI as Abi,
      functionName: "resolveMarketFromOracle",
      args: [marketId],
    });
  };

  return { resolveFromOracle, hash, isPending, isConfirming, isSuccess, error };
}

export function useSettleMarketWithProof() {
  const { writeContractAsync, hash, isPending, isConfirming, isSuccess, error } =
    useContractWrite();

  const settleMarketWithProof = async (
    marketId: `0x${string}`,
    payoutRecipients: `0x${string}`[],
    payoutAmounts: bigint[],
    totalPool: bigint,
    platformFeeAmount: bigint,
    pA: [bigint, bigint],
    pB: [[bigint, bigint], [bigint, bigint]],
    pC: [bigint, bigint]
  ) => {
    return writeContractAsync({
      address: CONTRACTS.hellyHook,
      abi: HELLY_HOOK_ABI as Abi,
      functionName: "settleMarketWithProof",
      args: [marketId, payoutRecipients, payoutAmounts, totalPool, platformFeeAmount, pA, pB, pC],
    });
  };

  return { settleMarketWithProof, hash, isPending, isConfirming, isSuccess, error };
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
