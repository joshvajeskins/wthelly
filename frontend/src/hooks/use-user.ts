"use client";

import { useState } from "react";
import { mockUser, mockChannelState } from "@/lib/mock-data";
import { User, ChannelState } from "@/types";

export function useUser() {
  const [user] = useState<User>(mockUser);
  const [isLoading] = useState(false);

  return {
    user,
    isLoading,
    isConnected: true,
  };
}

export function useChannelState() {
  const [channelState] = useState<ChannelState>(mockChannelState);
  const [isLoading] = useState(false);

  return {
    channelState,
    balance: channelState.availableBalance,
    lockedAmount: channelState.lockedAmount,
    isLoading,
  };
}

export function useWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = async () => {
    setIsConnecting(true);
    // Simulate wallet connection
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsConnected(true);
    setIsConnecting(false);
  };

  const disconnect = () => {
    setIsConnected(false);
  };

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    address: isConnected ? mockUser.address : null,
  };
}
