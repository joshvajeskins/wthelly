"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { SquadLeaderboardEntry, UserLeaderboardEntry } from "@/types";

interface SquadLeaderboardProps {
  entries: SquadLeaderboardEntry[];
  currentUserSquadId?: string;
}

export function SquadLeaderboard({ entries, currentUserSquadId }: SquadLeaderboardProps) {
  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isCurrentUserSquad = entry.squad.id === currentUserSquadId;

        return (
          <Link key={entry.squad.id} href={`/squads/${entry.squad.id}`}>
            <Card
              className={`border-2 transition-colors hover:border-[#BFFF00] ${
                isCurrentUserSquad ? "border-[#BFFF00]" : "border-border"
              }`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 flex items-center justify-center font-black text-lg ${
                      entry.rank <= 3
                        ? "text-[#BFFF00] border-2 border-[#BFFF00]"
                        : "text-muted-foreground border-2 border-border"
                    }`}
                  >
                    {entry.rank}
                  </div>
                  <div>
                    <p className="font-black lowercase text-foreground">
                      {entry.squad.name}
                    </p>
                    {isCurrentUserSquad && (
                      <span className="text-xs text-[#BFFF00] lowercase">your squad</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-lg font-black text-[#BFFF00]">{entry.aura}</p>
                    <p className="text-xs text-muted-foreground lowercase">aura</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-lg font-black text-foreground">{entry.totalRizz}</p>
                    <p className="text-xs text-muted-foreground lowercase">rizz</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-lg font-black text-foreground">{entry.winRate}%</p>
                    <p className="text-xs text-muted-foreground lowercase">wr</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

interface UserLeaderboardProps {
  entries: UserLeaderboardEntry[];
  currentUserAddress?: string;
}

export function UserLeaderboard({ entries, currentUserAddress }: UserLeaderboardProps) {
  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isCurrentUser = entry.user.address === currentUserAddress;

        return (
          <Card
            key={entry.user.address}
            className={`border-2 transition-colors hover:border-[#BFFF00] ${
              isCurrentUser ? "border-[#BFFF00]" : "border-border"
            }`}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 flex items-center justify-center font-black text-lg ${
                    entry.rank <= 3
                      ? "text-[#BFFF00] border-2 border-[#BFFF00]"
                      : "text-muted-foreground border-2 border-border"
                  }`}
                >
                  {entry.rank}
                </div>
                <div>
                  <p className="font-black lowercase text-foreground">
                    {entry.user.username || entry.user.address.slice(0, 8)}
                  </p>
                  {isCurrentUser && (
                    <span className="text-xs text-[#BFFF00] lowercase">you</span>
                  )}
                </div>
              </div>

              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-lg font-black text-[#BFFF00]">{entry.rizz}</p>
                  <p className="text-xs text-muted-foreground lowercase">rizz</p>
                </div>
                <div className="hidden md:block">
                  <p className="text-lg font-black text-foreground">{entry.aura}</p>
                  <p className="text-xs text-muted-foreground lowercase">aura</p>
                </div>
                <div className="hidden md:block">
                  <p className="text-lg font-black text-foreground">{entry.battlesWon}</p>
                  <p className="text-xs text-muted-foreground lowercase">wins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
