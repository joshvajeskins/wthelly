import {
  Market,
  Bet,
  User,
  Deposit,
  ChannelState,
} from "@/types";

// ============================================
// MOCK MARKETS
// ============================================

export const mockMarkets: Market[] = [
  {
    id: "market-1",
    question: "Will ETH hit $5,000 by March 2025?",
    description:
      "Market resolves YES if ETH/USD price reaches $5,000 or higher on Uniswap v4 before March 1, 2025.",
    category: "crypto",
    deadline: new Date("2025-03-01T00:00:00Z"),
    resolutionType: "price",
    poolKey: "0xETH_USDC_POOL",
    targetPrice: 5000,
    isAbove: true,
    status: "open",
    participantCount: 342,
    createdAt: new Date("2025-01-15T10:00:00Z"),
    creatorAddress: "0x1234567890abcdef1234567890abcdef12345678",
  },
  {
    id: "market-2",
    question: "Bitcoin $100k end of 2025?",
    description:
      "Market resolves YES if BTC/USD reaches $100,000 before December 31, 2025.",
    category: "crypto",
    deadline: new Date("2025-12-31T23:59:59Z"),
    resolutionType: "price",
    poolKey: "0xBTC_USDC_POOL",
    targetPrice: 100000,
    isAbove: true,
    status: "open",
    participantCount: 891,
    createdAt: new Date("2025-01-10T08:00:00Z"),
    creatorAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
  },
  {
    id: "market-3",
    question: "Will Solana flip Ethereum in market cap?",
    description:
      "Market resolves YES if SOL market cap exceeds ETH market cap at any point in 2025.",
    category: "crypto",
    deadline: new Date("2025-12-31T23:59:59Z"),
    resolutionType: "admin",
    status: "open",
    participantCount: 156,
    createdAt: new Date("2025-01-20T14:00:00Z"),
    creatorAddress: "0x9876543210fedcba9876543210fedcba98765432",
  },
  {
    id: "market-4",
    question: "Super Bowl LXIX - Chiefs vs 49ers?",
    description:
      "Will the Kansas City Chiefs play against the San Francisco 49ers in Super Bowl LXIX?",
    category: "sports",
    deadline: new Date("2025-02-09T18:00:00Z"),
    resolutionType: "admin",
    status: "open",
    participantCount: 234,
    createdAt: new Date("2025-01-25T12:00:00Z"),
    creatorAddress: "0xfedcba9876543210fedcba9876543210fedcba98",
  },
  {
    id: "market-5",
    question: "Will GPT-5 be released before July 2025?",
    description:
      "Market resolves YES if OpenAI officially releases GPT-5 (or equivalent successor to GPT-4) before July 1, 2025.",
    category: "entertainment",
    deadline: new Date("2025-07-01T00:00:00Z"),
    resolutionType: "admin",
    status: "open",
    participantCount: 178,
    createdAt: new Date("2025-01-18T09:00:00Z"),
    creatorAddress: "0x1111222233334444555566667777888899990000",
  },
  {
    id: "market-6",
    question: "DOGE to $1?",
    description:
      "Will Dogecoin reach $1.00 USD at any point during 2025?",
    category: "crypto",
    deadline: new Date("2025-12-31T23:59:59Z"),
    resolutionType: "price",
    poolKey: "0xDOGE_USDC_POOL",
    targetPrice: 1,
    isAbove: true,
    status: "open",
    participantCount: 567,
    createdAt: new Date("2025-01-22T16:00:00Z"),
    creatorAddress: "0xaaaa1111bbbb2222cccc3333dddd4444eeee5555",
  },
  {
    id: "market-7",
    question: "Fed rate cut in Q1 2025?",
    description:
      "Will the Federal Reserve cut interest rates in Q1 2025?",
    category: "politics",
    deadline: new Date("2025-03-31T23:59:59Z"),
    resolutionType: "admin",
    status: "open",
    participantCount: 289,
    createdAt: new Date("2025-01-05T11:00:00Z"),
    creatorAddress: "0x5555666677778888999900001111222233334444",
  },
  {
    id: "market-8",
    question: "Ethereum Layer 2 TVL > $100B?",
    description:
      "Will total TVL across all Ethereum L2s exceed $100 billion before end of 2025?",
    category: "crypto",
    deadline: new Date("2025-12-31T23:59:59Z"),
    resolutionType: "price",
    poolKey: "0xL2_TVL_ORACLE",
    targetPrice: 100000000000,
    isAbove: true,
    status: "open",
    participantCount: 145,
    createdAt: new Date("2025-01-28T13:00:00Z"),
    creatorAddress: "0xbbbb3333cccc4444dddd5555eeee6666ffff7777",
  },
];

// ============================================
// MOCK USER
// ============================================

export const mockUser: User = {
  address: "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00",
  username: "cryptochad",
  wins: 47,
  losses: 23,
  winRate: 67,
  totalWagered: 12450,
  streak: 3,
  channelBalance: 1450,
  channelNonce: 42,
  createdAt: new Date("2024-12-01T10:00:00Z"),
};

// ============================================
// MOCK BETS
// ============================================

export const mockBets: Bet[] = [
  {
    id: "bet-1",
    marketId: "market-1",
    userAddress: mockUser.address,
    amount: 100,
    direction: undefined, // Encrypted — only TEE knows
    status: "active",
    createdAt: new Date("2025-01-30T14:00:00Z"),
  },
  {
    id: "bet-2",
    marketId: "market-2",
    userAddress: mockUser.address,
    amount: 50,
    direction: "yes", // User can see their own bet
    status: "active",
    createdAt: new Date("2025-01-29T10:00:00Z"),
  },
  {
    id: "bet-3",
    marketId: "market-4",
    userAddress: mockUser.address,
    amount: 200,
    direction: "no",
    status: "active",
    createdAt: new Date("2025-01-28T16:00:00Z"),
  },
];

// Mock bet history (resolved)
export const mockBetHistory: Bet[] = [
  {
    id: "bet-h1",
    marketId: "market-old-1",
    userAddress: mockUser.address,
    amount: 75,
    direction: "yes",
    status: "won",
    payout: 142.5,
    createdAt: new Date("2025-01-15T10:00:00Z"),
  },
  {
    id: "bet-h2",
    marketId: "market-old-2",
    userAddress: mockUser.address,
    amount: 50,
    direction: "no",
    status: "won",
    payout: 87.5,
    createdAt: new Date("2025-01-10T14:00:00Z"),
  },
  {
    id: "bet-h3",
    marketId: "market-old-3",
    userAddress: mockUser.address,
    amount: 100,
    direction: "yes",
    status: "lost",
    payout: 0,
    createdAt: new Date("2025-01-05T09:00:00Z"),
  },
];

// ============================================
// MOCK CHANNEL STATE
// ============================================

export const mockChannelState: ChannelState = {
  channelId: "channel-1",
  userAddress: mockUser.address,
  balance: 1450,
  nonce: 42,
  activeBets: ["bet-1", "bet-2", "bet-3"],
  lockedAmount: 350,
  availableBalance: 1100,
  lastUpdated: new Date(),
};

// ============================================
// MOCK DEPOSITS
// ============================================

export const mockDeposits: Deposit[] = [
  {
    id: "deposit-1",
    userAddress: mockUser.address,
    sourceChain: "ethereum",
    sourceToken: "ETH",
    sourceAmount: 0.5,
    destAmount: 1600,
    lifiTxHash: "0xaaa...",
    status: "completed",
    createdAt: new Date("2025-01-25T10:00:00Z"),
    completedAt: new Date("2025-01-25T10:05:00Z"),
  },
  {
    id: "deposit-2",
    userAddress: mockUser.address,
    sourceChain: "arbitrum",
    sourceToken: "USDC",
    sourceAmount: 500,
    destAmount: 500,
    lifiTxHash: "0xbbb...",
    status: "completed",
    createdAt: new Date("2025-01-20T14:00:00Z"),
    completedAt: new Date("2025-01-20T14:02:00Z"),
  },
];

// ============================================
// MOCK USERS
// ============================================

export const mockUsers: User[] = [
  mockUser,
  {
    address: "0x1111111111111111111111111111111111111111",
    username: "skibidiking",
    wins: 89,
    losses: 34,
    winRate: 72,
    totalWagered: 45000,
    streak: 5,
    channelBalance: 3200,
    channelNonce: 156,
    createdAt: new Date("2024-10-15T08:00:00Z"),
  },
  {
    address: "0x2222222222222222222222222222222222222222",
    username: "rizzlord",
    wins: 67,
    losses: 45,
    winRate: 60,
    totalWagered: 28000,
    streak: 2,
    channelBalance: 2100,
    channelNonce: 98,
    createdAt: new Date("2024-11-01T12:00:00Z"),
  },
  {
    address: "0x3333333333333333333333333333333333333333",
    username: "betmaxxer",
    wins: 45,
    losses: 38,
    winRate: 54,
    totalWagered: 15000,
    streak: -2,
    channelBalance: 890,
    channelNonce: 67,
    createdAt: new Date("2024-11-20T16:00:00Z"),
  },
  {
    address: "0x4444444444444444444444444444444444444444",
    username: "cryptoking",
    wins: 120,
    losses: 40,
    winRate: 75,
    totalWagered: 78000,
    streak: 8,
    channelBalance: 5600,
    channelNonce: 234,
    createdAt: new Date("2024-09-01T10:00:00Z"),
  },
  {
    address: "0x5555555555555555555555555555555555555555",
    username: "noobslayer",
    wins: 78,
    losses: 52,
    winRate: 60,
    totalWagered: 34000,
    streak: 3,
    channelBalance: 2800,
    channelNonce: 145,
    createdAt: new Date("2024-10-01T14:00:00Z"),
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

// Market helpers
export function getMarketById(id: string): Market | undefined {
  return mockMarkets.find((m) => m.id === id);
}

export function getMarketsByCategory(category: string): Market[] {
  return mockMarkets.filter((m) => m.category === category);
}

export function getOpenMarkets(): Market[] {
  return mockMarkets.filter((m) => m.status === "open");
}

export function getTrendingMarkets(limit = 5): Market[] {
  return [...mockMarkets]
    .sort((a, b) => b.participantCount - a.participantCount)
    .slice(0, limit);
}

export function getUserBets(userAddress: string): Bet[] {
  return mockBets.filter((b) => b.userAddress === userAddress);
}

export function getMarketBets(marketId: string): Bet[] {
  return mockBets.filter((b) => b.marketId === marketId);
}

// User helpers
export function getUserByAddress(address: string): User | undefined {
  return mockUsers.find((u) => u.address === address);
}
