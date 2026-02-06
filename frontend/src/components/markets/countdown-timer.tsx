"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  deadline: Date;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  total: number;
}

function getTimeRemaining(deadline: Date): TimeRemaining {
  const now = new Date();
  const total = deadline.getTime() - now.getTime();

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, total: 0 };
  }

  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, total };
}

export function CountdownTimer({ deadline, className }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    getTimeRemaining(deadline)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getTimeRemaining(deadline));
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  const { days, hours, minutes, total } = timeRemaining;

  const isUrgent = total > 0 && total < 60 * 60 * 1000;
  const isEnded = total <= 0;

  const getDisplayText = () => {
    if (isEnded) return "ended";

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (days === 0) parts.push(`${minutes}m`);

    return parts.join(" ") || "< 1m";
  };

  return (
    <div className={cn("text-right", className)}>
      <span className="text-xs text-muted-foreground font-bold lowercase block">
        ends
      </span>
      <span
        className={cn(
          "font-black lowercase",
          isEnded && "text-muted-foreground",
          isUrgent && !isEnded && "text-red-500",
          !isEnded && !isUrgent && "text-foreground"
        )}
      >
        {getDisplayText()}
      </span>
    </div>
  );
}

