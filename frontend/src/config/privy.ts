import type { PrivyClientConfig } from "@privy-io/react-auth";
import { unichainSepolia } from "viem/chains";

export const PRIVY_APP_ID =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmjzw9suo00p1l80c68gipkmc";

export const privyConfig: PrivyClientConfig = {
  defaultChain: unichainSepolia,
  supportedChains: [unichainSepolia],
  appearance: {
    theme: "dark",
    accentColor: "#BFFF00",
  },
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
  loginMethods: ["wallet"],
};
