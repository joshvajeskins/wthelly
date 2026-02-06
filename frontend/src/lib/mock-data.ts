import {
  Market,
  Bet,
  User,
  Deposit,
  ChannelState,
  Squad,
  SigmaBattle,
  OneVOneBattle,
  SquadLeaderboardEntry,
  UserLeaderboardEntry,
  getUserStatus,
} from "@/types";

// ============================================
// MOCK MARKETS
// ============================================

export const mockMarkets: Market[] = [
  {
    id: "market-1",
    question: "Will ETH hit $5,000 by March 2025?",
    description:
      "Market resolves YES if ETH/USD price reaches $5,000 or higher on any major exchange before March 1, 2025.",
    category: "crypto",
    deadline: new Date("2025-03-01T00:00:00Z"),
    yesPool: 78500,
    noPool: 49000,
    totalPool: 127500,
    type: "public",
    status: "open",
    oracleSource: "chainlink:eth-usd",
    targetValue: 5000,
    createdAt: new Date("2025-01-15T10:00:00Z"),
    creatorAddress: "0x1234567890abcdef1234567890abcdef12345678",
    betCount: 342,
  },
  {
    id: "market-2",
    question: "Bitcoin $100k end of 2025?",
    description:
      "Market resolves YES if BTC/USD reaches $100,000 before December 31, 2025.",
    category: "crypto",
    deadline: new Date("2025-12-31T23:59:59Z"),
    yesPool: 156000,
    noPool: 89200,
    totalPool: 245200,
    type: "public",
    status: "open",
    oracleSource: "chainlink:btc-usd",
    targetValue: 100000,
    createdAt: new Date("2025-01-10T08:00:00Z"),
    creatorAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    betCount: 891,
  },
  {
    id: "market-3",
    question: "Will Solana flip Ethereum in market cap?",
    description:
      "Market resolves YES if SOL market cap exceeds ETH market cap at any point in 2025.",
    category: "crypto",
    deadline: new Date("2025-12-31T23:59:59Z"),
    yesPool: 23000,
    noPool: 67000,
    totalPool: 90000,
    type: "public",
    status: "open",
    oracleSource: "coingecko:market-cap",
    createdAt: new Date("2025-01-20T14:00:00Z"),
    creatorAddress: "0x9876543210fedcba9876543210fedcba98765432",
    betCount: 156,
  },
  {
    id: "market-4",
    question: "Super Bowl LXIX - Chiefs vs 49ers?",
    description:
      "Will the Kansas City Chiefs play against the San Francisco 49ers in Super Bowl LXIX?",
    category: "sports",
    deadline: new Date("2025-02-09T18:00:00Z"),
    yesPool: 45000,
    noPool: 55000,
    totalPool: 100000,
    type: "public",
    status: "open",
    oracleSource: "manual:sports",
    createdAt: new Date("2025-01-25T12:00:00Z"),
    creatorAddress: "0xfedcba9876543210fedcba9876543210fedcba98",
    betCount: 234,
  },
  {
    id: "market-5",
    question: "Will GPT-5 be released before July 2025?",
    description:
      "Market resolves YES if OpenAI officially releases GPT-5 (or equivalent successor to GPT-4) before July 1, 2025.",
    category: "entertainment",
    deadline: new Date("2025-07-01T00:00:00Z"),
    yesPool: 34500,
    noPool: 28500,
    totalPool: 63000,
    type: "public",
    status: "open",
    oracleSource: "manual:tech",
    createdAt: new Date("2025-01-18T09:00:00Z"),
    creatorAddress: "0x1111222233334444555566667777888899990000",
    betCount: 178,
  },
  {
    id: "market-6",
    question: "DOGE to $1?",
    description:
      "Will Dogecoin reach $1.00 USD at any point during 2025?",
    category: "crypto",
    deadline: new Date("2025-12-31T23:59:59Z"),
    yesPool: 12000,
    noPool: 88000,
    totalPool: 100000,
    type: "public",
    status: "open",
    oracleSource: "chainlink:doge-usd",
    targetValue: 1,
    createdAt: new Date("2025-01-22T16:00:00Z"),
    creatorAddress: "0xaaaa1111bbbb2222cccc3333dddd4444eeee5555",
    betCount: 567,
  },
  {
    id: "market-7",
    question: "Fed rate cut in Q1 2025?",
    description:
      "Will the Federal Reserve cut interest rates in Q1 2025?",
    category: "politics",
    deadline: new Date("2025-03-31T23:59:59Z"),
    yesPool: 67000,
    noPool: 43000,
    totalPool: 110000,
    type: "public",
    status: "open",
    oracleSource: "manual:fed",
    createdAt: new Date("2025-01-05T11:00:00Z"),
    creatorAddress: "0x5555666677778888999900001111222233334444",
    betCount: 289,
  },
  {
    id: "market-8",
    question: "Ethereum Layer 2 TVL > $100B?",
    description:
      "Will total TVL across all Ethereum L2s exceed $100 billion before end of 2025?",
    category: "crypto",
    deadline: new Date("2025-12-31T23:59:59Z"),
    yesPool: 45000,
    noPool: 35000,
    totalPool: 80000,
    type: "public",
    status: "open",
    oracleSource: "defillama:l2-tvl",
    targetValue: 100000000000,
    createdAt: new Date("2025-01-28T13:00:00Z"),
    creatorAddress: "0xbbbb3333cccc4444dddd5555eeee6666ffff7777",
    betCount: 145,
  },
];

// ============================================
// MOCK USER
// ============================================

export const mockUser: User = {
  address: "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00",
  username: "cryptochad",
  aura: 1250,
  rizz: 420,
  wins: 47,
  losses: 23,
  winRate: 67,
  totalWagered: 12450,
  status: getUserStatus(1250),
  streak: 3,
  squadId: "squad-1",
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
    commitmentHash: "0xabc123...",
    amount: 100,
    direction: undefined, // Hidden in cap mode
    status: "active",
    revealed: false,
    createdAt: new Date("2025-01-30T14:00:00Z"),
  },
  {
    id: "bet-2",
    marketId: "market-2",
    userAddress: mockUser.address,
    commitmentHash: "0xdef456...",
    amount: 50,
    direction: "yes", // Visible in no-cap mode
    status: "active",
    revealed: false,
    createdAt: new Date("2025-01-29T10:00:00Z"),
  },
  {
    id: "bet-3",
    marketId: "market-4",
    userAddress: mockUser.address,
    commitmentHash: "0xghi789...",
    amount: 200,
    direction: "no",
    status: "active",
    revealed: false,
    createdAt: new Date("2025-01-28T16:00:00Z"),
  },
];

// Mock bet history (resolved)
export const mockBetHistory: Bet[] = [
  {
    id: "bet-h1",
    marketId: "market-old-1",
    userAddress: mockUser.address,
    commitmentHash: "0x111...",
    amount: 75,
    direction: "yes",
    status: "won",
    revealed: true,
    payout: 142.5,
    createdAt: new Date("2025-01-15T10:00:00Z"),
    revealedAt: new Date("2025-01-20T12:00:00Z"),
  },
  {
    id: "bet-h2",
    marketId: "market-old-2",
    userAddress: mockUser.address,
    commitmentHash: "0x222...",
    amount: 50,
    direction: "no",
    status: "won",
    revealed: true,
    payout: 87.5,
    createdAt: new Date("2025-01-10T14:00:00Z"),
    revealedAt: new Date("2025-01-15T16:00:00Z"),
  },
  {
    id: "bet-h3",
    marketId: "market-old-3",
    userAddress: mockUser.address,
    commitmentHash: "0x333...",
    amount: 100,
    direction: "yes",
    status: "lost",
    revealed: true,
    payout: 0,
    createdAt: new Date("2025-01-05T09:00:00Z"),
    revealedAt: new Date("2025-01-10T11:00:00Z"),
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
// MOCK USERS (for squads and leaderboard)
// ============================================

export const mockUsers: User[] = [
  mockUser,
  {
    address: "0x1111111111111111111111111111111111111111",
    username: "skibidiking",
    aura: 2800,
    rizz: 890,
    wins: 89,
    losses: 34,
    winRate: 72,
    totalWagered: 45000,
    status: getUserStatus(2800),
    streak: 5,
    squadId: "squad-1",
    channelBalance: 3200,
    channelNonce: 156,
    createdAt: new Date("2024-10-15T08:00:00Z"),
  },
  {
    address: "0x2222222222222222222222222222222222222222",
    username: "rizzlord",
    aura: 1800,
    rizz: 650,
    wins: 67,
    losses: 45,
    winRate: 60,
    totalWagered: 28000,
    status: getUserStatus(1800),
    streak: 2,
    squadId: "squad-1",
    channelBalance: 2100,
    channelNonce: 98,
    createdAt: new Date("2024-11-01T12:00:00Z"),
  },
  {
    address: "0x3333333333333333333333333333333333333333",
    username: "aurachaser",
    aura: 950,
    rizz: 380,
    wins: 45,
    losses: 38,
    winRate: 54,
    totalWagered: 15000,
    status: getUserStatus(950),
    streak: -2,
    squadId: "squad-1",
    channelBalance: 890,
    channelNonce: 67,
    createdAt: new Date("2024-11-20T16:00:00Z"),
  },
  {
    address: "0x4444444444444444444444444444444444444444",
    username: "sigmabro",
    aura: 3500,
    rizz: 1200,
    wins: 120,
    losses: 40,
    winRate: 75,
    totalWagered: 78000,
    status: getUserStatus(3500),
    streak: 8,
    squadId: "squad-2",
    channelBalance: 5600,
    channelNonce: 234,
    createdAt: new Date("2024-09-01T10:00:00Z"),
  },
  {
    address: "0x5555555555555555555555555555555555555555",
    username: "noobslayer",
    aura: 2200,
    rizz: 780,
    wins: 78,
    losses: 52,
    winRate: 60,
    totalWagered: 34000,
    status: getUserStatus(2200),
    streak: 3,
    squadId: "squad-2",
    channelBalance: 2800,
    channelNonce: 145,
    createdAt: new Date("2024-10-01T14:00:00Z"),
  },
  {
    address: "0x6666666666666666666666666666666666666666",
    username: "betmaxxer",
    aura: 1600,
    rizz: 520,
    wins: 56,
    losses: 44,
    winRate: 56,
    totalWagered: 22000,
    status: getUserStatus(1600),
    streak: 1,
    squadId: "squad-2",
    channelBalance: 1900,
    channelNonce: 89,
    createdAt: new Date("2024-11-15T09:00:00Z"),
  },
  {
    address: "0x7777777777777777777777777777777777777777",
    username: "gigachad420",
    aura: 5200,
    rizz: 1800,
    wins: 156,
    losses: 45,
    winRate: 78,
    totalWagered: 120000,
    status: getUserStatus(5200),
    streak: 12,
    squadId: "squad-3",
    channelBalance: 8900,
    channelNonce: 345,
    createdAt: new Date("2024-08-01T08:00:00Z"),
  },
  {
    address: "0x8888888888888888888888888888888888888888",
    username: "fanum",
    aura: 4100,
    rizz: 1450,
    wins: 134,
    losses: 56,
    winRate: 71,
    totalWagered: 89000,
    status: getUserStatus(4100),
    streak: 6,
    squadId: "squad-3",
    channelBalance: 6700,
    channelNonce: 267,
    createdAt: new Date("2024-08-15T12:00:00Z"),
  },
  {
    address: "0x9999999999999999999999999999999999999999",
    username: "gyatt",
    aura: 2900,
    rizz: 950,
    wins: 98,
    losses: 67,
    winRate: 59,
    totalWagered: 56000,
    status: getUserStatus(2900),
    streak: -1,
    squadId: "squad-3",
    channelBalance: 3400,
    channelNonce: 178,
    createdAt: new Date("2024-09-20T16:00:00Z"),
  },
  {
    address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    username: "mewing",
    aura: 780,
    rizz: 290,
    wins: 34,
    losses: 28,
    winRate: 55,
    totalWagered: 8900,
    status: getUserStatus(780),
    streak: 2,
    squadId: "squad-4",
    channelBalance: 650,
    channelNonce: 45,
    createdAt: new Date("2024-12-01T10:00:00Z"),
  },
  {
    address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    username: "looksmaxxer",
    aura: 620,
    rizz: 230,
    wins: 28,
    losses: 25,
    winRate: 53,
    totalWagered: 6500,
    status: getUserStatus(620),
    streak: 1,
    squadId: "squad-4",
    channelBalance: 450,
    channelNonce: 34,
    createdAt: new Date("2024-12-10T14:00:00Z"),
  },
  {
    address: "0xcccccccccccccccccccccccccccccccccccccccc",
    username: "edgelordd",
    aura: 450,
    rizz: 180,
    wins: 22,
    losses: 23,
    winRate: 49,
    totalWagered: 4200,
    status: getUserStatus(450),
    streak: -3,
    squadId: "squad-4",
    channelBalance: 320,
    channelNonce: 28,
    createdAt: new Date("2024-12-20T08:00:00Z"),
  },
];

// ============================================
// MOCK SQUADS
// ============================================

export const mockSquads: Squad[] = [
  {
    id: "squad-1",
    name: "sigma grindset",
    leaderId: "0x1111111111111111111111111111111111111111",
    members: [
      mockUser.address,
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333",
    ],
    aura: 6800,
    totalRizz: 2340,
    wins: 23,
    losses: 8,
    inviteCode: "SIGMA1",
    status: "active",
    createdAt: new Date("2024-11-01T10:00:00Z"),
  },
  {
    id: "squad-2",
    name: "aura farmers",
    leaderId: "0x4444444444444444444444444444444444444444",
    members: [
      "0x4444444444444444444444444444444444444444",
      "0x5555555555555555555555555555555555555555",
      "0x6666666666666666666666666666666666666666",
    ],
    aura: 7300,
    totalRizz: 2500,
    wins: 28,
    losses: 12,
    inviteCode: "AURA42",
    status: "active",
    createdAt: new Date("2024-10-15T14:00:00Z"),
  },
  {
    id: "squad-3",
    name: "skibidi toilet",
    leaderId: "0x7777777777777777777777777777777777777777",
    members: [
      "0x7777777777777777777777777777777777777777",
      "0x8888888888888888888888888888888888888888",
      "0x9999999999999999999999999999999999999999",
    ],
    aura: 12200,
    totalRizz: 4200,
    wins: 45,
    losses: 15,
    inviteCode: "SKIB69",
    status: "active",
    createdAt: new Date("2024-09-01T08:00:00Z"),
  },
  {
    id: "squad-4",
    name: "npc gang",
    leaderId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    members: [
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "0xcccccccccccccccccccccccccccccccccccccccc",
    ],
    aura: 1850,
    totalRizz: 700,
    wins: 8,
    losses: 14,
    inviteCode: "NPC000",
    status: "active",
    createdAt: new Date("2024-12-01T12:00:00Z"),
  },
];

// ============================================
// MOCK SIGMA BATTLES
// ============================================

const mock1v1Battles: OneVOneBattle[] = [
  // Battle 1 - squad-1 vs squad-2 (completed)
  {
    id: "1v1-1",
    sigmaBattleId: "battle-1",
    player1Address: mockUser.address,
    player2Address: "0x4444444444444444444444444444444444444444",
    player1Bet: 1000,
    player2Bet: 1000,
    player1Direction: "yes",
    player2Direction: "no",
    marketQuestion: "Will ETH hit $5,000 by March 2025?",
    winnerAddress: mockUser.address,
    rizzAwarded: 50,
    status: "completed",
    createdAt: new Date("2025-01-20T10:00:00Z"),
    completedAt: new Date("2025-01-25T12:00:00Z"),
  },
  {
    id: "1v1-2",
    sigmaBattleId: "battle-1",
    player1Address: "0x1111111111111111111111111111111111111111",
    player2Address: "0x5555555555555555555555555555555555555555",
    player1Bet: 1000,
    player2Bet: 1000,
    player1Direction: "yes",
    player2Direction: "yes",
    marketQuestion: "Bitcoin $100k end of 2025?",
    winnerAddress: "0x1111111111111111111111111111111111111111",
    rizzAwarded: 50,
    status: "completed",
    createdAt: new Date("2025-01-20T10:00:00Z"),
    completedAt: new Date("2025-01-25T12:00:00Z"),
  },
  {
    id: "1v1-3",
    sigmaBattleId: "battle-1",
    player1Address: "0x2222222222222222222222222222222222222222",
    player2Address: "0x6666666666666666666666666666666666666666",
    player1Bet: 1000,
    player2Bet: 1000,
    player1Direction: "no",
    player2Direction: "yes",
    marketQuestion: "Will Solana flip Ethereum in market cap?",
    winnerAddress: "0x2222222222222222222222222222222222222222",
    rizzAwarded: 50,
    status: "completed",
    createdAt: new Date("2025-01-20T10:00:00Z"),
    completedAt: new Date("2025-01-25T12:00:00Z"),
  },
  // Battle 2 - squad-1 vs squad-3 (in progress)
  {
    id: "1v1-4",
    sigmaBattleId: "battle-2",
    player1Address: mockUser.address,
    player2Address: "0x7777777777777777777777777777777777777777",
    player1Bet: 1000,
    player2Bet: 1000,
    player1Direction: "yes",
    player2Direction: undefined,
    marketQuestion: "DOGE to $1?",
    rizzAwarded: 0,
    status: "in_progress",
    createdAt: new Date("2025-02-01T10:00:00Z"),
  },
  {
    id: "1v1-5",
    sigmaBattleId: "battle-2",
    player1Address: "0x1111111111111111111111111111111111111111",
    player2Address: "0x8888888888888888888888888888888888888888",
    player1Bet: 1000,
    player2Bet: 1000,
    player1Direction: undefined,
    player2Direction: undefined,
    marketQuestion: "Fed rate cut in Q1 2025?",
    rizzAwarded: 0,
    status: "pending",
    createdAt: new Date("2025-02-01T10:00:00Z"),
  },
  {
    id: "1v1-6",
    sigmaBattleId: "battle-2",
    player1Address: "0x2222222222222222222222222222222222222222",
    player2Address: "0x9999999999999999999999999999999999999999",
    player1Bet: 1000,
    player2Bet: 1000,
    player1Direction: undefined,
    player2Direction: undefined,
    marketQuestion: "Ethereum Layer 2 TVL > $100B?",
    rizzAwarded: 0,
    status: "pending",
    createdAt: new Date("2025-02-01T10:00:00Z"),
  },
];

export const mockSigmaBattles: SigmaBattle[] = [
  {
    id: "battle-1",
    challengerSquadId: "squad-1",
    defenderSquadId: "squad-2",
    wagerAmount: 500,
    challengerRizz: 150,
    defenderRizz: 0,
    winnerSquadId: "squad-1",
    battles: mock1v1Battles.filter((b) => b.sigmaBattleId === "battle-1"),
    status: "completed",
    createdAt: new Date("2025-01-20T08:00:00Z"),
    startedAt: new Date("2025-01-20T10:00:00Z"),
    completedAt: new Date("2025-01-25T14:00:00Z"),
  },
  {
    id: "battle-2",
    challengerSquadId: "squad-1",
    defenderSquadId: "squad-3",
    wagerAmount: 1000,
    challengerRizz: 0,
    defenderRizz: 0,
    battles: mock1v1Battles.filter((b) => b.sigmaBattleId === "battle-2"),
    status: "in_progress",
    createdAt: new Date("2025-02-01T08:00:00Z"),
    startedAt: new Date("2025-02-01T10:00:00Z"),
  },
  {
    id: "battle-3",
    challengerSquadId: "squad-2",
    defenderSquadId: "squad-4",
    wagerAmount: 300,
    challengerRizz: 0,
    defenderRizz: 0,
    battles: [],
    status: "pending",
    createdAt: new Date("2025-02-03T14:00:00Z"),
  },
];

// ============================================
// MOCK PRIVATE MARKETS
// ============================================

export const mockPrivateMarkets: Market[] = [
  {
    id: "private-market-1",
    question: "Will ETH hit $5,000 by March 2025?",
    description: "Private market linked to public market resolution.",
    category: "crypto",
    deadline: new Date("2025-03-01T00:00:00Z"),
    yesPool: 500,
    noPool: 300,
    totalPool: 800,
    type: "private",
    linkedMarketId: "market-1",
    status: "open",
    createdAt: new Date("2025-01-28T10:00:00Z"),
    creatorAddress: mockUser.address,
    betCount: 4,
    inviteCode: "ETH5K",
    participants: [
      mockUser.address,
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
    ],
    maxParticipants: 5,
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

export function getPublicMarkets(): Market[] {
  return mockMarkets.filter((m) => m.type === "public");
}

export function getTrendingMarkets(limit = 5): Market[] {
  return [...mockMarkets]
    .sort((a, b) => b.totalPool - a.totalPool)
    .slice(0, limit);
}

export function getUserBets(userAddress: string): Bet[] {
  return mockBets.filter((b) => b.userAddress === userAddress);
}

export function getMarketBets(marketId: string): Bet[] {
  return mockBets.filter((b) => b.marketId === marketId);
}

export function getPrivateMarketsByUser(userAddress: string): Market[] {
  return mockPrivateMarkets.filter(
    (m) => m.creatorAddress === userAddress || m.participants?.includes(userAddress)
  );
}

export function getPrivateMarketByInviteCode(code: string): Market | undefined {
  return mockPrivateMarkets.find((m) => m.inviteCode === code);
}

// User helpers
export function getUserByAddress(address: string): User | undefined {
  return mockUsers.find((u) => u.address === address);
}

export function getUsersBySquad(squadId: string): User[] {
  return mockUsers.filter((u) => u.squadId === squadId);
}

// Squad helpers
export function getSquadById(id: string): Squad | undefined {
  return mockSquads.find((s) => s.id === id);
}

export function getSquadByInviteCode(code: string): Squad | undefined {
  return mockSquads.find((s) => s.inviteCode === code);
}

export function getUserSquad(userAddress: string): Squad | undefined {
  return mockSquads.find((s) => s.members.includes(userAddress));
}

export function getSquadMembers(squadId: string): User[] {
  const squad = getSquadById(squadId);
  if (!squad) return [];
  return squad.members.map((addr) => getUserByAddress(addr)).filter(Boolean) as User[];
}

// Battle helpers
export function getBattleById(id: string): SigmaBattle | undefined {
  return mockSigmaBattles.find((b) => b.id === id);
}

export function getSquadBattles(squadId: string): SigmaBattle[] {
  return mockSigmaBattles.filter(
    (b) => b.challengerSquadId === squadId || b.defenderSquadId === squadId
  );
}

export function getActiveBattles(squadId: string): SigmaBattle[] {
  return getSquadBattles(squadId).filter(
    (b) => b.status === "pending" || b.status === "accepted" || b.status === "in_progress"
  );
}

export function getCompletedBattles(squadId: string): SigmaBattle[] {
  return getSquadBattles(squadId).filter((b) => b.status === "completed");
}

export function getUserMatchup(
  battleId: string,
  userAddress: string
): OneVOneBattle | undefined {
  const battle = getBattleById(battleId);
  if (!battle) return undefined;
  return battle.battles.find(
    (b) => b.player1Address === userAddress || b.player2Address === userAddress
  );
}

// Leaderboard helpers
export function getSquadLeaderboard(): SquadLeaderboardEntry[] {
  return [...mockSquads]
    .sort((a, b) => b.aura - a.aura)
    .map((squad, index) => ({
      rank: index + 1,
      squad,
      aura: squad.aura,
      totalRizz: squad.totalRizz,
      winRate: squad.wins + squad.losses > 0
        ? Math.round((squad.wins / (squad.wins + squad.losses)) * 100)
        : 0,
    }));
}

export function getUserLeaderboard(): UserLeaderboardEntry[] {
  return [...mockUsers]
    .sort((a, b) => b.rizz - a.rizz)
    .map((user, index) => ({
      rank: index + 1,
      user,
      rizz: user.rizz,
      aura: user.aura,
      battlesWon: user.wins,
    }));
}

