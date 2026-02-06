"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { TeeClient } from "@/lib/tee-client";
import { TEE_SERVER_URL } from "@/config/constants";

interface TeeContextType {
  teeClient: TeeClient;
  teePubKey: string | null;
  isConnected: boolean;
  teeMode: string | null;
  error: string | null;
  refreshStatus: () => Promise<void>;
}

const TeeContext = createContext<TeeContextType | null>(null);

export function TeeProvider({ children }: { children: ReactNode }) {
  const [teeClient] = useState(() => new TeeClient(TEE_SERVER_URL));
  const [teePubKey, setTeePubKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [teeMode, setTeeMode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const health = await teeClient.health();
      setIsConnected(true);
      setTeeMode(health.teeMode);
      setError(null);

      // Cache public key
      const pubKey = await teeClient.getPubKey();
      setTeePubKey(pubKey);
    } catch {
      setIsConnected(false);
      setTeeMode(null);
      setTeePubKey(null);
      setError("TEE server unavailable");
    }
  }, [teeClient]);

  // Poll health every 30 seconds
  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return (
    <TeeContext.Provider
      value={{
        teeClient,
        teePubKey,
        isConnected,
        teeMode,
        error,
        refreshStatus,
      }}
    >
      {children}
    </TeeContext.Provider>
  );
}

export function useTee() {
  const context = useContext(TeeContext);
  if (!context) {
    throw new Error("useTee must be used within a TeeProvider");
  }
  return context;
}
