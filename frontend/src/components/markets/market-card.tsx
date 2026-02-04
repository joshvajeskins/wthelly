"use client";

import Link from "next/link";
import { Market } from "@/types";
import { getCategoryLabel } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "./countdown-timer";

interface MarketCardProps {
  market: Market;
  className?: string;
}

export function MarketCard({ market, className }: MarketCardProps) {
  const {
    id,
    question,
    category,
    totalPool,
    type,
    deadline,
    betCount,
    status,
  } = market;

  const isActive = status === "open";
  const isClosed = status === "closed" || status === "resolved";

  return (
    <Link href={`/markets/${id}`}>
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-200 cursor-pointer",
          "border-2 border-border hover:border-[#BFFF00]",
          isClosed && "opacity-60",
          className
        )}
      >
        <CardHeader className="pb-3">
          {/* Badges Row */}
          <div className="flex items-center gap-2 mb-3">
            {/* Category Badge */}
            <Badge variant="secondary" className="text-xs font-bold lowercase">
              {getCategoryLabel(category)}
            </Badge>

            {/* Type Badge */}
            <Badge
              className={cn(
                "text-xs font-bold lowercase",
                type === "public"
                  ? "bg-[#BFFF00] text-black"
                  : "bg-transparent border-2 border-[#BFFF00] text-[#BFFF00]"
              )}
            >
              {type}
            </Badge>

            {/* Status Badge - if closed */}
            {isClosed && (
              <Badge className="text-xs font-bold lowercase ml-auto bg-red-500 text-white">
                {status === "resolved" ? "done" : "closed"}
              </Badge>
            )}
          </div>

          {/* Question */}
          <CardTitle className="text-lg leading-tight line-clamp-2 lowercase font-bold">
            {question}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Pool Display */}
          <div className="p-3 border-2 border-border group-hover:border-[#BFFF00] transition-colors">
            <span className="text-xs text-muted-foreground font-bold lowercase block mb-1">
              pool
            </span>
            <span className="text-2xl font-black text-[#BFFF00]">
              {formatCurrency(totalPool, { compact: true })}
            </span>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-xs text-muted-foreground font-bold lowercase block">bets</span>
              <span className="font-black text-foreground">
                {formatNumber(betCount)}
              </span>
            </div>

            <CountdownTimer deadline={deadline} />
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <Button
            disabled={!isActive}
            className={cn(
              "w-full font-black lowercase tracking-wider text-base h-11",
              "bg-[#BFFF00] hover:bg-white text-black"
            )}
          >
            {isClosed ? "view" : "bet"}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}

