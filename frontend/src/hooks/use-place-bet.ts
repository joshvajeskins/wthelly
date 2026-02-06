"use client";

import { useState } from "react";
import { usePrivyAccount } from "@/hooks/use-privy-account";
import { generateSecret, computeCommitmentHash } from "@/lib/commitment";
import { useSubmitCommitment } from "./use-contract-writes";
import { useTee } from "@/providers/tee-provider";
import { useClearnode } from "@/providers/clearnode-provider";
import { useStateChannel } from "@/hooks/use-state-channel";
import { CLEARNODE_CONTRACTS } from "@/config/constants";

const STORAGE_KEY = "wthelly_secrets";

export interface BetSecret {
  marketId: `0x${string}`;
  secret: `0x${string}`;
  isYes: boolean;
  amount: bigint;
  commitHash: `0x${string}`;
  timestamp: number;
  appSessionId?: string;
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
  const { teeClient, isConnected: teeConnected } = useTee();
  const { isAuthenticated: clearnodeConnected } = useClearnode();
  const { isReady: stateChannelReady, createAppSession, submitBetState } =
    useStateChannel();
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

      // Step 1: Submit commitment on-chain (L1 anchor)
      await submitCommitment(marketId, commitHash, amount);

      // Step 2: Send encrypted bet to TEE server (if connected)
      if (teeConnected) {
        try {
          await teeClient.submitEncryptedBet({
            marketId,
            isYes,
            amount: amount.toString(),
            secret,
            address,
          });
          console.log("[TEE] Encrypted bet submitted to TEE server");
        } catch (err) {
          // TEE submission failure is non-fatal — user can still reveal manually
          console.warn("[TEE] Failed to submit to TEE server (fallback to manual reveal):", err);
        }
      }

      // Step 3: Route through state channel (if Clearnode authenticated)
      let appSessionId: string | undefined;
      if (stateChannelReady && clearnodeConnected) {
        try {
          // Create app session for this market bet
          const sessionId = await createAppSession(
            marketId,
            [address, CLEARNODE_CONTRACTS.custody],
            [
              {
                participant: address,
                asset: CLEARNODE_CONTRACTS.usdc,
                amount: amount.toString(),
              },
            ]
          );

          // Submit initial bet state
          const betData = JSON.stringify({
            marketId,
            commitHash,
            amount: amount.toString(),
            timestamp: Date.now(),
          });

          await submitBetState(
            sessionId,
            betData,
            [
              {
                participant: address,
                asset: CLEARNODE_CONTRACTS.usdc,
                amount: amount.toString(),
              },
            ]
          );

          appSessionId = sessionId;
          console.log("[Clearnode] Bet submitted via state channel, session:", sessionId);
        } catch (err) {
          // State channel submission is non-fatal — on-chain commitment is the source of truth
          console.warn("[Clearnode] Failed to submit via state channel (on-chain commitment still valid):", err);
        }
      }

      // Step 4: Store secret in localStorage for later reveal (fallback)
      const secrets = loadSecrets();
      secrets.push({
        marketId,
        secret,
        isYes,
        amount,
        commitHash,
        timestamp: Date.now(),
        appSessionId,
      });
      saveSecrets(secrets);

      return { commitHash, secret, appSessionId };
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
    teeConnected,
    clearnodeConnected,
  };
}
