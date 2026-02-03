"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchupCard } from "@/components/battles/matchup-card";
import {
  mockUser,
  getBattleById,
  getSquadById,
  getUserMatchup,
} from "@/lib/mock-data";
import { SigmaBattle, Squad, OneVOneBattle, BetDirection } from "@/types";

export default function BattleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const battleId = params.id as string;

  const [battle, setBattle] = useState<SigmaBattle | null>(null);
  const [challengerSquad, setChallengerSquad] = useState<Squad | null>(null);
  const [defenderSquad, setDefenderSquad] = useState<Squad | null>(null);
  const [userMatchup, setUserMatchup] = useState<OneVOneBattle | null>(null);

  useEffect(() => {
    const foundBattle = getBattleById(battleId);
    if (foundBattle) {
      setBattle(foundBattle);
      setChallengerSquad(getSquadById(foundBattle.challengerSquadId) || null);
      setDefenderSquad(getSquadById(foundBattle.defenderSquadId) || null);
      setUserMatchup(getUserMatchup(battleId, mockUser.address) || null);
    }
  }, [battleId]);

  const handlePlaceBet = (direction: BetDirection) => {
    // In real implementation, this would call the contract
    alert(`Bet placed: ${direction}!`);
  };

  if (!battle || !challengerSquad || !defenderSquad) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-4xl flex items-center justify-center">
          <Card className="border-2 border-red-500">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-black lowercase text-red-500 mb-4">
                battle not found
              </h1>
              <Button
                onClick={() => router.push("/squads")}
                className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
              >
                back to squads
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  const getStatusLabel = () => {
    switch (battle.status) {
      case "pending":
        return "waiting for acceptance";
      case "accepted":
        return "accepted - starting soon";
      case "in_progress":
        return "battle in progress";
      case "completed":
        return "battle complete";
      case "cancelled":
        return "cancelled";
    }
  };

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
    }
  };

  const completedMatchups = battle.battles.filter((b) => b.status === "completed").length;
  const totalMatchups = battle.battles.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-4xl">
        {/* Battle Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-bold lowercase ${getStatusColor()}`}>
              {getStatusLabel()}
            </span>
            <span className="text-sm text-muted-foreground lowercase">
              ${battle.wagerAmount} wager
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black lowercase text-foreground mb-4">
            sigma battle
          </h1>

          {/* Squads vs Score */}
          <Card className="border-2 border-[#BFFF00]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center">
                  <p className="text-xl font-black lowercase text-foreground mb-2">
                    {challengerSquad.name}
                  </p>
                  <p className="text-4xl font-black text-[#BFFF00]">
                    {battle.challengerRizz}
                  </p>
                  <p className="text-xs text-muted-foreground lowercase">rizz</p>
                </div>

                <div className="text-3xl font-black text-muted-foreground">vs</div>

                <div className="flex-1 text-center">
                  <p className="text-xl font-black lowercase text-foreground mb-2">
                    {defenderSquad.name}
                  </p>
                  <p className="text-4xl font-black text-[#BFFF00]">
                    {battle.defenderRizz}
                  </p>
                  <p className="text-xs text-muted-foreground lowercase">rizz</p>
                </div>
              </div>

              {/* Winner Banner */}
              {battle.status === "completed" && battle.winnerSquadId && (
                <div className="mt-6 pt-6 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground lowercase mb-1">winner</p>
                  <p className="text-2xl font-black text-[#BFFF00] lowercase">
                    {battle.winnerSquadId === challengerSquad.id
                      ? challengerSquad.name
                      : defenderSquad.name}
                  </p>
                  <p className="text-sm text-muted-foreground lowercase mt-1">
                    +{battle.wagerAmount} + aura
                  </p>
                </div>
              )}

              {/* Progress */}
              {battle.status === "in_progress" && (
                <div className="mt-6 pt-6 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground lowercase">
                    {completedMatchups} / {totalMatchups} matches complete
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Your Matchup (highlighted) */}
        {userMatchup && (
          <div className="mb-8">
            <h2 className="text-xl font-black lowercase text-[#BFFF00] mb-4">
              your matchup
            </h2>
            <MatchupCard
              matchup={userMatchup}
              currentUserAddress={mockUser.address}
              onPlaceBet={handlePlaceBet}
            />
          </div>
        )}

        {/* All Matchups */}
        <div>
          <h2 className="text-xl font-black lowercase text-foreground mb-4">
            all matchups
          </h2>
          <div className="space-y-4">
            {battle.battles.map((matchup) => (
              <MatchupCard
                key={matchup.id}
                matchup={matchup}
                currentUserAddress={mockUser.address}
                onPlaceBet={
                  matchup.player1Address === mockUser.address ||
                  matchup.player2Address === mockUser.address
                    ? handlePlaceBet
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {/* No matchups yet */}
        {battle.battles.length === 0 && (
          <Card className="border-2 border-border">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground lowercase">
                matchups will be assigned when the battle starts
              </p>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-2 border-border hover:border-[#BFFF00] font-black lowercase"
          >
            back
          </Button>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
