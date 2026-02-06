"use client";

import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function JoinMarketPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-2xl flex items-center justify-center">
        <Card className="border-2 border-border w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-black lowercase text-[#BFFF00] mb-4">
              coming soon
            </h1>
            <p className="text-muted-foreground lowercase mb-6">
              market invite links are still cooking. check back later fr fr.
            </p>
            <Button
              onClick={() => router.push("/markets")}
              className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
            >
              back to markets
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
