import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CountdownTimer, MarketStats } from "@/components/markets";
import { BetCard, QuickAmounts } from "@/components/betting";
import { getMarketById, getUserBets, mockUser } from "@/lib/mock-data";
import { formatCurrency, calculatePayout } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { MarketDetailContent } from "./market-detail-content";

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const market = getMarketById(id);

  if (!market) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Market Not Found</h1>
            <Link href="/markets">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Markets
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  const userBets = getUserBets(mockUser.address).filter(
    (bet) => bet.marketId === id
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <MarketDetailContent market={market} userBets={userBets} />
      <Footer />
      <MobileNav />
    </div>
  );
}
