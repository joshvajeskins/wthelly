"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getUserStatus, getStatusLabel } from "@/types";
import type { UserStatus } from "@/types";
import { Flame, Sparkles } from "lucide-react";

interface AuraBadgeProps {
  aura: number;
  showLabel?: boolean;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Status tier colors and gradients
const STATUS_CONFIG: Record<
  UserStatus,
  {
    gradient: string;
    textColor: string;
    borderColor: string;
    icon: "fire" | "sparkles" | null;
  }
> = {
  npc: {
    gradient: "bg-gray-500",
    textColor: "text-gray-100",
    borderColor: "border-gray-400",
    icon: null,
  },
  "rizz-apprentice": {
    gradient: "bg-gradient-to-r from-blue-500 to-cyan-500",
    textColor: "text-white",
    borderColor: "border-blue-400",
    icon: "sparkles",
  },
  "aura-farmer": {
    gradient: "bg-gradient-to-r from-green-500 to-emerald-500",
    textColor: "text-white",
    borderColor: "border-green-400",
    icon: "sparkles",
  },
  sigma: {
    gradient: "bg-gradient-to-r from-purple-500 to-pink-500",
    textColor: "text-white",
    borderColor: "border-purple-400",
    icon: "fire",
  },
  gigachad: {
    gradient: "bg-gradient-to-r from-orange-500 to-red-500",
    textColor: "text-white",
    borderColor: "border-orange-400",
    icon: "fire",
  },
  "skibidi-god": {
    gradient: "bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500",
    textColor: "text-white",
    borderColor: "border-yellow-400",
    icon: "fire",
  },
};

export function AuraBadge({
  aura,
  showLabel = true,
  showIcon = true,
  size = "md",
  className,
}: AuraBadgeProps) {
  const status = getUserStatus(aura);
  const statusLabel = getStatusLabel(status);
  const config = STATUS_CONFIG[status];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-sm gap-1.5",
    lg: "px-3 py-1.5 text-base gap-2",
  };

  const iconSizes = {
    sm: "size-3",
    md: "size-3.5",
    lg: "size-4",
  };

  const IconComponent = config.icon === "fire" ? Flame : config.icon === "sparkles" ? Sparkles : null;

  return (
    <Badge
      className={cn(
        "font-bold transition-all",
        config.gradient,
        config.textColor,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && IconComponent && (
        <IconComponent className={cn(iconSizes[size], "animate-pulse")} />
      )}
      <span>{aura.toLocaleString()}</span>
      {showLabel && <span className="font-normal opacity-90">Aura</span>}
    </Badge>
  );
}

// ============================================
// STATUS BADGE (just the tier label)
// ============================================

interface StatusBadgeProps {
  status: UserStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusBadge({
  status,
  size = "md",
  className,
}: StatusBadgeProps) {
  const statusLabel = getStatusLabel(status);
  const config = STATUS_CONFIG[status];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <Badge
      className={cn(
        "font-semibold border",
        config.gradient,
        config.textColor,
        config.borderColor,
        sizeClasses[size],
        className
      )}
    >
      {statusLabel}
    </Badge>
  );
}

// ============================================
// COMBINED AURA + STATUS BADGE
// ============================================

interface AuraStatusBadgeProps {
  aura: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AuraStatusBadge({
  aura,
  size = "md",
  className,
}: AuraStatusBadgeProps) {
  const status = getUserStatus(aura);
  const statusLabel = getStatusLabel(status);
  const config = STATUS_CONFIG[status];

  const sizeClasses = {
    sm: "text-xs gap-1.5 px-2 py-0.5",
    md: "text-sm gap-2 px-2.5 py-1",
    lg: "text-base gap-2.5 px-3 py-1.5",
  };

  const iconSizes = {
    sm: "size-3",
    md: "size-3.5",
    lg: "size-4",
  };

  const IconComponent = config.icon === "fire" ? Flame : config.icon === "sparkles" ? Sparkles : null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        className={cn(
          "font-bold",
          config.gradient,
          config.textColor,
          sizeClasses[size]
        )}
      >
        {IconComponent && (
          <IconComponent className={cn(iconSizes[size], "animate-pulse")} />
        )}
        <span>{aura.toLocaleString()}</span>
        <span className="font-normal opacity-90">Aura</span>
      </Badge>
      <Badge
        variant="outline"
        className={cn(
          "font-semibold border-2",
          config.borderColor,
          sizeClasses[size]
        )}
      >
        {statusLabel}
      </Badge>
    </div>
  );
}

// ============================================
// COMPACT AURA DISPLAY (just icon + number)
// ============================================

interface CompactAuraProps {
  aura: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CompactAura({
  aura,
  size = "md",
  className,
}: CompactAuraProps) {
  const status = getUserStatus(aura);
  const config = STATUS_CONFIG[status];

  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-1.5",
    lg: "text-base gap-2",
  };

  const iconSizes = {
    sm: "size-3",
    md: "size-3.5",
    lg: "size-4",
  };

  const IconComponent = config.icon === "fire" ? Flame : config.icon === "sparkles" ? Sparkles : null;

  // High aura gets fire animation
  const isHighAura = aura >= 1000;

  return (
    <div
      className={cn(
        "inline-flex items-center font-semibold",
        config.textColor,
        sizeClasses[size],
        className
      )}
    >
      {IconComponent && (
        <IconComponent
          className={cn(
            iconSizes[size],
            isHighAura && "animate-pulse"
          )}
        />
      )}
      <span>{aura.toLocaleString()}</span>
    </div>
  );
}
