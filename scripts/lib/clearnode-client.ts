/**
 * ClearnodeClient adapted for Node.js (WebSocket, not browser).
 * Based on playground-yellow's frontend ClearnodeClient.
 */

import WebSocket from "ws";
import { type Hex, type WalletClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createECDSAMessageSigner,
  createEIP712AuthMessageSigner,
  NitroliteRPC,
  parseAuthChallengeResponse,
  parseAuthVerifyResponse,
  type AuthRequestParams,
} from "@erc7824/nitrolite";
import { CLEARNODE_WS_URL } from "./config.js";

export interface ClearnodeClientConfig {
  url?: string;
  requestTimeout?: number;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  method: string;
}

export class ClearnodeClient {
  private url: string;
  private requestTimeout: number;
  private ws: WebSocket | null = null;
  private sessionKey: Hex | null = null;
  private messageSigner: ((payload: any) => Promise<Hex>) | null = null;
  private pendingRequests = new Map<number, PendingRequest>();
  private connected = false;
  private authenticated = false;

  constructor(config: ClearnodeClientConfig = {}) {
    this.url = config.url || CLEARNODE_WS_URL;
    this.requestTimeout = config.requestTimeout || 15000;
  }

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Connection timeout"));
      }, 10000);

      ws.on("open", () => {
        clearTimeout(timeout);
        this.ws = ws;
        this.connected = true;
        console.log("  [Clearnode] Connected to", this.url);
        resolve();
      });

      ws.on("message", (data: Buffer) => {
        this.handleMessage(data.toString());
      });

      ws.on("error", (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });

      ws.on("close", () => {
        this.connected = false;
        this.authenticated = false;
        this.ws = null;
      });
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.authenticated = false;
    this.messageSigner = null;
  }

  async authenticate(walletClient: WalletClient): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }
    if (!walletClient.account) {
      throw new Error("Wallet client has no account");
    }

    const address = walletClient.account.address;

    // Generate session key
    this.sessionKey = generatePrivateKey();
    const sessionKeyAccount = privateKeyToAccount(this.sessionKey);
    this.messageSigner = createECDSAMessageSigner(this.sessionKey);

    // Step 1: Auth request
    const authRequestParams: AuthRequestParams = {
      address,
      session_key: sessionKeyAccount.address,
      application: "wthelly",
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
      scope: "all",
      allowances: [
        { asset: "yintegration.usd", amount: "1000000000000" },
      ],
    };

    const authRequestMsg = await createAuthRequestMessage(authRequestParams);
    this.ws.send(authRequestMsg);

    // Step 2: Wait for challenge
    const challengeResponse = await this.waitForMethod("auth_request", this.requestTimeout);

    // Step 3: Parse challenge
    const challengeStr = typeof challengeResponse === "string"
      ? challengeResponse
      : JSON.stringify(challengeResponse);
    const challenge = parseAuthChallengeResponse(challengeStr);

    if (!challenge.params.challengeMessage) {
      throw new Error("No challenge message received");
    }

    // Step 4: Sign challenge with EIP-712
    const eip712Signer = createEIP712AuthMessageSigner(
      walletClient,
      {
        scope: authRequestParams.scope,
        session_key: authRequestParams.session_key,
        expires_at: authRequestParams.expires_at,
        allowances: authRequestParams.allowances,
      },
      { name: authRequestParams.application }
    );

    // Step 5: Send verify
    const authVerifyMsg = await createAuthVerifyMessage(eip712Signer, challenge);
    this.ws.send(authVerifyMsg);

    // Step 6: Wait for verify response
    const verifyRaw = await this.waitForMethod("auth_verify", this.requestTimeout);
    const verifyStr = typeof verifyRaw === "string" ? verifyRaw : JSON.stringify(verifyRaw);
    const verifyResponse = parseAuthVerifyResponse(verifyStr);

    if (verifyResponse.params.success && verifyResponse.params.jwtToken) {
      this.authenticated = true;
      console.log("  [Clearnode] Authenticated as", address);
      return true;
    }

    return false;
  }

  /**
   * Call an RPC method on the clearnode.
   */
  async call(method: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    let request = NitroliteRPC.createRequest({
      method: method as any,
      params,
    });

    if (this.messageSigner) {
      request = await NitroliteRPC.signRequestMessage(request, this.messageSigner);
    }

    const requestId = request.req![0];
    this.ws.send(JSON.stringify(request));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout for ${method}`));
      }, this.requestTimeout);

      this.pendingRequests.set(requestId, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
        method,
      });
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  // --- Private ---

  private handleMessage(raw: string): void {
    try {
      const message = JSON.parse(raw);

      if (message.res) {
        const [requestId, method, result] = message.res;
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          this.pendingRequests.delete(requestId);
          if (result && typeof result === "object" && "error" in result) {
            pending.reject(new Error(result.error as string));
          } else {
            pending.resolve({ method, result, timestamp: message.res[3] });
          }
        }
      }
    } catch {
      // Ignore unparseable messages
    }
  }

  private waitForMethod(method: string, timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.ws?.removeListener("message", handler);
        reject(new Error(`Timeout waiting for ${method}`));
      }, timeout);

      const handler = (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.res && (msg.res[1] === method || msg.res[1] === "auth_challenge")) {
            this.ws?.removeListener("message", handler);
            clearTimeout(timer);
            resolve(data.toString());
          }
        } catch {
          // Keep waiting
        }
      };

      this.ws?.on("message", handler);
    });
  }
}
