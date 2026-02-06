"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import {
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { config } from "@/config/wagmi";
import { ClearnodeProvider } from "@/providers/clearnode-provider";

const queryClient = new QueryClient();

const customTheme = darkTheme({
  accentColor: "#BFFF00",
  accentColorForeground: "black",
  borderRadius: "none",
  fontStack: "system",
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme}>
          <ClearnodeProvider>
            {children}
          </ClearnodeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
