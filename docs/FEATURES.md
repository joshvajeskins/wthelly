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
  channelId: string | null;      // Yellow ledger channel ID
  channelBalance: bigint;        // USDC in state channel
  walletBalance: bigint;         // On-chain USDC balance
  activeSessions: number;        // Number of active app sessions
  teePublicKey: string;          // TEE encryption key
}
```

---

## 2. Market Browsing

### 2.1 Market List View
- Grid/list toggle
- Filter by: status (open/closed/resolved), type (price/custom), category
- Sort by: volume, deadline, newest
- Search markets by keyword

### 2.2 Market Card
```
┌─────────────────────────────────────────────┐
│  "Will ETH hit $5k by March?"               │
│                                             │
│  Rizz Pool: HIDDEN            [GYATT]       │
│  Type: Price (Uniswap hook)                 │
│  Closes in: 2d 14h                          │
│                                             │
│  [BET NOW]                                  │
└─────────────────────────────────────────────┘
```

### 2.3 Market Data Structure
```typescript
interface Market {
  id: string;                    // bytes32 hex
  question: string;
  description?: string;
  category: 'crypto' | 'sports' | 'politics' | 'entertainment' | 'other';
  deadline: Date;

  // Pool data (hidden from users until resolution)
  totalPool: number;             // Only TEE knows the breakdown
  participantCount: number;      // Number of bettors (public)

  // Resolution type
  resolutionType: 'price' | 'admin';  // price = Uniswap hook, admin = manual
  poolKey?: string;              // Uniswap pool (for price markets)
  targetPrice?: number;          // Target price (for price markets)
  isAbove?: boolean;             // Above or below target

  // Status
  status: 'open' | 'closed' | 'resolved' | 'settled';
  outcome?: boolean;             // true = YES won

  // Metadata
  createdAt: Date;
  creatorAddress: string;
}
```

### 2.4 Market Types

**Price Markets (Uniswap Hook)**
- Created permissionlessly by anyone
- Specify: Uniswap pool, target price, direction (above/below), deadline
- Auto-resolved by HellyHook `afterSwap()` when condition met
- No oracle needed — the pool IS the oracle

**Custom Markets (Admin Resolution)**
- Created by admin
- Any yes/no question (sports, politics, entertainment, etc.)
- Resolved manually by admin
- UMA optimistic oracle integration planned for future

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
│  │  MARKET INFO                                            │   │
│  │  Type: Price Market (ETH/USDC pool)                     │   │
│  │  Condition: ETH >= $5,000                               │   │
│  │  Participants: 47 skibidis                              │   │
│  │  Closes: 2d 14h                                         │   │
│  │  Positions: HIDDEN (encrypted in TEE)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PLACE YOUR BET                                         │   │
│  │                                                          │   │
│  │  [YES]  [NO]                                            │   │
│  │                                                          │   │
│  │  Amount: $[____] USDC                                   │   │
│  │  Channel Balance: $1,450.00                             │   │
│  │                                                          │   │
│  │  [PLACE BET]                                            │   │
│  │  Encrypted & gasless via Yellow Network                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  YOUR BETS ON THIS MARKET                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Bet: $100 | Position: ENCRYPTED | Status: Active       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Market Stats Display

Since all bets are encrypted:
- Only total participant count is shown
- Pool size is hidden (only TEE knows)
- YES/NO ratio is hidden (only TEE knows)
- Shows "Positions Encrypted" indicator

---

## 4. Betting System

### 4.1 Encrypted Betting Flow

1. User selects YES or NO
2. User enters amount in USDC
3. Frontend creates bet payload: `{ marketId, direction, amount }`
4. Frontend encrypts payload to TEE public key
5. Frontend creates signed app state update:
   - `allocations`: **unchanged** (critical — Clearnode can't infer bet)
   - `session_data`: encrypted bet blob
   - `nonce`: incremented
6. Signed state sent to app server via Clearnode (NitroRPC `send_app_state`)
7. TEE app server decrypts, validates, records bet internally
8. App server signs counter-state (ACK)
9. Frontend shows confirmation

### 4.2 Bet Validation (TEE-side)

The TEE app server validates:
- Market is open (not past deadline)
- Amount > 0
- Amount <= user's available liquidity (tracked internally by TEE)
- User hasn't exceeded per-market or global limits
- Decryption was successful

### 4.3 Bet Modification
- Cancel bet: Send a "cancel" encrypted message to TEE
- Modify amount: Cancel + new bet (two state updates)
- All operations gasless via state channel

### 4.4 Bet States
```typescript
type BetStatus =
  | 'active'      // Bet placed, encrypted in TEE
  | 'won'         // Market resolved, user won
  | 'lost'        // Market resolved, user lost
  | 'settled'     // Payout distributed via state channel
  | 'cancelled';  // User cancelled before resolution
```

---

## 5. Resolution & Settlement

### 5.1 Resolution Flow

```
Market Deadline Reached
         │
         ▼
   ┌─────────────┐
   │ Price Market │──► Uniswap hook checks price condition
   │              │    afterSwap() → auto-resolve if met
   └──────────────┘
         │
   ┌─────────────┐
   │Custom Market │──► Admin posts resolution on-chain
   └──────────────┘
         │
         ▼
TEE receives resolution event
         │
         ▼
TEE decrypts all bets for this market
TEE computes payouts (winner pool / loser pool math)
         │
         ▼
TEE generates ZK proof of correct computation
         │
         ▼
TEE creates final app states (updated allocations):
├── Winner: allocation += winnings
├── Loser: allocation -= bet amount
└── Platform: fanum tax collected
         │
         ▼
close_app_session for each user
WthellyAdjudicator verifies ZK proof
         │
         ▼
Custody contract distributes USDC
```

### 5.2 Resolution Interface
```
┌─────────────────────────────────────────────────────────────────┐
│  MARKET RESOLVED!                                               │
│                                                                 │
│  "Will ETH hit $5k by March?"                                  │
│  Result: YES                                                    │
│  Resolved by: Uniswap price hook (trustless)                   │
│                                                                 │
│  Your bet: YES, $100                                           │
│  Status: WINNER!                                               │
│                                                                 │
│  Payout: $165.33 USDC                                          │
│  (added to your channel balance)                               │
│                                                                 │
│  Settlement TX: 0xabc...123                                    │
│  ZK Proof: verified on-chain                                   │
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

Winnings = ($100 / $60,000) * $40,000 * 0.98 = $65.33
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
│  Deposited USDC goes into your Yellow Network channel          │
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
- Withdraw from state channel to wallet (close channel or partial withdraw)
- Option to bridge back to original chain via LI.FI
- Or keep on settlement chain (Base)

---

## 7. Yellow Network State Channel

### 7.1 Channel Lifecycle

```
OPEN CHANNEL (one on-chain tx)
├── User approves USDC spend to Custody contract
├── User deposits USDC → creates ledger channel with Clearnode
├── Receives channel ID and session key
└── Channel now active for gasless betting

OFF-CHAIN OPERATIONS (all gasless, via Clearnode)
├── Create app sessions (join markets)
├── Place encrypted bets (send_app_state)
├── Modify/cancel bets
├── Receive settlement results
└── All instant, all free, all encrypted

CLOSE CHANNEL (one on-chain tx)
├── All app sessions must be closed first
├── Final ledger state agreed between user and Clearnode
├── Custody contract distributes remaining USDC
└── Channel closed
```

### 7.2 Channel UI
```
┌─────────────────────────────────────────────────────────────────┐
│  STATE CHANNEL                                                  │
│                                                                 │
│  Balance: $1,450.00 USDC                                       │
│  Active Markets: 3                                              │
│  Available: $1,100.00                                          │
│                                                                 │
│  [DEPOSIT MORE]  [WITHDRAW]                                    │
│                                                                 │
│  All bets are encrypted and gasless via Yellow Network          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. User Profile & Stats

### 8.1 Profile Page
```
┌─────────────────────────────────────────────────────────────────┐
│  PROFILE                                                        │
│                                                                 │
│  0xabc...123                                                   │
│  Username: CryptoChad                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  STATS                                                   │   │
│  │  Wins: 47  |  Losses: 23  |  Win Rate: 67%              │   │
│  │  Total Wagered: $12,450  |  Total Won: $8,230            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ACTIVE BETS                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  "ETH $5k" | $100 | ENCRYPTED | Closes 2d               │   │
│  │  "BTC $100k" | $50 | ENCRYPTED | Closes 14d             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  BET HISTORY                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  "SOL ATH" | WON | +$45 | Feb 1                         │   │
│  │  "DOGE $1" | LOST | -$20 | Jan 28                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  CHANNEL                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Balance: $1,450 USDC | Status: Active                   │   │
│  │  [DEPOSIT]  [WITHDRAW]                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Notifications

### 9.1 Notification Types
- Market resolved (payout incoming)
- Bet won/lost
- Settlement completed (USDC available)
- Deposit completed
- Channel balance low

### 9.2 Implementation
- In-app notification center
- Toast notifications for real-time events
- WebSocket events from Clearnode

---

## 10. Mobile Responsiveness

### 10.1 Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### 10.2 Mobile Adaptations
- Bottom navigation bar
- Full-screen modals for betting
- Simplified stats display
- Condensed market cards
