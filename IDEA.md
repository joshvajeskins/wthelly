# WTHELLY — Private Betting with Brainrot Energy

> Bet on anything. Hidden positions. Maximum aura. No cap fr fr.

---

## Problem

Prediction markets are cooked:

- **Public bets = skill issue** — Everyone sees the odds, herd mentality kicks in, whales manipulate
- **Gas fees are not sigma** — Paying $5 to place a $10 bet is negative aura
- **UX is Ohio-tier** — Wallet popups, chain switching, bridge waiting... bro just let me bet

There's no way to make a quick, private, gasless bet without losing your mind.

---

## Solution

A web app where:

1. **Private betting** — Your position is hidden until resolution (commitment-reveal scheme)
2. **Gasless everything** — Yellow state channels handle bets off-chain
3. **Deposit from anywhere** — LI.FI brings funds from any chain
4. **Atomic settlement** — Uniswap v4 hook handles payouts

No cap, this is how betting should work.

---

## Brainrot Theme & Terminology

| Term | Meaning |
|------|---------|
| **Skibidi** | User/bettor |
| **Aura** | Points/reputation from winning bets |
| **Squad** | Team of skibidis that compete together |
| **Rizz Pool** | The betting pool for a market |
| **Sigma Battle** | 1v1 bet between two skibidis |
| **Ohio Mode** | When you're on a losing streak |
| **Gyatt** | A market with massive volume (that's a gyatt pool fr) |
| **No Cap** | Public market (transparent odds) |
| **Cap** | Private market (hidden positions) |
| **Fanum Tax** | Platform fee on winnings |

---

## Protocol Integrations

| Protocol | Role | How We Use It |
|----------|------|---------------|
| **Yellow Network** | Gasless betting | State channels for off-chain bet placement, modification, cancellation |
| **Uniswap v4** | Settlement | Custom hook for atomic bet resolution and payouts |
| **LI.FI** | Cross-chain deposits | Deposit from any chain with any token, converted to USDC |

---

## Key Innovation: Private Betting via State Channels

### The Problem with Public Bets

```
TYPICAL PREDICTION MARKET:

"Will ETH hit $5k by Friday?"

YES: $45,000 (73%)
NO:  $17,000 (27%)

Problems:
├── Everyone sees sentiment → herding behavior
├── Whales see small bets → counter-position
├── Late bettors have information advantage
└── Market manipulation via fake volume

Result: Negative aura experience
```

### WTHELLY Solution: Cap Mode (Hidden Bets)

```
WTHELLY (Cap Mode):

"Will ETH hit $5k by Friday?"

Total Rizz Pool: $62,000
Positions: HIDDEN (that's cap fr)
Your Bet: Only you know

At resolution:
├── Oracle confirms result
├── Skibidis reveal their bets
├── Commitments verified
└── Payouts via Uniswap v4 hook

Maximum sigma energy.
```

---

## How It Works

### Betting Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SKIBIDI PLACES BET                                          │
│                                                                 │
│  Web App:                                                       │
│  ├── User selects: YES, $100                                   │
│  ├── Generates random secret locally                           │
│  ├── Creates commitment = hash(market, YES, $100, secret)      │
│  ├── Stores secret in browser (localStorage/IndexedDB)         │
│  └── Signs state channel update (gasless)                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  2. YELLOW STATE CHANNEL                                        │
│                                                                 │
│  Off-chain magic:                                               │
│  ├── Bet recorded in state channel                             │
│  ├── Funds locked (but no on-chain tx)                         │
│  ├── Instant confirmation                                       │
│  └── Can modify/cancel anytime (still gasless)                 │
│                                                                 │
│  Server sees: commitment_hash + amount                          │
│  Server does NOT see: bet direction                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  3. RESOLUTION                                                  │
│                                                                 │
│  ├── Oracle (Chainlink/Pyth): ETH = $5,127 → YES wins         │
│  ├── Server broadcasts: "Reveal your bets!"                    │
│  ├── Skibidis submit reveals: direction + secret               │
│  ├── Server verifies: hash(reveal) == commitment               │
│  └── Settlement triggered                                       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  4. SETTLEMENT (Uniswap v4 Hook)                               │
│                                                                 │
│  ├── State channel closes                                      │
│  ├── Uniswap v4 hook processes payouts                        │
│  ├── Winners receive funds atomically                          │
│  └── Fanum tax (platform fee) collected                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### What's Hidden in Cap Mode?

| Data | Server Sees? | Other Skibidis See? |
|------|--------------|---------------------|
| Bet amount | Yes (for locking) | No |
| Bet direction | **No** | No |
| User identity | Yes (for payouts) | No (only commitment hash) |

---

## Cross-Chain Deposits (LI.FI)

### Deposit From Anywhere

```
┌─────────────────────────────────────────┐
│  FUEL UP YOUR WALLET                    │
│                                         │
│  From Chain:                            │
│  [Bitcoin] [Solana] [Ethereum]         │
│  [Arbitrum] [Base] [Polygon] [+more]   │
│                                         │
│  From Token:                            │
│  [BTC] [SOL] [ETH] [USDC] [Any]        │
│                                         │
│  Amount: [0.1 ETH]                      │
│  You'll receive: ~$320 USDC             │
│                                         │
│  [LFG 🚀]                               │
│                                         │
│  Powered by LI.FI                       │
└─────────────────────────────────────────┘
```

---

## Yellow Network Integration

### Why State Channels?

```
Traditional betting:
├── Place bet → $2 gas
├── Modify bet → $2 gas
├── Cancel bet → $2 gas
├── Claim winnings → $2 gas
└── Total: $8+ in gas for one bet cycle

Yellow state channels:
├── Open channel → $2 gas (one time)
├── Place bet → FREE (off-chain)
├── Modify bet → FREE (off-chain)
├── Cancel bet → FREE (off-chain)
├── Close channel → $2 gas (settlement)
└── Total: $4 for unlimited bets

That's sigma efficiency.
```

### State Channel Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  YELLOW STATE CHANNEL LIFECYCLE                                 │
│                                                                 │
│  1. OPEN CHANNEL                                                │
│     ├── Deposit USDC to channel contract                       │
│     ├── One on-chain tx                                        │
│     └── Channel now active                                      │
│                                                                 │
│  2. OFF-CHAIN OPERATIONS (all gasless)                         │
│     ├── Place bets (signed state updates)                      │
│     ├── Modify bets                                            │
│     ├── Cancel bets                                            │
│     ├── Join markets                                           │
│     └── All instant, all free                                  │
│                                                                 │
│  3. SETTLEMENT                                                  │
│     ├── Market resolves                                        │
│     ├── Final state agreed                                     │
│     ├── Channel closes                                         │
│     └── Payouts via Uniswap v4 hook                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Uniswap v4 Settlement Hook

### HellyHook.sol

```solidity
// Simplified concept
contract HellyHook is BaseHook {

    struct Market {
        bytes32 marketId;
        uint256 yesPool;
        uint256 noPool;
        bool resolved;
        bool outcome; // true = YES won
    }

    // Called when market resolves
    function settleMarket(
        bytes32 marketId,
        bool outcome,
        bytes[] calldata reveals,
        bytes[] calldata signatures
    ) external {
        // Verify all reveals match commitments
        for (uint i = 0; i < reveals.length; i++) {
            require(verifyReveal(reveals[i], signatures[i]), "Invalid reveal");
        }

        // Calculate payouts
        // Winners split the losing pool (minus fanum tax)

        // Execute atomic payouts via Uniswap
        // ...
    }
}
```

---

## User Experience

### Landing Page

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    WTHELLY                        │
│                                                                 │
│              Bet on anything. Hidden positions.                 │
│                    Maximum aura. No cap fr fr.                  │
│                                                                 │
│                      [ENTER THE MARKET]                         │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  GASLESS    │  │   PRIVATE   │  │  CROSS-CHAIN │            │
│  │  Bets via   │  │  Hidden     │  │  Deposit     │            │
│  │  Yellow     │  │  positions  │  │  from        │            │
│  │  state      │  │  until      │  │  anywhere    │            │
│  │  channels   │  │  resolution │  │  via LI.FI   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Market View

```
┌─────────────────────────────────────────────────────────────────┐
│  WTHELLY                         [Connect Wallet] │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🔥 TRENDING MARKETS                                      │  │
│  │                                                           │  │
│  │  "Will ETH hit $5k by March?"                [GYATT 🍑]  │  │
│  │  Rizz Pool: $127,450  |  Closes in 2d 14h                │  │
│  │  Mode: CAP (hidden)                                       │  │
│  │  [BET NOW]                                               │  │
│  │                                                           │  │
│  │  "Bitcoin $100k end of year?"                            │  │
│  │  Rizz Pool: $89,200  |  Closes in 14d                    │  │
│  │  Mode: NO CAP (public: YES 67% / NO 33%)                 │  │
│  │  [BET NOW]                                               │  │
│  │                                                           │  │
│  │  "Will Solana flip Ethereum?"                            │  │
│  │  Rizz Pool: $45,000  |  Closes in 30d                    │  │
│  │  Mode: CAP (hidden)                                       │  │
│  │  [BET NOW]                                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  YOUR STATS                                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Aura: 1,250 🔥  |  Win Rate: 67%  |  Active Bets: 3     │  │
│  │  Status: SIGMA MODE                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Betting Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  "Will ETH hit $5k by March?"                              [X] │
│                                                                 │
│  Mode: CAP (your position stays hidden)                        │
│                                                                 │
│  YOUR POSITION                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │                     │  │                     │              │
│  │        YES          │  │         NO          │              │
│  │                     │  │    [SELECTED]       │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
│  AMOUNT                                                         │
