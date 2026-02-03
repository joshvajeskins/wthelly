import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl md:text-5xl font-black lowercase text-[#BFFF00] mb-4">
            how it works
          </h1>
          <p className="text-lg text-muted-foreground lowercase max-w-2xl mx-auto">
            wthelly is a private betting platform built on yellow network, uniswap v4, and li.fi. no cap fr fr.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-6 mb-12">
          <Card className="border-2 border-border hover:border-[#BFFF00] transition-colors">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 border-2 border-[#BFFF00] flex items-center justify-center text-2xl font-black text-[#BFFF00]">
                  1
                </div>
                <div>
                  <h3 className="text-2xl font-black lowercase text-[#BFFF00] mb-3">
                    gasless
                  </h3>
                  <p className="text-muted-foreground lowercase text-lg">
                    no gas fees fr fr. yellow network state channels let you bet without paying ethereum fees. all transactions happen off-chain until settlement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-border hover:border-[#BFFF00] transition-colors">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 border-2 border-[#BFFF00] flex items-center justify-center text-2xl font-black text-[#BFFF00]">
                  2
                </div>
                <div>
                  <h3 className="text-2xl font-black lowercase text-[#BFFF00] mb-3">
                    private
                  </h3>
                  <p className="text-muted-foreground lowercase text-lg">
                    cap mode keeps your bets hidden until resolution. maximum sigma energy. no one knows your position until the market resolves. built with commit-reveal scheme on uniswap v4 hooks.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-border hover:border-[#BFFF00] transition-colors">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 border-2 border-[#BFFF00] flex items-center justify-center text-2xl font-black text-[#BFFF00]">
                  3
                </div>
                <div>
                  <h3 className="text-2xl font-black lowercase text-[#BFFF00] mb-3">
                    cross-chain
                  </h3>
                  <p className="text-muted-foreground lowercase text-lg">
                    bridge from any chain via li.fi. eth, usdc, whatever you got. deposit from ethereum, arbitrum, base, polygon, optimism - we got you.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How to bet */}
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-black lowercase text-[#BFFF00] mb-6 text-center">
            how to bet
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 border-border">
              <CardContent className="p-6">
                <h3 className="text-xl font-black lowercase text-foreground mb-2">
                  no cap mode
                </h3>
                <p className="text-muted-foreground lowercase">
                  your bet is visible to everyone. classic prediction market vibes. good for when you want to flex your position.
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border">
              <CardContent className="p-6">
                <h3 className="text-xl font-black lowercase text-foreground mb-2">
                  cap mode
                </h3>
                <p className="text-muted-foreground lowercase">
                  your bet is hidden until the market resolves. only you know your position. reveal to claim winnings. gigachad energy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-black lowercase text-[#BFFF00] mb-6 text-center">
            tech stack
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-2 border-border text-center">
              <CardContent className="p-6">
                <p className="text-lg font-black lowercase text-[#BFFF00]">yellow</p>
                <p className="text-xs text-muted-foreground lowercase mt-1">state channels</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border text-center">
              <CardContent className="p-6">
                <p className="text-lg font-black lowercase text-[#BFFF00]">uniswap</p>
                <p className="text-xs text-muted-foreground lowercase mt-1">v4 hooks</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border text-center">
              <CardContent className="p-6">
                <p className="text-lg font-black lowercase text-[#BFFF00]">li.fi</p>
                <p className="text-xs text-muted-foreground lowercase mt-1">cross-chain</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/markets">
            <Button className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase tracking-wider px-8 py-6 text-lg">
              start betting
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
