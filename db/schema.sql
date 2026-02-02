-- WTHELLY Database Schema
-- Run against the Postgres instance from docker-compose

CREATE SCHEMA IF NOT EXISTS wthelly;

CREATE TABLE IF NOT EXISTS wthelly.markets (
    id TEXT PRIMARY KEY,               -- bytes32 hex string
    question TEXT NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    reveal_deadline TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'open',        -- open, closed, resolved, settled
    outcome BOOLEAN,
    total_yes NUMERIC DEFAULT 0,
    total_no NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wthelly.bets (
    id SERIAL PRIMARY KEY,
    market_id TEXT REFERENCES wthelly.markets(id),
    bettor_address TEXT NOT NULL,
    commitment_hash TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    direction TEXT,                     -- null until revealed: 'yes' or 'no'
    secret TEXT,                        -- null until revealed
    revealed BOOLEAN DEFAULT FALSE,
    payout NUMERIC,
    channel_id TEXT,                    -- Yellow state channel reference
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wthelly.users (
    address TEXT PRIMARY KEY,
    username TEXT,
    aura INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    channel_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wthelly.settlements (
    id SERIAL PRIMARY KEY,
    market_id TEXT REFERENCES wthelly.markets(id),
    tx_hash TEXT,
    total_payout NUMERIC,
    platform_fee NUMERIC,
    winners INTEGER,
    losers INTEGER,
    settled_at TIMESTAMPTZ DEFAULT NOW()
);
