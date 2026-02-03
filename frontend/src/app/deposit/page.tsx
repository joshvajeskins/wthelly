"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { mockUser, mockDeposits } from "@/lib/mock-data";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { SUPPORTED_CHAINS, SUPPORTED_TOKENS } from "@/config/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function DepositPage() {
  const [sourceChain, setSourceChain] = useState("");
  const [sourceToken, setSourceToken] = useState("");
  const [amount, setAmount] = useState("");

  const handleDeposit = () => {
    // TODO: Implement deposit logic with LI.FI
    console.log("deposit:", { sourceChain, sourceToken, amount });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-[#BFFF00] text-black font-bold lowercase">
            completed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-transparent border-2 border-[#BFFF00] text-[#BFFF00] font-bold lowercase">
            pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500 text-white font-bold lowercase">
            failed
          </Badge>
        );
      default:
        return <Badge className="lowercase">{status}</Badge>;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl pb-24 lg:pb-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black lowercase text-[#BFFF00] mb-2">deposit funds</h1>
          <p className="text-muted-foreground lowercase">
            bridge from any chain via li.fi
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Current Balance Card */}
            <Card className="border-2 border-border">
              <CardHeader>
                <CardTitle className="lowercase font-black">channel balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-[#BFFF00]">
                  {formatCurrency(mockUser.channelBalance)}
                </div>
              </CardContent>
            </Card>

            {/* Deposit Form Card */}
            <Card className="border-2 border-border">
              <CardHeader>
                <CardTitle className="lowercase font-black">deposit funds</CardTitle>
                <CardDescription className="lowercase">
                  select source chain, token, and amount to deposit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Source Chain Selector */}
                <div className="space-y-2">
                  <Label htmlFor="source-chain" className="lowercase font-bold text-xs text-muted-foreground">source chain</Label>
                  <Select value={sourceChain} onValueChange={setSourceChain}>
                    <SelectTrigger
                      id="source-chain"
                      className="border-2 border-border focus:border-[#BFFF00] lowercase"
                    >
                      <SelectValue placeholder="select chain" />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-border">
                      {SUPPORTED_CHAINS.map((chain) => (
                        <SelectItem key={chain.id} value={chain.id} className="lowercase">
                          {chain.name.toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Source Token Selector */}
                <div className="space-y-2">
                  <Label htmlFor="source-token" className="lowercase font-bold text-xs text-muted-foreground">source token</Label>
                  <Select value={sourceToken} onValueChange={setSourceToken}>
                    <SelectTrigger
                      id="source-token"
                      className="border-2 border-border focus:border-[#BFFF00] lowercase"
                    >
                      <SelectValue placeholder="select token" />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-border">
                      {SUPPORTED_TOKENS.map((token) => (
                        <SelectItem key={token.symbol} value={token.symbol} className="lowercase">
                          {token.name.toLowerCase()} ({token.symbol.toLowerCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="lowercase font-bold text-xs text-muted-foreground">amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border-2 border-border focus:border-[#BFFF00]"
                  />
                </div>

                {/* Deposit Button */}
                <Button
                  onClick={handleDeposit}
                  disabled={!sourceChain || !sourceToken || !amount}
                  className="w-full bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
                >
                  deposit
                </Button>
              </CardContent>
            </Card>

            {/* Recent Deposits Section */}
            <Card className="border-2 border-border">
              <CardHeader>
                <CardTitle className="lowercase font-black">recent deposits</CardTitle>
                <CardDescription className="lowercase">
                  your latest deposit transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockDeposits.map((deposit) => (
                    <div
                      key={deposit.id}
                      className="flex items-center justify-between p-4 border-2 border-border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 lowercase">
                          <span className="font-bold">{deposit.sourceChain.toLowerCase()}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-muted-foreground">base</span>
                        </div>
                        <div className="text-sm text-muted-foreground lowercase">
                          {deposit.sourceAmount} {deposit.sourceToken.toLowerCase()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(deposit.createdAt)}
                        </div>
                      </div>
                      <div>{getStatusBadge(deposit.status)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How It Works Section */}
          <div>
            <Card className="border-2 border-border sticky top-8">
              <CardHeader>
                <CardTitle className="lowercase font-black">how it works</CardTitle>
                <CardDescription className="lowercase">
                  simple 3-step deposit process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center border-2 border-[#BFFF00] text-[#BFFF00] font-black">
                      1
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-bold mb-1 lowercase">
                      select your source chain and token
                    </h3>
                    <p className="text-sm text-muted-foreground lowercase">
                      choose where you want to bridge from
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center border-2 border-[#BFFF00] text-[#BFFF00] font-black">
                      2
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-bold mb-1 lowercase">
                      li.fi bridges your funds to base
                    </h3>
                    <p className="text-sm text-muted-foreground lowercase">
                      secure cross-chain transfer
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center border-2 border-[#BFFF00] text-[#BFFF00] font-black">
                      3
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-bold mb-1 lowercase">
                      funds deposited to your yellow channel
                    </h3>
                    <p className="text-sm text-muted-foreground lowercase">
                      ready to use in the marketplace
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground lowercase">
                    <span className="text-[#BFFF00]">*</span>
                    <span>powered by li.fi protocol</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground lowercase mt-2">
                    <span className="text-[#BFFF00]">*</span>
                    <span>typical completion: 2-5 minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
