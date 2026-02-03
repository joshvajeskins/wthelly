"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberList } from "@/components/squads/member-list";
import { BattleCard } from "@/components/battles/battle-card";
import {
  mockUser,
  mockSquads,
  getSquadById,
  getSquadMembers,
  getSquadBattles,
  getActiveBattles,
  getCompletedBattles,
} from "@/lib/mock-data";
import { Squad, User, SigmaBattle, generateInviteCode } from "@/types";

export default function SquadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const squadId = params.id as string;

  const [squad, setSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [activeBattles, setActiveBattles] = useState<SigmaBattle[]>([]);
  const [completedBattles, setCompletedBattles] = useState<SigmaBattle[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeSquadId, setChallengeSquadId] = useState("");
  const [wagerAmount, setWagerAmount] = useState(100);

  const isUserInSquad = squad?.members.includes(mockUser.address);
  const isUserLeader = squad?.leaderId === mockUser.address;

  useEffect(() => {
    const foundSquad = getSquadById(squadId);
    if (foundSquad) {
      setSquad(foundSquad);
      setMembers(getSquadMembers(squadId));
      setActiveBattles(getActiveBattles(squadId));
      setCompletedBattles(getCompletedBattles(squadId));
    }
  }, [squadId]);

  const copyInviteLink = () => {
    if (!squad) return;
    const link = `${window.location.origin}/squads/${squad.id}?invite=${squad.inviteCode}`;
    navigator.clipboard.writeText(link);
  };

  const handleChallenge = () => {
    // In real implementation, this would call the contract
    alert(`Challenge sent to squad ${challengeSquadId} with $${wagerAmount} wager!`);
    setShowChallenge(false);
  };

  if (!squad) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-4xl flex items-center justify-center">
          <Card className="border-2 border-red-500">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-black lowercase text-red-500 mb-4">
                squad not found
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

  const winRate =
    squad.wins + squad.losses > 0
      ? Math.round((squad.wins / (squad.wins + squad.losses)) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-4xl">
        {/* Squad Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-black lowercase text-[#BFFF00]">
                {squad.name}
              </h1>
              {isUserInSquad && (
                <span className="text-sm text-muted-foreground lowercase">
                  {isUserLeader ? "you are the leader" : "you are a member"}
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-[#BFFF00]">{squad.aura}</p>
              <p className="text-sm text-muted-foreground lowercase">aura</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border-2 border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-black text-foreground">{squad.members.length}</p>
                <p className="text-xs text-muted-foreground lowercase">members</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-black text-foreground">{squad.totalRizz}</p>
                <p className="text-xs text-muted-foreground lowercase">total rizz</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-black text-foreground">
                  {squad.wins}w / {squad.losses}l
                </p>
                <p className="text-xs text-muted-foreground lowercase">record</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-black text-foreground">{winRate}%</p>
                <p className="text-xs text-muted-foreground lowercase">win rate</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons (for members/leader) */}
        {isUserInSquad && (
          <div className="flex gap-2 mb-8">
            {isUserLeader && (
              <>
                <Button
                  onClick={() => setShowInvite(!showInvite)}
                  className="flex-1 bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
                >
                  invite members
                </Button>
                <Button
                  onClick={() => setShowChallenge(!showChallenge)}
                  variant="outline"
                  className="flex-1 border-2 border-border hover:border-[#BFFF00] font-black lowercase"
                >
                  challenge squad
                </Button>
              </>
            )}
            {!isUserLeader && (
              <Button
                variant="outline"
                className="flex-1 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-black font-black lowercase"
              >
                leave squad
              </Button>
            )}
          </div>
        )}

        {/* Invite Modal */}
        {showInvite && (
          <Card className="border-2 border-[#BFFF00] mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-black lowercase text-foreground mb-4">
                invite code
              </h3>
              <div className="bg-background border-2 border-border p-4 mb-4 text-center">
                <p className="text-2xl font-black text-[#BFFF00] tracking-widest">
                  {squad.inviteCode}
                </p>
              </div>
              <Button
                onClick={copyInviteLink}
                className="w-full bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
              >
                copy invite link
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Challenge Modal */}
        {showChallenge && (
          <Card className="border-2 border-[#BFFF00] mb-8">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xl font-black lowercase text-foreground">
                challenge a squad
              </h3>

              <div>
                <label className="block text-sm font-bold lowercase text-muted-foreground mb-2">
                  select opponent
                </label>
                <select
                  value={challengeSquadId}
                  onChange={(e) => setChallengeSquadId(e.target.value)}
                  className="w-full p-3 border-2 border-border bg-background text-foreground lowercase"
                >
                  <option value="">pick a squad...</option>
                  {mockSquads
                    .filter((s) => s.id !== squad.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.aura} aura)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold lowercase text-muted-foreground mb-2">
                  wager amount ($)
                </label>
                <Input
                  type="number"
                  value={wagerAmount}
                  onChange={(e) => setWagerAmount(Number(e.target.value))}
                  className="border-2 border-border focus:border-[#BFFF00]"
                  min={10}
                  max={10000}
                />
              </div>

              <Button
                onClick={handleChallenge}
                disabled={!challengeSquadId || wagerAmount < 10}
                className="w-full bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
              >
                send challenge
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Members Section */}
        <div className="mb-8">
          <h2 className="text-xl font-black lowercase text-foreground mb-4">
            members
          </h2>
          <MemberList
            members={members}
            leaderId={squad.leaderId}
            currentUserAddress={mockUser.address}
          />
        </div>

        {/* Active Battles */}
        {activeBattles.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-black lowercase text-foreground mb-4">
              active battles
            </h2>
            <div className="space-y-4">
              {activeBattles.map((battle) => {
                const challengerSquad = getSquadById(battle.challengerSquadId);
                const defenderSquad = getSquadById(battle.defenderSquadId);
                if (!challengerSquad || !defenderSquad) return null;
                return (
                  <BattleCard
                    key={battle.id}
                    battle={battle}
                    challengerSquad={challengerSquad}
                    defenderSquad={defenderSquad}
                    userSquadId={squad.id}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Battle History */}
        {completedBattles.length > 0 && (
          <div>
            <h2 className="text-xl font-black lowercase text-foreground mb-4">
              battle history
            </h2>
            <div className="space-y-4">
              {completedBattles.map((battle) => {
                const challengerSquad = getSquadById(battle.challengerSquadId);
                const defenderSquad = getSquadById(battle.defenderSquadId);
                if (!challengerSquad || !defenderSquad) return null;
                return (
                  <BattleCard
                    key={battle.id}
                    battle={battle}
                    challengerSquad={challengerSquad}
                    defenderSquad={defenderSquad}
                    userSquadId={squad.id}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* No battles */}
        {activeBattles.length === 0 && completedBattles.length === 0 && (
          <Card className="border-2 border-border">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground lowercase">
                no battles yet. {isUserLeader && "challenge a squad to get started!"}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
