# Sponsor Submissions

## Yellow Network

### Why we're applicable

wthelly integrates Yellow SDK's Nitrolite protocol for session-based off-chain betting. Users deposit USDC into the ERC-7824 Custody contract once, then place multiple bets via state channels with zero gas cost per bet. The Nitrolite clearnode manages state channel sessions, and final settlement happens on-chain only when the session ends or market resolves. This demonstrates instant, gas-free transactions for a prediction market use case.

### Code references

**Custody contract (ERC-7824):**
- [nitrolite/contract/src/Custody.sol](https://github.com/gabrielantonyxaviour/wthelly/blob/main/nitrolite/contract/src/Custody.sol) — full state channel custody contract
  - [`deposit()` function (L179-L195)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/nitrolite/contract/src/Custody.sol#L179-L195)
  - [`withdraw()` function (L203-L214)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/nitrolite/contract/src/Custody.sol#L203-L214)
  - [`create()` channel function (L222-L305)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/nitrolite/contract/src/Custody.sol#L222-L305)
  - [`close()` channel function (L384-L417)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/nitrolite/contract/src/Custody.sol#L384-L417)

**Custody ABI usage in scripts:**
- [scripts/lib/config.ts — CUSTODY_ABI (L360-L392)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/scripts/lib/config.ts#L360-L392)
- [scripts/lib/config.ts — CUSTODY_CONTRACTS addresses (L58-L63)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/scripts/lib/config.ts#L58-L63)

**Custody deposit/withdraw in E2E test flow:**
- [scripts/8-testnet-flow.ts — Deploy Custody (L469-L473)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/scripts/8-testnet-flow.ts#L469-L473)
- [scripts/8-testnet-flow.ts — Test Custody deposit & withdraw cycle (L632-L713)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/scripts/8-testnet-flow.ts#L632-L713)
- [scripts/8-testnet-flow.ts — CUSTODY_ABI import (L54)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/scripts/8-testnet-flow.ts#L54)

**Nitrolite clearnode docker-compose:**
- [nitrolite/docker-compose.yml (L1-L94)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/nitrolite/docker-compose.yml#L1-L94) — PostgreSQL + clearnode services

**Frontend Nitrolite/Custody integration:**
- [frontend/src/hooks/use-state-channel.ts (L1-L384)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/hooks/use-state-channel.ts#L1-L384) — NitroliteClient usage for deposit, channel creation, withdrawal
  - [`@erc7824/nitrolite` imports (L12-L20)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/hooks/use-state-channel.ts#L12-L20)
  - [`createNitroliteClient()` helper (L56-L71)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/hooks/use-state-channel.ts#L56-L71)
  - [`deposit()` — depositAndCreateChannel flow (L91-L143)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/hooks/use-state-channel.ts#L91-L143)
  - [`withdraw()` — closeChannel + withdrawal flow (L201-L256)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/hooks/use-state-channel.ts#L201-L256)
- [frontend/src/lib/clearnode-client.ts (L1-L446)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/lib/clearnode-client.ts#L1-L446) — WebSocket client for Clearnode RPC (create_channel, close_channel, app sessions)
- [frontend/src/providers/clearnode-provider.tsx (L1-L190)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/providers/clearnode-provider.tsx#L1-L190) — React provider for Clearnode auth + session management
- [frontend/src/config/constants.ts — CLEARNODE_CONTRACTS (L87-L91)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/config/constants.ts#L87-L91)
- [frontend/src/config/abis.ts — CUSTODY_ABI (L289-L339)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/config/abis.ts#L289-L339)
- [frontend/src/hooks/use-contract-writes.ts — useDeposit (L83-L98), useWithdraw (L101-L114)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/hooks/use-contract-writes.ts#L83-L114)
- [frontend/src/hooks/use-contract-reads.ts — useCustodyBalance (L52-L83)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/hooks/use-contract-reads.ts#L52-L83)
- [frontend/package.json — `@erc7824/nitrolite` dependency (L15)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/package.json#L15)

### Additional feedback

The Nitrolite integration enables gas-free betting by keeping bet state off-chain in signed state channel updates. Users deposit once, bet many times, and settle once — matching the "session-based spending" pattern Yellow encourages.

---

## Uniswap V4

### Why we're applicable

wthelly is built as a native Uniswap V4 Hook on Unichain, integrating prediction market logic directly into the AMM. The HellyHook contract extends BaseHook and implements afterInitialize, beforeSwap, and afterSwap to manage market lifecycle and fee collection within V4 pool operations. Market settlements are verified with Groth16 ZK proofs on-chain, adding a privacy layer to the V4 ecosystem. This demonstrates how V4 Hooks can enable entirely new financial primitives beyond simple swap customization.

### Code references

**HellyHook.sol — Core V4 Hook:**
- [contracts/src/HellyHook.sol (L1-L362)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/contracts/src/HellyHook.sol#L1-L362)
  - [Contract declaration — extends BaseHook (L27)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/contracts/src/HellyHook.sol#L27)
  - [`getHookPermissions()` — enables afterSwap (L300-L317)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/contracts/src/HellyHook.sol#L300-L317)
  - [`_afterSwap()` — price oracle update on every swap (L319-L332)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/contracts/src/HellyHook.sol#L319-L332)
  - [`createMarket()` — create prediction market linked to pool price (L157-L183)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/contracts/src/HellyHook.sol#L157-L183)
  - [`resolveMarket()` — admin resolution (L188-L197)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/contracts/src/HellyHook.sol#L188-L197)
  - [`resolveMarketFromOracle()` — auto-resolve from pool price (L201-L218)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/contracts/src/HellyHook.sol#L201-L218)
  - [`settleMarketWithProof()` — ZK proof settlement (L234-L284)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/contracts/src/HellyHook.sol#L234-L284)
  - [`setVerifier()` — set Groth16 verifier address (L287-L289)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/contracts/src/HellyHook.sol#L287-L289)

**Groth16Verifier.sol — On-chain ZK proof verification:**
- [contracts/src/Groth16Verifier.sol (L1-L189)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/contracts/src/Groth16Verifier.sol#L1-L189) — auto-generated from snarkjs

**PoolManager address constant:**
- [scripts/8-testnet-flow.ts — POOL_MANAGER on Unichain Sepolia (L73)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/scripts/8-testnet-flow.ts#L73)

**Hook deployment & test flow:**
- [scripts/8-testnet-flow.ts — Deploy HellyHook with PoolManager (L449-L459)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/scripts/8-testnet-flow.ts#L449-L459)
- [scripts/8-testnet-flow.ts — Deploy Groth16Verifier (L461-L466)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/scripts/8-testnet-flow.ts#L461-L466)
- [scripts/8-testnet-flow.ts — Configure verifier on hook (L519-L524)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/scripts/8-testnet-flow.ts#L519-L524)
- [scripts/8-testnet-flow.ts — Create market with oracle params (L618-L622)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/scripts/8-testnet-flow.ts#L618-L622)
- [scripts/8-testnet-flow.ts — Settle market with real Groth16 proof (L803-L817)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/scripts/8-testnet-flow.ts#L803-L817)

**v4-core and v4-periphery dependencies:**
- [contracts/foundry.toml — remappings (L13-L20)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/contracts/foundry.toml#L13-L20)
  - `v4-core/=lib/v4-periphery/lib/v4-core/`
  - `v4-periphery/=lib/v4-periphery/`
  - `@uniswap/v4-core/=lib/v4-periphery/lib/v4-core/`

### Additional feedback

The Hook is not a trivial beforeSwap modifier — it implements a complete prediction market lifecycle (create -> bet -> resolve -> ZK-verify -> settle) as a V4 Hook, demonstrating that V4's hook architecture can support complex financial applications beyond basic swap logic.

---

## LI.FI

### Why we're applicable

wthelly integrates LI.FI to enable cross-chain deposits into the prediction market from any EVM chain. Users can bridge assets from multiple chains into Unichain where the V4 Hook operates, solving the liquidity fragmentation problem for a chain-specific DeFi application.

### Code references

**Cross-chain deposit support:**
- [frontend/src/config/constants.ts — SUPPORTED_CHAINS for cross-chain deposits (L21-L27)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/config/constants.ts#L21-L27) — Ethereum, Arbitrum, Base, Polygon, Optimism
- [frontend/src/types/index.ts — Deposit type with lifiTxHash (L115-L126)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/types/index.ts#L115-L126)

**UI integration:**
- [frontend/src/app/how-it-works/page.tsx — Cross-chain feature section (L62-L78)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/app/how-it-works/page.tsx#L62-L78) — "bridge from any chain via li.fi"
- [frontend/src/app/how-it-works/page.tsx — Tech stack card (L140-L145)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/app/how-it-works/page.tsx#L140-L145)
- [frontend/src/app/layout.tsx — App metadata mentions LI.FI (L18)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/app/layout.tsx#L18)
- [frontend/src/components/layout/footer.tsx — Footer branding (L18)](https://github.com/gabrielantonyxaviour/wthelly/blob/main/frontend/src/components/layout/footer.tsx#L18)

### Additional feedback

LI.FI solves the onboarding problem — since the prediction market runs on Unichain, users on other chains need a way to deposit. LI.FI provides this cross-chain bridge capability.
