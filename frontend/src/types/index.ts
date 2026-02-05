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

export type MarketStatus = "open" | "closed" | "resolved";

export type MarketType = "public" | "private";

export interface Market {
  id: string;
  question: string;
  description?: string;
  category: MarketCategory;
  deadline: Date;

  // Pool data
  yesPool: number;
  noPool: number;
  totalPool: number;

  // Type - public (platform) or private (user-created)
  type: MarketType;

  // For private markets - links to public market for resolution
  linkedMarketId?: string;

  // Status
  status: MarketStatus;
  outcome?: boolean; // true = YES won, false = NO won

  // Oracle (for public markets)
  oracleSource?: string;
  targetValue?: number;

  // Metadata
  createdAt: Date;
  creatorAddress: string;

  // Stats
  betCount: number;

  // Private market specific
  inviteCode?: string; // share code for private markets
  participants?: string[]; // wallet addresses of participants
  maxParticipants?: number;
}

// ============================================
// BET TYPES
// ============================================

export type BetDirection = "yes" | "no";

export type BetStatus =
  | "pending" // Commitment sent, waiting for confirmation
  | "active" // Bet is live
  | "revealing" // Market resolved, reveal window open
  | "revealed" // User has revealed
  | "won" // User won
  | "lost" // User lost
  | "cancelled" // User cancelled
  | "forfeited"; // User didn't reveal in time

export interface Bet {
  id: string;
  marketId: string;
  userAddress: string;

  // Commitment (all bets are private by default)
  commitmentHash: string;
  amount: number;

  // Direction (null until revealed)
  direction?: BetDirection;

  // Secret (stored client-side, null until revealed)
  secret?: string;

  // Status
  status: BetStatus;
  revealed: boolean;

  // Payout
  payout?: number;

  // Timestamps
  createdAt: Date;
  revealedAt?: Date;
}

// Client-side secret storage
export interface LocalBetSecret {
  marketId: string;
  betId: string;
  direction: BetDirection;
  amount: number;
  secret: string;
  commitment: string;
  timestamp: number;
}

// ============================================
// USER TYPES
// ============================================

export type UserStatus =
  | "npc" // 0-100 aura
  | "rizz-apprentice" // 100-500
  | "aura-farmer" // 500-1000
  | "sigma" // 1000-2500
  | "gigachad" // 2500-5000
  | "skibidi-god"; // 5000+

export interface User {
  address: string;
  username?: string;

  // Stats
  aura: number; // earned from squad battles (trophies)
  rizz: number; // earned from 1v1 wins
  wins: number;
  losses: number;
  winRate: number;
  totalWagered: number;

  // Status
  status: UserStatus;
  streak: number; // Positive = winning streak, negative = losing streak

  // Squad
  squadId?: string;

  // Channel
  channelBalance: number;
  channelNonce: number;

  // Timestamps
  createdAt: Date;
}

// ============================================
// SQUAD TYPES
// ============================================

export type SquadStatus = "active" | "in_battle" | "disbanded";

export interface Squad {
  id: string;
  name: string;
  leaderId: string;
  members: string[]; // wallet addresses

  // Stats
  aura: number; // trophies from winning sigma battles
  totalRizz: number; // combined rizz of all members
  wins: number; // sigma battle wins
  losses: number; // sigma battle losses

  // Invite
  inviteCode: string;

  // Status
  status: SquadStatus;

  // Timestamps
  createdAt: Date;
}

export interface SquadInvite {
  id: string;
  squadId: string;
  inviterAddress: string;
  inviteeAddress: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  createdAt: Date;
  expiresAt: Date;
}

// ============================================
// SIGMA BATTLE TYPES
// ============================================

export type SigmaBattleStatus =
  | "pending" // challenge sent, waiting for acceptance
  | "accepted" // both squads ready
  | "in_progress" // 1v1 battles happening
  | "completed" // all battles done, winner determined
  | "cancelled"; // one squad backed out

export interface SigmaBattle {
  id: string;

  // Squads
  challengerSquadId: string;
  defenderSquadId: string;

  // Wager (real currency)
  wagerAmount: number;

  // Results
  challengerRizz: number;
  defenderRizz: number;
  winnerSquadId?: string;

  // Individual battles
  battles: OneVOneBattle[];

  // Status
  status: SigmaBattleStatus;

  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type OneVOneStatus = "pending" | "in_progress" | "completed";

export interface OneVOneBattle {
  id: string;
  sigmaBattleId: string;

  // Participants
  player1Address: string; // from challenger squad
  player2Address: string; // from defender squad

  // Fake currency betting
  player1Bet: number;
  player2Bet: number;
  player1Direction?: BetDirection;
  player2Direction?: BetDirection;

  // The market question they're betting on (from linked public market)
  marketQuestion: string;

  // Result
  winnerAddress?: string;
  rizzAwarded: number; // rizz points winner gets

  // Status
  status: OneVOneStatus;

  // Timestamps
  createdAt: Date;
  completedAt?: Date;
}

// ============================================
// LEADERBOARD TYPES
// ============================================

export interface SquadLeaderboardEntry {
  rank: number;
  squad: Squad;
  aura: number;
  totalRizz: number;
  winRate: number;
}

export interface UserLeaderboardEntry {
  rank: number;
  user: User;
  rizz: number;
  aura: number;
  battlesWon: number;
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
  type?: MarketType;
  search?: string;
}

export type SortOption = "newest" | "deadline" | "volume" | "popular";

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getUserStatus(aura: number): UserStatus {
  if (aura >= 5000) return "skibidi-god";
  if (aura >= 2500) return "gigachad";
  if (aura >= 1000) return "sigma";
  if (aura >= 500) return "aura-farmer";
  if (aura >= 100) return "rizz-apprentice";
  return "npc";
}

export function getStatusLabel(status: UserStatus): string {
  const labels: Record<UserStatus, string> = {
    npc: "npc mode",
    "rizz-apprentice": "rizz apprentice",
    "aura-farmer": "aura farmer",
    sigma: "sigma mode",
    gigachad: "gigachad",
    "skibidi-god": "skibidi god",
  };
  return labels[status];
}

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

export function getMarketTypeLabel(type: MarketType): string {
  return type === "public" ? "public" : "private";
}

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

