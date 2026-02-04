"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Squad } from "@/types";

interface SquadCardProps {
  squad: Squad;
  isUserSquad?: boolean;
}

export function SquadCard({ squad, isUserSquad }: SquadCardProps) {
  const winRate =
    squad.wins + squad.losses > 0
      ? Math.round((squad.wins / (squad.wins + squad.losses)) * 100)
      : 0;

  return (
    <Link href={`/squads/${squad.id}`}>
      <Card
        className={`border-2 transition-colors hover:border-[#BFFF00] ${
          isUserSquad ? "border-[#BFFF00]" : "border-border"
        }`}
      >
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-black lowercase text-foreground">
                {squad.name}
              </h3>
              {isUserSquad && (
                <span className="text-xs text-[#BFFF00] lowercase font-bold">
                  your squad
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#BFFF00]">{squad.aura}</p>
              <p className="text-xs text-muted-foreground lowercase">aura</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-black text-foreground">
                {squad.members.length}
              </p>
              <p className="text-xs text-muted-foreground lowercase">members</p>
            </div>
            <div>
              <p className="text-lg font-black text-foreground">{squad.totalRizz}</p>
              <p className="text-xs text-muted-foreground lowercase">rizz</p>
            </div>
            <div>
              <p className="text-lg font-black text-foreground">{winRate}%</p>
              <p className="text-xs text-muted-foreground lowercase">win rate</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm text-muted-foreground lowercase">
            <span>
              {squad.wins}w / {squad.losses}l
            </span>
            <span>{squad.status}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
