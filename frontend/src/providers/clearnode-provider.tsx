"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createEIP712AuthMessageSigner,
  createECDSAMessageSigner,
  parseAuthChallengeResponse,
  parseAuthVerifyResponse,
  type MessageSigner,
} from "@erc7824/nitrolite";
import { usePrivyAccount } from "@/hooks/use-privy-account";
import { useWalletClient } from "@/hooks/use-wallet-client";
import { ClearnodeClient } from "@/lib/clearnode-client";
import { CLEARNODE_WS_URL } from "@/config/constants";

interface ClearnodeState {
  client: ClearnodeClient | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  isConnecting: boolean;
  sessionSigner: MessageSigner | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const ClearnodeContext = createContext<ClearnodeState>({
  client: null,
  isConnected: false,
  isAuthenticated: false,
  isConnecting: false,
  sessionSigner: null,
  error: null,
  connect: async () => {},
  disconnect: () => {},
});

export function ClearnodeProvider({ children }: { children: ReactNode }) {
  const { address, isConnected: walletConnected } = usePrivyAccount();
  const { getWalletClient } = useWalletClient();
  const [client, setClient] = useState<ClearnodeClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionSigner, setSessionSigner] = useState<MessageSigner | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-disconnect when wallet disconnects
  useEffect(() => {
    if (!walletConnected && client) {
      client.disconnect();
      setClient(null);
      setIsConnected(false);
      setIsAuthenticated(false);
      setSessionSigner(null);
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

      // Authenticate via EIP-712 using the nitrolite SDK
      const walletClient = await getWalletClient();

      const authenticated = await newClient.authenticate(
        address,
        walletClient.signTypedData.bind(walletClient),
        {
          createAuthRequestMessage,
          createAuthVerifyMessage,
          createEIP712AuthMessageSigner,
          parseAuthChallengeResponse,
          parseAuthVerifyResponse,
          createECDSAMessageSigner,
          generatePrivateKey,
          privateKeyToAccount,
        }
      );

      if (authenticated) {
        setIsAuthenticated(true);
        // Create session signer for subsequent RPC calls
        const sessionKey = generatePrivateKey();
        const signer = createECDSAMessageSigner(sessionKey);
        setSessionSigner(() => signer);
        console.log("[Clearnode] Fully authenticated with session key");
      } else {
        setError("Authentication failed");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to Clearnode"
      );
      setIsConnected(false);
      setIsAuthenticated(false);
    } finally {
      setIsConnecting(false);
    }
  }, [walletConnected, address, getWalletClient]);

  const disconnect = useCallback(() => {
    if (client) {
      client.disconnect();
    }
    setClient(null);
    setIsConnected(false);
    setIsAuthenticated(false);
    setSessionSigner(null);
    setError(null);
  }, [client]);

  return (
    <ClearnodeContext.Provider
      value={{
        client,
        isConnected,
        isAuthenticated,
        isConnecting,
        sessionSigner,
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
