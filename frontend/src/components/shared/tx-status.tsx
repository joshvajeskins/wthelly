"use client";

import { Badge } from "@/components/ui/badge";
import { Loader2, Check, ExternalLink, X } from "lucide-react";

interface TxStatusProps {
  hash?: `0x${string}`;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error?: Error | null;
}

const BASESCAN_URL = "https://sepolia.basescan.org/tx";

export function TxStatus({
  hash,
  isPending,
  isConfirming,
  isSuccess,
  error,
}: TxStatusProps) {
  if (error) {
    return (
      <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 font-bold lowercase gap-1">
        <X className="size-3" />
        {error.message.includes("User rejected")
          ? "rejected"
          : "error"}
      </Badge>
    );
  }

  if (isPending) {
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-bold lowercase gap-1">
        <Loader2 className="size-3 animate-spin" />
        waiting for wallet...
      </Badge>
    );
  }

  if (isConfirming) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold lowercase gap-1">
          <Loader2 className="size-3 animate-spin" />
          confirming...
        </Badge>
        {hash && (
          <a
            href={`${BASESCAN_URL}/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-[#BFFF00] transition-colors flex items-center gap-1"
          >
            <ExternalLink className="size-3" />
            basescan
          </a>
        )}
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 font-bold lowercase gap-1">
          <Check className="size-3" />
          confirmed
        </Badge>
        {hash && (
          <a
            href={`${BASESCAN_URL}/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-[#BFFF00] transition-colors flex items-center gap-1"
          >
            <ExternalLink className="size-3" />
            basescan
          </a>
        )}
      </div>
    );
  }

  return null;
}
