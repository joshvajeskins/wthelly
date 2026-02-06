"use client";

import { useState } from "react";
import { usePrivyAccount } from "@/hooks/use-privy-account";
import { generateSecret, computeCommitmentHash } from "@/lib/commitment";
import { useSubmitCommitment } from "./use-contract-writes";
import { ONE_USDC } from "@/config/constants";

const STORAGE_KEY = "wthelly_secrets";

export interface BetSecret {
  marketId: `0x${string}`;
  secret: `0x${string}`;
  isYes: boolean;
  amount: bigint;
  commitHash: `0x${string}`;
  timestamp: number;
}

function loadSecrets(): BetSecret[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((s: any) => ({
      ...s,
      amount: BigInt(s.amount),
    }));
  } catch {
    return [];
  }
}

function saveSecrets(secrets: BetSecret[]) {
  if (typeof window === "undefined") return;
  const serializable = secrets.map((s) => ({
    ...s,
    amount: s.amount.toString(),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

export function getBetSecrets(): BetSecret[] {
  return loadSecrets();
}

export function getBetSecretForMarket(marketId: `0x${string}`): BetSecret | undefined {
  return loadSecrets().find(
    (s) => s.marketId.toLowerCase() === marketId.toLowerCase()
  );
}

export function usePlaceBet() {
  const { address } = usePrivyAccount();
  const { submitCommitment, hash, isPending, isConfirming, isSuccess, error } =
    useSubmitCommitment();
  const [isPlacing, setIsPlacing] = useState(false);

  const placeBet = async (
    marketId: `0x${string}`,
    isYes: boolean,
    amountUsdc: number
  ) => {
    if (!address) throw new Error("Wallet not connected");

    setIsPlacing(true);
    try {
      const secret = generateSecret();
      const amount = BigInt(Math.round(amountUsdc * 1e6));
      const commitHash = computeCommitmentHash(
        marketId,
        isYes,
        amount,
        secret,
        address
      );

      // Submit commitment on-chain
      await submitCommitment(marketId, commitHash, amount);

      // Store secret in localStorage for later reveal
      const secrets = loadSecrets();
      secrets.push({
        marketId,
        secret,
        isYes,
        amount,
        commitHash,
        timestamp: Date.now(),
      });
      saveSecrets(secrets);

      return { commitHash, secret };
    } finally {
      setIsPlacing(false);
    }
  };

  return {
    placeBet,
    isPlacing: isPlacing || isPending,
    isConfirming,
    isSuccess,
    hash,
    error,
  };
}
