"use client";

import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { usePrivyAccount } from "@/hooks/use-privy-account";
import { useHellyBalance, useUsdcBalance } from "./use-contract-reads";
import { useBets } from "./use-bets";
import { useOnChainMarkets } from "./use-market-events";
import { useClearnode } from "@/providers/clearnode-provider";
import { USDC_DECIMALS } from "@/config/constants";
import type { User, ChannelState } from "@/types";

export function useUser() {
  const { address, isConnected } = usePrivyAccount();
  const { data: hellyBalanceRaw } = useHellyBalance(address);
  const { activeBets, betHistory, allBets, isLoading: betsLoading } = useBets();
  const { markets: onChainMarkets } = useOnChainMarkets();

  const hellyBalance = hellyBalanceRaw
    ? Number(hellyBalanceRaw) / 10 ** USDC_DECIMALS
    : 0;

  const stats = useMemo(() => {
    const totalWagered = allBets.reduce((sum, bet) => sum + bet.amount, 0);

    let wins = 0;
    let losses = 0;

    for (const bet of betHistory) {
      const market = onChainMarkets.find(
        (m) => m.id.toLowerCase() === bet.marketId.toLowerCase()
      );
      if (market && market.resolved && bet.direction) {
        const userBetYes = bet.direction === "yes";
        if (userBetYes === market.outcome) {
          wins++;
        } else {
          losses++;
        }
      }
    }

    const winRate =
      wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

    return { totalWagered, wins, losses, winRate };
  }, [allBets, betHistory, onChainMarkets]);

  const user: User | null =
    isConnected && address
      ? {
          address,
          wins: stats.wins,
          losses: stats.losses,
          winRate: stats.winRate,
          totalWagered: stats.totalWagered,
          streak: 0,
          channelBalance: hellyBalance,
          channelNonce: 0,
          createdAt: new Date(),
        }
      : null;

  return {
    user,
    isLoading: betsLoading,
    isConnected,
  };
}

export function useChannelState() {
  const { address } = usePrivyAccount();
  const { data: hellyBalanceRaw, isLoading } = useHellyBalance(address);
  const { isAuthenticated } = useClearnode();

  const balance = hellyBalanceRaw
    ? Number(hellyBalanceRaw) / 10 ** USDC_DECIMALS
    : 0;

  const channelState: ChannelState = {
    channelId: isAuthenticated ? "clearnode-session" : "",
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
    isAuthenticated,
  };
}

export function useWallet() {
  const { address, isConnected, isConnecting } = usePrivyAccount();
  const { login, logout } = usePrivy();

  return {
    isConnected,
    isConnecting,
    connect: login,
    disconnect: logout,
    address: address || null,
  };
}
