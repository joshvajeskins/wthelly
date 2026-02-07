// ============================================
// APP CONSTANTS
// ============================================

export const APP_NAME = "wthelly";
export const APP_DESCRIPTION = "Bet on anything. Hidden positions. No cap fr fr.";

// Platform fee (Fanum Tax)
export const PLATFORM_FEE_PERCENT = 2;

// Minimum bet amount (USDC)
export const MIN_BET_AMOUNT = 1;

// Maximum bet amount (USDC)
export const MAX_BET_AMOUNT = 100000;

// Quick amount options for betting
export const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

// Supported chains for deposits
export const SUPPORTED_CHAINS = [
  { id: "ethereum", name: "Ethereum", icon: "⟠" },
  { id: "arbitrum", name: "Arbitrum", icon: "🔷" },
  { id: "base", name: "Base", icon: "🔵" },
  { id: "polygon", name: "Polygon", icon: "🟣" },
  { id: "optimism", name: "Optimism", icon: "🔴" },
];

// Supported tokens for deposits
export const SUPPORTED_TOKENS = [
  { symbol: "ETH", name: "Ethereum", decimals: 18 },
  { symbol: "USDC", name: "USD Coin", decimals: 6 },
  { symbol: "USDT", name: "Tether", decimals: 6 },
  { symbol: "DAI", name: "Dai", decimals: 18 },
];

// Navigation links
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/markets", label: "Markets" },
  { href: "/profile", label: "Profile" },
  { href: "/deposit", label: "Deposit" },
];

// Category config
export const CATEGORIES = [
  { id: "crypto", label: "Crypto", emoji: "₿" },
  { id: "sports", label: "Sports", emoji: "⚽" },
  { id: "politics", label: "Politics", emoji: "🏛️" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "other", label: "Other", emoji: "❓" },
] as const;

// Status messages (brainrot edition)
export const STATUS_MESSAGES = {
  // Success
  betPlaced: "That's bussin ✅ Bet placed fr fr",
  depositComplete: "Funds secured 💰 Ready to bet",
  winnings: "W DETECTED 🔥 You're actually cracked",

  // Error
  insufficientBalance: "You're broke fr 😭 Deposit more",
  betFailed: "Bruh. Something broke 💀 Try again",
  networkError: "Network error 🌐 Check your connection",

  // Loading
  placingBet: "Cooking... 🍳",
  depositing: "Bridging funds...",

  // Info
  marketClosed: "Market closed. No more bets fr",
  encryptedBet: "Your bet is encrypted in the TEE until resolution",
};

// External links
export const EXTERNAL_LINKS = {
  github: "https://github.com/what-the-helly-market",
  docs: "https://docs.whatthehelly.market",
  twitter: "https://twitter.com/whatthehelly",
  discord: "https://discord.gg/whatthehelly",
};

// TEE server URL
export const TEE_SERVER_URL = process.env.NEXT_PUBLIC_TEE_SERVER_URL || "http://localhost:3001";

// Clearnode / ERC-7824 contract addresses (deployed on Unichain Sepolia)
export const CLEARNODE_CONTRACTS = {
  custody: "0xbc971a5be98ee37bdb82ca3e79f8e592dfcf0865" as `0x${string}`,
  adjudicator: "0xF7dA4205B3BF5DE8572e38c798C245B20C4f6243" as `0x${string}`,
  usdc: "0xd8f50a509efe389574dd378b0ef03e33558222ea" as `0x${string}`,
} as const;

// Asset symbol matching Clearnode assets.yaml
export const CLEARNODE_ASSET_SYMBOL = "wthelly.usd";

// Clearnode WebSocket URL
export const CLEARNODE_WS_URL = process.env.NEXT_PUBLIC_CLEARNODE_WS_URL || "ws://localhost:8000/ws";

// TEE public address (broker/admin — derived from EVM_PRIVATE_KEY)
export const TEE_ADDRESS = "0x32FE11d9900D63350016374BE98ff37c3Af75847" as `0x${string}`;

// TEE public key (ECIES encryption target — uncompressed secp256k1, 65 bytes)
export const TEE_PUBLIC_KEY = "0x04531049d0d76160fa47d3df1e21a92a41af0d2f6ce098d4843a8fb3979b5db8a3a1af13af718edebd4c712f35c7c6defe97aeab227f627e5dc530329a522c40b8";

// Contract addresses (Unichain Sepolia)
export const CONTRACTS = {
  hellyHook: (process.env.NEXT_PUBLIC_HELLY_HOOK_ADDRESS || "0x6feb4f3eed23d6cdda54ec67d5d649be015f782d") as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0xd8f50a509efe389574dd378b0ef03e33558222ea") as `0x${string}`,
};

// HellyHook deployment block on Unichain Sepolia (for efficient event scanning)
export const HELLY_HOOK_DEPLOY_BLOCK = 43582376n;

// USDC decimals
export const USDC_DECIMALS = 6;
export const ONE_USDC = BigInt(1e6);

