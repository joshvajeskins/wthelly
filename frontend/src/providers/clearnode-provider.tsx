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
import { CLEARNODE_WS_URL, CLEARNODE_CONTRACTS } from "@/config/constants";

interface ClearnodeState {
  client: ClearnodeClient | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  isConnecting: boolean;
  sessionSigner: MessageSigner | null;
  error: string | null;
  hasChannel: boolean;
  channelBalance: string;
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
  hasChannel: false,
  channelBalance: "0",
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
  const [hasChannel, setHasChannel] = useState(false);
  const [channelBalance, setChannelBalance] = useState("0");

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

        // Auto-detect existing channels
        try {
          const channels = await newClient.getChannels(signer, address);
          if (channels.length > 0) {
            setHasChannel(true);
            // Get balance from first channel
            const balances = await newClient.getLedgerBalances(signer);
            const usdcBal = balances.find(
              (b: any) =>
                b.asset?.toLowerCase() ===
                CLEARNODE_CONTRACTS.usdc.toLowerCase()
            );
            setChannelBalance(usdcBal?.amount || "0");
          }
        } catch (err) {
          console.warn("[Clearnode] Failed to fetch channels:", err);
        }
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
    setHasChannel(false);
    setChannelBalance("0");
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
        hasChannel,
        channelBalance,
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
