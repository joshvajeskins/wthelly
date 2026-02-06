// ============================================
// APP CONSTANTS
// ============================================

export const APP_NAME = "wthelly";
export const APP_DESCRIPTION = "Bet on anything. Hidden positions. No cap fr fr.";

// Platform fee (Fanum Tax)
export const PLATFORM_FEE_PERCENT = 2;

// Reveal window duration (1 hour in milliseconds)
export const REVEAL_WINDOW_MS = 60 * 60 * 1000;

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

// Contract addresses (Base Sepolia)
export const CONTRACTS = {
  hellyHook: "0x218dc19b1e7dab45149a564839fffd2d6ed9e1ce" as `0x${string}`,
  usdc: "0xf678f6cca06fa7b94e59f84229c13942a90a03b8" as `0x${string}`,
};

// HellyHook deployment block on Base Sepolia (for efficient event scanning)
export const HELLY_HOOK_DEPLOY_BLOCK = 22380000n;

// USDC decimals
export const USDC_DECIMALS = 6;
export const ONE_USDC = BigInt(1e6);

