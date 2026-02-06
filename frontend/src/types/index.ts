// ============================================
// WTHELLY - TYPE DEFINITIONS
// ============================================

// ============================================
// MARKET TYPES
// ============================================

export type MarketCategory =
  | "crypto"
  | "sports"
  | "politics"
  | "entertainment"
  | "other";

export type MarketStatus = "open" | "closed" | "resolved" | "settled";

export type ResolutionType = "price" | "admin";

export interface Market {
  id: string;
  question: string;
  description?: string;
  category: MarketCategory;
  deadline: Date;

  // Resolution type
  resolutionType: ResolutionType;
  poolKey?: string; // Uniswap pool (for price markets)
  targetPrice?: number; // Target price (for price markets)
  isAbove?: boolean; // Above or below target (for price markets)

  // Pool stats (hidden until resolution — only TEE knows)
  participantCount: number;

  // Status
  status: MarketStatus;
  outcome?: boolean; // true = YES won, false = NO won

  // Metadata
  createdAt: Date;
  creatorAddress: string;
}

// ============================================
// BET TYPES
// ============================================

export type BetDirection = "yes" | "no";

export type BetStatus =
  | "active" // Bet placed, encrypted in TEE
  | "won" // Market resolved, user won
  | "lost" // Market resolved, user lost
  | "settled" // Payout distributed via state channel
  | "cancelled"; // User cancelled before resolution

export interface Bet {
  id: string;
  marketId: string;
  userAddress: string;

  // Amount (visible to user who placed it)
  amount: number;

  // Direction (encrypted — only user and TEE know)
  direction?: BetDirection;

  // Status
  status: BetStatus;

  // Payout (set after settlement)
  payout?: number;

  // State channel references
  sessionId?: string;
  channelId?: string;

  // Timestamps
  createdAt: Date;
}

// ============================================
// USER TYPES
// ============================================

export interface User {
  address: string;
  username?: string;

  // Stats
  wins: number;
  losses: number;
  winRate: number;
  totalWagered: number;

  // Streak
  streak: number; // Positive = winning streak, negative = losing streak

  // Channel
  channelId?: string;
  channelBalance: number;
  channelNonce: number;

  // Timestamps
  createdAt: Date;
}

// ============================================
// DEPOSIT TYPES
// ============================================

export type DepositStatus = "pending" | "bridging" | "completed" | "failed";

export interface Deposit {
  id: string;
  userAddress: string;
  sourceChain: string;
  sourceToken: string;
  sourceAmount: number;
  destAmount: number;
  lifiTxHash?: string;
  status: DepositStatus;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================
// CHANNEL TYPES
// ============================================

export interface ChannelState {
  channelId: string;
  userAddress: string;
  balance: number;
  nonce: number;
  activeBets: string[]; // Bet IDs
  lockedAmount: number;
  availableBalance: number;
  lastUpdated: Date;
  signature?: string;
}

// ============================================
// UI TYPES
// ============================================

export interface MarketFilters {
  category?: MarketCategory;
  status?: MarketStatus;
  resolutionType?: ResolutionType;
  search?: string;
}

export type SortOption = "newest" | "deadline" | "volume" | "popular";

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getCategoryLabel(category: MarketCategory): string {
  const labels: Record<MarketCategory, string> = {
    crypto: "crypto",
    sports: "sports",
    politics: "politics",
    entertainment: "entertainment",
    other: "other",
  };
  return labels[category];
}

export function getResolutionTypeLabel(type: ResolutionType): string {
  return type === "price" ? "price market" : "admin resolved";
}
