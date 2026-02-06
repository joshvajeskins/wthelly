"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { PRIVY_APP_ID, privyConfig } from "@/config/privy";
import { ClearnodeProvider } from "@/providers/clearnode-provider";
import { TeeProvider } from "@/providers/tee-provider";

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      <ClearnodeProvider>
        <TeeProvider>{children}</TeeProvider>
      </ClearnodeProvider>
    </PrivyProvider>
  );
}
