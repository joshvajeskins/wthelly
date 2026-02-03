# Features Specification

> Detailed specification of all features in WTHELLY

---

## 1. Authentication & Wallet Connection

### 1.1 Wallet Connection
- Connect via WalletConnect, MetaMask, Coinbase Wallet
- Support for multiple EVM chains
- Persistent session across page reloads

### 1.2 User Profile Creation
- Auto-create profile on first connection
- Username selection (optional, defaults to truncated address)
- Profile persists in localStorage + backend

### 1.3 Session State
```typescript
interface UserSession {
  address: string;
  username: string;
  aura: number;
  wins: number;
  losses: number;
  squadId?: string;
  channelBalance: number;  // Yellow state channel balance
  walletBalance: number;   // On-chain balance
}
```

---

## 2. Market Browsing

### 2.1 Market List View
- Grid/list toggle
- Filter by: status (open/closed/resolved), mode (cap/no-cap), category
- Sort by: volume, deadline, newest
- Search markets by keyword

### 2.2 Market Card
```
┌─────────────────────────────────────────────┐
│  "Will ETH hit $5k by March?"               │
│                                             │
│  Rizz Pool: $127,450        [GYATT 🍑]     │
│  Mode: CAP (hidden)                         │
│  Closes in: 2d 14h                          │
│                                             │
│  [BET NOW]                                  │
└─────────────────────────────────────────────┘
```

### 2.3 Market Data Structure
```typescript
interface Market {
  id: string;
  question: string;
  description?: string;
  category: 'crypto' | 'sports' | 'politics' | 'entertainment' | 'other';
  deadline: Date;

  // Pool data
  yesPool: number;
  noPool: number;
  totalPool: number;

  // Mode
  isCap: boolean;  // true = hidden positions

  // Status
  status: 'open' | 'closed' | 'resolved';
  outcome?: boolean;  // true = YES won

  // Oracle
  oracleSource: string;
  targetValue?: number;

  // Metadata
  createdAt: Date;
  creatorAddress: string;
}
```

### 2.4 Market Categories
- Crypto (price predictions)
- Sports (game outcomes)
- Politics (election results)
- Entertainment (awards, releases)
- Other (custom)

---

## 3. Market Detail Page

### 3.1 Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                                                         │
│                                                                 │
│  "Will ETH hit $5k by March?"                                  │
│  Created by 0xabc...123                                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  MARKET STATS                                           │   │
│  │  Rizz Pool: $127,450  |  Mode: CAP  |  Closes: 2d 14h  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PLACE YOUR BET                                         │   │
│  │                                                          │   │
│  │  [YES]  [NO]                                            │   │
│  │                                                          │   │
│  │  Amount: $[____] USDC                                   │   │
│  │                                                          │   │
│  │  [PLACE BET]                                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  YOUR BETS ON THIS MARKET                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Bet #1: $100 | Position: HIDDEN | [Cancel]             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Market Stats Display

**Cap Mode (Hidden):**
- Total pool only
- No YES/NO breakdown visible
- Shows "Positions Hidden" indicator

**No Cap Mode (Public):**
- Total pool
- YES/NO breakdown with percentages
- Visual bar showing distribution

---

## 4. Betting System

### 4.1 Private Betting (Cap Mode)

**Flow:**
1. User selects YES or NO
2. User enters amount
3. Client generates random 32-byte secret
4. Client creates commitment: `hash(marketId, direction, amount, secret)`
5. Secret stored in localStorage (encrypted)
6. Commitment + amount sent to Yellow state channel
7. Server receives commitment but NOT direction

**Commitment Structure:**
```typescript
interface BetCommitment {
  marketId: string;
  commitment: string;  // keccak256 hash
  amount: number;
  timestamp: Date;
  // Direction and secret stored client-side only
}

// Client-side storage
interface LocalBetSecret {
  marketId: string;
  direction: 'yes' | 'no';
  amount: number;
  secret: string;  // 32-byte hex
  commitment: string;
}
```

### 4.2 Public Betting (No Cap Mode)

**Flow:**
1. User selects YES or NO
2. User enters amount
3. Bet placed directly via state channel
4. Position is visible to all

### 4.3 Bet Modification (Pre-Resolution)
- Cancel bet (get funds back to channel)
- Modify amount (cancel + new bet)
- All operations gasless via state channel

### 4.4 Bet States
```typescript
type BetStatus =
  | 'pending'     // Commitment sent, waiting for channel confirmation
  | 'active'      // Bet is live
  | 'revealing'   // Market resolved, reveal window open
  | 'revealed'    // User has revealed
  | 'won'         // User won, payout pending
  | 'lost'        // User lost
  | 'cancelled'   // User cancelled before resolution
  | 'forfeited';  // User didn't reveal in time
```

---

## 5. Resolution & Reveal System

### 5.1 Resolution Flow
```
Market Deadline Reached
         │
         ▼
Oracle Fetches Result
         │
         ▼
Market Status → "resolved"
Outcome Recorded (YES/NO)
         │
         ▼
Reveal Window Opens (1 hour)
         │
         ▼
Users Reveal Bets
         │
         ▼
Reveal Window Closes
         │
         ▼
Settlement via Uniswap v4 Hook
         │
         ▼
Payouts Distributed
```

### 5.2 Reveal Interface
```
┌─────────────────────────────────────────────────────────────────┐
│  🎉 MARKET RESOLVED!                                           │
│                                                                 │
│  "Will ETH hit $5k by March?"                                  │
│  Result: YES ✅                                                 │
│                                                                 │
│  Your hidden bet: YES, $100                                    │
│  Status: WINNER! 🔥                                            │
│                                                                 │
│  Potential Payout: $187.50                                     │
│                                                                 │
│  [REVEAL & CLAIM]                                              │
│                                                                 │
│  ⏰ Reveal window closes in: 47:23                             │
│  (Unrevealed bets are forfeited)                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Payout Calculation
```
Winner Payout = (user_bet / total_winner_pool) * total_loser_pool * (1 - fee)

Example:
- Total YES pool: $60,000
- Total NO pool: $40,000
- User bet: $100 on YES
- YES wins
- Fee: 2% (Fanum Tax)

Payout = ($100 / $60,000) * $40,000 * 0.98 = $65.33
Total Return = $100 (original) + $65.33 (winnings) = $165.33
```

---

## 6. Cross-Chain Deposits (LI.FI)

### 6.1 Deposit Flow
```
┌─────────────────────────────────────────────────────────────────┐
│  DEPOSIT FUNDS                                                  │
│                                                                 │
│  From Chain:                                                    │
│  [Ethereum] [Arbitrum] [Base] [Polygon] [Optimism] [+more]    │
│                                                                 │
│  From Token:                                                    │
│  [ETH] [USDC] [USDT] [DAI] [+more]                            │
│                                                                 │
│  Amount: [0.1] ETH                                             │
│                                                                 │
│  You'll receive: ~$320 USDC                                    │
│  Estimated time: ~2 minutes                                    │
│  Bridge fee: ~$2.50                                            │
│                                                                 │
│  [DEPOSIT]                                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Deposit States
```typescript
interface Deposit {
  id: string;
  sourceChain: string;
  sourceToken: string;
  sourceAmount: number;
  destAmount: number;
  lifiTxHash: string;
  status: 'pending' | 'bridging' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}
```

### 6.3 Withdrawal Flow
- Withdraw from state channel to wallet
- Option to bridge back to original chain via LI.FI
- Or keep on settlement chain

---

## 7. Yellow State Channel

### 7.1 Channel Lifecycle
```
OPEN CHANNEL
├── User deposits USDC to channel contract
├── One on-chain transaction
└── Channel now active

OFF-CHAIN OPERATIONS (all gasless)
├── Place bets
├── Modify bets
├── Cancel bets
├── Check balance
└── All instant, all free

CLOSE CHANNEL
├── Settlement triggered
├── Final state agreed
├── On-chain transaction
└── Funds distributed
```

### 7.2 Channel State
```typescript
interface ChannelState {
  channelId: string;
  userAddress: string;
  balance: number;
  nonce: number;
  activeBets: BetCommitment[];
  lastUpdated: Date;
  signature: string;
}
```

### 7.3 Channel UI
```
┌─────────────────────────────────────────────────────────────────┐
│  STATE CHANNEL                                                  │
│                                                                 │
│  Balance: $1,450.00 USDC                                       │
│  Active Bets: 3 ($350 locked)                                  │
│  Available: $1,100.00                                          │
│                                                                 │
│  [DEPOSIT MORE]  [WITHDRAW]                                    │
│                                                                 │
│  ⚡ All bets are gasless via Yellow Network                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. User Profile & Stats

### 8.1 Profile Page
```
┌─────────────────────────────────────────────────────────────────┐
│  SKIBIDI PROFILE                                                │
│                                                                 │
│  0xabc...123                                                   │
│  Username: CryptoChad                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  STATS                                                   │   │
│  │  Aura: 1,250 🔥  |  Wins: 47  |  Losses: 23             │   │
│  │  Win Rate: 67%  |  Total Wagered: $12,450               │   │
│  │  Status: SIGMA MODE                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ACTIVE BETS                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  "ETH $5k" | $100 | HIDDEN | Closes 2d                  │   │
│  │  "BTC $100k" | $50 | YES | Closes 14d                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  BET HISTORY                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  "SOL ATH" | WON | +$45 | Feb 1                         │   │
│  │  "DOGE $1" | LOST | -$20 | Jan 28                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Aura System
```
Aura Calculation:
├── Win: +10 base + (bet_amount / 100)
├── Lose: -5 base
├── Streak bonus: +5 per consecutive win
├── Streak penalty: -2 per consecutive loss

Status Tiers:
├── 0-100: NPC Mode
├── 100-500: Rizz Apprentice
├── 500-1000: Aura Farmer
├── 1000-2500: Sigma Mode
├── 2500-5000: Gigachad
├── 5000+: Skibidi God
```

---

## 9. Squads (Nice to Have)

### 9.1 Squad Features
- Create/join squads
- Squad leaderboard
- Combined aura tracking
- Squad challenges

### 9.2 Squad Structure
```typescript
interface Squad {
  id: string;
  name: string;
  leaderId: string;
  members: string[];
  totalAura: number;
  wins: number;
  losses: number;
  createdAt: Date;
}
```

---

## 10. Notifications

### 10.1 Notification Types
- Market resolved (reveal needed)
- Bet won/lost
- Reveal window closing soon
- Deposit completed
- Channel balance low

### 10.2 Implementation
- In-app notification center
- Browser push notifications (optional)
- Toast notifications for real-time events

---

## 11. Mobile Responsiveness

### 11.1 Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### 11.2 Mobile Adaptations
- Bottom navigation bar
- Full-screen modals for betting
- Swipe gestures for market cards
- Simplified stats display
