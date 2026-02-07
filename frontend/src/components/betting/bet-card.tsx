"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type { Bet, Market, BetStatus } from "@/types";
import { EyeOff, TrendingUp, TrendingDown, X, Clock, Lock } from "lucide-react";

interface BetCardProps {
  bet: Bet;
  market: Market;
  onCancel?: (betId: string) => void;
}

const STATUS_CONFIG: Record<
  BetStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color?: string }
> = {
  active: { label: "active", variant: "default" },
  won: { label: "won", variant: "default", color: "text-green-600 dark:text-green-400" },
  lost: { label: "lost", variant: "destructive" },
  settled: { label: "settled", variant: "secondary" },
  cancelled: { label: "cancelled", variant: "outline" },
};

export function BetCard({ bet, market, onCancel }: BetCardProps) {
  const statusConfig = STATUS_CONFIG[bet.status];
  const isEncrypted = bet.status === "active";
  const showCancel = bet.status === "active" && market.status === "open" && onCancel;

  const getDirectionIcon = () => {
    if (!bet.direction) return null;
    return bet.direction === "yes" ? (
      <TrendingUp className="size-4 text-green-600 dark:text-green-400" />
    ) : (
      <TrendingDown className="size-4 text-red-600 dark:text-red-400" />
    );
  };

  const getDirectionLabel = () => {
    if (!bet.direction) return null;
    return bet.direction === "yes" ? (
      <span className="text-green-600 dark:text-green-400 font-semibold lowercase">
        yes
      </span>
    ) : (
      <span className="text-red-600 dark:text-red-400 font-semibold lowercase">no</span>
    );
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium leading-tight line-clamp-2">
            {market.question}
          </h3>
          <Badge
            variant={statusConfig.variant}
            className={statusConfig.color}
          >
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {/* Position */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {bet.direction ? (
              <>
                {getDirectionIcon()}
                <span className="lowercase">position:</span>
                {getDirectionLabel()}
              </>
            ) : (
              <>
                <EyeOff className="size-4" />
                <span className="lowercase">position encrypted</span>
              </>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground lowercase">bet amount</span>
          <span className="font-semibold">{formatCurrency(bet.amount)}</span>
        </div>

        {/* Payout (if won) */}
        {bet.status === "won" && bet.payout && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground lowercase">payout</span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(bet.payout)}
            </span>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <span>{formatRelativeTime(bet.createdAt)}</span>
        </div>

        {/* Encrypted bet info */}
        {isEncrypted && (
          <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="size-3" />
            encrypted via state channel — hidden until settlement
          </div>
        )}
      </CardContent>

      {/* Actions */}
      <CardFooter className="pt-0 gap-2">
        {showCancel && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onCancel(bet.id)}
          >
            <X className="size-4" />
            cancel
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
