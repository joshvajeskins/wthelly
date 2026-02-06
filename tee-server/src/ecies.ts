import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';
import { gcm } from '@noble/ciphers/aes';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils';

const ECIES_INFO = new TextEncoder().encode('wthelly-ecies-v1');

/**
 * ECIES encryption using secp256k1 ECDH + HKDF + AES-256-GCM
 *
 * Ciphertext format: [65 bytes ephemeral pubkey | 12 bytes nonce | ciphertext | 16 bytes GCM tag]
 */

export function eciesEncrypt(recipientPubKey: Uint8Array, plaintext: Uint8Array): Uint8Array {
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

export function eciesDecrypt(privateKey: Uint8Array, data: Uint8Array): Uint8Array {
  // Unpack
  const ephemeralPub = data.slice(0, 65);
  const nonce = data.slice(65, 77);
  const ciphertext = data.slice(77);

  // ECDH shared secret
  const sharedPoint = secp256k1.getSharedSecret(privateKey, ephemeralPub);

  // Derive AES key via HKDF-SHA256
  const aesKey = hkdf(sha256, sharedPoint.slice(1, 33), undefined, ECIES_INFO, 32);

  // AES-256-GCM decrypt
  const decipher = gcm(aesKey, nonce);
  return decipher.decrypt(ciphertext);
}

export function encryptBetData(
  recipientPubKey: Uint8Array,
  betData: {
    marketId: string;
    isYes: boolean;
    amount: string;
    secret: string;
    address: string;
  }
): string {
  const plaintext = new TextEncoder().encode(JSON.stringify(betData));
  const encrypted = eciesEncrypt(recipientPubKey, plaintext);
  return '0x' + bytesToHex(encrypted);
}

export function decryptBetData(
  privateKey: Uint8Array,
  encryptedHex: string
): { marketId: string; isYes: boolean; amount: string; secret: string; address: string } {
  const data = hexToBytes(encryptedHex.replace('0x', ''));
  const decrypted = eciesDecrypt(privateKey, data);
  return JSON.parse(new TextDecoder().decode(decrypted));
}
