/**
 * Bet commitment generation — browser-compatible version.
 * Creates secrets and hashes for the commit-reveal pattern.
 */

import {
  type Hex,
  type Address,
  keccak256,
  encodePacked,
  encodeAbiParameters,
} from "viem";

/**
 * Generate a random 32-byte secret (browser-safe)
 */
export function generateSecret(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as Hex;
}

/**
 * Compute the commitment hash matching the on-chain formula:
 * keccak256(abi.encode(marketId, isYes, amount, secret, user))
 */
export function computeCommitmentHash(
  marketId: Hex,
  isYes: boolean,
  amount: bigint,
  secret: Hex,
  user: Address
): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "bool" },
        { type: "uint256" },
        { type: "bytes32" },
        { type: "address" },
      ],
      [marketId, isYes, amount, secret, user]
    )
  );
}

/**
 * Generate a market ID from a question string
 */
export function generateMarketId(question: string): Hex {
  return keccak256(encodePacked(["string"], [question]));
}
