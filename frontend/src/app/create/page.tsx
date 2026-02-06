"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockMarkets } from "@/lib/mock-data";
import { Market } from "@/types";

export default function CreateMarketPage() {
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("crypto");
  const [resolutionType, setResolutionType] = useState("admin");
  const [created, setCreated] = useState(false);

  const handleCreate = () => {
    if (!question) return;
    setCreated(true);
  };

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
          // Success State
          <Card className="border-2 border-[#BFFF00]">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-black lowercase text-[#BFFF00] mb-4">
                market created fr fr
              </h2>
              <p className="text-muted-foreground lowercase mb-6">
                your market is live. share it with friends to start betting.
              </p>
              <Button
                onClick={() => {
                  setCreated(false);
                  setQuestion("");
                }}
                className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
              >
                create another
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Creation Form
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
              />
            </div>

            {/* Category */}
            <div>
              <h2 className="text-xl font-black lowercase text-foreground mb-4">
                2. category
              </h2>
              <div className="flex flex-wrap gap-2">
                {["crypto", "sports", "politics", "entertainment", "other"].map((cat) => (
                  <Button
                    key={cat}
                    variant={category === cat ? "default" : "outline"}
                    onClick={() => setCategory(cat)}
                    className={`font-black lowercase ${
                      category === cat
                        ? "bg-[#BFFF00] hover:bg-white text-black"
                        : "border-2 border-border hover:border-[#BFFF00]"
                    }`}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* Resolution Type */}
            <div>
              <h2 className="text-xl font-black lowercase text-foreground mb-4">
                3. resolution type
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={`border-2 cursor-pointer transition-colors ${
                    resolutionType === "price"
                      ? "border-[#BFFF00]"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => setResolutionType("price")}
                >
                  <CardContent className="p-4">
                    <p className="font-black lowercase text-foreground">price market</p>
                    <p className="text-sm text-muted-foreground lowercase mt-1">
                      auto-resolved by uniswap v4 hook
                    </p>
                  </CardContent>
                </Card>
                <Card
                  className={`border-2 cursor-pointer transition-colors ${
                    resolutionType === "admin"
                      ? "border-[#BFFF00]"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => setResolutionType("admin")}
                >
                  <CardContent className="p-4">
                    <p className="font-black lowercase text-foreground">custom market</p>
                    <p className="text-sm text-muted-foreground lowercase mt-1">
                      resolved by admin
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Create Button */}
            <Button
              onClick={handleCreate}
              disabled={!question}
              className="w-full bg-[#BFFF00] hover:bg-white text-black font-black lowercase py-6 text-lg disabled:opacity-50"
            >
              create market
            </Button>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
