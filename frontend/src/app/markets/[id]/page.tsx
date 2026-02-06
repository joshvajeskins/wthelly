"use client";

import { use } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MarketDetailContent } from "./market-detail-content";
import { useMarket } from "@/hooks/use-markets";

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { market, isLoading } = useMarket(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted" />
            <div className="h-64 bg-muted" />
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <MarketDetailContent market={market} userBets={[]} />
      <Footer />
      <MobileNav />
    </div>
  );
}
