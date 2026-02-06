"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TxStatus } from "@/components/shared/tx-status";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type { Bet, Market, BetStatus } from "@/types";
import { EyeOff, TrendingUp, TrendingDown, X, Clock, Lock, Eye } from "lucide-react";
import { getBetSecretForMarket } from "@/hooks/use-place-bet";
import { useRevealBet } from "@/hooks/use-contract-writes";

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

  // Reveal functionality
  const { revealBet, hash, isPending, isConfirming, isSuccess, error } = useRevealBet();
  const canReveal =
    bet.status === "active" &&
    (market.status === "resolved" || market.status === "closed");
  const secret = canReveal
    ? getBetSecretForMarket(bet.marketId as `0x${string}`)
    : undefined;

  const handleReveal = async () => {
    if (!secret) {
      toast.error("no secret found in browser. was this bet placed from another device?");
      return;
    }
    try {
      await revealBet(
        bet.marketId as `0x${string}`,
        secret.isYes,
        secret.secret
      );
      toast.success("bet revealed!");
    } catch (err: any) {
      if (err.message?.includes("User rejected")) {
        toast.error("transaction rejected");
      } else {
        toast.error("failed to reveal bet");
      }
    }
  };

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
        {isEncrypted && !canReveal && (
          <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="size-3" />
            encrypted — hidden until resolution
          </div>
        )}

        {/* Reveal prompt */}
        {canReveal && secret && (
          <div className="rounded-md bg-[#BFFF00]/10 border border-[#BFFF00]/30 p-2 text-xs text-[#BFFF00] flex items-center gap-1.5">
            <Eye className="size-3" />
            market resolved — reveal your bet to claim payout
          </div>
        )}

        {/* Tx Status for reveal */}
        {(isPending || isConfirming || isSuccess || error) && (
          <TxStatus
            hash={hash}
            isPending={isPending}
            isConfirming={isConfirming}
            isSuccess={isSuccess}
            error={error}
          />
        )}
      </CardContent>

      {/* Actions */}
      <CardFooter className="pt-0 gap-2">
        {canReveal && secret && (
          <Button
            size="sm"
            className="flex-1 bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
            onClick={handleReveal}
            disabled={isPending || isConfirming}
          >
            <Eye className="size-4" />
            {isPending || isConfirming ? "revealing..." : "reveal bet"}
          </Button>
        )}
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
