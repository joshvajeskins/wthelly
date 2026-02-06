import type { Market, MarketCategory, MarketStatus } from "@/types";
import type { OnChainMarket } from "@/hooks/use-market-events";

/**
 * Derive market status from on-chain data
 */
function deriveStatus(market: OnChainMarket): MarketStatus {
  if (market.settled) return "settled";
  if (market.resolved) return "resolved";

  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now > market.deadline) return "closed";

  return "open";
}

/**
 * Infer category from question text (best-effort heuristic)
 */
function inferCategory(question: string): MarketCategory {
  const q = question.toLowerCase();

  if (
    q.includes("eth") ||
    q.includes("btc") ||
    q.includes("bitcoin") ||
    q.includes("solana") ||
    q.includes("sol") ||
    q.includes("doge") ||
    q.includes("crypto") ||
    q.includes("token") ||
    q.includes("defi") ||
    q.includes("tvl") ||
    q.includes("layer 2") ||
    q.includes("l2")
  ) {
    return "crypto";
  }

  if (
    q.includes("super bowl") ||
    q.includes("nba") ||
    q.includes("nfl") ||
    q.includes("world cup") ||
    q.includes("game") ||
    q.includes("match") ||
    q.includes("championship")
  ) {
    return "sports";
  }

  if (
    q.includes("election") ||
    q.includes("president") ||
    q.includes("fed") ||
    q.includes("congress") ||
    q.includes("vote") ||
    q.includes("policy") ||
    q.includes("rate cut")
  ) {
    return "politics";
  }

  if (
    q.includes("gpt") ||
    q.includes("ai") ||
    q.includes("movie") ||
    q.includes("oscar") ||
    q.includes("music") ||
    q.includes("release")
  ) {
    return "entertainment";
  }

  return "other";
}

/**
 * Convert an on-chain market struct to the frontend Market type
 */
export function toFrontendMarket(onChain: OnChainMarket): Market {
  const status = deriveStatus(onChain);
  const category = inferCategory(onChain.question);

  return {
    id: onChain.id,
    question: onChain.question,
    category,
    deadline: new Date(Number(onChain.deadline) * 1000),
    resolutionType: "admin",
    status,
    outcome: onChain.resolved ? onChain.outcome : undefined,
    participantCount: Number(onChain.commitCount),
    createdAt: new Date(), // Not available from events in this simple impl
    creatorAddress: "0x0000000000000000000000000000000000000000",
  };
}
