"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateInviteCode } from "@/types";

export default function CreateSquadPage() {
  const router = useRouter();
  const [squadName, setSquadName] = useState("");
  const [created, setCreated] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const handleCreate = () => {
    if (!squadName.trim()) return;
    const code = generateInviteCode();
    setInviteCode(code);
    setCreated(true);
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/squads/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
  };

  if (created) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-2xl flex items-center justify-center">
          <Card className="border-2 border-[#BFFF00] w-full">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-black lowercase text-[#BFFF00] mb-4">
                squad created no cap
              </h1>
              <p className="text-xl font-black lowercase text-foreground mb-6">
                {squadName.toLowerCase()}
              </p>
              <p className="text-muted-foreground lowercase mb-6">
                share this code with your homies
              </p>

              <div className="bg-background border-2 border-border p-4 mb-6">
                <p className="text-3xl font-black text-[#BFFF00] tracking-widest">
                  {inviteCode}
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={copyInviteLink}
                  className="w-full bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
                >
                  copy invite link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/squads")}
                  className="w-full border-2 border-border hover:border-[#BFFF00] font-black lowercase"
                >
                  go to squads
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-2xl">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black lowercase text-[#BFFF00] mb-2">
            create squad
          </h1>
          <p className="text-muted-foreground lowercase">
            assemble your crew. dominate the battles.
          </p>
        </div>

        <Card className="border-2 border-border">
          <CardContent className="p-6 space-y-6">
            {/* Squad Name */}
            <div>
              <label className="block text-sm font-bold lowercase text-muted-foreground mb-2">
                squad name
              </label>
              <Input
                placeholder="enter squad name..."
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                className="border-2 border-border focus:border-[#BFFF00] lowercase"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {squadName.length}/20 characters
              </p>
            </div>

            {/* Info */}
            <div className="border-2 border-border p-4 space-y-2">
              <p className="text-sm text-muted-foreground lowercase">
                as squad leader you can:
              </p>
              <ul className="text-sm text-foreground lowercase space-y-1">
                <li>• invite members to your squad</li>
                <li>• challenge other squads to sigma battles</li>
                <li>• set wager amounts for battles</li>
                <li>• kick members (gigachad move)</li>
              </ul>
            </div>

            {/* Create Button */}
            <Button
              onClick={handleCreate}
              disabled={!squadName.trim()}
              className="w-full bg-[#BFFF00] hover:bg-white text-black font-black lowercase py-6 text-lg disabled:opacity-50"
            >
              create squad
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
