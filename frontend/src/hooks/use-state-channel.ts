"use client";

import { useState, useCallback } from "react";
import { type Hex, type Address } from "viem";
import { useClearnode } from "@/providers/clearnode-provider";
import type { AppSessionInfo } from "@/lib/clearnode-client";
import { CLEARNODE_CONTRACTS } from "@/config/constants";
import { usePrivyAccount } from "@/hooks/use-privy-account";
import { useWalletClient } from "@/hooks/use-wallet-client";
import { publicClient } from "@/config/viem";
import {
  NitroliteClient,
  SessionKeyStateSigner,
  convertRPCToClientChannel,
  convertRPCToClientState,
  type Channel,
  type UnsignedState,
  type FinalState,
  StateIntent,
} from "@erc7824/nitrolite";

const CHANNEL_STORAGE_KEY = "wthelly_channel_id";
const SESSION_KEY_STORAGE = "wthelly_session_key";
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

/**
 * Creates a NitroliteClient instance for on-chain Custody contract interactions.
 */
function createNitroliteClient(
  walletClient: any,
  sessionKey: Hex
): NitroliteClient {
  return new NitroliteClient({
    publicClient: publicClient as any,
    walletClient: walletClient as any,
    stateSigner: new SessionKeyStateSigner(sessionKey),
    addresses: {
      custody: CLEARNODE_CONTRACTS.custody,
      adjudicator: CLEARNODE_CONTRACTS.adjudicator,
    },
    chainId: 1301, // Unichain Sepolia
    challengeDuration: 3600n, // 1 hour minimum
  });
}

export function useStateChannel() {
  const { client, isAuthenticated, sessionSigner } = useClearnode();
  const { address } = usePrivyAccount();
  const { getWalletClient } = useWalletClient();
  const [channelId, setChannelId] = useState<string | null>(loadChannelId);
  const [channels, setChannels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isReady = !!client && isAuthenticated && !!sessionSigner;

  /**
   * Deposit USDC and create a state channel.
   * Flow:
   *   1. Send create_channel RPC to Clearnode → get broker's pre-signed state
   *   2. Convert RPC types to SDK client types
   *   3. Call NitroliteClient.depositAndCreateChannel() → handles approval + on-chain tx
   *   4. Clearnode detects Created event and creates DB record
   */
  const deposit = useCallback(
    async (amount: string) => {
      if (!isReady || !address) throw new Error("Clearnode not ready");
      setIsLoading(true);
      try {
        const amountBig = BigInt(amount);

        // Step 1: Get broker's pre-signed channel data from Clearnode
        console.log("[Channel] Requesting create_channel from Clearnode...");
        const response = await client!.createChannel(sessionSigner!, {
          chainId: 1301,
          token: CLEARNODE_CONTRACTS.usdc,
        });
        console.log("[Channel] Broker response:", response.channelId);

        // Step 2: Convert RPC types to SDK client types
        const channel: Channel = convertRPCToClientChannel(response.channel);
        const unsignedInitialState: UnsignedState = {
          intent: response.state.intent as StateIntent,
          version: BigInt(response.state.version),
          data: response.state.stateData,
          allocations: response.state.allocations.map((a) => ({
            destination: a.destination as Address,
            token: a.token as Address,
            amount: BigInt(a.amount),
          })),
        };

        // Step 3: Create NitroliteClient and call depositAndCreateChannel
        const walletClient = await getWalletClient();
        const sessionKey = localStorage.getItem(SESSION_KEY_STORAGE) as Hex;
        const nitrolite = createNitroliteClient(walletClient, sessionKey);

        console.log("[Channel] Calling depositAndCreateChannel on-chain...");
        const result = await nitrolite.depositAndCreateChannel(
          CLEARNODE_CONTRACTS.usdc,
          amountBig,
          {
            channel,
            unsignedInitialState,
            serverSignature: response.serverSignature,
          }
        );

        console.log("[Channel] Channel created on-chain:", result.channelId);
        setChannelId(result.channelId);
        saveChannelId(result.channelId);
        return result.channelId;
      } finally {
        setIsLoading(false);
      }
    },
    [client, sessionSigner, address, isReady, getWalletClient]
  );

  /**
   * Create a channel without deposit (funds already in Custody).
   */
  const createChannel = useCallback(
    async () => {
      if (!isReady || !address) throw new Error("Clearnode not ready");
      setIsLoading(true);
      try {
        // Step 1: Get broker's pre-signed channel data
        const response = await client!.createChannel(sessionSigner!, {
          chainId: 1301,
          token: CLEARNODE_CONTRACTS.usdc,
        });

        // Step 2: Convert types
        const channel: Channel = convertRPCToClientChannel(response.channel);
        const unsignedInitialState: UnsignedState = {
          intent: response.state.intent as StateIntent,
          version: BigInt(response.state.version),
          data: response.state.stateData,
          allocations: response.state.allocations.map((a) => ({
            destination: a.destination as Address,
            token: a.token as Address,
            amount: BigInt(a.amount),
          })),
        };

        // Step 3: Create channel on-chain (no deposit)
        const walletClient = await getWalletClient();
        const sessionKey = localStorage.getItem(SESSION_KEY_STORAGE) as Hex;
        const nitrolite = createNitroliteClient(walletClient, sessionKey);

        const result = await nitrolite.createChannel({
          channel,
          unsignedInitialState,
          serverSignature: response.serverSignature,
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

  /**
   * Close channel and withdraw funds.
   * Flow:
   *   1. Send close_channel RPC to Clearnode → get final state with broker sig
   *   2. Use NitroliteClient.closeChannel() → calls Custody.close() on-chain
   *   3. Use NitroliteClient.withdrawal() → calls Custody.withdraw() on-chain
   */
  const withdraw = useCallback(
    async () => {
      if (!isReady || !channelId || !address)
        throw new Error("No channel to close");
      setIsLoading(true);
      try {
        // Step 1: Get final state from Clearnode
        console.log("[Channel] Requesting close_channel from Clearnode...");
        const response = await client!.closeChannel(sessionSigner!, {
          channelId: channelId as Hex,
          fundsDestination: address,
        });
        console.log("[Channel] Broker returned final state");

        // Step 2: Build FinalState and close on-chain
        const walletClient = await getWalletClient();
        const sessionKey = localStorage.getItem(SESSION_KEY_STORAGE) as Hex;
        const nitrolite = createNitroliteClient(walletClient, sessionKey);

        const finalState: FinalState = {
          channelId: response.channelId,
          intent: response.state.intent as StateIntent,
          version: BigInt(response.state.version),
          data: response.state.stateData,
          allocations: response.state.allocations.map((a) => ({
            destination: a.destination as Address,
            token: a.token as Address,
            amount: BigInt(a.amount),
          })),
          serverSignature: response.serverSignature,
        };

        console.log("[Channel] Closing channel on-chain...");
        await nitrolite.closeChannel({
          stateData: response.state.stateData,
          finalState,
        });

        // Step 3: Withdraw from Custody
        const balance = await nitrolite.getAccountBalance(
          CLEARNODE_CONTRACTS.usdc
        );
        if (balance > 0n) {
          console.log("[Channel] Withdrawing", balance.toString(), "from Custody...");
          await nitrolite.withdrawal(CLEARNODE_CONTRACTS.usdc, balance);
        }

        setChannelId(null);
        localStorage.removeItem(CHANNEL_STORAGE_KEY);
        console.log("[Channel] Channel closed and funds withdrawn");
      } finally {
        setIsLoading(false);
      }
    },
    [client, sessionSigner, channelId, address, isReady, getWalletClient]
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
      finalAllocations: Array<{
        participant: string;
        asset: string;
        amount: string;
      }>
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

  // Get balance from Custody contract (on-chain)
  const getBalance = useCallback(async () => {
    if (!address) return "0";
    try {
      const walletClient = await getWalletClient();
      const sessionKey = localStorage.getItem(SESSION_KEY_STORAGE) as Hex;
      if (!sessionKey) return "0";
      const nitrolite = createNitroliteClient(walletClient, sessionKey);
      const balance = await nitrolite.getAccountBalance(
        CLEARNODE_CONTRACTS.usdc
      );
      return balance.toString();
    } catch {
      return "0";
    }
  }, [address, getWalletClient]);

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
