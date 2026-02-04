"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPrivateMarketByInviteCode, getMarketById } from "@/lib/mock-data";
import { Market } from "@/types";

export default function JoinPrivateMarketPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [privateMarket, setPrivateMarket] = useState<Market | null>(null);
  const [linkedMarket, setLinkedMarket] = useState<Market | null>(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const market = getPrivateMarketByInviteCode(code.toUpperCase());
    if (market) {
      setPrivateMarket(market);
      if (market.linkedMarketId) {
        const linked = getMarketById(market.linkedMarketId);
        setLinkedMarket(linked || null);
      }
    } else {
      setError("invalid invite code fr fr");
    }
  }, [code]);

  const handleJoin = () => {
    // In real implementation, this would call the contract
    setJoined(true);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-2xl flex items-center justify-center">
          <Card className="border-2 border-red-500 w-full">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-black lowercase text-red-500 mb-4">
                {error}
              </h1>
              <p className="text-muted-foreground lowercase mb-6">
                the invite code &quot;{code}&quot; doesn&apos;t exist or has expired
              </p>
              <Button
                onClick={() => router.push("/markets")}
                className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
              >
                back to markets
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-2xl flex items-center justify-center">
          <Card className="border-2 border-[#BFFF00] w-full">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-black lowercase text-[#BFFF00] mb-4">
                you&apos;re in no cap
              </h1>
              <p className="text-muted-foreground lowercase mb-6">
                successfully joined the private market
              </p>
              {privateMarket && (
                <p className="text-foreground font-bold lowercase mb-6">
                  {privateMarket.question.toLowerCase()}
                </p>
              )}
              <Button
                onClick={() => router.push("/markets")}
                className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
              >
                view my markets
              </Button>
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
            join private market
          </h1>
          <p className="text-muted-foreground lowercase">
            invite code: <span className="text-[#BFFF00] font-bold">{code.toUpperCase()}</span>
          </p>
        </div>

        {privateMarket && (
          <Card className="border-2 border-border">
            <CardContent className="p-6 space-y-6">
              {/* Market Question */}
              <div>
                <p className="text-sm text-muted-foreground lowercase mb-2">
                  market question:
                </p>
                <p className="text-xl font-black lowercase text-foreground">
                  {privateMarket.question.toLowerCase()}
                </p>
              </div>

              {/* Market Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-border p-4">
                  <p className="text-sm text-muted-foreground lowercase">participants</p>
                  <p className="text-lg font-black text-foreground">
                    {privateMarket.participants?.length || 1} / {privateMarket.maxParticipants || 5}
                  </p>
                </div>
                <div className="border-2 border-border p-4">
                  <p className="text-sm text-muted-foreground lowercase">pool</p>
                  <p className="text-lg font-black text-[#BFFF00]">
                    ${privateMarket.totalPool.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Linked Market Info */}
              {linkedMarket && (
                <div className="border-2 border-border p-4">
                  <p className="text-sm text-muted-foreground lowercase mb-2">
                    resolution linked to:
                  </p>
                  <p className="text-foreground lowercase">
                    {linkedMarket.question.toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground lowercase mt-1">
                    ${linkedMarket.totalPool.toLocaleString()} pool • {linkedMarket.betCount} bets
                  </p>
                </div>
              )}

              {/* Creator */}
              <div>
                <p className="text-sm text-muted-foreground lowercase">created by:</p>
                <p className="text-foreground font-mono text-sm">
                  {privateMarket.creatorAddress.slice(0, 6)}...{privateMarket.creatorAddress.slice(-4)}
                </p>
              </div>

              {/* Join Button */}
              <Button
                onClick={handleJoin}
                className="w-full bg-[#BFFF00] hover:bg-white text-black font-black lowercase py-6 text-lg"
              >
                join market
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
