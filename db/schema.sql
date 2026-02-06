-- WTHELLY Database Schema
-- Tracks markets, bets, settlements, and state channel info
-- TEE app server is the primary source of truth for active bets

CREATE SCHEMA IF NOT EXISTS wthelly;

-- Markets (created on-chain, mirrored here for querying)
CREATE TABLE IF NOT EXISTS wthelly.markets (
    id TEXT PRIMARY KEY,                   -- bytes32 hex string (marketId)
    question TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'crypto',        -- crypto, sports, politics, entertainment, other
    deadline TIMESTAMPTZ NOT NULL,

    -- Resolution type
    resolution_type TEXT NOT NULL,          -- 'price' or 'admin'
    pool_key TEXT,                          -- Uniswap pool address (price markets only)
    target_price NUMERIC,                  -- Target price (price markets only)
    is_above BOOLEAN,                      -- true = above target (price markets only)

    -- Status
    status TEXT DEFAULT 'open',            -- open, closed, resolved, settled
    outcome BOOLEAN,                       -- null until resolved: true = YES won

    -- Pool stats (updated by TEE at resolution only)
    total_yes NUMERIC DEFAULT 0,
    total_no NUMERIC DEFAULT 0,
    participant_count INTEGER DEFAULT 0,

    -- On-chain references
    creation_tx TEXT,                      -- Market creation transaction hash
    resolution_tx TEXT,                    -- Resolution transaction hash

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bets (recorded by TEE app server)
-- During active betting, only the TEE knows the encrypted content
-- After resolution, TEE reveals and records all bet details here
CREATE TABLE IF NOT EXISTS wthelly.bets (
    id SERIAL PRIMARY KEY,
    market_id TEXT REFERENCES wthelly.markets(id),
    bettor_address TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    direction TEXT,                         -- 'yes' or 'no' (revealed at resolution)
    payout NUMERIC,                        -- null until settled

    -- State channel references
    session_id TEXT,                        -- ERC-7824 app session ID
    channel_id TEXT,                        -- Yellow ledger channel ID

    -- Status
    status TEXT DEFAULT 'active',          -- active, won, lost, settled, cancelled

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS wthelly.users (
    address TEXT PRIMARY KEY,
    username TEXT,
    channel_id TEXT,                        -- Yellow ledger channel ID
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_wagered NUMERIC DEFAULT 0,
    total_won NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settlements (one per resolved market)
CREATE TABLE IF NOT EXISTS wthelly.settlements (
    id SERIAL PRIMARY KEY,
    market_id TEXT REFERENCES wthelly.markets(id),
    settlement_tx TEXT,                    -- On-chain settlement transaction
    zk_proof TEXT,                         -- ZK proof of correct computation
    total_payout NUMERIC,
    platform_fee NUMERIC,                  -- Fanum tax collected
    winners INTEGER,
    losers INTEGER,
    settled_at TIMESTAMPTZ DEFAULT NOW()
);

-- State channel events (audit log)
CREATE TABLE IF NOT EXISTS wthelly.channel_events (
    id SERIAL PRIMARY KEY,
    channel_id TEXT NOT NULL,
    event_type TEXT NOT NULL,              -- 'opened', 'deposited', 'session_created',
                                           -- 'session_closed', 'withdrawn', 'closed'
    user_address TEXT NOT NULL,
    amount NUMERIC,                        -- USDC amount (for deposits/withdrawals)
    tx_hash TEXT,                          -- On-chain tx (for on-chain events)
    metadata JSONB,                        -- Additional event data
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bets_market ON wthelly.bets(market_id);
CREATE INDEX IF NOT EXISTS idx_bets_bettor ON wthelly.bets(bettor_address);
CREATE INDEX IF NOT EXISTS idx_markets_status ON wthelly.markets(status);
CREATE INDEX IF NOT EXISTS idx_channel_events_channel ON wthelly.channel_events(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_events_user ON wthelly.channel_events(user_address);
