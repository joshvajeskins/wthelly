"use client";

import { useCallback } from "react";
import { createWalletClient, custom } from "viem";
import { unichainSepolia } from "viem/chains";
import { useWallets } from "@privy-io/react-auth";

export function useWalletClient() {
  const { wallets } = useWallets();

  const getWalletClient = useCallback(async () => {
    const wallet = wallets[0];
    if (!wallet) throw new Error("No wallet connected");

    await wallet.switchChain(unichainSepolia.id);
    const provider = await wallet.getEthereumProvider();

    return createWalletClient({
      chain: unichainSepolia,
      transport: custom(provider),
      account: wallet.address as `0x${string}`,
    });
  }, [wallets]);

  return { getWalletClient };
}
