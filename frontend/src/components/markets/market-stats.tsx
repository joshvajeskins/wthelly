"use client";

import { Market } from "@/types";
import { formatCurrency, formatNumber, formatOdds } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Users } from "lucide-react";
import { CountdownTimer } from "./countdown-timer";

interface MarketStatsProps {
  market: Market;
  className?: string;
  showDeadline?: boolean;
  showBetCount?: boolean;
  layout?: "horizontal" | "vertical";
}

export function MarketStats({
  market,
  className,
  showDeadline = true,
  showBetCount = true,
  layout = "vertical",
}: MarketStatsProps) {
  const { yesPool, noPool, totalPool, deadline, betCount } = market;
  const odds = formatOdds(yesPool, noPool);

  const isHorizontal = layout === "horizontal";

  return (
    <div
      className={cn(
        "flex gap-4",
        isHorizontal ? "flex-row items-center justify-between" : "flex-col",
        className
      )}
    >
      {/* Total Pool */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground font-medium lowercase">
          rizz pool
        </span>
        <span className="text-2xl font-bold text-foreground">
          {formatCurrency(totalPool, { compact: true })}
        </span>
      </div>

      {/* YES/NO Breakdown */}
      {totalPool > 0 && (
        <div className={cn("flex gap-4", isHorizontal ? "flex-row" : "flex-col sm:flex-row")}>
          {/* YES Pool */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-full bg-emerald-500/10">
              <TrendingUp className="size-4 text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground lowercase">yes</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(yesPool, { compact: true })}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({odds.yes})
                </span>
              </div>
            </div>
          </div>

          {/* NO Pool */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-full bg-rose-500/10">
              <TrendingDown className="size-4 text-rose-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground lowercase">no</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(noPool, { compact: true })}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({odds.no})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats */}
      <div className={cn("flex gap-4", isHorizontal ? "flex-row items-center" : "flex-row")}>
        {/* Bet Count */}
        {showBetCount && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="size-4" />
            <span>{formatNumber(betCount)} bets</span>
          </div>
        )}

        {/* Deadline */}
        {showDeadline && (
          <CountdownTimer deadline={deadline} />
        )}
      </div>
    </div>
  );
}
