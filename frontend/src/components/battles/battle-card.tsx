"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { SigmaBattle, Squad } from "@/types";

interface BattleCardProps {
  battle: SigmaBattle;
  challengerSquad: Squad;
  defenderSquad: Squad;
  userSquadId?: string;
}

export function BattleCard({
  battle,
  challengerSquad,
  defenderSquad,
  userSquadId,
}: BattleCardProps) {
  const isUserInBattle =
    userSquadId === challengerSquad.id || userSquadId === defenderSquad.id;

  const getStatusColor = () => {
    switch (battle.status) {
      case "pending":
        return "text-yellow-500";
      case "accepted":
      case "in_progress":
        return "text-[#BFFF00]";
      case "completed":
        return "text-muted-foreground";
      case "cancelled":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusLabel = () => {
    switch (battle.status) {
      case "pending":
        return "waiting";
      case "accepted":
        return "accepted";
      case "in_progress":
        return "live";
      case "completed":
        return "done";
      case "cancelled":
        return "cancelled";
      default:
        return battle.status;
    }
  };

  return (
    <Link href={`/battles/${battle.id}`}>
      <Card
        className={`border-2 transition-colors hover:border-[#BFFF00] ${
          isUserInBattle ? "border-[#BFFF00]" : "border-border"
        }`}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <span className={`text-sm font-bold lowercase ${getStatusColor()}`}>
              {getStatusLabel()}
            </span>
            <span className="text-sm text-muted-foreground lowercase">
              ${battle.wagerAmount} wager
            </span>
          </div>

          {/* Squads vs */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <p className="font-black lowercase text-foreground">
                {challengerSquad.name}
              </p>
              {battle.status === "in_progress" || battle.status === "completed" ? (
                <p className="text-lg font-black text-[#BFFF00]">
                  {battle.challengerRizz}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground lowercase">
                  {challengerSquad.aura} aura
                </p>
              )}
            </div>

            <div className="text-2xl font-black text-muted-foreground">vs</div>

            <div className="flex-1 text-center">
              <p className="font-black lowercase text-foreground">
                {defenderSquad.name}
              </p>
              {battle.status === "in_progress" || battle.status === "completed" ? (
                <p className="text-lg font-black text-[#BFFF00]">
                  {battle.defenderRizz}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground lowercase">
                  {defenderSquad.aura} aura
                </p>
              )}
            </div>
          </div>

          {/* Winner */}
          {battle.status === "completed" && battle.winnerSquadId && (
            <div className="mt-4 pt-4 border-t border-border text-center">
              <span className="text-sm text-muted-foreground lowercase">winner: </span>
              <span className="font-black text-[#BFFF00] lowercase">
                {battle.winnerSquadId === challengerSquad.id
                  ? challengerSquad.name
                  : defenderSquad.name}
              </span>
            </div>
          )}

          {/* Battle progress */}
          {battle.status === "in_progress" && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground lowercase text-center">
                {battle.battles.filter((b) => b.status === "completed").length} /{" "}
                {battle.battles.length} matches complete
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
