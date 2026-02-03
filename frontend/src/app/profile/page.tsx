import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { MobileNav } from "@/components/layout/mobile-nav"
import { AuraBadge, EmptyState } from "@/components/shared"
import { BetCard } from "@/components/betting"
import { mockUser, mockBets, mockBetHistory, getMarketById, getUserSquad } from "@/lib/mock-data"
import { formatCurrency, formatAddress } from "@/lib/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ProfilePage() {
  // Filter active bets for the current user
  const userActiveBets = mockBets.filter(bet => bet.userAddress === mockUser.address)
  const userSquad = getUserSquad(mockUser.address)

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
                    {(mockUser.username || mockUser.address).charAt(0).toLowerCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black lowercase text-[#BFFF00] mb-1">{(mockUser.username || "anonymous").toLowerCase()}</h1>
                    <p className="text-muted-foreground font-mono text-sm">{formatAddress(mockUser.address)}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-center md:justify-end">
                    <AuraBadge aura={mockUser.aura} size="lg" />
                  </div>
                  <Card className="border-2 border-border">
                    <CardContent className="p-3">
                      <div>
                        <p className="text-xs text-muted-foreground lowercase font-bold">channel balance</p>
                        <p className="text-lg font-black text-[#BFFF00]">{formatCurrency(mockUser.channelBalance)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Squad Section */}
        <div className="mb-8">
          {userSquad ? (
            <Card className="border-2 border-[#BFFF00]">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground lowercase font-bold mb-1">your squad</p>
                    <p className="text-xl font-black lowercase text-foreground">{userSquad.name}</p>
                    <p className="text-sm text-muted-foreground lowercase">
                      {userSquad.members.length} members • {userSquad.aura} aura • {userSquad.wins}w/{userSquad.losses}l
                    </p>
                  </div>
                  <Link href={`/squads/${userSquad.id}`}>
                    <Button className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase">
                      view squad
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-black lowercase text-foreground">no squad yet</p>
                    <p className="text-sm text-muted-foreground lowercase">join a squad to compete in sigma battles</p>
                  </div>
                  <Link href="/squads">
                    <Button className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase">
                      find squad
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border-2 border-border hover:border-[#BFFF00] transition-colors">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground lowercase font-bold mb-2">total aura</p>
              <p className="text-3xl font-black text-[#BFFF00]">{mockUser.aura}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-border hover:border-[#BFFF00] transition-colors">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground lowercase font-bold mb-2">rizz</p>
              <p className="text-3xl font-black text-[#BFFF00]">{mockUser.rizz}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-border hover:border-[#BFFF00] transition-colors">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground lowercase font-bold mb-2">win rate</p>
              <p className="text-3xl font-black text-[#BFFF00]">{mockUser.winRate}%</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-border hover:border-[#BFFF00] transition-colors">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground lowercase font-bold mb-2">total wins</p>
              <p className="text-3xl font-black text-[#BFFF00]">{mockUser.wins}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-border hover:border-[#BFFF00] transition-colors">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground lowercase font-bold mb-2">total wagered</p>
              <p className="text-3xl font-black text-[#BFFF00]">{formatCurrency(mockUser.totalWagered)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Bets Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-black lowercase text-[#BFFF00]">active bets (no cap)</h2>
            <span className="px-3 py-1 border-2 border-[#BFFF00] text-[#BFFF00] text-sm font-bold lowercase">
              {userActiveBets.length} active
            </span>
          </div>

          {userActiveBets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userActiveBets.map((bet) => {
                const market = getMarketById(bet.marketId);
                if (!market) return null;
                return <BetCard key={bet.id} bet={bet} market={market} />;
              })}
            </div>
          ) : (
            <Card className="border-2 border-border">
              <CardContent className="p-12">
                <EmptyState
                  title="no active bets"
                  description="you don't have any active bets rn. start betting to see them here fr fr"
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
              {mockBetHistory.length} total
            </span>
          </div>

          {mockBetHistory.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockBetHistory.map((bet) => {
                const market = getMarketById(bet.marketId);
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
  )
}
