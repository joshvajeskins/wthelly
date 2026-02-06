# WTHELLY

> Private prediction markets. Encrypted bets. Trustless settlement. No cap fr fr.

A private betting platform built on Yellow Network state channels and Uniswap v4, for HackMoney 2026.

---

## Overview

WTHELLY is a prediction market where **nobody sees your position** until the market resolves:

- **Bets are encrypted** — Your position is hidden inside a TEE-secured app server. Not even the Clearnode routing layer can read it.
- **Everything is gasless** — Yellow Network state channels handle all betting off-chain via signed app states.
- **Settlement is trustless** — Uniswap v4 hook monitors on-chain prices and auto-resolves price-based markets.
- **Deposit from anywhere** — LI.FI enables cross-chain deposits from any chain.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui
- **State:** React hooks + Context
- **Web3:** wagmi + viem

### Backend (App Server)
- **Runtime:** Node.js (TEE enclave)
- **Protocol:** ERC-7824 (NitroLite) app engine
- **Encryption:** TEE public key encryption for bet payloads
- **Settlement proofs:** ZK proofs for verifiable payout computation

### Protocols
| Protocol | Purpose |
|----------|---------|
| **Yellow Network** | State channels (NitroLite/Clearnode) for gasless off-chain betting |
| **Uniswap v4** | Price oracle hook for automated market resolution |
| **LI.FI** | Cross-chain deposits |

### Contracts
| Contract | Purpose |
|----------|---------|
| **Custody.sol** | NitroLite custody — holds USDC deposits for state channels |
| **WthellyAdjudicator.sol** | Custom ERC-7824 adjudicator — validates bet states and settlement |
| **HellyHook.sol** | Uniswap v4 hook — monitors pool prices, auto-resolves markets |

---

## Project Structure

```
wthelly/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities and helpers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── providers/       # Context providers
│   │   └── types/           # TypeScript types
│   └── package.json
├── contracts/               # Solidity contracts (Foundry)
│   ├── src/
│   │   ├── HellyHook.sol    # Uniswap v4 price oracle hook
│   │   └── MockUSDC.sol     # Test token
│   └── test/
├── server/                  # TEE app server (future)
├── scripts/                 # Deployment & test scripts
│   ├── lib/                 # Shared config, contracts, accounts
│   ├── 1-deploy.ts          # Deploy contracts
│   ├── 7-full-flow.ts       # Local E2E test
│   └── 8-testnet-flow.ts    # Base Sepolia E2E test
├── db/                      # Database schema
│   └── schema.sql
├── docs/                    # Documentation
│   ├── FEATURES.md
│   ├── ARCHITECTURE.md
│   └── UI_DESIGN.md
├── IDEA.md                  # Concept and design
└── README.md                # This file
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm (recommended)
- Foundry (for contracts)
- Docker (for local Clearnode)

### Local Development

```bash
# Frontend
cd frontend && pnpm install && pnpm dev

# Contracts (local Anvil test)
cd contracts && forge test

# Full E2E (local)
npx tsx scripts/7-full-flow.ts

# Testnet E2E (Base Sepolia)
npx tsx scripts/8-testnet-flow.ts
```

---

## Core Features

1. **Private Betting** — All bets encrypted inside TEE app server, invisible to everyone
2. **Gasless Operations** — All bets via Yellow Network state channels (signed app states)
3. **Automated Price Markets** — Uniswap v4 hook monitors on-chain prices and auto-resolves markets
4. **Custom Markets** — Admin-created markets resolved manually (UMA oracle in future)
5. **Cross-Chain Deposits** — Deposit from any chain via LI.FI
6. **ZK Settlement** — Verifiable payout proofs posted on-chain at resolution
7. **User Profiles** — Track wins, losses, and betting history

---

## How It Works

### Privacy Model

All bets are encrypted to the TEE app server's public key. The Clearnode (Yellow Network router) only sees opaque encrypted blobs. Nobody — not the Clearnode, not other users, not even the frontend — can see pool ratios or individual positions until the market resolves.

### Betting Flow

1. User opens a state channel (one on-chain tx, deposits USDC to Custody contract)
2. User creates an app session for a specific market
3. User encrypts their bet (market + direction + amount) to the TEE public key
4. Encrypted bet sent as `session_data` in a signed app state via Clearnode
5. TEE app server decrypts, validates, and records the bet internally
6. **Allocations do NOT change** — only `session_data` updates (Clearnode sees nothing)
7. At resolution: TEE reveals all positions, computes payouts, updates allocations
8. Final state settled on-chain via WthellyAdjudicator

### Market Resolution

**Price-based markets:** Uniswap v4 `afterSwap()` hook checks if the target price condition is met after every swap. When triggered, it posts the resolution on-chain automatically.

**Custom markets:** Admin resolves manually (UMA optimistic oracle planned for future).

---

## Brainrot Terminology

| Term | Meaning |
|------|---------|
| Skibidi | User/bettor |
| Rizz Pool | Betting pool |
| Gyatt | High-volume market |
| Fanum Tax | Platform fee |

---

## Prize Targets

| Sponsor | Prize | How We Qualify |
|---------|-------|----------------|
| Yellow Network | $15,000 | Full ERC-7824 state channel integration — Clearnode routing, app sessions, custom adjudicator |
| Uniswap v4 | $10,000 | Price oracle hook — afterSwap() auto-resolves prediction markets |
| LI.FI | $6,000 | Cross-chain deposits from any chain |

**Total Potential: $31,000**

---

## Documentation

- [IDEA.md](./IDEA.md) — Concept, privacy model, and protocol design
- [docs/FEATURES.md](./docs/FEATURES.md) — Feature specifications
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Technical architecture
- [docs/UI_DESIGN.md](./docs/UI_DESIGN.md) — Design system and guidelines

---

## License

MIT
