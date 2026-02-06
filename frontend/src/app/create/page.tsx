"use client";

import { useState } from "react";
import { usePrivyAccount } from "@/hooks/use-privy-account";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { EmptyState } from "@/components/shared";
import { TxStatus } from "@/components/shared/tx-status";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateMarket } from "@/hooks/use-contract-writes";
import { useContractAdmin } from "@/hooks/use-contract-reads";
import { generateMarketId } from "@/lib/commitment";

const DURATIONS = [
  { label: "1h", seconds: 3600 },
  { label: "6h", seconds: 21600 },
  { label: "24h", seconds: 86400 },
  { label: "7d", seconds: 604800 },
];

const REVEAL_WINDOW = 3600n; // 1 hour reveal window

export default function CreateMarketPage() {
  const { address, isConnected } = usePrivyAccount();
  const { data: adminAddress } = useContractAdmin();
  const { createMarket, hash, isPending, isConfirming, isSuccess, error } =
    useCreateMarket();

  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("crypto");
  const [duration, setDuration] = useState(86400);
  const [created, setCreated] = useState(false);

  const isAdmin =
    isConnected &&
    adminAddress &&
    address?.toLowerCase() === (adminAddress as string)?.toLowerCase();

  const handleCreate = async () => {
    if (!question || !isAdmin) return;

    try {
      const marketId = generateMarketId(question);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + duration);

      await createMarket(marketId, question, deadline, REVEAL_WINDOW);
      toast.success("market created fr fr!");
      setCreated(true);
    } catch (err: any) {
      if (err.message?.includes("User rejected")) {
        toast.error("transaction rejected");
      } else {
        toast.error("failed to create market");
      }
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-4xl">
          <Card className="border-2 border-border">
            <CardContent className="p-12">
              <EmptyState
                title="connect wallet"
                description="connect your wallet to create markets"
              />
            </CardContent>
          </Card>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-black lowercase text-[#BFFF00] mb-2">
              create market
            </h1>
          </div>
          <Card className="border-2 border-border">
            <CardContent className="p-12">
              <EmptyState
                title="admin only"
                description="only the hellyhook admin can create markets. connect with the admin wallet."
              />
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

      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-black lowercase text-[#BFFF00] mb-2">
            create market
          </h1>
          <p className="text-muted-foreground lowercase">
            create a prediction market for anything
          </p>
        </div>

        {created ? (
          <Card className="border-2 border-[#BFFF00]">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-black lowercase text-[#BFFF00] mb-4">
                market created fr fr
              </h2>
              <p className="text-muted-foreground lowercase mb-2">
                your market is live on base sepolia.
              </p>
              {hash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#BFFF00] hover:underline lowercase"
                >
                  view on basescan
                </a>
              )}
              <div className="mt-6">
                <Button
                  onClick={() => {
                    setCreated(false);
                    setQuestion("");
                  }}
                  className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
                >
                  create another
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Question */}
            <div>
              <h2 className="text-xl font-black lowercase text-foreground mb-4">
                1. market question
              </h2>
              <Input
                placeholder="will eth hit $5k by march?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="border-2 border-border focus:border-[#BFFF00] lowercase text-lg"
                disabled={isPending || isConfirming}
              />
            </div>

            {/* Category */}
            <div>
              <h2 className="text-xl font-black lowercase text-foreground mb-4">
                2. category
              </h2>
              <div className="flex flex-wrap gap-2">
                {["crypto", "sports", "politics", "entertainment", "other"].map(
                  (cat) => (
                    <Button
                      key={cat}
                      variant={category === cat ? "default" : "outline"}
                      onClick={() => setCategory(cat)}
                      className={`font-black lowercase ${
                        category === cat
                          ? "bg-[#BFFF00] hover:bg-white text-black"
                          : "border-2 border-border hover:border-[#BFFF00]"
                      }`}
                      disabled={isPending || isConfirming}
                    >
                      {cat}
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Duration */}
            <div>
              <h2 className="text-xl font-black lowercase text-foreground mb-4">
                3. market duration
              </h2>
              <div className="grid grid-cols-4 gap-3">
                {DURATIONS.map((d) => (
                  <Button
                    key={d.label}
                    variant={duration === d.seconds ? "default" : "outline"}
                    onClick={() => setDuration(d.seconds)}
                    className={`font-black lowercase ${
                      duration === d.seconds
                        ? "bg-[#BFFF00] hover:bg-white text-black"
                        : "border-2 border-border hover:border-[#BFFF00]"
                    }`}
                    disabled={isPending || isConfirming}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tx Status */}
            {(isPending || isConfirming) && (
              <TxStatus
                hash={hash}
                isPending={isPending}
                isConfirming={isConfirming}
                isSuccess={isSuccess}
                error={error}
              />
            )}

            {/* Create Button */}
            <Button
              onClick={handleCreate}
              disabled={!question || isPending || isConfirming}
              className="w-full bg-[#BFFF00] hover:bg-white text-black font-black lowercase py-6 text-lg disabled:opacity-50"
            >
              {isPending || isConfirming ? "creating..." : "create market"}
            </Button>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
