"use client";

import { useState, useCallback } from "react";
import { useClearnode } from "@/providers/clearnode-provider";
import type { ChannelInfo, AppSessionInfo } from "@/lib/clearnode-client";
import { CLEARNODE_CONTRACTS } from "@/config/constants";
import { usePrivyAccount } from "@/hooks/use-privy-account";

const CHANNEL_STORAGE_KEY = "wthelly_channel_id";
const APP_SESSION_STORAGE_KEY = "wthelly_app_sessions";

function loadChannelId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CHANNEL_STORAGE_KEY);
}

function saveChannelId(channelId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHANNEL_STORAGE_KEY, channelId);
}

function loadAppSessions(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(APP_SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAppSession(marketId: string, sessionId: string) {
  if (typeof window === "undefined") return;
  const sessions = loadAppSessions();
  sessions[marketId] = sessionId;
  localStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify(sessions));
}

export function useStateChannel() {
  const { client, isAuthenticated, sessionSigner } = useClearnode();
  const { address } = usePrivyAccount();
  const [channelId, setChannelId] = useState<string | null>(loadChannelId);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isReady = !!client && isAuthenticated && !!sessionSigner;

  const createChannel = useCallback(
    async (amount: string) => {
      if (!isReady || !address) throw new Error("Clearnode not ready");

      setIsLoading(true);
      try {
        const result = await client!.createChannel(sessionSigner!, {
          chainId: 1301, // Unichain Sepolia
          participant: address,
          token: CLEARNODE_CONTRACTS.usdc,
          amount,
        });
        setChannelId(result.channelId);
        saveChannelId(result.channelId);
        return result.channelId;
      } finally {
        setIsLoading(false);
      }
    },
    [client, sessionSigner, address, isReady]
  );

  const fetchChannels = useCallback(async () => {
    if (!isReady || !address) return [];

    setIsLoading(true);
    try {
      const result = await client!.getChannels(sessionSigner!, address);
      setChannels(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [client, sessionSigner, address, isReady]);

  const createAppSession = useCallback(
    async (
      marketId: string,
      participants: string[],
      allocations: Array<{ participant: string; asset: string; amount: string }>
    ) => {
      if (!isReady) throw new Error("Clearnode not ready");

      const result = await client!.createAppSession(sessionSigner!, {
        appDefinition: `wthelly-market-${marketId}`,
        participants,
        allocations,
      });

      saveAppSession(marketId, result.sessionId);
      return result.sessionId;
    },
    [client, sessionSigner, isReady]
  );

  const submitBetState = useCallback(
    async (
      sessionId: string,
      data: string,
      allocations: Array<{ participant: string; asset: string; amount: string }>
    ) => {
      if (!isReady) throw new Error("Clearnode not ready");

      return client!.submitAppState(sessionSigner!, {
        sessionId,
        intent: "operate",
        data,
        allocations,
      });
    },
    [client, sessionSigner, isReady]
  );

  const closeAppSession = useCallback(
    async (
      sessionId: string,
      finalAllocations: Array<{ participant: string; asset: string; amount: string }>
    ) => {
      if (!isReady) throw new Error("Clearnode not ready");

      return client!.closeAppSession(sessionSigner!, {
        sessionId,
        allocations: finalAllocations,
      });
    },
    [client, sessionSigner, isReady]
  );

  const getAppSessions = useCallback(
    async (marketId?: string) => {
      if (!isReady) throw new Error("Clearnode not ready");

      const appDef = marketId ? `wthelly-market-${marketId}` : undefined;
      return client!.getAppSessions(sessionSigner!, appDef);
    },
    [client, sessionSigner, isReady]
  );

  const getLedgerBalances = useCallback(async () => {
    if (!isReady) throw new Error("Clearnode not ready");
    return client!.getLedgerBalances(sessionSigner!);
  }, [client, sessionSigner, isReady]);

  const getAppSessionForMarket = useCallback(
    (marketId: string): string | null => {
      const sessions = loadAppSessions();
      return sessions[marketId] || null;
    },
    []
  );

  const deposit = useCallback(
    async (amount: string) => {
      if (!isReady || !address) throw new Error("Clearnode not ready");
      setIsLoading(true);
      try {
        const result = await client!.createChannel(sessionSigner!, {
          chainId: 1301, // Unichain Sepolia
          participant: address,
          token: CLEARNODE_CONTRACTS.usdc,
          amount,
        });
        setChannelId(result.channelId);
        saveChannelId(result.channelId);
        return result.channelId;
      } finally {
        setIsLoading(false);
      }
    },
    [client, sessionSigner, address, isReady]
  );

  const withdraw = useCallback(
    async () => {
      if (!isReady || !channelId) throw new Error("No channel to close");
      setIsLoading(true);
      try {
        await client!.closeChannel(sessionSigner!, { channelId });
        setChannelId(null);
        localStorage.removeItem(CHANNEL_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    },
    [client, sessionSigner, channelId, isReady]
  );

  const getBalance = useCallback(
    async () => {
      if (!isReady) return "0";
      try {
        const balances = await client!.getLedgerBalances(sessionSigner!);
        const usdcBalance = balances.find(
          (b: any) =>
            b.asset?.toLowerCase() === CLEARNODE_CONTRACTS.usdc.toLowerCase()
        );
        return usdcBalance?.amount || "0";
      } catch {
        return "0";
      }
    },
    [client, sessionSigner, isReady]
  );

  return {
    isReady,
    channelId,
    channels,
    isLoading,
    createChannel,
    deposit,
    withdraw,
    getBalance,
    fetchChannels,
    createAppSession,
    submitBetState,
    closeAppSession,
    getAppSessions,
    getLedgerBalances,
    getAppSessionForMarket,
  };
}
