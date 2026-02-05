import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MarketGrid } from "@/components/markets";
import { getTrendingMarkets } from "@/lib/mock-data";

export default function Home() {
  const trendingMarkets = getTrendingMarkets().slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobileNav />

      <main className="flex flex-col">
        {/* Hero Section */}
        <section className="relative px-4 py-16 md:py-24 lg:py-32">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left - Content */}
              <div className="flex flex-col space-y-6 text-center lg:text-left">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black lowercase tracking-tighter text-[#BFFF00]">
                  wthelly
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-xl lowercase tracking-wide">
                  bet on anything. hidden positions. maximum aura. no cap fr fr.
                </p>
                <div className="flex justify-center lg:justify-start">
                  <Link href="/markets">
                    <Button
                      size="lg"
                      className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase tracking-wider px-8 py-6 text-lg"
                    >
                      enter the market
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right - Image */}
              <div className="relative flex justify-center lg:justify-end">
                <div className="relative w-full max-w-md lg:max-w-lg">
                  <Image
                    src="/hero.png"
                    alt="wthelly hero"
                    width={600}
                    height={600}
                    className="w-full h-auto"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trending Markets */}
        <section className="px-4 py-16 border-t border-border">
          <div className="container mx-auto max-w-6xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl md:text-3xl font-black lowercase text-[#BFFF00]">
                trending rn
              </h2>
              <Link
                href="/markets"
                className="text-muted-foreground hover:text-[#BFFF00] lowercase font-bold text-sm transition-colors"
              >
                view all
              </Link>
            </div>
            <MarketGrid markets={trendingMarkets} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

