import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from multiple locations
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  teeMode: (process.env.TEE_MODE || 'local-dev') as 'local-dev' | 'enclave',
  enclaveKeyPath: process.env.ENCLAVE_KEY_PATH || '/app/ecdsa.sec',

  // Clearnode WebSocket
  clearnodeWsUrl: process.env.CLEARNODE_WS_URL || 'ws://localhost:8000/ws',

  // EVM chain config (Unichain Sepolia)
  rpcUrl: process.env.RPC_URL || 'https://sepolia.unichain.org',
  chainId: parseInt(process.env.CHAIN_ID || '1301', 10),
  hellyHookAddress: process.env.HELLY_HOOK_ADDRESS || '0x218dc19b1e7dab45149a564839fffd2d6ed9e1ce',

  // ZK circuit paths
  wasmPath: process.env.WASM_PATH || path.resolve(__dirname, '../../circuits/build/settlement_verify_js/settlement_verify.wasm'),
  zkeyPath: process.env.ZKEY_PATH || path.resolve(__dirname, '../../circuits/build/settlement_verify.zkey'),

  // Platform fee
  feeBps: parseInt(process.env.FEE_BPS || '200', 10),

  // Max bets per market (must match circuit)
  maxBets: 32,
};
