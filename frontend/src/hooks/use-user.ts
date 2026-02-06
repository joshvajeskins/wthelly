"use client";

import { useAccount } from "wagmi";
import { useHellyBalance, useUsdcBalance } from "./use-contract-reads";
import { USDC_DECIMALS } from "@/config/constants";
import type { User, ChannelState } from "@/types";

export function useUser() {
  const { address, isConnected } = useAccount();
  const { data: hellyBalanceRaw } = useHellyBalance(address);
  const { data: usdcBalanceRaw } = useUsdcBalance(address);

  const hellyBalance = hellyBalanceRaw
    ? Number(hellyBalanceRaw) / 10 ** USDC_DECIMALS
    : 0;

  const user: User | null = isConnected && address
    ? {
        address,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalWagered: 0,
        streak: 0,
        channelBalance: hellyBalance,
        channelNonce: 0,
        createdAt: new Date(),
      }
    : null;

  return {
    user,
    isLoading: false,
    isConnected,
  };
}

export function useChannelState() {
  const { address } = useAccount();
  const { data: hellyBalanceRaw, isLoading } = useHellyBalance(address);

  const balance = hellyBalanceRaw
    ? Number(hellyBalanceRaw) / 10 ** USDC_DECIMALS
    : 0;

  const channelState: ChannelState = {
    channelId: "",
    userAddress: address || "0x0",
    balance,
    nonce: 0,
    activeBets: [],
    lockedAmount: 0,
    availableBalance: balance,
    lastUpdated: new Date(),
  };

  return {
    channelState,
    balance,
    lockedAmount: 0,
    isLoading,
  };
}

export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount();

  return {
    isConnected,
    isConnecting,
    connect: async () => {},
    disconnect: () => {},
    address: address || null,
  };
}
