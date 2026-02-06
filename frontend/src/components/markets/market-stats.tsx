"use client";

import { Market } from "@/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Users, Lock, Shield } from "lucide-react";
import { CountdownTimer } from "./countdown-timer";

interface MarketStatsProps {
  market: Market;
  className?: string;
  showDeadline?: boolean;
  layout?: "horizontal" | "vertical";
}

export function MarketStats({
  market,
  className,
  showDeadline = true,
  layout = "vertical",
}: MarketStatsProps) {
  const { participantCount, deadline, resolutionType } = market;

  const isHorizontal = layout === "horizontal";

  return (
    <div
      className={cn(
        "flex gap-4",
        isHorizontal ? "flex-row items-center justify-between" : "flex-col",
        className
      )}
    >
      {/* Pool Info - Hidden */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground font-medium lowercase flex items-center gap-1">
          <Lock className="size-3" />
          rizz pool
        </span>
        <span className="text-lg font-bold text-muted-foreground italic lowercase">
          hidden until resolution
        </span>
      </div>

      {/* Resolution Type */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground font-medium lowercase flex items-center gap-1">
          <Shield className="size-3" />
          resolution
        </span>
        <span className="text-sm font-bold text-foreground lowercase">
          {resolutionType === "price" ? "uniswap v4 hook (trustless)" : "admin resolved"}
        </span>
      </div>

      {/* Additional Stats */}
      <div className={cn("flex gap-4", isHorizontal ? "flex-row items-center" : "flex-row")}>
        {/* Participant Count */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="size-4" />
          <span>{formatNumber(participantCount)} skibidis</span>
        </div>

        {/* Deadline */}
        {showDeadline && (
          <CountdownTimer deadline={deadline} />
        )}
      </div>
    </div>
  );
}
