// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format a number as currency (USD)
 */
export function formatCurrency(
  amount: number,
  options?: { compact?: boolean; decimals?: number }
): string {
  const { compact = false, decimals = 2 } = options || {};

  if (compact && amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (compact && amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format address (truncate)
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format date relative (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSecs = Math.floor(Math.abs(diffMs) / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const isFuture = diffMs > 0;
  const prefix = isFuture ? "in " : "";
  const suffix = isFuture ? "" : " ago";

  if (diffDays > 30) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
  if (diffDays > 0) {
    return `${prefix}${diffDays}d${suffix}`;
  }
  if (diffHours > 0) {
    return `${prefix}${diffHours}h${suffix}`;
  }
  if (diffMins > 0) {
    return `${prefix}${diffMins}m${suffix}`;
  }
  return "just now";
}

/**
 * Format countdown (e.g., "2d 14h 23m")
 */
export function formatCountdown(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return "Ended";

  const diffSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(diffSecs / 86400);
  const hours = Math.floor((diffSecs % 86400) / 3600);
  const mins = Math.floor((diffSecs % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 && days === 0) parts.push(`${mins}m`);

  return parts.join(" ") || "< 1m";
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format datetime for display
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Calculate and format pool odds
 */
export function formatOdds(yesPool: number, noPool: number): { yes: string; no: string } {
  const total = yesPool + noPool;
  if (total === 0) {
    return { yes: "50%", no: "50%" };
  }
  const yesPercent = Math.round((yesPool / total) * 100);
  const noPercent = 100 - yesPercent;
  return {
    yes: `${yesPercent}%`,
    no: `${noPercent}%`,
  };
}

/**
 * Calculate potential payout
 */
export function calculatePayout(
  betAmount: number,
  betDirection: "yes" | "no",
  yesPool: number,
  noPool: number,
  feePercent = 2
): number {
  const winnerPool = betDirection === "yes" ? yesPool : noPool;
  const loserPool = betDirection === "yes" ? noPool : yesPool;

  if (winnerPool === 0) return betAmount;

  const winnings = (betAmount / winnerPool) * loserPool * (1 - feePercent / 100);
  return betAmount + winnings;
}
