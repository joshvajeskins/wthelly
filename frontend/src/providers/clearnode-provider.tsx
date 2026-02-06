"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { usePrivyAccount } from "@/hooks/use-privy-account";
import { ClearnodeClient } from "@/lib/clearnode-client";

interface ClearnodeState {
  client: ClearnodeClient | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const ClearnodeContext = createContext<ClearnodeState>({
  client: null,
  isConnected: false,
  isAuthenticated: false,
  isConnecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
});

const CLEARNODE_WS_URL =
  process.env.NEXT_PUBLIC_CLEARNODE_WS_URL || "ws://localhost:8000/ws";

export function ClearnodeProvider({ children }: { children: ReactNode }) {
  const { address, isConnected: walletConnected } = usePrivyAccount();
  const [client, setClient] = useState<ClearnodeClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-disconnect when wallet disconnects
  useEffect(() => {
    if (!walletConnected && client) {
      client.disconnect();
      setClient(null);
      setIsConnected(false);
      setIsAuthenticated(false);
    }
  }, [walletConnected, client]);

  const connect = useCallback(async () => {
    if (!walletConnected || !address) {
      setError("Wallet not connected");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const newClient = new ClearnodeClient({ url: CLEARNODE_WS_URL });
      await newClient.connect();
      setClient(newClient);
      setIsConnected(true);

      // Note: Authentication requires the @erc7824/nitrolite SDK
      // and wallet signature. For now, connection without auth is shown.
      // Full auth would be triggered separately.
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to Clearnode"
      );
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [walletConnected, address]);

  const disconnect = useCallback(() => {
    if (client) {
      client.disconnect();
    }
    setClient(null);
    setIsConnected(false);
    setIsAuthenticated(false);
    setError(null);
  }, [client]);

  return (
    <ClearnodeContext.Provider
      value={{
        client,
        isConnected,
        isAuthenticated,
        isConnecting,
        error,
        connect,
        disconnect,
      }}
    >
      {children}
    </ClearnodeContext.Provider>
  );
}

export function useClearnode() {
  return useContext(ClearnodeContext);
}
