# WTHELLY — Private Prediction Markets

> Bet on anything. Nobody sees your position. No cap fr fr.

---

## Problem

Prediction markets are cooked:

- **Public bets = skill issue** — Everyone sees the odds, herd mentality kicks in, whales manipulate
- **Gas fees are not sigma** — Paying $5 to place a $10 bet is negative energy
- **Bet privacy is nonexistent** — Even "commit-reveal" schemes leak amounts and timing to the server
- **No trustless resolution** — Most markets rely on centralized oracles or admin resolution

---

## Solution

A prediction market where:

1. **All bets are encrypted** — TEE app server holds all positions. Clearnode (the router) sees nothing. Pool ratios are hidden from everyone until resolution.
2. **Gasless everything** — Yellow Network state channels handle all bets off-chain via signed app states.
3. **Trustless price resolution** — Uniswap v4 hook monitors on-chain pool prices and auto-resolves markets when conditions are met.
4. **Deposit from anywhere** — LI.FI brings funds from any chain.
5. **Verifiable settlement** — ZK proofs verify payout computation on-chain.

---

## Protocol Integrations

| Protocol | Role | How We Use It |
|----------|------|---------------|
| **Yellow Network** | Gasless private betting | NitroLite state channels (ERC-7824). Clearnode routes encrypted app states between users and TEE app server. All betting is off-chain. |
| **Uniswap v4** | Trustless price oracle | Custom hook with `afterSwap()` — monitors pool prices on every swap, auto-resolves price-based prediction markets when target conditions are met. |
| **LI.FI** | Cross-chain deposits | Deposit from any chain with any token, bridged and swapped to USDC on the settlement chain. |

---

## Key Innovation: TEE-Encrypted State Channels

### The Problem with Existing Approaches

```
TYPICAL PREDICTION MARKET (Polymarket-style):
├── All positions are public → herding behavior
├── Whales see sentiment → counter-position
├── Late bettors have information advantage
└── Market manipulation via fake volume

COMMIT-REVEAL (on-chain):
├── Amounts are visible on-chain during commit phase
├── Server knows the commitment count → can infer sentiment
├── Reveal phase is on-chain → gas costs per user
└── Secret storage in browser localStorage → fragile
```

### WTHELLY Solution: Encrypted App Sessions

```
WTHELLY:
├── User encrypts bet to TEE public key
├── Clearnode routes encrypted blob (sees nothing)
├── TEE decrypts and validates internally
├── Pool ratios hidden from everyone
├── Allocations don't change during betting
│   └── Only session_data updates (opaque to Clearnode)
├── At resolution: TEE reveals all, computes payouts
├── ZK proof verifies settlement math
└── On-chain settlement via WthellyAdjudicator

Privacy guarantees:
├── Clearnode: sees NOTHING (encrypted blobs only)
├── Other users: see NOTHING
├── Frontend: sees only own encrypted bet confirmation
├── TEE app server: sees all (runs in verified enclave)
└── Pool ratios: hidden until market resolution
```

---

## How It Works

### State Channel Architecture (ERC-7824 / NitroLite)

```
┌──────────────┐                ┌──────────────┐
│   User       │◄──── WS ─────►│  Clearnode    │
│   (Browser)  │  NitroRPC      │  (Router)     │
└──────┬───────┘                └──────┬────────┘
       │                               │
       │  Signed app states            │  Routes messages
       │  (encrypted session_data)     │  (sees nothing)
       │                               │
       │                        ┌──────┴────────┐
       │                        │  TEE App      │
       │                        │  Server       │
       │                        │               │
       │                        │  • Decrypts   │
       │                        │  • Validates   │
       │                        │  • Tracks pool │
       │                        │  • Computes    │
       │                        │    payouts     │
       │                        └───────────────┘
       │
┌──────┴───────┐
│   Custody    │  On-chain (Base Sepolia)
│   Contract   │  Holds USDC deposits
└──────────────┘
```

### Betting Flow (Detailed)

```
1. OPEN STATE CHANNEL (one-time, on-chain)
   ├── User deposits USDC to Custody contract
   ├── Creates a ledger channel with Clearnode
   └── Gets session key for signing

2. JOIN MARKET (gasless, off-chain)
   ├── User creates an app session for a specific market
   ├── App session has [user_allocation, server_allocation]
   ├── Initial allocations set based on deposit
   └── WthellyAdjudicator validates the session

3. PLACE BET (gasless, encrypted, off-chain)
   ├── User creates bet payload: { marketId, direction, amount }
   ├── Encrypts payload to TEE public key
   ├── Signs app state update:
   │   ├── allocations: [UNCHANGED, UNCHANGED]  ← key insight
   │   └── session_data: encrypted_bet_blob
   ├── Sends via Clearnode (Clearnode sees nothing)
   └── TEE decrypts, validates (sufficient balance?), records bet

4. MARKET RESOLUTION (on-chain trigger)
   ├── Price markets: Uniswap v4 hook detects price condition met
   ├── Custom markets: Admin posts resolution on-chain
   ├── TEE receives resolution event
   └── TEE computes final payouts for all participants

5. SETTLEMENT (on-chain)
   ├── TEE generates ZK proof of correct payout computation
   ├── TEE creates final app state with updated allocations:
   │   ├── Winners: allocation increased by winnings
   │   ├── Losers: allocation decreased by bet amount
   │   └── Platform: fanum tax collected
   ├── Final state submitted to WthellyAdjudicator
   ├── Adjudicator verifies ZK proof + signatures
   └── Custody contract distributes USDC to winners
```

### What's Hidden and From Whom

| Data | Clearnode Sees? | Other Users See? | TEE Sees? |
|------|----------------|------------------|-----------|
| Bet direction | No (encrypted) | No | Yes |
| Bet amount | No (encrypted) | No | Yes |
| Pool ratios | No | No | Yes |
| Market question | Yes (public) | Yes | Yes |
| User address | Yes (channel routing) | No | Yes |
| Final payouts | Yes (after settlement) | Own only | Yes |

---

## Uniswap v4 Price Oracle Hook

### How HellyHook Works

```
┌─────────────────────────────────────────────────────────────────┐
│  Uniswap v4 Pool (e.g., ETH/USDC)                              │
│                                                                 │
│  Normal swaps happen as usual                                   │
│                                                                 │
│  afterSwap() hook fires on every swap:                          │
│  ├── Gets current pool price (sqrtPriceX96)                    │
│  ├── Checks all registered prediction markets                  │
│  ├── For each market with a price target:                      │
│  │   ├── "Will ETH hit $5k?" → check if price >= $5000        │
│  │   ├── "Will ETH drop below $3k?" → check if price <= $3000 │
│  │   └── If condition met → emit MarketResolved event          │
│  └── TEE app server listens for events → triggers settlement  │
│                                                                 │
│  Permissionless market creation:                                │
│  ├── Anyone can create a price-based market                    │
│  ├── Specify: pool, direction (above/below), target price      │
│  └── Hook auto-resolves when condition is met                  │
│                                                                 │
│  No oracle needed for price markets.                           │
│  The Uniswap pool IS the oracle.                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cross-Chain Deposits (LI.FI)

```
┌─────────────────────────────────────────┐
│  DEPOSIT FUNDS                          │
│                                         │
│  From Chain:                            │
│  [Ethereum] [Arbitrum] [Base]          │
│  [Polygon] [Optimism] [+more]          │
│                                         │
│  From Token:                            │
│  [ETH] [USDC] [USDT] [DAI] [Any]      │
│                                         │
│  Amount: [0.1 ETH]                      │
│  You'll receive: ~$320 USDC             │
│                                         │
│  [LFG]                                  │
│                                         │
│  Deposited USDC goes directly into      │
│  your Yellow Network state channel      │
└─────────────────────────────────────────┘
```

---

## Smart Contracts

### WthellyAdjudicator.sol (ERC-7824)

```solidity
contract WthellyAdjudicator is IAdjudicator {
    // Validates app session state transitions
    // Ensures: bet amounts <= user allocation
    // Ensures: settlement payouts are mathematically correct
    // Verifies ZK proof at final settlement

    function adjudicate(
        AdjudicatorParams calldata params,
        bytes calldata proof
    ) external returns (bool);
}
```

### HellyHook.sol (Uniswap v4)

```solidity
contract HellyHook is BaseHook {
    struct PriceMarket {
        PoolKey pool;
        uint256 targetPrice;
        bool isAbove;        // true = "will price go above target?"
        bool resolved;
        bool outcome;
    }

    // afterSwap: check if any market conditions are met
    function afterSwap(...) external override {
        uint256 currentPrice = getCurrentPrice(key);
        for (uint i = 0; i < activeMarkets.length; i++) {
            if (shouldResolve(activeMarkets[i], currentPrice)) {
                resolve(activeMarkets[i]);
            }
        }
    }

    // Permissionless market creation
    function createPriceMarket(
        PoolKey calldata pool,
        uint256 targetPrice,
        bool isAbove,
        uint256 deadline
    ) external;
}
```

---

## Brainrot Terminology

| Term | Meaning |
|------|---------|
| **Skibidi** | User/bettor |
| **Rizz Pool** | The betting pool for a market |
| **Gyatt** | A market with massive volume |
| **Fanum Tax** | Platform fee on winnings (2%) |

---

## Hackathon Scope

### Must Have
- [ ] Yellow Network state channel integration (NitroLite / Clearnode)
- [ ] TEE app server with encrypted bet handling
- [ ] Custom WthellyAdjudicator (ERC-7824)
- [ ] Uniswap v4 price oracle hook (afterSwap auto-resolution)
- [ ] Web app with market browsing and betting
- [ ] LI.FI cross-chain deposit flow
- [ ] ZK settlement proof generation

### Nice to Have
- [ ] UMA optimistic oracle for custom market resolution
- [ ] Permissionless market creation UI
- [ ] Mobile-responsive design
- [ ] Leaderboard

---

## The Pitch

> "Prediction markets are cooked. Public odds get gamed. We built WTHELLY — where all bets are encrypted inside a TEE, routed through Yellow Network state channels that see nothing, and settled trustlessly via Uniswap v4 price hooks. Your position is invisible until resolution. The Clearnode routing your bets literally cannot read them. Deposit from any chain with LI.FI. No cap fr fr."
