# WTHELLY

> Bet on anything. Hidden positions. Maximum aura. No cap fr fr.

A private betting platform with brainrot energy, built for HackMoney 2026.

---

## Overview

WTHELLY is a prediction market web app where:

- **Bets are private** — Your position is hidden until market resolution
- **Everything is gasless** — Yellow Network state channels handle off-chain betting
- **Deposit from anywhere** — LI.FI enables cross-chain deposits from any chain
- **Settlement is atomic** — Uniswap v4 hook handles payouts

---

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui
- **State:** React hooks + Context
- **Web3:** wagmi + viem

### Protocols
| Protocol | Purpose |
|----------|---------|
| **Yellow Network** | State channels for gasless betting |
| **Uniswap v4** | Settlement hook for atomic payouts |
| **LI.FI** | Cross-chain deposits |

### Backend (Future)
- Node.js + Express
- PostgreSQL
- Yellow SDK
- Chainlink/Pyth oracles

---

## Project Structure

```
wthelly/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   │   ├── ui/          # shadcn components
│   │   │   ├── layout/      # Layout components
│   │   │   ├── markets/     # Market-related components
│   │   │   ├── betting/     # Betting components
│   │   │   └── wallet/      # Wallet/deposit components
│   │   ├── lib/             # Utilities and helpers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── providers/       # Context providers
│   │   ├── types/           # TypeScript types
│   │   └── constants/       # Constants and config
│   ├── public/              # Static assets
│   └── package.json
├── contracts/               # Smart contracts (future)
├── docs/                    # Documentation
│   ├── FEATURES.md
│   ├── ARCHITECTURE.md
│   └── UI_DESIGN.md
├── IDEA.md                  # Original concept
└── README.md                # This file
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm (recommended)

### Installation

```bash
cd frontend
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Core Features

1. **Market Browsing** — Browse trending prediction markets
2. **Private Betting (Cap Mode)** — Place hidden bets with commitment-reveal
3. **Public Betting (No Cap)** — Traditional betting with visible odds
4. **Cross-Chain Deposits** — Deposit from any chain via LI.FI
5. **Gasless Operations** — All bets via Yellow state channels
6. **User Profiles** — Track aura, wins, and stats
7. **Squads** — Team up with other skibidis

---

## Brainrot Terminology

| Term | Meaning |
|------|---------|
| Skibidi | User/bettor |
| Aura | Points/reputation |
| Squad | Team of users |
| Rizz Pool | Betting pool |
| Cap | Private/hidden mode |
| No Cap | Public/transparent mode |
| Gyatt | High-volume market |
| Sigma Battle | 1v1 bet |
| Ohio Mode | Losing streak |
| Fanum Tax | Platform fee |

---

## Prize Targets

| Sponsor | Prize | How We Qualify |
|---------|-------|----------------|
| Yellow Network | $15,000 | State channels for gasless betting |
| Uniswap v4 | $10,000 | Settlement hook for payouts |
| LI.FI | $6,000 | Cross-chain deposits |

**Total Potential: $31,000**

---

## Documentation

- [IDEA.md](./IDEA.md) — Original concept and detailed spec
- [docs/FEATURES.md](./docs/FEATURES.md) — Feature specifications
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Technical architecture
- [docs/UI_DESIGN.md](./docs/UI_DESIGN.md) — Design system and guidelines

---

## License

MIT
