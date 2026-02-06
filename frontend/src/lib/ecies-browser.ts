/**
 * Browser-compatible ECIES encryption using @noble/curves + @noble/hashes + @noble/ciphers
 * Encrypts bet data with the TEE's secp256k1 public key
 *
 * Ciphertext format: [65 bytes ephemeral pubkey | 12 bytes nonce | ciphertext | 16 bytes GCM tag]
 */

import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hkdf } from "@noble/hashes/hkdf";
import { gcm } from "@noble/ciphers/aes";
import { bytesToHex, hexToBytes, randomBytes } from "@noble/hashes/utils";

const ECIES_INFO = new TextEncoder().encode("wthelly-ecies-v1");

export interface BetData {
  marketId: string;
  isYes: boolean;
  amount: string;
  secret: string;
  address: string;
}

/**
 * ECIES encrypt plaintext with a recipient's secp256k1 public key
 */
export function eciesEncrypt(
  recipientPubKeyHex: string,
  plaintext: Uint8Array
): Uint8Array {
  const recipientPubKey = hexToBytes(recipientPubKeyHex.replace("0x", ""));

  // Generate ephemeral keypair
  const ephemeralPriv = secp256k1.utils.randomPrivateKey();
  const ephemeralPub = secp256k1.getPublicKey(ephemeralPriv, false); // 65 bytes uncompressed

  // ECDH shared secret
  const sharedPoint = secp256k1.getSharedSecret(ephemeralPriv, recipientPubKey);

  // Derive AES key via HKDF-SHA256
  const aesKey = hkdf(sha256, sharedPoint.slice(1, 33), undefined, ECIES_INFO, 32);

  // AES-256-GCM encrypt
  const nonce = randomBytes(12);
  const cipher = gcm(aesKey, nonce);
  const ciphertext = cipher.encrypt(plaintext);

  // Pack: ephemeralPub(65) + nonce(12) + ciphertext(includes 16-byte tag)
  const result = new Uint8Array(65 + 12 + ciphertext.length);
  result.set(ephemeralPub, 0);
  result.set(nonce, 65);
  result.set(ciphertext, 77);

  return result;
}

/**
 * Encrypt bet data for the TEE server
 * Returns hex-encoded ciphertext
 */
export function encryptBetData(
  teePubKeyHex: string,
  betData: BetData
): string {
  const plaintext = new TextEncoder().encode(JSON.stringify(betData));
  const encrypted = eciesEncrypt(teePubKeyHex, plaintext);
  return "0x" + bytesToHex(encrypted);
}
