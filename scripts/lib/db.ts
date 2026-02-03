/**
 * PostgreSQL database operations for WTHELLY tables.
 */

import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { POSTGRES_URL } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: POSTGRES_URL });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// --- Schema ---

export async function initSchema(): Promise<void> {
  const schemaPath = join(__dirname, "../../db/schema.sql");
  const sql = readFileSync(schemaPath, "utf-8");
  const p = getPool();
  await p.query(sql);
  console.log("  [DB] WTHELLY schema initialized");
}

// --- Markets ---

export async function insertMarket(
  id: string,
  question: string,
  deadline: Date,
  revealDeadline: Date
): Promise<void> {
  const p = getPool();
  await p.query(
    `INSERT INTO wthelly.markets (id, question, deadline, reveal_deadline, status)
     VALUES ($1, $2, $3, $4, 'open')
     ON CONFLICT (id) DO NOTHING`,
    [id, question, deadline, revealDeadline]
  );
}

export async function updateMarketStatus(
  id: string,
  status: string,
  outcome?: boolean
): Promise<void> {
  const p = getPool();
  if (outcome !== undefined) {
    await p.query(
      `UPDATE wthelly.markets SET status = $2, outcome = $3 WHERE id = $1`,
      [id, status, outcome]
    );
  } else {
    await p.query(`UPDATE wthelly.markets SET status = $2 WHERE id = $1`, [
      id,
      status,
    ]);
  }
}

export async function updateMarketPools(
  id: string,
  totalYes: number,
  totalNo: number
): Promise<void> {
  const p = getPool();
  await p.query(
    `UPDATE wthelly.markets SET total_yes = $2, total_no = $3 WHERE id = $1`,
    [id, totalYes, totalNo]
  );
}

export async function getMarketFromDB(
  id: string
): Promise<any | null> {
  const p = getPool();
  const result = await p.query(`SELECT * FROM wthelly.markets WHERE id = $1`, [
    id,
  ]);
  return result.rows[0] || null;
}

// --- Bets ---

export async function insertBet(
  marketId: string,
  bettorAddress: string,
  commitmentHash: string,
  amount: number,
  secret: string,
  direction: string,
  channelId?: string
): Promise<number> {
  const p = getPool();
  const result = await p.query(
    `INSERT INTO wthelly.bets (market_id, bettor_address, commitment_hash, amount, secret, direction, channel_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [marketId, bettorAddress, commitmentHash, amount, secret, direction, channelId || null]
  );
  return result.rows[0].id;
}

export async function updateBetRevealed(
  marketId: string,
  bettorAddress: string,
  direction: string,
  secret: string
): Promise<void> {
  const p = getPool();
  await p.query(
    `UPDATE wthelly.bets SET revealed = TRUE, direction = $3, secret = $4
     WHERE market_id = $1 AND bettor_address = $2`,
    [marketId, bettorAddress, direction, secret]
  );
}

export async function updateBetPayout(
  marketId: string,
  bettorAddress: string,
  payout: number
): Promise<void> {
  const p = getPool();
  await p.query(
    `UPDATE wthelly.bets SET payout = $3 WHERE market_id = $1 AND bettor_address = $2`,
    [marketId, bettorAddress, payout]
  );
}

export async function getBetsForMarket(marketId: string): Promise<any[]> {
  const p = getPool();
  const result = await p.query(
    `SELECT * FROM wthelly.bets WHERE market_id = $1 ORDER BY id`,
    [marketId]
  );
  return result.rows;
}

// --- Users ---

export async function upsertUser(
  address: string,
  username?: string,
  channelId?: string
): Promise<void> {
  const p = getPool();
  await p.query(
    `INSERT INTO wthelly.users (address, username, channel_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (address) DO UPDATE SET
       username = COALESCE($2, wthelly.users.username),
       channel_id = COALESCE($3, wthelly.users.channel_id)`,
    [address, username || null, channelId || null]
  );
}

export async function updateUserStats(
  address: string,
  wins: number,
  losses: number,
  aura: number
): Promise<void> {
  const p = getPool();
  await p.query(
    `UPDATE wthelly.users SET wins = $2, losses = $3, aura = $4 WHERE address = $1`,
    [address, wins, losses, aura]
  );
}

// --- Settlements ---

export async function insertSettlement(
  marketId: string,
  txHash: string,
  totalPayout: number,
  platformFee: number,
  winners: number,
  losers: number
): Promise<number> {
  const p = getPool();
  const result = await p.query(
    `INSERT INTO wthelly.settlements (market_id, tx_hash, total_payout, platform_fee, winners, losers)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [marketId, txHash, totalPayout, platformFee, winners, losers]
  );
  return result.rows[0].id;
}
