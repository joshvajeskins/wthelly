"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  TrendingUp,
  Inbox,
  AlertCircle,
  FolderOpen,
} from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon | "search" | "trending" | "inbox" | "alert" | "folder";
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const ICON_MAP = {
  search: Search,
  trending: TrendingUp,
  inbox: Inbox,
  alert: AlertCircle,
  folder: FolderOpen,
};

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  // Determine which icon to render
  const IconComponent = typeof icon === "string" ? ICON_MAP[icon] : icon;

  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted p-6">
        <IconComponent className="size-12 text-muted-foreground" />
      </div>

      <div className="max-w-md space-y-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {action && (
        <Button onClick={action.onClick} size="lg">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ============================================
// PRESET EMPTY STATES
// ============================================

interface PresetEmptyStateProps {
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

// No Markets Found
export function NoMarketsFound({ action, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon="search"
      title="No Markets Found"
      description="No markets match your filters. Try adjusting your search or check back later fr."
      action={action}
      className={className}
    />
  );
}

// No Active Bets
export function NoActiveBets({ action, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon="trending"
      title="No Active Bets"
      description="You haven't placed any bets yet. Time to get in the game fr fr."
      action={action}
      className={className}
    />
  );
}

// No Bet History
export function NoBetHistory({ action, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon="inbox"
      title="No Bet History"
      description="Your bet history is empty. Place some bets to start building your legacy."
      action={action}
      className={className}
    />
  );
}

// Market Closed
export function MarketClosed({ className }: { className?: string }) {
  return (
    <EmptyState
      icon="alert"
      title="Market Closed"
      description="This market is no longer accepting bets. Check out other markets fr."
      className={className}
    />
  );
}

// Network Error
export function NetworkError({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon="alert"
      title="Connection Error"
      description="Failed to load data. Check your connection and try again fr fr."
      action={
        onRetry
          ? {
              label: "Try Again",
              onClick: onRetry,
            }
          : undefined
      }
      className={className}
    />
  );
}

// Insufficient Balance
export function InsufficientBalance({
  onDeposit,
  className,
}: {
  onDeposit?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon="alert"
      title="Insufficient Balance"
      description="You're broke fr. Deposit more funds to start betting."
      action={
        onDeposit
          ? {
              label: "Deposit Funds",
              onClick: onDeposit,
            }
          : undefined
      }
      className={className}
    />
  );
}

// No Results
export function NoResults({ className }: { className?: string }) {
  return (
    <EmptyState
      icon="search"
      title="No Results"
      description="Nothing found for your search. Try different keywords or filters."
      className={className}
    />
  );
}

// Coming Soon
export function ComingSoon({
  feature = "This feature",
  className,
}: {
  feature?: string;
  className?: string;
}) {
  return (
    <EmptyState
      icon="folder"
      title="Coming Soon"
      description={`${feature} is still cooking. Check back later fr fr.`}
      className={className}
    />
  );
}
