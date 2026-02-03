"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicMarkets } from "@/lib/mock-data";
import { Market, generateInviteCode } from "@/types";

export default function CreatePrivateMarketPage() {
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [maxParticipants, setMaxParticipants] = useState(3);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const publicMarkets = getPublicMarkets();
  const filteredMarkets = publicMarkets.filter((m) =>
    m.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (!selectedMarket) return;
    const code = generateInviteCode();
    setInviteCode(code);
  };

  const copyInviteLink = () => {
    if (!inviteCode) return;
    const link = `${window.location.origin}/markets/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-black lowercase text-[#BFFF00] mb-2">
            create private market
          </h1>
          <p className="text-muted-foreground lowercase">
            bet with your friends on any public market
          </p>
        </div>

        {inviteCode ? (
          // Success State - Show invite code
          <Card className="border-2 border-[#BFFF00]">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-black lowercase text-[#BFFF00] mb-4">
                market created fr fr
              </h2>
              <p className="text-muted-foreground lowercase mb-6">
                share this code with your squad
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
                  onClick={() => {
                    setInviteCode(null);
                    setSelectedMarket(null);
                  }}
                  className="w-full border-2 border-border hover:border-[#BFFF00] font-black lowercase"
                >
                  create another
                </Button>
              </div>

              {selectedMarket && (
                <div className="mt-8 text-left">
                  <p className="text-sm text-muted-foreground lowercase mb-2">
                    linked market:
                  </p>
                  <p className="text-foreground font-bold lowercase">
                    {selectedMarket.question.toLowerCase()}
                  </p>
                  <p className="text-sm text-muted-foreground lowercase mt-2">
                    max participants: {maxParticipants}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          // Creation Form
          <div className="space-y-8">
            {/* Step 1: Select Public Market */}
            <div>
              <h2 className="text-xl font-black lowercase text-foreground mb-4">
                1. pick a market
              </h2>

              <Input
                placeholder="search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4 border-2 border-border focus:border-[#BFFF00] lowercase"
              />

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredMarkets.map((market) => (
                  <Card
                    key={market.id}
                    className={`border-2 cursor-pointer transition-colors ${
                      selectedMarket?.id === market.id
                        ? "border-[#BFFF00]"
                        : "border-border hover:border-muted-foreground"
                    }`}
                    onClick={() => setSelectedMarket(market)}
                  >
                    <CardContent className="p-4">
                      <p className="font-bold lowercase text-foreground">
                        {market.question.toLowerCase()}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground lowercase">
                        <span>{market.category}</span>
                        <span>${market.totalPool.toLocaleString()} pool</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Step 2: Set Participants */}
            {selectedMarket && (
              <div>
                <h2 className="text-xl font-black lowercase text-foreground mb-4">
                  2. max participants
                </h2>
                <div className="flex gap-2">
                  {[2, 3, 4, 5].map((num) => (
                    <Button
                      key={num}
                      variant={maxParticipants === num ? "default" : "outline"}
                      onClick={() => setMaxParticipants(num)}
                      className={`flex-1 font-black ${
                        maxParticipants === num
                          ? "bg-[#BFFF00] hover:bg-white text-black"
                          : "border-2 border-border hover:border-[#BFFF00]"
                      }`}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Market Preview */}
            {selectedMarket && (
              <Card className="border-2 border-[#BFFF00]">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground lowercase mb-2">
                    selected market:
                  </p>
                  <p className="text-lg font-black lowercase text-foreground mb-4">
                    {selectedMarket.question.toLowerCase()}
                  </p>
                  <div className="flex gap-4 text-sm text-muted-foreground lowercase">
                    <span>category: {selectedMarket.category}</span>
                    <span>pool: ${selectedMarket.totalPool.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Create Button */}
            <Button
              onClick={handleCreate}
              disabled={!selectedMarket}
              className="w-full bg-[#BFFF00] hover:bg-white text-black font-black lowercase py-6 text-lg disabled:opacity-50"
            >
              create private market
            </Button>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
