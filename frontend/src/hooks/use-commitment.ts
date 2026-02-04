"use client";

import { useState, useCallback } from "react";
import { LocalBetSecret, BetDirection } from "@/types";

// Storage key for local secrets
const SECRETS_STORAGE_KEY = "helly-bet-secrets";

/**
 * Generate a random secret for commitment
 */
function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Generate commitment hash from direction, amount, and secret
 * In production, this would use keccak256
 */
async function generateCommitment(
  direction: BetDirection,
  amount: number,
  secret: string
): Promise<string> {
  const data = `${direction}:${amount}:${secret}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hook for managing bet commitments
 */
export function useCommitment() {
  const [isGenerating, setIsGenerating] = useState(false);

  const createCommitment = useCallback(
    async (
      marketId: string,
      direction: BetDirection,
      amount: number
    ): Promise<{ commitment: string; secret: string }> => {
      setIsGenerating(true);

      try {
        const secret = generateSecret();
        const commitment = await generateCommitment(direction, amount, secret);

        return { commitment, secret };
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const saveSecret = useCallback((betSecret: LocalBetSecret): void => {
    const existingSecrets = getStoredSecrets();
    const updated = [...existingSecrets, betSecret];
    localStorage.setItem(SECRETS_STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const getSecret = useCallback(
    (marketId: string, betId: string): LocalBetSecret | null => {
      const secrets = getStoredSecrets();
      return (
        secrets.find(
          (s) => s.marketId === marketId && s.betId === betId
        ) || null
      );
    },
    []
  );

  const removeSecret = useCallback((betId: string): void => {
    const secrets = getStoredSecrets();
    const filtered = secrets.filter((s) => s.betId !== betId);
    localStorage.setItem(SECRETS_STORAGE_KEY, JSON.stringify(filtered));
  }, []);

  return {
    createCommitment,
    saveSecret,
    getSecret,
    removeSecret,
    isGenerating,
  };
}

/**
 * Get all stored secrets from localStorage
 */
function getStoredSecrets(): LocalBetSecret[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(SECRETS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Hook to get all stored secrets for a user
 */
export function useStoredSecrets() {
  const [secrets] = useState<LocalBetSecret[]>(() => getStoredSecrets());

  const getSecretsForMarket = useCallback(
    (marketId: string): LocalBetSecret[] => {
      return secrets.filter((s) => s.marketId === marketId);
    },
    [secrets]
  );

  return {
    secrets,
    getSecretsForMarket,
  };
}
