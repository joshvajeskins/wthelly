"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SquadCard } from "@/components/squads/squad-card";
import { SquadLeaderboard, UserLeaderboard } from "@/components/leaderboard/leaderboard-table";
import {
  mockUser,
  mockSquads,
  getUserSquad,
  getSquadLeaderboard,
  getUserLeaderboard,
  getSquadByInviteCode,
} from "@/lib/mock-data";

type MainTab = "my-squad" | "leaderboard";
type LeaderboardTab = "squads" | "individuals";

export default function SquadsPage() {
  const [mainTab, setMainTab] = useState<MainTab>("my-squad");
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>("squads");
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const userSquad = getUserSquad(mockUser.address);
  const squadLeaderboard = getSquadLeaderboard();
  const userLeaderboard = getUserLeaderboard();

  const handleJoinSquad = () => {
    const squad = getSquadByInviteCode(inviteCode.toUpperCase());
    if (squad) {
      // In real implementation, this would call the contract
      window.location.href = `/squads/${squad.id}`;
    } else {
      setJoinError("invalid code fr fr");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-black lowercase text-[#BFFF00] mb-2">
            squads
          </h1>
          <p className="text-muted-foreground lowercase">
            build your squad. battle for aura. become sigma.
          </p>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={mainTab === "my-squad" ? "default" : "outline"}
            onClick={() => setMainTab("my-squad")}
            className={`flex-1 font-black lowercase ${
              mainTab === "my-squad"
                ? "bg-[#BFFF00] hover:bg-white text-black"
                : "border-2 border-border hover:border-[#BFFF00]"
            }`}
          >
            my squad
          </Button>
          <Button
            variant={mainTab === "leaderboard" ? "default" : "outline"}
            onClick={() => setMainTab("leaderboard")}
            className={`flex-1 font-black lowercase ${
              mainTab === "leaderboard"
                ? "bg-[#BFFF00] hover:bg-white text-black"
                : "border-2 border-border hover:border-[#BFFF00]"
            }`}
          >
            leaderboard
          </Button>
        </div>

        {/* My Squad Tab */}
        {mainTab === "my-squad" && (
          <div className="space-y-8">
            {userSquad ? (
              // User has a squad
              <div>
                <h2 className="text-xl font-black lowercase text-foreground mb-4">
                  your squad
                </h2>
                <SquadCard squad={userSquad} isUserSquad />
              </div>
            ) : (
              // User doesn't have a squad
              <div className="space-y-6">
                {/* Create Squad */}
                <Card className="border-2 border-border">
                  <CardContent className="p-6 text-center">
                    <h2 className="text-xl font-black lowercase text-foreground mb-2">
                      no squad yet
                    </h2>
                    <p className="text-muted-foreground lowercase mb-6">
                      create your own squad or join an existing one
                    </p>
                    <Link href="/squads/create">
                      <Button className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase">
                        create squad
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Join Squad */}
                <Card className="border-2 border-border">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-black lowercase text-foreground mb-4">
                      join with code
                    </h2>
                    <div className="flex gap-2">
                      <Input
                        placeholder="enter invite code..."
                        value={inviteCode}
                        onChange={(e) => {
                          setInviteCode(e.target.value);
                          setJoinError(null);
                        }}
                        className="flex-1 border-2 border-border focus:border-[#BFFF00] uppercase font-bold"
                      />
                      <Button
                        onClick={handleJoinSquad}
                        disabled={!inviteCode}
                        className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
                      >
                        join
                      </Button>
                    </div>
                    {joinError && (
                      <p className="text-red-500 text-sm lowercase mt-2">{joinError}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Browse All Squads */}
            <div>
              <h2 className="text-xl font-black lowercase text-foreground mb-4">
                all squads
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {mockSquads.map((squad) => (
                  <SquadCard
                    key={squad.id}
                    squad={squad}
                    isUserSquad={squad.id === userSquad?.id}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {mainTab === "leaderboard" && (
          <div className="space-y-6">
            {/* Leaderboard Sub-tabs */}
            <div className="flex gap-2">
              <Button
                variant={leaderboardTab === "squads" ? "default" : "outline"}
                onClick={() => setLeaderboardTab("squads")}
                className={`flex-1 font-black lowercase ${
                  leaderboardTab === "squads"
                    ? "bg-[#BFFF00] hover:bg-white text-black"
                    : "border-2 border-border hover:border-[#BFFF00]"
                }`}
              >
                squads by aura
              </Button>
              <Button
                variant={leaderboardTab === "individuals" ? "default" : "outline"}
                onClick={() => setLeaderboardTab("individuals")}
                className={`flex-1 font-black lowercase ${
                  leaderboardTab === "individuals"
                    ? "bg-[#BFFF00] hover:bg-white text-black"
                    : "border-2 border-border hover:border-[#BFFF00]"
                }`}
              >
                individuals by rizz
              </Button>
            </div>

            {/* Squad Leaderboard */}
            {leaderboardTab === "squads" && (
              <SquadLeaderboard
                entries={squadLeaderboard}
                currentUserSquadId={userSquad?.id}
              />
            )}

            {/* User Leaderboard */}
            {leaderboardTab === "individuals" && (
              <UserLeaderboard
                entries={userLeaderboard}
                currentUserAddress={mockUser.address}
              />
            )}
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
