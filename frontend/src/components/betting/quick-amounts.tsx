"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { QUICK_AMOUNTS } from "@/config/constants";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface QuickAmountsProps {
  onSelect: (amount: number) => void;
  selectedAmount?: number;
  maxAmount?: number;
  disabled?: boolean;
}

export function QuickAmounts({
  onSelect,
  selectedAmount,
  maxAmount,
  disabled = false,
}: QuickAmountsProps) {
  // Filter amounts that are within the user's balance if maxAmount is provided
  const availableAmounts = maxAmount
    ? QUICK_AMOUNTS.filter((amount) => amount <= maxAmount)
    : QUICK_AMOUNTS;

  if (availableAmounts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Quick Select</label>
      <div className="grid grid-cols-3 gap-2">
        {availableAmounts.map((amount) => {
          const isSelected = selectedAmount === amount;
          const isDisabled = disabled || (maxAmount !== undefined && amount > maxAmount);

          return (
            <Button
              key={amount}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onSelect(amount)}
              disabled={isDisabled}
              className={cn(
                "font-semibold transition-all",
                isSelected && "ring-2 ring-ring ring-offset-2"
              )}
            >
              {formatCurrency(amount, { decimals: 0 })}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
