// ============================================
// APP CONSTANTS
// ============================================

export const APP_NAME = "wthelly";
export const APP_DESCRIPTION = "Bet on anything. Hidden positions. Maximum aura. No cap fr fr.";

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
  betRevealed: "Bet revealed! Let's see if you cooked 🍳",
  depositComplete: "Funds secured 💰 Ready to bet",
  winnings: "W DETECTED 🔥 You're actually cracked",

  // Error
  insufficientBalance: "You're broke fr 😭 Deposit more",
  betFailed: "Bruh. Something broke 💀 Try again",
  revealFailed: "Reveal failed 💀 Check your connection",
  networkError: "Network error 🌐 Not very sigma of you",

  // Loading
  placingBet: "Cooking... 🍳",
  revealing: "Revealing your position...",
  depositing: "Bridging funds...",

  // Info
  marketClosed: "Market closed. No more bets fr",
  revealWindow: "Reveal window open! Claim your winnings",
  hiddenBet: "Your position is hidden until resolution",
};

// Aura thresholds
export const AURA_THRESHOLDS = {
  npc: 0,
  "rizz-apprentice": 100,
  "aura-farmer": 500,
  sigma: 1000,
  gigachad: 2500,
  "skibidi-god": 5000,
};

// External links
export const EXTERNAL_LINKS = {
  github: "https://github.com/what-the-helly-market",
  docs: "https://docs.whatthehelly.market",
  twitter: "https://twitter.com/whatthehelly",
  discord: "https://discord.gg/whatthehelly",
};

// Contract addresses (placeholders)
export const CONTRACTS = {
  hellyHook: "0x0000000000000000000000000000000000000000",
  yellowChannel: "0x0000000000000000000000000000000000000000",
  usdc: "0x0000000000000000000000000000000000000000",
};

