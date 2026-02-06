"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";

export function usePrivyAccount() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const wallet = wallets[0];
  const address = wallet?.address as `0x${string}` | undefined;

  return {
    address,
    isConnected: ready && authenticated && !!wallet,
    isConnecting: !ready,
  };
}
