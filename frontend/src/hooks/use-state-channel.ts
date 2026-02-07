"use client";

import { useState, useCallback } from "react";
import { type Abi } from "viem";
import { useClearnode } from "@/providers/clearnode-provider";
import type { ChannelInfo, AppSessionInfo } from "@/lib/clearnode-client";
import { CLEARNODE_CONTRACTS } from "@/config/constants";
import { CUSTODY_ABI, ERC20_ABI } from "@/config/abis";
import { CONTRACTS } from "@/config/constants";
import { usePrivyAccount } from "@/hooks/use-privy-account";
import { useWalletClient } from "@/hooks/use-wallet-client";
import { publicClient } from "@/config/viem";

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
  const { getWalletClient } = useWalletClient();
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

  // Deposit: approve USDC to Custody → deposit on-chain → create channel via Clearnode
  const deposit = useCallback(
    async (amount: string) => {
      if (!isReady || !address) throw new Error("Clearnode not ready");
      setIsLoading(true);
      try {
        const amountBig = BigInt(amount);
        const walletClient = await getWalletClient();

        // Step 1: Approve USDC to Custody (if needed)
        const allowance = await publicClient.readContract({
          address: CONTRACTS.usdc,
          abi: ERC20_ABI as Abi,
          functionName: "allowance",
          args: [address, CLEARNODE_CONTRACTS.custody],
        }) as bigint;

        if (allowance < amountBig) {
          const maxApproval = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
          const approveHash = await walletClient.writeContract({
            address: CONTRACTS.usdc,
            abi: ERC20_ABI as Abi,
            functionName: "approve",
            args: [CLEARNODE_CONTRACTS.custody, maxApproval],
          } as any);
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        // Step 2: Deposit to Custody on-chain
        const depositHash = await walletClient.writeContract({
          address: CLEARNODE_CONTRACTS.custody,
          abi: CUSTODY_ABI as Abi,
          functionName: "deposit",
          args: [address, CLEARNODE_CONTRACTS.usdc, amountBig],
        } as any);
        await publicClient.waitForTransactionReceipt({ hash: depositHash });

        // Step 3: Create channel via Clearnode RPC
        const result = await client!.createChannel(sessionSigner!, {
          chainId: 1301,
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
    [client, sessionSigner, address, isReady, getWalletClient]
  );

  // Withdraw: close channel via Clearnode → withdraw from Custody on-chain
  const withdraw = useCallback(
    async () => {
      if (!isReady || !channelId) throw new Error("No channel to close");
      setIsLoading(true);
      try {
        // Step 1: Close channel via Clearnode RPC
        await client!.closeChannel(sessionSigner!, { channelId });

        // Step 2: Withdraw from Custody on-chain
        const walletClient = await getWalletClient();

        // Get Custody balance to withdraw
        const balances = await publicClient.readContract({
          address: CLEARNODE_CONTRACTS.custody,
          abi: CUSTODY_ABI as Abi,
          functionName: "getAccountsBalances",
          args: [[address!], [CLEARNODE_CONTRACTS.usdc]],
        }) as bigint[][];

        const custodyBalance = balances[0]?.[0] ?? 0n;
        if (custodyBalance > 0n) {
          const withdrawHash = await walletClient.writeContract({
            address: CLEARNODE_CONTRACTS.custody,
            abi: CUSTODY_ABI as Abi,
            functionName: "withdraw",
            args: [CLEARNODE_CONTRACTS.usdc, custodyBalance],
          } as any);
          await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
        }

        setChannelId(null);
        localStorage.removeItem(CHANNEL_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    },
    [client, sessionSigner, channelId, address, isReady, getWalletClient]
  );

  // Get balance from Custody contract (on-chain)
  const getBalance = useCallback(
    async () => {
      if (!address) return "0";
      try {
        const balances = await publicClient.readContract({
          address: CLEARNODE_CONTRACTS.custody,
          abi: CUSTODY_ABI as Abi,
          functionName: "getAccountsBalances",
          args: [[address], [CLEARNODE_CONTRACTS.usdc]],
        }) as bigint[][];
        return (balances[0]?.[0] ?? 0n).toString();
      } catch {
        return "0";
      }
    },
    [address]
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
