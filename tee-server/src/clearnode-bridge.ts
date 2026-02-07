import WebSocket from 'ws';
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createCloseAppSessionMessage,
  NitroliteRPC,
} from '@erc7824/nitrolite';
import type { MessageSigner, CloseAppSessionRequest } from '@erc7824/nitrolite';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bytesToHex } from '@noble/hashes/utils';
import type { TeeAttestationService } from './tee-attestation.js';

type NotificationHandler = (notification: any) => void;

export class ClearnodeBridge {
  private ws: WebSocket | null = null;
  private url: string;
  private teeService: TeeAttestationService;
  private notificationHandlers: NotificationHandler[] = [];
  private pendingRequests: Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }> =
    new Map();
  private requestId = 1;
  private _isAuthenticated = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private signer: MessageSigner | null = null;
  private teeAddress: `0x${string}` | null = null;

  constructor(url: string, teeService: TeeAttestationService) {
    this.url = url;
    this.teeService = teeService;
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  onNotification(handler: NotificationHandler): void {
    this.notificationHandlers.push(handler);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', async () => {
        console.log('[ClearnodeBridge] WebSocket connected');
        try {
          await this.authenticate();
          this._isAuthenticated = true;
          console.log('[ClearnodeBridge] Authenticated successfully');
          resolve();
        } catch (error) {
          console.error('[ClearnodeBridge] Authentication failed:', error);
          reject(error);
        }
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', () => {
        console.log('[ClearnodeBridge] WebSocket disconnected');
        this._isAuthenticated = false;
        this.rejectAllPending(new Error('WebSocket disconnected'));
        this.scheduleReconnect();
      });

      this.ws.on('error', (error: Error) => {
        console.error('[ClearnodeBridge] WebSocket error:', error.message);
        // If we haven't resolved yet, reject
        if (!this._isAuthenticated) {
          reject(error);
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._isAuthenticated = false;
  }

  /**
   * Send a signed RPC message and wait for a response.
   */
  async sendRpc(method: string, params: any): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }

    const id = this.requestId++;
    const request = NitroliteRPC.createRequest(id, method, [params]);
    const signedRequest = await NitroliteRPC.signRequestMessage(request, this.signer);
    const message = JSON.stringify(signedRequest);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws!.send(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`RPC timeout for method: ${method}`));
        }
      }, 30_000);
    });
  }

  /**
   * Send a close_app_session message using the SDK helper.
   */
  async closeAppSession(params: CloseAppSessionRequest[]): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }

    const message = await createCloseAppSessionMessage(this.signer, params);
    const parsed = JSON.parse(message);
    const id = parsed.req?.[0];

    return new Promise((resolve, reject) => {
      if (id !== undefined) {
        this.pendingRequests.set(id, { resolve, reject });
      }
      this.ws!.send(message);

      setTimeout(() => {
        if (id !== undefined && this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('RPC timeout for close_app_session'));
        }
      }, 30_000);
    });
  }

  private initSigner(): { signer: MessageSigner; address: `0x${string}` } {
    // Build wallet client from TEE private key
    const privateKeyHex = `0x${bytesToHex(this.teeService.getPrivateKey())}` as `0x${string}`;
    const account = privateKeyToAccount(privateKeyHex);
    const address = account.address;

    const walletClient = createWalletClient({
      account,
      transport: http(),
    });

    // MessageSigner: signs the payload tuple and returns a hex signature
    const signer: MessageSigner = async (payload) => {
      const message = JSON.stringify(payload);
      return await walletClient.signMessage({ message });
    };

    return { signer, address };
  }

  private async authenticate(): Promise<void> {
    const { signer, address } = this.initSigner();
    this.signer = signer;
    this.teeAddress = address;

    // Step 1: Send auth_request
    const authRequestMsg = await createAuthRequestMessage(signer, address);
    this.ws!.send(authRequestMsg);

    // Step 2: Wait for auth_challenge response
    const challengeResponse = await this.waitForMethod('auth_challenge');

    // Step 3: Create and send auth_verify message (SDK parses challenge internally)
    const verifyMsg = await createAuthVerifyMessage(signer, challengeResponse, address);
    this.ws!.send(verifyMsg);

    // Step 4: Wait for verify response and validate
    const verifyResponse = await this.waitForMethod('auth_verify');
    const parsed = NitroliteRPC.parseResponse(verifyResponse);

    if (!parsed.isValid || parsed.isError) {
      throw new Error(`Auth verification failed: ${parsed.error || 'unknown error'}`);
    }
  }

  /**
   * Wait for a message with a specific method in the `res` field.
   */
  private waitForMethod(expectedMethod: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for ${expectedMethod}`));
      }, 15_000);

      const handler = (data: WebSocket.Data) => {
        const msg = data.toString();
        try {
          const parsed = JSON.parse(msg);
          // Check the res field: [requestId, method, data[], timestamp]
          if (parsed.res && Array.isArray(parsed.res) && parsed.res[1] === expectedMethod) {
            cleanup();
            resolve(msg);
          }
        } catch {
          // Not JSON, ignore
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        this.ws?.removeListener('message', handler);
      };

      this.ws!.on('message', handler);
    });
  }

  private handleMessage(raw: string): void {
    try {
      const parsed = JSON.parse(raw);

      // Check if this is an RPC response matching a pending request
      if (parsed.res && Array.isArray(parsed.res)) {
        const responseId = parsed.res[0];
        if (typeof responseId === 'number' && this.pendingRequests.has(responseId)) {
          const pending = this.pendingRequests.get(responseId)!;
          this.pendingRequests.delete(responseId);

          const result = NitroliteRPC.parseResponse(raw);
          if (result.isError) {
            pending.reject(new Error(result.error || 'RPC error'));
          } else {
            pending.resolve(result.data);
          }
          return;
        }
      }

      // Otherwise treat as a push notification
      for (const handler of this.notificationHandlers) {
        try {
          handler(parsed);
        } catch (err) {
          console.error('[ClearnodeBridge] Notification handler error:', err);
        }
      }
    } catch {
      // Not valid JSON, ignore
    }
  }

  private rejectAllPending(error: Error): void {
    for (const [, pending] of this.pendingRequests) {
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    if (this.reconnectTimer) return;

    console.log('[ClearnodeBridge] Scheduling reconnect in 5s...');
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
        console.log('[ClearnodeBridge] Reconnected successfully');
      } catch (error) {
        console.error('[ClearnodeBridge] Reconnect failed:', error);
        this.scheduleReconnect();
      }
    }, 5_000);
  }
}
