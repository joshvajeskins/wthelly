import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { readFileSync } from 'fs';
import { config } from './config.js';

export interface TeeMetrics {
  betsReceived: number;
  betsDecrypted: number;
  betsFailed: number;
  settlementsExecuted: number;
  proofsGenerated: number;
  attestationCount: number;
}

export class TeeAttestationService {
  private privateKey: Uint8Array;
  public publicKey: Uint8Array;
  public publicKeyHex: string;

  private metrics: TeeMetrics = {
    betsReceived: 0,
    betsDecrypted: 0,
    betsFailed: 0,
    settlementsExecuted: 0,
    proofsGenerated: 0,
    attestationCount: 0,
  };

  constructor() {
    if (config.teeMode === 'enclave') {
      // Production: read 32-byte private key from filesystem
      try {
        const keyData = readFileSync(config.enclaveKeyPath);
        this.privateKey = new Uint8Array(keyData.buffer, keyData.byteOffset, 32);
        console.log('[TEE] Enclave mode: loaded ECDSA key from', config.enclaveKeyPath);
      } catch (error) {
        console.error('[TEE] Failed to read enclave key, falling back to ephemeral');
        this.privateKey = secp256k1.utils.randomPrivateKey();
      }
    } else {
      // Development: generate ephemeral keypair
      this.privateKey = secp256k1.utils.randomPrivateKey();
      console.log('[TEE] Local-dev mode: generated ephemeral keypair');
    }

    // Derive public key (uncompressed, 65 bytes)
    this.publicKey = secp256k1.getPublicKey(this.privateKey, false);
    this.publicKeyHex = '0x' + bytesToHex(this.publicKey);
    console.log('[TEE] Public key:', this.publicKeyHex.slice(0, 20) + '...');
  }

  getPrivateKey(): Uint8Array {
    return this.privateKey;
  }

  signMessage(message: string): string {
    const msgHash = sha256(new TextEncoder().encode(message));
    const sig = secp256k1.sign(msgHash, this.privateKey);
    return bytesToHex(sig.toCompactRawBytes());
  }

  incrementMetric(key: keyof TeeMetrics): void {
    this.metrics[key]++;
  }

  getMetrics(): TeeMetrics {
    return { ...this.metrics };
  }

  async getOysterAttestation(): Promise<any | null> {
    if (config.teeMode !== 'enclave') return null;
    try {
      const response = await fetch('http://127.0.0.1:1300/attestation/raw');
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }
}
