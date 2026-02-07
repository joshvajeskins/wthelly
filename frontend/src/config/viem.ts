import { createPublicClient, http } from "viem";
import { unichainSepolia } from "viem/chains";

export const publicClient = createPublicClient({
  chain: unichainSepolia,
  transport: http("https://sepolia.unichain.org"),
});
