"use client";

import { useState } from "react";
import Link from "next/link";
import { usePrivyAccount } from "@/hooks/use-privy-account";
import { toast } from "sonner";
import { CountdownTimer, MarketStats } from "@/components/markets";
import { BetCard, QuickAmounts } from "@/components/betting";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import type { Market, Bet } from "@/types";
import { getResolutionTypeLabel } from "@/types";
import { usePlaceBet } from "@/hooks/use-place-bet";
import { useCustodyBalance } from "@/hooks/use-contract-reads";
import { USDC_DECIMALS } from "@/config/constants";

interface MarketDetailContentProps {
  market: Market;
  userBets: Bet[];
}

export function MarketDetailContent({
  market,
  userBets,
}: MarketDetailContentProps) {
  const [selectedOption, setSelectedOption] = useState<"yes" | "no" | null>(
    null
  );
  const [amount, setAmount] = useState<string>("");
  const { address, isConnected } = usePrivyAccount();
  const { placeBet, isPlacing } = usePlaceBet();
  const { data: custodyBalanceRaw } = useCustodyBalance(address);

  const custodyBalance = custodyBalanceRaw
    ? Number(custodyBalanceRaw) / 10 ** USDC_DECIMALS
    : 0;

  const numericAmount = parseFloat(amount) || 0;

  const handlePlaceBet = async () => {
    if (!selectedOption || numericAmount <= 0 || !isConnected) return;

    if (numericAmount > custodyBalance) {
      toast.error("insufficient custody balance. deposit more usdc first.");
      return;
    }

    try {
      await placeBet(
        market.id as `0x${string}`,
        selectedOption === "yes",
        numericAmount
      );
      toast.success("bet placed fr fr! submitted via state channel.");
      setAmount("");
      setSelectedOption(null);
    } catch (err: any) {
      if (err.message?.includes("User rejected")) {
        toast.error("transaction rejected");
      } else {
        toast.error("failed to place bet. try again.");
      }
    }
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  return (
    <main className="flex-1 container mx-auto px-4 py-8 pb-24 lg:pb-8">
      {/* Back Link */}
      <Link
        href="/markets"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-[#BFFF00] mb-6 transition-colors lowercase font-bold"
      >
        back to markets
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Market Info Section */}
          <Card className="border-2 border-border">
            <CardHeader>
              <div className="space-y-4">
                <h1 className="text-2xl md:text-3xl font-black lowercase">
                  {market.question}
                </h1>
                <p className="text-muted-foreground lowercase">
                  {market.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={`text-xs font-bold lowercase ${
                      market.resolutionType === "price"
                        ? "bg-[#BFFF00] text-black"
                        : "bg-transparent border-2 border-[#BFFF00] text-[#BFFF00]"
                    }`}
                  >
                    {getResolutionTypeLabel(market.resolutionType)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-bold lowercase">
                    {market.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-bold lowercase flex items-center gap-1">
                    <Lock className="size-3" />
                    encrypted
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Countdown Timer */}
              <div className="bg-muted/50 border-2 border-border p-4">
                <h3 className="text-xs font-bold text-muted-foreground mb-2 lowercase">
                  time remaining
                </h3>
                <CountdownTimer deadline={market.deadline} />
              </div>

              {/* Market Stats */}
              <MarketStats market={market} />
            </CardContent>
          </Card>

          {/* User's Bets */}
          {userBets.length > 0 && (
            <Card className="border-2 border-border">
              <CardHeader>
                <CardTitle className="lowercase font-black">your bets on this market</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userBets.map((bet) => (
                  <BetCard key={bet.id} bet={bet} market={market} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Betting Section */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4 border-2 border-border">
            <CardHeader>
              <CardTitle className="lowercase font-black">place your bet</CardTitle>
              {isConnected && (
                <p className="text-xs text-muted-foreground lowercase">
                  custody balance: {formatCurrency(custodyBalance)}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {!isConnected ? (
                <p className="text-center text-sm text-muted-foreground py-4 lowercase">
                  connect wallet to place bets
                </p>
              ) : market.status !== "open" ? (
                <p className="text-center text-sm text-muted-foreground py-4 lowercase">
                  market is {market.status} — no more bets
                </p>
              ) : (
                <>
                  {/* yes/no Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      size="lg"
                      variant={selectedOption === "yes" ? "default" : "outline"}
                      className={`h-16 text-lg font-black lowercase ${
                        selectedOption === "yes"
                          ? "bg-[#BFFF00] hover:bg-white text-black"
                          : "border-2 border-border hover:border-[#BFFF00] hover:text-[#BFFF00]"
                      }`}
                      onClick={() => setSelectedOption("yes")}
                      disabled={isPlacing}
                    >
                      yes
                    </Button>
                    <Button
                      size="lg"
                      variant={selectedOption === "no" ? "default" : "outline"}
                      className={`h-16 text-lg font-black lowercase ${
                        selectedOption === "no"
                          ? "bg-[#BFFF00] hover:bg-white text-black"
                          : "border-2 border-border hover:border-[#BFFF00] hover:text-[#BFFF00]"
                      }`}
                      onClick={() => setSelectedOption("no")}
                      disabled={isPlacing}
                    >
                      no
                    </Button>
                  </div>

                  {selectedOption && (
                    <>
                      {/* Amount Input */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold lowercase text-muted-foreground">
                          amount (usdc)
                        </label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          min="0"
                          step="0.01"
                          className="text-lg border-2 border-border focus:border-[#BFFF00]"
                          disabled={isPlacing}
                        />
                      </div>

                      {/* Quick Amounts */}
                      <QuickAmounts onSelect={handleQuickAmount} />

                      {/* Encrypted Notice */}
                      {numericAmount > 0 && (
                        <div className="border-2 border-border p-4 space-y-1">
                          <p className="text-xs font-bold text-muted-foreground lowercase flex items-center gap-1">
                            <Lock className="size-3" />
                            state channel: bet encrypted end-to-end
                          </p>
                          <p className="text-xs text-muted-foreground lowercase">
                            bet is submitted via clearnode state channel and encrypted with TEE.
                          </p>
                        </div>
                      )}

                      {/* Place Bet Button */}
                      <Button
                        size="lg"
                        className="w-full text-lg font-black lowercase bg-[#BFFF00] hover:bg-white text-black"
                        onClick={handlePlaceBet}
                        disabled={
                          !selectedOption ||
                          numericAmount <= 0 ||
                          isPlacing
                        }
                      >
                        {isPlacing
                          ? "cooking..."
                          : `place ${selectedOption} bet`}
                      </Button>
                    </>
                  )}

                  {!selectedOption && (
                    <p className="text-center text-sm text-muted-foreground py-4 lowercase">
                      select yes or no to continue
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
