# wthelly App Flow

## Architecture Overview

wthelly is a prediction market platform where bet directions are hidden using ECIES encryption and settlements are verified using Groth16 ZK proofs. The system uses ERC-7824 state channels (Nitrolite/Clearnode) for off-chain state management and Uniswap V4 hooks for on-chain price oracles.

**Key principle:** Users only do on-chain transactions for depositing and withdrawing. All betting activity happens off-chain through state channels. The TEE server is the trusted app logic layer that validates bets, tracks balances, and generates ZK proofs for settlement.

---

## Deployed Contracts (Unichain Sepolia, Chain ID 1301)

| Contract | Address | Purpose |
|----------|---------|---------|
| HellyHook | `0x6feb4f3eed23d6cdda54ec67d5d649be015f782d` | Prediction market management + price oracle + ZK settlement verification |
| MockUSDC | `0xd8f50a509efe389574dd378b0ef03e33558222ea` | Test USDC token |
| Groth16Verifier | *(needs deployment)* | On-chain ZK proof verification (generated from settlement circuit) |
| Custody | `0xbc971a5be98ee37bdb82ca3e79f8e592dfcf0865` | ERC-7824 fund custody for state channels |
| Adjudicator (Dummy) | `0xc3a95ef6a26d309e4fa40f211d0892571a92096f` | State channel dispute resolution (currently always-true placeholder) |
| BalanceChecker | `0x87da1de8bedc98bfe27eddf3dcfca8bebc2425b3` | Utility for reading custody balances |

---

## Components

### 1. HellyHook.sol (On-Chain)
- Uniswap V4 hook that records pool prices via `afterSwap` (price oracle)
- Admin creates/resolves prediction markets
- `settleMarketWithProof()` verifies Groth16 ZK proofs to validate settlement math
- **Record-only settlement**: emits events with payout amounts but does NOT transfer funds (funds are managed by Custody.sol)

### 2. Groth16Verifier.sol (On-Chain)
- Generated from the `settlement_verify.circom` circuit via snarkjs
- Verifies 4 public signals: `[outcome, feeBps, totalPool, platformFee]`
- Uses BN128 curve with EVM precompiles (ecMul, ecAdd, ecPairing)
- This same verifier will be used for **adjudication** — the custom adjudicator will call it to validate state transitions during disputes

### 3. Custody.sol (On-Chain, ERC-7824)
- Holds all user funds (USDC deposits)
- Manages state channel lifecycle: create, join, close, challenge, checkpoint, resize
- Users deposit USDC into Custody, which creates their on-chain balance
- Channel close operations distribute funds based on the final signed state

### 4. Custom Adjudicator (On-Chain, TO BE BUILT)
- Replaces the Dummy adjudicator (which accepts everything)
- When a dispute arises (challenge on Custody), the adjudicator validates the state transition
- For settlement state transitions: decodes the state `data` bytes, extracts the ZK proof, and calls Groth16Verifier to verify correctness
- This ensures that even during disputes, settlement math is cryptographically verified

### 5. Clearnode (Off-Chain, Infrastructure)
- Stock Nitrolite state channel server (Go)
- Manages WebSocket connections, channel lifecycle, app sessions
- Routes messages between participants
- Maintains ledger balances (what the channel thinks each user has)
- Does NOT understand betting logic — it's a generic state channel router

### 6. TEE Server (Off-Chain, Trusted App Logic)
- The "brain" of the betting system
- Holds the ECIES private key for decrypting bet data
- Maintains internal balance tracking per user (separate from Clearnode's view)
- Validates bet placements (checks available liquidity)
- Co-signs valid app states (both participants must sign for state to advance)
- Computes settlements and generates Groth16 ZK proofs
- Connects to Clearnode via WebSocket as a participant in app sessions

### 7. ZK Circuit (settlement_verify.circom)
- Groth16 circuit with MAX_BETS = 32
- **Public signals (verified on-chain):** outcome, feeBps, totalPool, platformFee
- **Private signals (hidden):** individual bet directions, amounts, payouts, active flags
- **Constraints enforced:**
  - Outcome is binary (0 or 1)
  - Active flags are contiguous (no gaps)
  - Directions are binary
  - Inactive slots are zeroed
  - Winner/loser classification matches outcome
  - TotalPool = sum of all bet amounts
  - Fee = loserPool * feeBps / 10000
  - Conservation: sumPayouts + platformFee = totalPool
  - Losers get zero payout
  - Winners get proportional payouts (cross-multiplication check)

### 8. Frontend (Browser)
- Next.js app with Privy wallet connection
- Clearnode WebSocket client for state channel operations
- ECIES encryption of bet data using TEE's public key
- On-chain contract interactions via viem (deposit, withdraw, approve)

---

## Detailed User Flow

### Phase 1: Onboarding (On-Chain)

```
User connects wallet (Privy)
    |
    v
User mints test USDC (testnet only)
    |
    v
User approves USDC spending to Custody contract
    |   ERC20.approve(Custody, amount)
    v
User deposits USDC into Custody
    |   Custody.deposit(userAddress, USDC, amount)
    |   (on-chain tx — funds now held by Custody.sol)
    v
User creates a state channel via Clearnode RPC
    |   Clearnode orchestrates Custody.create() on-chain
    |   (on-chain tx — channel is now open with allocated funds)
    v
User is ready to bet (no more on-chain txs needed)
```

**If user already has an open channel**, they skip directly to Phase 2. The channel persists across multiple bets and markets. One channel serves all purposes.

### Phase 2: Authentication (Off-Chain)

```
User connects to Clearnode WebSocket
    |
    v
EIP-712 authentication handshake:
    1. Client sends auth_request (address + session key)
    2. Clearnode responds with auth_challenge
    3. Client signs challenge with wallet (EIP-712 typed data)
    4. Client sends auth_verify with signature
    5. Clearnode validates and returns JWT
    |
    v
Session key is persisted in localStorage
    (future reconnects reuse the same session key)
    |
    v
Client is authenticated — can sign app state messages
```

### Phase 3: Placing a Bet (Off-Chain)

This is the core innovation. **No on-chain transactions. No balance changes in the channel.**

```
User selects a market and chooses YES/NO with an amount
    |
    v
Frontend creates an app session via Clearnode:
    create_app_session({
      appDefinition: "wthelly-market-{marketId}",
      participants: [userAddress, teeAddress],
      allocations: [{ participant: user, asset: "wthelly.usd", amount: betAmount }]
    })
    |
    v
Frontend ECIES-encrypts the bet data with TEE's public key:
    encryptedBet = ECIES.encrypt(teePubKey, {
      marketId, isYes, amount, address
    })
    |
    v
Frontend submits app state via Clearnode:
    submit_app_state({
      sessionId,
      intent: "operate",
      data: JSON.stringify({ marketId, encryptedBet, amount, timestamp }),
      allocations: [unchanged — NO balance movement]
    })
    |
    v
Clearnode forwards the state to the TEE (as app session participant)
    |
    v
TEE receives the app state notification:
    1. Decrypts encryptedBet using its ECIES private key
    2. Extracts: marketId, isYes, amount, address
    3. Checks TEE's internal balance tracker:
       - Does this user have enough AVAILABLE liquidity?
       - Available = Clearnode balance - sum(locked bets in unresolved markets)
    4a. If YES: TEE co-signs the state (both sigs make it valid)
        - Stores the decrypted bet in BetStore
        - Updates internal available balance tracker
    4b. If NO: TEE rejects (does NOT co-sign)
        - State remains at previous version
        - User is notified of insufficient balance
    |
    v
App state is now valid (signed by both user and TEE)
```

**Critical detail — the "shadow balance" system:**

The Clearnode ledger shows the user's total deposited amount (e.g., $100). The TEE maintains a separate tracking of how much is "locked" in unresolved bets. Example:

```
Clearnode sees:  User balance = $100
TEE tracks:      User has 5 active bets of $20 each = $100 locked
                 Available liquidity = $100 - $100 = $0

If user tries to place another $20 bet:
  TEE checks: available = $0 < $20 → REJECT (don't co-sign)
```

This is NOT visible on-chain or to Clearnode. Only the TEE knows the true available balance. This is the privacy + correctness guarantee.

### Phase 4: Market Resolution (Admin/Oracle)

```
Admin resolves market manually:
    HellyHook.resolveMarket(marketId, outcome)
    (on-chain tx)

    --- OR ---

Market resolves automatically via oracle:
    HellyHook.resolveMarketFromOracle(marketId)
    - Reads lastSqrtPriceX96 from the afterSwap hook
    - Compares against marketPriceTarget
    - Determines outcome based on priceAbove flag
    (on-chain tx — anyone can call after deadline)
```

### Phase 5: Settlement (TEE + On-Chain)

This is where the ZK magic happens. The TEE computes payouts and generates a proof.

```
TEE detects market resolution (or admin triggers /settle endpoint)
    |
    v
TEE computes settlement for ALL bets in this market:
    1. Classify each bet as winner/loser based on outcome
    2. Calculate:
       - winnerPool = sum of all winner bet amounts
       - loserPool = sum of all loser bet amounts
       - totalPool = winnerPool + loserPool
       - platformFee = loserPool * feeBps / 10000
       - netDistributable = loserPool - platformFee
    3. For each winner:
       payout = originalBet + (originalBet * netDistributable / winnerPool)
    4. For each loser:
       payout = 0
    |
    v
TEE generates Groth16 ZK proof:
    - Private inputs: directions[], amounts[], payouts[], active[], numBets
    - Public inputs: outcome, feeBps, totalPool, platformFee
    - Uses snarkjs.groth16.fullProve() with WASM witness generator + zkey
    - Proof proves settlement math is correct WITHOUT revealing individual bets
    |
    v
TEE (or admin) submits settlement on-chain:
    HellyHook.settleMarketWithProof(
      marketId,
      payoutRecipients[],  // addresses
      payoutAmounts[],     // amounts each person gets
      totalPool,
      platformFeeAmount,
      _pA, _pB, _pC       // Groth16 proof
    )
    |
    v
HellyHook verifies on-chain:
    1. Check market exists, is resolved, not already settled
    2. Verify conservation: sum(payoutAmounts) + platformFee == totalPool
    3. Build public signals: [outcome, feeBps, totalPool, platformFee]
    4. Call Groth16Verifier.verifyProof(_pA, _pB, _pC, pubSignals)
    5. If valid: mark market as settled, emit PayoutClaimed events
    |
    v
TEE updates app session states via Clearnode:
    For each user who bet on this market:
      close_app_session({
        sessionId: user's app session for this market,
        allocations: [{ participant: user, asset: "wthelly.usd", amount: payout }]
      })
    |
    v
TEE updates internal balance tracker:
    - Unlock the bet amounts for this market
    - Apply new balances based on payouts
    - Winners see increased available balance
    - Losers see decreased available balance
    |
    v
Clearnode updates ledger balances based on closed app sessions
```

### Phase 6: Withdrawal (On-Chain)

```
User wants to withdraw funds
    |
    v
Frontend closes the channel via Clearnode:
    close_channel({ channelId })
    - Clearnode creates a final state with current allocations
    - Both parties sign the final state
    - Clearnode calls Custody.close() on-chain with signed state
    (on-chain tx)
    |
    v
User withdraws from Custody:
    Custody.withdraw(USDC, amount)
    (on-chain tx — USDC transferred from Custody to user's wallet)
```

---

## Dispute Resolution & Adjudication

### Why We Need a Custom Adjudicator

The current Dummy adjudicator accepts ANY state transition — this means during a dispute, anyone can propose any allocation and it will be accepted. This is unacceptable for a prediction market.

The custom adjudicator (WthellyAdjudicator) will use the Groth16Verifier to validate state transitions. Specifically:

### When Adjudication Happens

Adjudication occurs during **disputes** on the Custody contract. A dispute arises when:
1. A participant calls `Custody.challenge()` claiming a newer/different state than what Clearnode proposed
2. During the challenge period, participants can submit counter-states
3. The adjudicator decides which state is valid

### How the Custom Adjudicator Works

```
Custody.challenge(channelId, candidateState, proofs, challengerSig)
    |
    v
Custody calls: adjudicator.adjudicate(channel, candidateState, proofs)
    |
    v
WthellyAdjudicator.adjudicate():
    1. Decode candidateState.data bytes
    2. If the state contains a settlement proof:
       - Extract: outcome, feeBps, totalPool, platformFee, proof (pA, pB, pC)
       - Call Groth16Verifier.verifyProof(pA, pB, pC, [outcome, feeBps, totalPool, platformFee])
       - If valid: return true (state transition is legitimate)
       - If invalid: return false (reject the state)
    3. If the state is a regular bet state (no settlement):
       - Verify both participant signatures exist
       - Return true (both parties agreed to this state)
```

This ensures:
- **Happy path:** TEE and user cooperate, states are co-signed, everything works off-chain
- **Dispute path:** If TEE misbehaves or goes offline, the on-chain adjudicator can verify settlement proofs cryptographically
- **Settlement integrity:** Even during disputes, the ZK proof guarantees correct payout math

---

## Balance Tracking (Three Layers)

The system has three layers of balance tracking:

### Layer 1: Custody (On-Chain Truth)
- `Custody.getAccountsBalances([user], [USDC])` returns the on-chain deposited amount
- This is the "ground truth" — funds that are actually custodied
- Only changes when: deposit, withdraw, channel create, channel close

### Layer 2: Clearnode Ledger (Channel State)
- Clearnode tracks what each user's allocation is within their channel
- Changes when: app sessions open/close, channel resize
- May differ from Custody if app sessions have modified allocations
- Clearnode does NOT understand betting logic

### Layer 3: TEE Internal Tracker (Application Logic)
- TEE tracks "available liquidity" per user
- `available = clearnode_balance - sum(locked_bets_in_unresolved_markets)`
- This is the REAL available balance for placing new bets
- Only the TEE knows this — it's not visible on-chain or in Clearnode
- Updates when: bet placed (decrease), market settled (recalculate based on payouts)

### Example Scenario

```
1. User deposits $100 to Custody
   Custody: $100 | Clearnode: $100 | TEE available: $100

2. User places $30 YES bet on Market A
   Custody: $100 | Clearnode: $100 | TEE available: $70

3. User places $50 NO bet on Market B
   Custody: $100 | Clearnode: $100 | TEE available: $20

4. User tries to place $25 bet on Market C
   TEE check: $20 < $25 → REJECTED (TEE won't co-sign)

5. Market A resolves YES (user won), payout = $55
   TEE settles: closes app session with $55 allocation
   Custody: $100 | Clearnode: $125 | TEE available: $75
   ($100 - $50 locked in Market B + $25 net winnings from A)

6. Market B resolves YES (user lost, they bet NO), payout = $0
   TEE settles: closes app session with $0 allocation
   Custody: $100 | Clearnode: $75 | TEE available: $75
   (Market B lock released, but $50 was lost)

7. User withdraws
   Close channel → Custody.close() with $75 final state
   Custody.withdraw($75) → $75 USDC back in wallet
```

---

## What Is Implemented vs What Needs Work

### Implemented (Working)
- [x] HellyHook.sol: market create, resolve, resolveFromOracle, settleMarketWithProof
- [x] ZK Circuit: settlement_verify.circom compiled, trusted setup done, test proofs generated
- [x] Groth16Verifier.sol: generated from circuit, ready for deployment
- [x] TEE Server: ECIES encryption/decryption, bet storage, settlement computation, ZK proof generation, Clearnode WebSocket bridge
- [x] Frontend: Clearnode authentication, app session management, ECIES bet encryption, state channel hooks
- [x] Custody.sol: deposited and deployed (stock Nitrolite)
- [x] Clearnode: running with Unichain Sepolia config
- [x] Frontend deposit/withdraw: connected to Custody contract

### Needs Work
- [ ] **Deploy Groth16Verifier.sol** on-chain (replace MockVerifier which has been deleted)
- [ ] **Set Groth16Verifier** as the verifier in HellyHook (`setVerifier()`)
- [ ] **Build custom WthellyAdjudicator.sol** that uses Groth16Verifier for dispute resolution
- [ ] **Deploy WthellyAdjudicator** and reconfigure Custody/Clearnode to use it
- [ ] **TEE balance tracking**: implement the "shadow balance" system that tracks available liquidity per user
- [ ] **TEE co-signing logic**: implement validation before co-signing (check available balance, market exists, market is open)
- [ ] **TEE settlement trigger**: when market resolves on-chain, TEE should detect it and auto-settle
- [ ] **TEE → on-chain settlement**: TEE should submit the proof to HellyHook.settleMarketWithProof()
- [ ] **TEE → Clearnode app session close**: after settlement, TEE should close all app sessions for that market with correct allocations
- [ ] **State encoding**: define the exact bytes encoding for State.data so adjudicator can decode it
- [ ] **E2E test with real proofs**: update scripts to use Groth16Verifier instead of MockVerifier
- [ ] **Frontend market resolution listener**: detect when markets resolve and show updated balances

---

## State Encoding Format

For the adjudicator to decode state data during disputes, we need a consistent encoding:

### Bet State (during active betting)
```
State.data = abi.encode(
    string "bet",              // state type identifier
    bytes32 marketId,          // which market this bet is for
    bytes encryptedBetData,    // ECIES-encrypted bet payload
    uint256 timestamp          // when this state was created
)
```

### Settlement State (after market resolution)
```
State.data = abi.encode(
    string "settlement",       // state type identifier
    bytes32 marketId,          // which market was settled
    bool outcome,              // market outcome (true=YES, false=NO)
    uint256 totalPool,         // total pool amount
    uint256 platformFee,       // platform fee amount
    uint256 feeBps,            // fee basis points
    uint[2] pA,                // Groth16 proof point A
    uint[2][2] pB,             // Groth16 proof point B
    uint[2] pC                 // Groth16 proof point C
)
```

The adjudicator decodes State.data, checks the type, and if it's a "settlement" state, extracts the proof and verifies it via Groth16Verifier.

---

## Security Model

### What the ZK proof guarantees
- Settlement payouts are mathematically correct
- No funds are created or destroyed (conservation)
- Losers get zero, winners get proportional payouts
- Platform fee is correctly computed
- Individual bet directions remain hidden (private inputs)

### What the TEE guarantees
- Bet data is encrypted and only the TEE can read it
- The TEE honestly tracks available balances
- The TEE generates correct proofs (enforced by the circuit constraints)
- In local-dev mode, TEE is just a regular server (no attestation)
- In enclave mode (Marlin Oyster), TEE attestation proves code integrity

### What the adjudicator guarantees
- During disputes, state transitions can be verified on-chain
- Settlement states must pass ZK verification to be accepted
- Even if Clearnode or TEE goes offline, users can recover funds through the dispute mechanism

### Trust assumptions
- Admin is trusted for market creation and resolution (centralized)
- TEE is trusted for bet validation and balance tracking (can be verified via attestation)
- Clearnode is trusted for message routing (disputes protect against misbehavior)
- ZK proofs are trustless — math is verified on-chain by anyone
