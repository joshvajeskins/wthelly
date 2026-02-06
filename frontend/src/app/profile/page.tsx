"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { EmptyState } from "@/components/shared";
import { BetCard } from "@/components/betting";
import { formatCurrency, formatAddress } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useBets } from "@/hooks/use-bets";
import { useMarkets } from "@/hooks/use-markets";
import { useClearnode } from "@/providers/clearnode-provider";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, isConnected } = useUser();
  const { activeBets, betHistory } = useBets();
  const { markets } = useMarkets();
  const {
    isConnected: clearnodeConnected,
    isAuthenticated: clearnodeAuthenticated,
    isConnecting: clearnodeConnecting,
    error: clearnodeError,
    connect: connectClearnode,
    disconnect: disconnectClearnode,
  } = useClearnode();

  if (!isConnected || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-6xl">
          <Card className="border-2 border-border">
            <CardContent className="p-12">
              <EmptyState
                title="connect wallet"
                description="connect your wallet to view your profile and bets"
              />
              <div className="flex justify-center mt-6">
                <Link href="/deposit">
                  <Button className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase tracking-wider">
                    get started
                  </Button>
                </Link>
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

      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-6xl">
        {/* User Header Section */}
        <div className="mb-8">
          <Card className="border-2 border-border">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-2 border-[#BFFF00] flex items-center justify-center text-2xl font-black text-[#BFFF00]">
                    {user.address.charAt(2).toLowerCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black lowercase text-[#BFFF00] mb-1">
                      {user.username || formatAddress(user.address)}
                    </h1>
                    <p className="text-muted-foreground font-mono text-sm">
                      {formatAddress(user.address)}
                    </p>
                  </div>
                </div>

                <Card className="border-2 border-border">
                  <CardContent className="p-3">
                    <div>
                      <p className="text-xs text-muted-foreground lowercase font-bold">
                        hellyhook balance
                      </p>
                      <p className="text-lg font-black text-[#BFFF00]">
                        {formatCurrency(user.channelBalance)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-2 border-border hover:border-[#BFFF00] transition-colors">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground lowercase font-bold mb-2">win rate</p>
              <p className="text-3xl font-black text-[#BFFF00]">{user.winRate}%</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-border hover:border-[#BFFF00] transition-colors">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground lowercase font-bold mb-2">total wins</p>
              <p className="text-3xl font-black text-[#BFFF00]">{user.wins}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-border hover:border-[#BFFF00] transition-colors">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground lowercase font-bold mb-2">total losses</p>
              <p className="text-3xl font-black text-[#BFFF00]">{user.losses}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-border hover:border-[#BFFF00] transition-colors">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground lowercase font-bold mb-2">total wagered</p>
              <p className="text-3xl font-black text-[#BFFF00]">{formatCurrency(user.totalWagered)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Yellow Network / Clearnode Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-black lowercase text-[#BFFF00]">yellow network</h2>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  clearnodeAuthenticated
                    ? "bg-green-500"
                    : clearnodeConnected
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              />
              <span className="text-xs text-muted-foreground lowercase font-bold">
                {clearnodeAuthenticated
                  ? "authenticated"
                  : clearnodeConnected
                    ? "connected"
                    : "disconnected"}
              </span>
            </div>
          </div>

          <Card className="border-2 border-border">
            <CardContent className="p-6">
              {clearnodeAuthenticated ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wifi className="size-5 text-green-500" />
                    <div>
                      <p className="text-sm font-bold lowercase">connected to clearnode</p>
                      <p className="text-xs text-muted-foreground">
                        state channel active — bets are encrypted end-to-end
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectClearnode}
                    className="lowercase"
                  >
                    disconnect
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <WifiOff className="size-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-bold lowercase">yellow network</p>
                      <p className="text-xs text-muted-foreground">
                        connect for encrypted state channel betting via clearnode
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
                    onClick={connectClearnode}
                    disabled={clearnodeConnecting}
                  >
                    {clearnodeConnecting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        connecting...
                      </>
                    ) : (
                      "connect to clearnode"
                    )}
                  </Button>
                </div>
              )}
              {clearnodeError && (
                <p className="mt-3 text-xs text-red-500">{clearnodeError}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Bets Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-black lowercase text-[#BFFF00]">active bets</h2>
            <span className="px-3 py-1 border-2 border-[#BFFF00] text-[#BFFF00] text-sm font-bold lowercase">
              {activeBets.length} active
            </span>
          </div>

          {activeBets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {activeBets.map((bet) => {
                const market = markets.find(
                  (m) => m.id.toLowerCase() === bet.marketId.toLowerCase()
                );
                if (!market) return null;
                return <BetCard key={bet.id} bet={bet} market={market} />;
              })}
            </div>
          ) : (
            <Card className="border-2 border-border">
              <CardContent className="p-12">
                <EmptyState
                  title="no active bets"
                  description="your on-chain commitments will appear here after you place bets"
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bet History Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-black lowercase text-[#BFFF00]">bet history</h2>
            <span className="px-3 py-1 border-2 border-border text-muted-foreground text-sm font-bold lowercase">
              {betHistory.length} total
            </span>
          </div>

          {betHistory.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {betHistory.map((bet) => {
                const market = markets.find(
                  (m) => m.id.toLowerCase() === bet.marketId.toLowerCase()
                );
                if (!market) return null;
                return <BetCard key={bet.id} bet={bet} market={market} />;
              })}
            </div>
          ) : (
            <Card className="border-2 border-border">
              <CardContent className="p-12">
                <EmptyState
                  title="no bet history"
                  description="your completed bets will appear here"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
