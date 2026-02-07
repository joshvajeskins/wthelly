# wthelly

### The prediction market where nobody knows which side you're on.

---

## One-Liner

A prediction market that hides your bet direction using ECIES encryption, settles payouts with ZK proofs, and runs entirely off-chain through ERC-7824 state channels — you only touch the chain to deposit and withdraw.

---

## The Problem

Prediction markets today have a transparency problem that's actually a *feature request*.

On Polymarket, the moment you place a bet, everyone sees it. Whales move markets before they even finish clicking. Copy-traders front-run conviction. Your $500 YES on "ETH hits $10k" is public before the block confirms.

This creates three real issues:
1. **Whale exposure** — large bets move odds before settlement, punishing informed traders
2. **Copy-trading parasites** — bots mirror smart money, diluting alpha
3. **Gas costs per bet** — every prediction is an on-chain transaction, making micro-bets uneconomical

What if your bet direction was encrypted, the payout math was provably correct *without* revealing who bet what, and you never paid gas to place a bet?

---

## The Solution

**wthelly** is a prediction market where:

- Your bet direction (YES/NO) is **ECIES-encrypted** — only a TEE can read it
- Settlement payouts are verified by a **Groth16 ZK proof** — math is correct, but individual bets stay hidden
- All betting happens **off-chain** through **ERC-7824 state channels** (Nitrolite) — zero gas per bet
- On-chain price data from **Uniswap V4 hooks** powers automated market resolution

You deposit once. You bet as many times as you want. You withdraw when you're done. Two on-chain transactions total.

---

## How It Works (The Fun Version)

```
You:     "I think ETH hits $5000 by Friday"
wthelly: *encrypts your YES bet so literally nobody can see it*
You:     *places 5 more bets on different markets, zero gas*
Friday:  ETH hits $5000
wthelly: *TEE computes payouts, generates ZK proof*
         *proof says "the math checks out" without saying who won*
Chain:   *verifies proof, confirms payouts*
You:     *withdraws winnings*
Others:  "wait, who even bet YES?"
```

---

## How It Works (The Technical Version)

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    ON-CHAIN                          │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Custody   │  │  HellyHook   │  │  Groth16     │  │
│  │ (ERC-7824)│  │  (V4 Hook)   │  │  Verifier    │  │
│  │           │  │              │  │              │  │
│  │ Deposits  │  │ Markets      │  │ Proof check  │  │
│  │ Withdraws │  │ Oracle prices│  │ 4 pub signals│  │
│  │ Channels  │  │ ZK settle    │  │              │  │
│  └──────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
         │                                    ▲
         │ deposit/withdraw only              │ proof
         ▼                                    │
┌─────────────────────────────────────────────────────┐
│                   OFF-CHAIN                         │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Clearnode │  │  TEE Server  │  │  Frontend    │  │
│  │ (Nitro-  │  │  (Trusted    │  │  (Next.js)   │  │
│  │  lite)    │◄─┤  App Logic)  │  │              │  │
│  │           │  │              │  │ ECIES encrypt│  │
│  │ State     │  │ ECIES decrypt│  │ WS client    │  │
│  │ channels  │  │ Balance track│  │ Privy wallet │  │
│  │ Routing   │  │ ZK proofs    │  │              │  │
│  └──────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
```

### User Flow

**1. Onboarding (2 on-chain txs, then never again)**
- Connect wallet → Approve USDC → Deposit to Custody → Open state channel
- That's it. You're ready to bet.

**2. Placing Bets (zero gas, fully encrypted)**
- Pick a market, choose YES or NO, enter amount
- Frontend ECIES-encrypts `{marketId, direction, amount}` with the TEE's public key
- Encrypted blob is sent through Clearnode state channel as an app state update
- TEE decrypts, validates your available balance, co-signs the state
- Nobody — not Clearnode, not other users, not the chain — knows your direction

**3. Settlement (ZK-verified, trustless)**
- Market resolves (admin or Uniswap V4 oracle)
- TEE computes payouts: winners get proportional share of loser pool minus fee
- TEE generates a **Groth16 ZK proof** that proves:
  - Total pool = sum of all bets *(conservation)*
  - Platform fee = loserPool * feeBps / 10000 *(correct fee)*
  - Sum of payouts + fee = total pool *(no funds created or destroyed)*
  - Losers get zero, winners get proportional payouts
  - ...all **without revealing** who bet which direction
- Proof submitted on-chain → HellyHook verifies via Groth16Verifier → payouts confirmed

**4. Withdrawal (1 on-chain tx)**
- Close channel → Withdraw from Custody → Done

---

## Why State Channels (Nitrolite / ERC-7824)

This is the core UX unlock. Without state channels, every bet = an on-chain transaction. With Nitrolite:

| Without State Channels | With Nitrolite |
|----------------------|----------------|
| Gas per bet (~$0.50-2) | Zero gas per bet |
| 2-12s confirmation per bet | Instant (WebSocket) |
| Bet visible on-chain immediately | Bet encrypted, off-chain |
| Need new tx for each market | One channel serves all markets |

**How we use Nitrolite specifically:**
- **Custody.sol** holds all user funds with ERC-7824 channel lifecycle
- **Clearnode** routes encrypted bet states between user and TEE as app sessions
- Each bet creates an **app session** — a lightweight virtual channel within the user's ledger channel
- The TEE participates as the counterparty in every app session, co-signing valid states
- On settlement, app sessions close with final allocations reflecting payouts
- Users can dispute via on-chain challenge if anything goes wrong

The state channel is the highway. Bets are the cars. You pay the toll once (deposit), drive as much as you want, and pay again to exit (withdraw).

---

## Why ZK Proofs

The ZK proof is what makes "hidden bets with provable settlement" possible.

**The circuit** (`settlement_verify.circom`, Groth16, MAX_BETS=32):

```
Public signals (verified on-chain):     Private signals (hidden):
├── outcome (0 or 1)                    ├── directions[] (each bet's YES/NO)
├── feeBps (platform fee rate)          ├── amounts[] (each bet's size)
├── totalPool (sum of all bets)         ├── payouts[] (each bet's payout)
└── platformFee (fee amount)            └── active[] (which slots are used)
```

**What the proof guarantees:**
- The math is correct (conservation law holds)
- No funds appear from nowhere or vanish
- Winners are correctly classified based on outcome
- Payouts are proportional (cross-multiplication check)
- Platform fee is exactly right

**What the proof hides:**
- Who bet YES vs NO
- Individual bet amounts
- Individual payouts
- How many people were on each side

An observer sees: "a market settled, $10,000 total pool, $200 fee, payouts distributed." They do NOT see: "Alice bet $5000 YES and won $9,800."

---

## Uniswap V4 Integration

HellyHook is a **Uniswap V4 hook** that serves as an on-chain price oracle for automated market resolution.

- Implements `afterSwap()` to record `lastSqrtPriceX96` after every swap on tracked pools
- Markets can be created with a price target: *"Will ETH/USDC be above $5000 by block X?"*
- `resolveMarketFromOracle()` reads the stored price and resolves the market automatically
- No need for external oracles — the swap activity IS the oracle

This means prediction markets can be created on ANY Uniswap V4 pool's price action, with trustless automated resolution.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contracts | Solidity, Foundry | HellyHook (V4 hook), Groth16Verifier, Custody |
| State Channels | Nitrolite SDK, ERC-7824 | Gasless off-chain betting |
| ZK Proofs | circom, snarkjs, Groth16 | Privacy-preserving settlement verification |
| TEE | Node.js, Marlin Oyster | Encrypted bet processing, proof generation |
| Frontend | Next.js, Privy, viem | Wallet connection, ECIES encryption, state channel client |
| Encryption | ECIES (secp256k1 + AES-256-GCM) | Bet direction hiding |
| Chain | Unichain Sepolia | Deployment target |

---

## What Makes This Novel

1. **Encrypted prediction markets are new.** Existing platforms (Polymarket, Augur) show all positions publicly. wthelly is the first to encrypt bet directions with ECIES and settle with ZK proofs.

2. **State channels for prediction markets are new.** Nobody has used ERC-7824 channels to make betting gasless while maintaining on-chain settlement guarantees.

3. **The "shadow balance" system.** The TEE tracks available liquidity per user separately from the channel ledger — enabling multiple concurrent bets across markets without any channel resizing.

4. **ZK-verified settlement with hidden bets.** The Groth16 circuit proves payout correctness across up to 32 bets without revealing any individual bet's direction or amount on-chain.

5. **Uniswap V4 hooks as price oracles for prediction markets.** Using swap activity as a built-in oracle for automated market resolution — no Chainlink, no external feeds.

---

## Demo

**Video walkthrough covering:**
1. Wallet connect + mint test USDC
2. Deposit to Custody + open state channel
3. Browse markets + place an encrypted bet (show ECIES encryption happening)
4. Show that the bet direction is invisible on-chain and to Clearnode
5. Admin resolves market
6. TEE generates ZK proof + settlement verified on-chain
7. Withdraw winnings

---

## Sponsor Integrations

### Nitrolite / ERC-7824
- **Custody.sol** — full ERC-7824 fund custody with channel lifecycle
- **Clearnode** — state channel router managing WebSocket connections and app sessions
- **NitroliteClient SDK** — frontend integration for channel create, deposit, withdraw, app session management
- **App Sessions** — each bet is an app session between user and TEE, with encrypted state payloads

### Uniswap
- **HellyHook** — V4 hook implementing `afterSwap()` for price oracle
- **On-chain price recording** — `lastSqrtPriceX96` stored per pool per swap
- **Automated market resolution** — `resolveMarketFromOracle()` compares stored price vs market target
- **Pool-native prediction markets** — any V4 pool becomes a prediction market source

---

## Builder

**Joshva Jeskins** — Solo builder
- GitHub: [joshvajeskins](https://github.com/joshvajeskins)
- Contact: joshvajeskinsweb3@gmail.com

---

## Links

- **GitHub:** [wthelly repo]
- **Demo Video:** [link]
- **Deployed on:** Unichain Sepolia (Chain ID: 1301)

---

*built at ETHGlobal HackMoney 2026*
