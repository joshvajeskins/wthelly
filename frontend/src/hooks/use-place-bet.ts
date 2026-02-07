"use client";

import { useState } from "react";
import { usePrivyAccount } from "@/hooks/use-privy-account";
import { useTee } from "@/providers/tee-provider";
import { useClearnode } from "@/providers/clearnode-provider";
import { useStateChannel } from "@/hooks/use-state-channel";
import { CLEARNODE_CONTRACTS, TEE_ADDRESS } from "@/config/constants";

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
    if (!stateChannelReady || !clearnodeConnected)
      throw new Error("Clearnode not connected");

    setIsPlacing(true);
    try {
      const amount = BigInt(Math.round(amountUsdc * 1e6));

      // Step 1: Create app session for this market bet
      const sessionId = await createAppSession(
        marketId,
        [address, TEE_ADDRESS],
        [
          {
            participant: address,
            asset: CLEARNODE_CONTRACTS.usdc,
            amount: amount.toString(),
          },
        ]
      );

      // Step 2: ECIES-encrypt bet data with TEE public key
      const betPayload = JSON.stringify({
        marketId,
        isYes,
        amount: amount.toString(),
        address,
      });
      let encryptedBet: string | undefined;
      if (teeConnected) {
        try {
          encryptedBet = await teeClient.encryptBetData(betPayload);
        } catch (err) {
          console.warn("[TEE] Encryption failed, submitting unencrypted:", err);
        }
      }

      // Step 3: Submit bet as app state
      const stateData = JSON.stringify({
        marketId,
        encryptedBet: encryptedBet || betPayload,
        amount: amount.toString(),
        timestamp: Date.now(),
      });

      await submitBetState(sessionId, stateData, [
        {
          participant: address,
          asset: CLEARNODE_CONTRACTS.usdc,
          amount: amount.toString(),
        },
      ]);

      // Step 4: Store locally for tracking
      const secrets = loadSecrets();
      secrets.push({
        marketId,
        secret: "0x" as `0x${string}`, // No secret needed in pure state channel mode
        isYes,
        amount,
        commitHash: "0x" as `0x${string}`, // No commit hash in pure state channel mode
        timestamp: Date.now(),
        appSessionId: sessionId,
      });
      saveSecrets(secrets);

      return { appSessionId: sessionId };
    } finally {
      setIsPlacing(false);
    }
  };

  return {
    placeBet,
    isPlacing,
    teeConnected,
    clearnodeConnected,
  };
}
