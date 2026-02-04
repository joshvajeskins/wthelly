"use client";

import { Market } from "@/types";
import { cn } from "@/lib/utils";
import { MarketCard } from "./market-card";
import { Card, CardContent } from "@/components/ui/card";

interface MarketGridProps {
  markets: Market[];
  loading?: boolean;
  className?: string;
}

export function MarketGrid({
  markets,
  loading = false,
  className,
}: MarketGridProps) {
  if (loading) {
    return (
      <div className={cn("grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <MarketCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!markets || markets.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-16", className)}>
        <Card className="w-full max-w-md border-2 border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <h3 className="text-xl font-black lowercase mb-2 text-[#BFFF00]">no markets rn</h3>
            <p className="text-sm text-muted-foreground lowercase">
              try adjusting filters or check back later
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {markets.map((market) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  );
}

function MarketCardSkeleton() {
  return (
    <Card className="overflow-hidden border-2 border-border">
      <div className="animate-pulse">
        <div className="p-6 pb-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 bg-muted" />
            <div className="h-5 w-24 bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-full bg-muted" />
            <div className="h-5 w-3/4 bg-muted" />
          </div>
        </div>

        <div className="px-6 space-y-4">
          <div className="p-3 border-2 border-border">
            <div className="h-3 w-16 bg-muted mb-2" />
            <div className="h-6 w-24 bg-muted" />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-3 w-12 bg-muted" />
              <div className="h-4 w-16 bg-muted" />
            </div>
            <div className="h-4 w-20 bg-muted" />
          </div>
        </div>

        <div className="px-6 pt-6 pb-6">
          <div className="h-11 w-full bg-muted" />
        </div>
      </div>
    </Card>
  );
}
