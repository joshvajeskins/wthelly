"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuickAmounts } from "./quick-amounts";
import {
  formatCurrency,
  calculatePayout,
  formatOdds,
} from "@/lib/format";
import {
  MIN_BET_AMOUNT,
  MAX_BET_AMOUNT,
  STATUS_MESSAGES,
} from "@/config/constants";
import type { Market, BetDirection } from "@/types";
import { AlertCircle, TrendingUp, Loader2 } from "lucide-react";

interface BetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  market: Market;
  userBalance: number;
  onPlaceBet: (direction: BetDirection, amount: number) => Promise<void>;
}

export function BetModal({
  open,
  onOpenChange,
  market,
  userBalance,
  onPlaceBet,
}: BetModalProps) {
  const [direction, setDirection] = React.useState<BetDirection | null>(null);
  const [amount, setAmount] = React.useState<string>("");
  const [isPlacing, setIsPlacing] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  const amountNum = parseFloat(amount) || 0;
  const odds = formatOdds(market.yesPool, market.noPool);
  const potentialPayout = direction
    ? calculatePayout(amountNum, direction, market.yesPool, market.noPool)
    : 0;
  const potentialWinnings = potentialPayout - amountNum;

  const canPlaceBet =
    direction &&
    amountNum >= MIN_BET_AMOUNT &&
    amountNum <= MAX_BET_AMOUNT &&
    amountNum <= userBalance &&
    !isPlacing;

  const handleAmountChange = (value: string) => {
    // Allow only numbers and decimals
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(value) || value === "") {
      setAmount(value);
      setError("");
    }
  };

  const handleQuickAmount = (quickAmount: number) => {
    const finalAmount = Math.min(quickAmount, userBalance);
    setAmount(finalAmount.toString());
    setError("");
  };

  const handlePlaceBet = async () => {
    if (!canPlaceBet || !direction) return;

    // Validate amount
    if (amountNum < MIN_BET_AMOUNT) {
      setError(`Minimum bet is ${formatCurrency(MIN_BET_AMOUNT)}`);
      return;
    }

    if (amountNum > MAX_BET_AMOUNT) {
      setError(`Maximum bet is ${formatCurrency(MAX_BET_AMOUNT)}`);
      return;
    }

    if (amountNum > userBalance) {
      setError(STATUS_MESSAGES.insufficientBalance);
      return;
    }

    try {
      setIsPlacing(true);
      setError("");
      await onPlaceBet(direction, amountNum);

      // Reset form on success
      setDirection(null);
      setAmount("");
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : STATUS_MESSAGES.betFailed
      );
    } finally {
      setIsPlacing(false);
    }
  };

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setDirection(null);
      setAmount("");
      setError("");
      setIsPlacing(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="lowercase">place your bet</DialogTitle>
          <DialogDescription className="text-left">
            {market.question}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Position Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium lowercase">pick your side</label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={direction === "yes" ? "default" : "outline"}
                size="lg"
                className="h-auto flex-col gap-1 py-3"
                onClick={() => setDirection("yes")}
              >
                <span className="text-lg font-bold lowercase">yes</span>
                <span className="text-xs opacity-75 lowercase">{odds.yes} odds</span>
              </Button>
              <Button
                variant={direction === "no" ? "default" : "outline"}
                size="lg"
                className="h-auto flex-col gap-1 py-3"
                onClick={() => setDirection("no")}
              >
                <span className="text-lg font-bold lowercase">no</span>
                <span className="text-xs opacity-75 lowercase">{odds.no} odds</span>
              </Button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium lowercase">bet amount</label>
              <span className="text-xs text-muted-foreground lowercase">
                balance: {formatCurrency(userBalance)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-7 pr-16 text-lg"
                disabled={isPlacing}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                onClick={() => handleQuickAmount(userBalance)}
                disabled={isPlacing}
              >
                max
              </Button>
            </div>
          </div>

          {/* Quick Amounts */}
          <QuickAmounts
            onSelect={handleQuickAmount}
            maxAmount={userBalance}
            disabled={isPlacing}
          />

          {/* Potential Payout */}
          {direction && amountNum > 0 && (
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground lowercase">your bet</span>
                <span className="font-medium">
                  {formatCurrency(amountNum)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground lowercase">
                  potential winnings
                </span>
                <span className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                  <TrendingUp className="size-3" />
                  +{formatCurrency(potentialWinnings)}
                </span>
              </div>
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="font-medium lowercase">total payout</span>
                <span className="font-bold text-lg">
                  {formatCurrency(potentialPayout)}
                </span>
              </div>
            </div>
          )}

          {/* Private Bet Warning - All bets are private by default */}
          <div className="flex items-start gap-2 rounded-lg border border-[#BFFF00]/50 bg-[#BFFF00]/10 p-3 text-sm">
            <AlertCircle className="size-4 text-[#BFFF00] mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-foreground lowercase">
                private bet mode
              </p>
              <p className="text-muted-foreground text-xs lowercase">
                all bets are private by default (zk commit-reveal). keep your
                secret safe fr fr.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
              <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPlacing}
          >
            cancel
          </Button>
          <Button
            onClick={handlePlaceBet}
            disabled={!canPlaceBet}
            className="min-w-32"
          >
            {isPlacing ? (
              <>
                <Loader2 className="animate-spin" />
                {STATUS_MESSAGES.placingBet}
              </>
            ) : (
              "place bet"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
