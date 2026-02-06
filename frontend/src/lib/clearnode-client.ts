/**
 * ClearnodeClient — browser-compatible version.
 * Uses native WebSocket (not `ws` npm package).
 */

import { type Hex } from "viem";

export interface ClearnodeClientConfig {
  url?: string;
  requestTimeout?: number;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  method: string;
}

const DEFAULT_WS_URL = "ws://localhost:8000/ws";

export class ClearnodeClient {
  private url: string;
  private requestTimeout: number;
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<number, PendingRequest>();
  private _connected = false;
  private _authenticated = false;

  constructor(config: ClearnodeClientConfig = {}) {
    this.url = config.url || DEFAULT_WS_URL;
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

      ws.onopen = () => {
        clearTimeout(timeout);
        this.ws = ws;
        this._connected = true;
        console.log("[Clearnode] Connected to", this.url);
        resolve();
      };

      ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(
          typeof event.data === "string" ? event.data : ""
        );
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("WebSocket connection failed"));
      };

      ws.onclose = () => {
        this._connected = false;
        this._authenticated = false;
        this.ws = null;
      };
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
    this._authenticated = false;
  }

  /**
   * Authenticate with Clearnode via EIP-712 signature.
   * Requires @erc7824/nitrolite SDK functions.
   */
  async authenticate(
    address: string,
    signTypedData: (params: any) => Promise<Hex>,
    nitrolite: {
      createAuthRequestMessage: (params: any) => Promise<string>;
      createAuthVerifyMessage: (signer: any, challenge: any) => Promise<string>;
      createEIP712AuthMessageSigner: (
        signer: any,
        params: any,
        domain: any
      ) => any;
      parseAuthChallengeResponse: (str: string) => any;
      parseAuthVerifyResponse: (str: string) => any;
      createECDSAMessageSigner: (key: Hex) => any;
      generatePrivateKey: () => Hex;
      privateKeyToAccount: (key: Hex) => any;
    }
  ): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    // Generate session key
    const sessionKey = nitrolite.generatePrivateKey();
    const sessionKeyAccount = nitrolite.privateKeyToAccount(sessionKey);

    // Step 1: Auth request
    const authRequestParams = {
      address,
      session_key: sessionKeyAccount.address,
      application: "wthelly",
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
      scope: "all",
      allowances: [
        { asset: "yintegration.usd", amount: "1000000000000" },
      ],
    };

    const authRequestMsg = await nitrolite.createAuthRequestMessage(
      authRequestParams
    );
    this.ws.send(authRequestMsg);

    // Step 2: Wait for challenge
    const challengeResponse = await this.waitForMethod(
      "auth_request",
      this.requestTimeout
    );

    // Step 3: Parse challenge
    const challenge = nitrolite.parseAuthChallengeResponse(challengeResponse);

    if (!challenge.params.challengeMessage) {
      throw new Error("No challenge message received");
    }

    // Step 4: Sign challenge with EIP-712 via wallet
    const walletSigner = {
      signTypedData,
      account: { address },
    };

    const eip712Signer = nitrolite.createEIP712AuthMessageSigner(
      walletSigner,
      {
        scope: authRequestParams.scope,
        session_key: authRequestParams.session_key,
        expires_at: authRequestParams.expires_at,
        allowances: authRequestParams.allowances,
      },
      { name: authRequestParams.application }
    );

    // Step 5: Send verify
    const authVerifyMsg = await nitrolite.createAuthVerifyMessage(
      eip712Signer,
      challenge
    );
    this.ws.send(authVerifyMsg);

    // Step 6: Wait for verify response
    const verifyRaw = await this.waitForMethod(
      "auth_verify",
      this.requestTimeout
    );
    const verifyResponse = nitrolite.parseAuthVerifyResponse(verifyRaw);

    if (verifyResponse.params.success && verifyResponse.params.jwtToken) {
      this._authenticated = true;
      console.log("[Clearnode] Authenticated as", address);
      return true;
    }

    return false;
  }

  get isConnected(): boolean {
    return this._connected;
  }

  get isAuthenticated(): boolean {
    return this._authenticated;
  }

  // --- Private ---

  private handleMessage(raw: string): void {
    try {
      const message = JSON.parse(raw);

      if (message.res) {
        const [requestId, , result] = message.res;
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          this.pendingRequests.delete(requestId);
          if (result && typeof result === "object" && "error" in result) {
            pending.reject(new Error(result.error as string));
          } else {
            pending.resolve(result);
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
        if (this.ws) {
          this.ws.removeEventListener("message", handler);
        }
        reject(new Error(`Timeout waiting for ${method}`));
      }, timeout);

      const handler = (event: MessageEvent) => {
        try {
          const data =
            typeof event.data === "string" ? event.data : "";
          const msg = JSON.parse(data);
          if (
            msg.res &&
            (msg.res[1] === method || msg.res[1] === "auth_challenge")
          ) {
            this.ws?.removeEventListener("message", handler);
            clearTimeout(timer);
            resolve(data);
          }
        } catch {
          // Keep waiting
        }
      };

      this.ws?.addEventListener("message", handler);
    });
  }
}
