/**
 * Bet commitment generation — creates secrets and hashes for the commit-reveal pattern.
 */

import { type Hex, type Address, keccak256, encodePacked, encodeAbiParameters } from "viem";
import crypto from "crypto";

/**
 * Generate a random 32-byte secret
 */
export function generateSecret(): Hex {
  const bytes = crypto.randomBytes(32);
  return `0x${bytes.toString("hex")}` as Hex;
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
