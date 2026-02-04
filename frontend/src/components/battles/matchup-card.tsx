"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OneVOneBattle, User, BetDirection } from "@/types";
import { getUserByAddress } from "@/lib/mock-data";

interface MatchupCardProps {
  matchup: OneVOneBattle;
  currentUserAddress?: string;
  onPlaceBet?: (direction: BetDirection) => void;
}

export function MatchupCard({ matchup, currentUserAddress, onPlaceBet }: MatchupCardProps) {
  const [selectedDirection, setSelectedDirection] = useState<BetDirection | null>(null);

  const player1 = getUserByAddress(matchup.player1Address);
  const player2 = getUserByAddress(matchup.player2Address);

  const isCurrentUserPlayer1 = currentUserAddress === matchup.player1Address;
  const isCurrentUserPlayer2 = currentUserAddress === matchup.player2Address;
  const isCurrentUserInMatchup = isCurrentUserPlayer1 || isCurrentUserPlayer2;

  const currentUserDirection = isCurrentUserPlayer1
    ? matchup.player1Direction
    : isCurrentUserPlayer2
    ? matchup.player2Direction
    : undefined;

  const canPlaceBet =
    isCurrentUserInMatchup &&
    matchup.status !== "completed" &&
    !currentUserDirection;

  const handlePlaceBet = () => {
    if (selectedDirection && onPlaceBet) {
      onPlaceBet(selectedDirection);
    }
  };

  const getStatusBadge = () => {
    switch (matchup.status) {
      case "pending":
        return <span className="text-yellow-500 text-xs font-bold lowercase">pending</span>;
      case "in_progress":
        return <span className="text-[#BFFF00] text-xs font-bold lowercase">live</span>;
      case "completed":
        return <span className="text-muted-foreground text-xs font-bold lowercase">done</span>;
    }
  };

  return (
    <Card
      className={`border-2 ${
        isCurrentUserInMatchup ? "border-[#BFFF00]" : "border-border"
      }`}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          {getStatusBadge()}
          {matchup.status === "completed" && matchup.winnerAddress && (
            <span className="text-xs text-[#BFFF00] font-bold lowercase">
              +{matchup.rizzAwarded} rizz
            </span>
          )}
        </div>

        {/* Players */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex-1 text-center">
            <p className="font-black lowercase text-foreground">
              {player1?.username || matchup.player1Address.slice(0, 8)}
            </p>
            {matchup.player1Direction && (
              <span
                className={`text-sm font-bold lowercase ${
                  matchup.player1Direction === "yes"
                    ? "text-[#BFFF00]"
                    : "text-red-500"
                }`}
              >
                {matchup.player1Direction}
              </span>
            )}
            {matchup.status === "completed" &&
              matchup.winnerAddress === matchup.player1Address && (
                <p className="text-xs text-[#BFFF00] font-bold lowercase mt-1">
                  winner
                </p>
              )}
          </div>

          <div className="text-lg font-black text-muted-foreground">vs</div>

          <div className="flex-1 text-center">
            <p className="font-black lowercase text-foreground">
              {player2?.username || matchup.player2Address.slice(0, 8)}
            </p>
            {matchup.player2Direction && (
              <span
                className={`text-sm font-bold lowercase ${
                  matchup.player2Direction === "yes"
                    ? "text-[#BFFF00]"
                    : "text-red-500"
                }`}
              >
                {matchup.player2Direction}
              </span>
            )}
            {matchup.status === "completed" &&
              matchup.winnerAddress === matchup.player2Address && (
                <p className="text-xs text-[#BFFF00] font-bold lowercase mt-1">
                  winner
                </p>
              )}
          </div>
        </div>

        {/* Market Question */}
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground lowercase mb-1">market:</p>
          <p className="text-sm font-bold lowercase text-foreground">
            {matchup.marketQuestion.toLowerCase()}
          </p>
        </div>

        {/* Bet Interface (for current user) */}
        {canPlaceBet && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground lowercase mb-2">
              place your bet (1000 battle points):
            </p>
            <div className="flex gap-2 mb-2">
              <Button
                variant={selectedDirection === "yes" ? "default" : "outline"}
                onClick={() => setSelectedDirection("yes")}
                className={`flex-1 font-black lowercase ${
                  selectedDirection === "yes"
                    ? "bg-[#BFFF00] hover:bg-white text-black"
                    : "border-2 border-border hover:border-[#BFFF00]"
                }`}
              >
                yes
              </Button>
              <Button
                variant={selectedDirection === "no" ? "default" : "outline"}
                onClick={() => setSelectedDirection("no")}
                className={`flex-1 font-black lowercase ${
                  selectedDirection === "no"
                    ? "bg-red-500 hover:bg-red-400 text-white"
                    : "border-2 border-border hover:border-red-500"
                }`}
              >
                no
              </Button>
            </div>
            {selectedDirection && (
              <Button
                onClick={handlePlaceBet}
                className="w-full bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
              >
                confirm bet
              </Button>
            )}
          </div>
        )}

        {/* Already bet indicator */}
        {isCurrentUserInMatchup && currentUserDirection && matchup.status !== "completed" && (
          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground lowercase">
              you bet{" "}
              <span
                className={`font-bold ${
                  currentUserDirection === "yes" ? "text-[#BFFF00]" : "text-red-500"
                }`}
              >
                {currentUserDirection}
              </span>
            </p>
            <p className="text-xs text-muted-foreground lowercase">
              waiting for market resolution...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
