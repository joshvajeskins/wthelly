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
                     WebSocket (NitroRPC)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLEARNODE (Yellow Network)                      │
│                                                                         │
│  Message router — sees NOTHING about bet content                        │
│                                                                         │
│  • Routes signed app states between users and app server               │
│  • Manages ledger channels (user ↔ Clearnode)                          │
│  • Manages virtual app sessions (user ↔ app server)                    │
│  • Enforces ERC-7824 protocol (signatures, nonces)                     │
│  • Encrypted session_data passes through opaquely                      │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                     WebSocket (NitroRPC)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       TEE APP SERVER (Enclave)                          │
│                                                                         │
│  Runs inside Trusted Execution Environment                              │
│                                                                         │
│  • Decrypts bet payloads (only TEE has private key)                    │
│  • Validates bets (sufficient balance, market open, etc.)              │
│  • Maintains private pool state (yes/no totals per market)             │
│  • Computes payouts at resolution                                       │
│  • Generates ZK settlement proofs                                       │
│  • Signs final app states for on-chain settlement                      │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                    On-chain transactions
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Custody.sol    │  │  HellyHook.sol  │  │  Wthelly        │
│  (NitroLite)    │  │  (Uniswap v4)   │  │  Adjudicator    │
│                 │  │                 │  │  (ERC-7824)     │
│  Holds USDC     │  │  afterSwap()    │  │                 │
│  deposits for   │  │  monitors pool  │  │  Validates      │
│  state channels │  │  prices, auto-  │  │  settlement     │
│                 │  │  resolves price │  │  states and     │
│                 │  │  markets        │  │  ZK proofs      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │   Base Sepolia      │
                    │   (Settlement)      │
                    └─────────────────────┘
```

---

## State Channel Architecture (ERC-7824 / NitroLite)

### Channel Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│  LEDGER CHANNEL (on-chain)                                      │
│  User ↔ Clearnode                                               │
│  • Created by depositing USDC to Custody contract               │
│  • One per user                                                  │
│  • Allocations: [user_balance, clearnode_balance]                │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  APP SESSION 1 (virtual, off-chain)                       │  │
│  │  Market: "Will ETH hit $5k?"                              │  │
│  │  Participants: [user, app_server]                         │  │
│  │  Allocations: [user_alloc, server_alloc]                  │  │
│  │  session_data: <encrypted bet blob>                       │  │
│  │  Adjudicator: WthellyAdjudicator                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  APP SESSION 2 (virtual, off-chain)                       │  │
│  │  Market: "BTC above $100k by March?"                      │  │
│  │  Participants: [user, app_server]                         │  │
│  │  Allocations: [user_alloc, server_alloc]                  │  │
│  │  session_data: <encrypted bet blob>                       │  │
│  │  Adjudicator: WthellyAdjudicator                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### NitroRPC Message Format

All messages between user, Clearnode, and app server follow the NitroRPC protocol:

```typescript
// Request
type NitroRequest = [
  "req",                    // message type
  requestId: number,        // unique ID
  method: string,           // RPC method name
  payload: any[],           // method parameters
  timestamp: number,        // Unix timestamp
  signature: string         // EIP-712 signature
];

// Response
type NitroResponse = [
  "res",
  requestId: number,
  method: string,
  payload: any[],
  timestamp: number,
  signature: string
];
```

### Key RPC Methods Used

| Method | Purpose |
|--------|---------|
| `auth_request` | Request JWT auth token from Clearnode |
| `create_app_session` | Create a new market betting session |
| `close_app_session` | Close session and settle |
| `send_app_state` | Send encrypted bet to app server |
| `get_app_sessions` | List active sessions |
| `get_ledger_balances` | Check channel balance |

---

## Data Flow

### Placing a Bet (Encrypted, Gasless)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │     │  Clearnode   │     │  TEE App     │
│   (Browser)  │     │  (Router)    │     │  Server      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ 1. User picks      │                    │
       │    YES + $100      │                    │
       │                    │                    │
       │ 2. Encrypt bet     │                    │
       │    payload to TEE  │                    │
       │    public key      │                    │
       │                    │                    │
       │ 3. Create signed   │                    │
       │    app state:      │                    │
       │    allocs=[SAME]   │                    │
       │    data=encrypted  │                    │
       │                    │                    │
       │ 4. send_app_state ─┼──────────────────►│
       │    (NitroRPC)      │  routes opaque     │
       │                    │  blob through      │
       │                    │                    │ 5. Decrypt bet
       │                    │                    │    Validate:
       │                    │                    │    - amount <= balance
       │                    │                    │    - market is open
       │                    │                    │    Record internally
       │                    │                    │
       │◄───────────────────┼────────────────────│ 6. ACK (signed
       │                    │                    │    counter-state)
       │                    │                    │
       │ 7. Show "Bet       │                    │
       │    placed" toast   │                    │
       │                    │                    │
```

**Critical insight**: Allocations do NOT change when placing a bet. Only `session_data` is updated with the encrypted bet blob. This means the Clearnode cannot infer bet amounts from allocation changes.

### Market Resolution & Settlement

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Uniswap v4  │     │  TEE App     │     │  Custody     │
│  HellyHook   │     │  Server      │     │  Contract    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ 1. afterSwap()     │                    │
       │    detects price   │                    │
       │    target met      │                    │
       │                    │                    │
       │ 2. Emit            │                    │
       │    MarketResolved  │                    │
       │    event           │                    │
       │                    │                    │
       │──────────────────►│                    │
       │                    │ 3. Process event   │
       │                    │    Compute payouts │
       │                    │    for all bettors │
       │                    │                    │
       │                    │ 4. Generate ZK     │
       │                    │    proof of        │
       │                    │    correct payouts │
       │                    │                    │
       │                    │ 5. Create final    │
       │                    │    app states:     │
       │                    │    allocs updated  │
       │                    │    (winners +,     │
       │                    │     losers -)      │
       │                    │                    │
       │                    │ 6. close_app_      │
       │                    │    session ────────┼──►│
       │                    │    (for each user) │   │
       │                    │                    │   │ 7. Verify
       │                    │                    │   │    adjudicator
       │                    │                    │   │    + ZK proof
       │                    │                    │   │
       │                    │                    │   │ 8. Distribute
       │                    │                    │   │    USDC to
       │                    │                    │   │    winners
       │                    │                    │
```

---

## Encryption & Privacy

### TEE Encryption Model

```typescript
// Frontend encrypts bet to TEE public key
interface BetPayload {
  marketId: string;
  direction: 'yes' | 'no';
  amount: number;
}

// Encrypted with TEE's public key (e.g., ECIES or NaCl box)
const encryptedBet = encrypt(
  JSON.stringify(betPayload),
  TEE_PUBLIC_KEY
);

// App state sent via Clearnode
interface AppState {
  allocations: [bigint, bigint];  // UNCHANGED during betting
  session_data: string;            // encrypted bet blob (opaque)
  nonce: number;
  signatures: [string, string];
}
```

### Privacy Guarantees

| Layer | What It Sees |
|-------|-------------|
| **Frontend** | Own bet only (plaintext before encryption) |
| **Clearnode** | Encrypted blobs, channel metadata, routing info |
| **TEE App Server** | All bets (decrypted), pool ratios, payout computation |
| **On-chain** | Final allocations only (after settlement). No bet details. |
| **Other users** | Nothing until market resolution |

### TEE Trust Model

- App server runs in a verified TEE enclave (e.g., Intel SGX, AWS Nitro)
- Code hash is publicly verifiable — anyone can confirm what code runs in the enclave
- TEE private key never leaves the enclave
- Even the app server operator cannot extract bet data

---

## Smart Contracts

### Custody.sol (NitroLite)

Standard NitroLite custody contract. Holds USDC deposits and distributes funds based on final channel states.

```
Custody functions:
├── deposit(channelId, amount)     — Lock USDC into channel
├── challenge(channelId, state)    — Start dispute with signed state
├── checkpoint(channelId, state)   — Record agreed state on-chain
├── conclude(channelId, state)     — Close channel, distribute funds
└── reclaim(channelId)             — Reclaim after timeout
```

### WthellyAdjudicator.sol (ERC-7824)

Custom adjudicator that validates prediction market app session states.

```solidity
interface IWthellyAdjudicator {
    // Validate a state transition
    // - During betting: only session_data changes, allocations unchanged
    // - During settlement: allocations change, ZK proof required
    function adjudicate(
        AdjudicatorParams calldata params,
        bytes calldata proof
    ) external returns (bool);
}

// AdjudicatorParams (from ERC-7824)
struct AdjudicatorParams {
    uint256 channelId;
    address[] participants;
    uint256[] allocations;
    bytes appData;           // session_data (encrypted during betting)
    uint256 nonce;
}
```

### HellyHook.sol (Uniswap v4)

```solidity
contract HellyHook is BaseHook {
    struct PriceMarket {
        bytes32 marketId;
        PoolKey poolKey;          // Which Uniswap pool to monitor
        uint160 targetSqrtPrice;  // Target price in sqrtPriceX96 format
        bool isAbove;             // true = resolve YES when price >= target
        uint256 deadline;         // Market expiry
        bool resolved;
        bool outcome;
    }

    mapping(bytes32 => PriceMarket) public markets;

    // Hook: fires after every swap in registered pools
    function afterSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external override returns (bytes4, int128) {
        // Check all active markets for this pool
        // If price condition met → resolve market
        // Emit MarketResolved(marketId, outcome)
    }

    // Permissionless: anyone can create a price-based market
    function createPriceMarket(
        bytes32 marketId,
        PoolKey calldata poolKey,
        uint160 targetSqrtPrice,
        bool isAbove,
        uint256 deadline
    ) external;

    // Admin: resolve non-price markets manually
    function resolveMarket(
        bytes32 marketId,
        bool outcome
    ) external onlyAdmin;
}
```

---

## State Management

### Client-Side State

```typescript
interface AppState {
  // User
  user: UserSession | null;
  isConnected: boolean;

  // Yellow Network
  ledgerChannelId: string | null;
  channelBalance: bigint;
  appSessions: AppSession[];     // One per market the user is betting on

  // Markets
  markets: Market[];
  marketsLoading: boolean;

  // User's bets (decrypted locally, never sent unencrypted)
  myBets: Map<string, BetPayload>;  // marketId → bet

  // TEE
  teePublicKey: string;           // For encrypting bets
}
```

### App Session State (ERC-7824)

```typescript
interface AppSession {
  sessionId: string;
  marketId: string;
  participants: [string, string];     // [user, appServer]
  allocations: [bigint, bigint];      // [userAlloc, serverAlloc]
  sessionData: string;                 // Encrypted bet blob
  nonce: number;
  status: 'open' | 'settled' | 'disputed';
}
```

---

## Payout Calculation

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

This calculation happens inside the TEE.
ZK proof verifies the math on-chain without revealing individual bets.
```

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
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',

  // Settlement
  SETTLEMENT_PROOF_INVALID = 'SETTLEMENT_PROOF_INVALID',
  ADJUDICATOR_REJECTED = 'ADJUDICATOR_REJECTED',

  // TEE
  TEE_UNAVAILABLE = 'TEE_UNAVAILABLE',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',

  // Deposit
  DEPOSIT_FAILED = 'DEPOSIT_FAILED',
  BRIDGE_TIMEOUT = 'BRIDGE_TIMEOUT',
}
```

### Recovery Flows

- **TEE down**: Channel can be disputed on-chain via Custody contract timeout
- **Clearnode down**: Yellow Network liveness guarantees — user can force-close channel on-chain
- **Settlement dispute**: WthellyAdjudicator verifies ZK proof; incorrect settlement is rejected
