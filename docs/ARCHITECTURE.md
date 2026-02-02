# Technical Architecture

> System design and technical implementation details

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│                         (Next.js 16 App)                                │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Pages     │  │ Components  │  │   Hooks     │  │  Providers  │   │
│  │             │  │             │  │             │  │             │   │
│  │ • Home      │  │ • Market    │  │ • useMarkets│  │ • Wallet    │   │
│  │ • Markets   │  │   Card      │  │ • useBets   │  │ • Yellow    │   │
│  │ • Market    │  │ • Betting   │  │ • useChannel│  │ • Theme     │   │
│  │   Detail    │  │   Modal     │  │ • useDeposit│  │             │   │
│  │ • Profile   │  │ • Deposit   │  │ • useUser   │  │             │   │
│  │ • Deposit   │  │   Widget    │  │             │  │             │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          INTEGRATION LAYER                               │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │   wagmi/viem    │  │   Yellow SDK    │  │    LI.FI SDK    │        │
│  │                 │  │                 │  │                 │        │
│  │ • Wallet conn   │  │ • State channel │  │ • Quote         │        │
│  │ • Contract calls│  │ • Sign states   │  │ • Route         │        │
│  │ • Events        │  │ • Gasless ops   │  │ • Execute       │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Yellow Network │  │   Uniswap v4    │  │     LI.FI       │
│                 │  │                 │  │                 │
│  State Channels │  │  Settlement     │  │  Cross-chain    │
│  • Nitrolite    │  │  • HellyHook    │  │  • Bridges      │
│  • Off-chain    │  │  • Atomic       │  │  • DEX Agg      │
│    betting      │  │    payouts      │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │    Base / Arbitrum  │
                    │    (Settlement)     │
                    └─────────────────────┘
```

---

## Frontend Architecture

### Directory Structure

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx               # Root layout with providers
│   │   ├── page.tsx                 # Home page
│   │   ├── markets/
│   │   │   ├── page.tsx             # Markets list
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Market detail
│   │   ├── profile/
│   │   │   └── page.tsx             # User profile
│   │   ├── deposit/
│   │   │   └── page.tsx             # Deposit page
│   │   └── globals.css              # Global styles
│   │
│   ├── components/
│   │   ├── ui/                      # shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── header.tsx           # Navigation header
│   │   │   ├── footer.tsx           # Footer
│   │   │   ├── sidebar.tsx          # Mobile sidebar
│   │   │   └── mobile-nav.tsx       # Bottom nav for mobile
│   │   │
│   │   ├── markets/
│   │   │   ├── market-card.tsx      # Market preview card
│   │   │   ├── market-grid.tsx      # Grid of market cards
│   │   │   ├── market-filters.tsx   # Filter/sort controls
│   │   │   ├── market-stats.tsx     # Market statistics display
│   │   │   └── market-countdown.tsx # Deadline countdown
│   │   │
│   │   ├── betting/
│   │   │   ├── bet-modal.tsx        # Betting dialog
│   │   │   ├── bet-form.tsx         # YES/NO selection + amount
│   │   │   ├── bet-card.tsx         # User's bet display
│   │   │   ├── bet-history.tsx      # List of past bets
│   │   │   ├── reveal-modal.tsx     # Reveal and claim dialog
│   │   │   └── commitment.ts        # Commitment generation utils
│   │   │
│   │   ├── wallet/
│   │   │   ├── connect-button.tsx   # Wallet connection
│   │   │   ├── account-menu.tsx     # Connected account dropdown
│   │   │   ├── channel-balance.tsx  # Yellow channel balance
│   │   │   └── deposit-widget.tsx   # LI.FI deposit component
│   │   │
│   │   └── shared/
│   │       ├── loading.tsx          # Loading states
│   │       ├── error.tsx            # Error states
│   │       ├── empty.tsx            # Empty states
│   │       └── aura-badge.tsx       # Aura/status display
│   │
│   ├── hooks/
│   │   ├── use-markets.ts           # Market data fetching
│   │   ├── use-market.ts            # Single market data
│   │   ├── use-bets.ts              # User's bets
│   │   ├── use-channel.ts           # Yellow state channel
│   │   ├── use-deposit.ts           # LI.FI deposit flow
│   │   ├── use-user.ts              # User profile/stats
│   │   └── use-commitment.ts        # Commitment management
│   │
│   ├── providers/
│   │   ├── wallet-provider.tsx      # wagmi + RainbowKit
│   │   ├── yellow-provider.tsx      # Yellow SDK context
│   │   ├── theme-provider.tsx       # Dark/light mode
│   │   └── toast-provider.tsx       # Notifications
│   │
│   ├── lib/
│   │   ├── utils.ts                 # General utilities
│   │   ├── commitment.ts            # Commitment hash generation
│   │   ├── storage.ts               # LocalStorage helpers
│   │   ├── format.ts                # Number/date formatting
│   │   └── constants.ts             # App constants
│   │
│   ├── types/
│   │   ├── market.ts                # Market types
│   │   ├── bet.ts                   # Bet types
│   │   ├── user.ts                  # User types
│   │   └── channel.ts               # Channel types
│   │
│   └── config/
│       ├── wagmi.ts                 # wagmi configuration
│       ├── chains.ts                # Supported chains
│       └── contracts.ts             # Contract addresses
│
├── public/
│   ├── logo.svg
│   └── og-image.png
│
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Data Flow

### Placing a Private Bet (Cap Mode)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │     │    Yellow    │     │   Backend    │
│              │     │   Network    │     │   (Future)   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ 1. User selects    │                    │
       │    YES + $100      │                    │
       │                    │                    │
       │ 2. Generate secret │                    │
       │    (client-side)   │                    │
       │                    │                    │
       │ 3. Create commit   │                    │
       │    hash(YES,$100,  │                    │
       │    secret)         │                    │
       │                    │                    │
       │ 4. Store secret    │                    │
       │    in localStorage │                    │
       │                    │                    │
       │ 5. Sign state ─────┼──────────────────►│
       │    channel update  │                    │
       │    (commitment +   │                    │
       │     amount only)   │                    │
       │                    │                    │
       │                    │ 6. Update channel  │
       │                    │    state (off-chain)
       │                    │                    │
       │◄───────────────────┼────────────────────│ 7. Confirm
       │                    │                    │
       │ 8. Show success    │                    │
       │    (bet hidden)    │                    │
       │                    │                    │
```

### Revealing a Bet

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │     │    Yellow    │     │  Uniswap v4  │
│              │     │   Network    │     │    Hook      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ 1. Market resolved │                    │
       │    (notification)  │                    │
       │                    │                    │
       │ 2. Get secret from │                    │
       │    localStorage    │                    │
       │                    │                    │
       │ 3. Submit reveal ──┼──────────────────►│
       │    (direction +    │                    │
       │     secret)        │                    │
       │                    │                    │
       │                    │ 4. Verify:        │
       │                    │    hash(reveal)   │
       │                    │    == commitment  │
       │                    │                    │
       │                    │ 5. Aggregate ─────┼──►│
       │                    │    all reveals    │   │
       │                    │                    │   │
       │                    │                    │   │ 6. Execute
       │                    │                    │   │    settlement
       │                    │                    │   │
       │◄───────────────────┼────────────────────┼───│ 7. Payout
       │                    │                    │
```

---

## State Management

### Client-Side State

```typescript
// React Context for global state

interface AppState {
  // User
  user: UserSession | null;
  isConnected: boolean;

  // Channel
  channelBalance: number;
  channelNonce: number;

  // Markets
  markets: Market[];
  marketsLoading: boolean;

  // User's bets
  activeBets: Bet[];
  betHistory: Bet[];

  // Local secrets (for cap mode)
  betSecrets: Map<string, LocalBetSecret>;
}
```

### Local Storage Schema

```typescript
// Keys and structure

localStorage = {
  // Bet secrets (encrypted)
  'helly:secrets': {
    [marketId]: {
      direction: 'yes' | 'no',
      amount: number,
      secret: string,
      commitment: string,
      timestamp: number
    }
  },

  // User preferences
  'helly:theme': 'dark' | 'light',

  // Recent transactions
  'helly:deposits': Deposit[],

  // Session
  'helly:session': {
    address: string,
    username: string,
    lastConnected: number
  }
}
```

---

## API Design (Mock for Hackathon)

### Markets API

```typescript
// GET /api/markets
interface MarketsResponse {
  markets: Market[];
  total: number;
  page: number;
  pageSize: number;
}

// GET /api/markets/:id
interface MarketResponse {
  market: Market;
  userBets?: Bet[];  // If connected
}

// POST /api/markets/:id/bet
interface PlaceBetRequest {
  commitment: string;
  amount: number;
  signature: string;
}

// POST /api/markets/:id/reveal
interface RevealRequest {
  direction: 'yes' | 'no';
  secret: string;
  signature: string;
}
```

### User API

```typescript
// GET /api/user/:address
interface UserResponse {
  address: string;
  username: string;
  aura: number;
  wins: number;
  losses: number;
  squadId?: string;
}

// GET /api/user/:address/bets
interface UserBetsResponse {
  active: Bet[];
  history: Bet[];
}
```

---

## Smart Contract Architecture

### HellyHook.sol (Uniswap v4)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "v4-periphery/BaseHook.sol";

contract HellyHook is BaseHook {

    struct Market {
        bytes32 id;
        string question;
        uint256 deadline;
        uint256 yesPool;
        uint256 noPool;
        bool resolved;
        bool outcome;
        mapping(address => bytes32) commitments;
        mapping(address => uint256) amounts;
    }

    mapping(bytes32 => Market) public markets;

    // Create market
    function createMarket(
        bytes32 id,
        string calldata question,
        uint256 deadline
    ) external;

    // Place bet (commitment only)
    function placeBet(
        bytes32 marketId,
        bytes32 commitment,
        uint256 amount
    ) external;

    // Reveal bet
    function revealBet(
        bytes32 marketId,
        bool direction,
        bytes32 secret
    ) external;

    // Resolve market (oracle callback)
    function resolveMarket(
        bytes32 marketId,
        bool outcome
    ) external onlyOracle;

    // Settle and distribute payouts
    function settle(bytes32 marketId) external;
}
```

### Yellow Channel Interface

```typescript
// Yellow SDK integration (simplified)

interface YellowChannel {
  // Open channel with deposit
  open(amount: bigint): Promise<ChannelId>;

  // Get current balance
  getBalance(): Promise<bigint>;

  // Sign state update (gasless)
  signStateUpdate(update: StateUpdate): Promise<SignedState>;

  // Close channel and settle
  close(): Promise<TxHash>;
}

interface StateUpdate {
  nonce: number;
  commitments: Commitment[];
  balanceChange: bigint;
}
```

---

## Security Considerations

### Commitment Scheme

```
commitment = keccak256(
  abi.encodePacked(
    marketId,
    direction,    // 'yes' or 'no'
    amount,
    secret        // 32 random bytes
  )
)
```

**Properties:**
- Hiding: Cannot determine direction from commitment
- Binding: Cannot change direction after committing

### Secret Storage

- Secrets stored in browser localStorage
- Encrypted with user's wallet signature
- Never sent to server until reveal
- User warned to not clear browser data

### Reveal Window

- Fixed 1-hour window after resolution
- Non-revealed bets forfeited (funds to winner pool)
- Prevents indefinite waiting attacks

---

## Performance Optimizations

### Frontend

- React Server Components for static content
- Client components only where needed
- Optimistic UI updates
- SWR/React Query for data fetching
- Lazy loading for market list
- Virtual scrolling for long lists

### State Channels

- Batch multiple bets in single state update
- Compress state for smaller signatures
- Cache channel state client-side

---

## Error Handling

### Error Types

```typescript
enum HellyError {
  // Wallet
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_REJECTED = 'WALLET_REJECTED',

  // Channel
  CHANNEL_NOT_OPEN = 'CHANNEL_NOT_OPEN',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',

  // Betting
  MARKET_CLOSED = 'MARKET_CLOSED',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  BET_EXISTS = 'BET_EXISTS',

  // Reveal
  REVEAL_WINDOW_CLOSED = 'REVEAL_WINDOW_CLOSED',
  INVALID_SECRET = 'INVALID_SECRET',
  SECRET_NOT_FOUND = 'SECRET_NOT_FOUND',

  // Deposit
  DEPOSIT_FAILED = 'DEPOSIT_FAILED',
  BRIDGE_TIMEOUT = 'BRIDGE_TIMEOUT',
}
```

### Recovery Flows

- Secret backup/restore option
- Manual reveal if auto-reveal fails
- Channel dispute resolution via Yellow
