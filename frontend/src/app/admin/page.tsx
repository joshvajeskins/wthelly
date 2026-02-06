"use client";

import { useState } from "react";
import { usePrivyAccount } from "@/hooks/use-privy-account";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { EmptyState } from "@/components/shared";
import { TxStatus } from "@/components/shared/tx-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useContractAdmin } from "@/hooks/use-contract-reads";
import { useResolveMarket, useSettleMarket, useSettleMarketWithProof } from "@/hooks/use-contract-writes";
import { useOnChainMarkets, type OnChainMarket } from "@/hooks/use-market-events";
import { USDC_DECIMALS } from "@/config/constants";
import { useTee } from "@/providers/tee-provider";

function MarketAdminCard({ market }: { market: OnChainMarket }) {
  const resolveHook = useResolveMarket();
  const settleHook = useSettleMarket();
  const settleWithProofHook = useSettleMarketWithProof();
  const { teeClient, isConnected: teeConnected } = useTee();
  const [teeSettling, setTeeSettling] = useState(false);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const isPastDeadline = now > market.deadline;
  const canResolve = isPastDeadline && !market.resolved;
  const canSettle = market.resolved && !market.settled;

  const totalYes = Number(market.totalYes) / 10 ** USDC_DECIMALS;
  const totalNo = Number(market.totalNo) / 10 ** USDC_DECIMALS;

  const handleResolve = async (outcome: boolean) => {
    try {
      await resolveHook.resolveMarket(market.id, outcome);
      toast.success(`market resolved as ${outcome ? "YES" : "NO"}`);
    } catch (err: any) {
      if (err.message?.includes("User rejected")) {
        toast.error("transaction rejected");
      } else {
        toast.error("failed to resolve market");
      }
    }
  };

  const handleSettle = async () => {
    try {
      await settleHook.settleMarket(market.id);
      toast.success("market settled — payouts distributed");
    } catch (err: any) {
      if (err.message?.includes("User rejected")) {
        toast.error("transaction rejected");
      } else {
        toast.error("failed to settle market");
      }
    }
  };

  const handleTeeSettle = async () => {
    if (!teeConnected) {
      toast.error("TEE server not connected");
      return;
    }
    setTeeSettling(true);
    try {
      // Step 1: Tell TEE to compute settlement + ZK proof
      const settlement = await teeClient.settleMarket(market.id, market.outcome);

      if (!settlement.proof) {
        toast.error("TEE generated settlement but no ZK proof — use manual settle");
        return;
      }

      // Step 2: Submit proof on-chain
      const recipients = settlement.payouts
        .filter((p) => BigInt(p.amount) > 0n)
        .map((p) => p.address as `0x${string}`);
      const amounts = settlement.payouts
        .filter((p) => BigInt(p.amount) > 0n)
        .map((p) => BigInt(p.amount));

      const pA: [bigint, bigint] = [BigInt(settlement.proof.pA[0]), BigInt(settlement.proof.pA[1])];
      const pB: [[bigint, bigint], [bigint, bigint]] = [
        [BigInt(settlement.proof.pB[0][0]), BigInt(settlement.proof.pB[0][1])],
        [BigInt(settlement.proof.pB[1][0]), BigInt(settlement.proof.pB[1][1])],
      ];
      const pC: [bigint, bigint] = [BigInt(settlement.proof.pC[0]), BigInt(settlement.proof.pC[1])];

      await settleWithProofHook.settleMarketWithProof(
        market.id,
        recipients,
        amounts,
        BigInt(settlement.platformFee),
        pA,
        pB,
        pC
      );

      toast.success("market settled with ZK proof — positions never revealed on-chain");
    } catch (err: any) {
      if (err.message?.includes("User rejected")) {
        toast.error("transaction rejected");
      } else {
        toast.error(err.message || "TEE settlement failed");
      }
    } finally {
      setTeeSettling(false);
    }
  };

  const getStatusBadge = () => {
    if (market.settled)
      return <Badge variant="secondary" className="lowercase">settled</Badge>;
    if (market.resolved)
      return (
        <Badge className="bg-[#BFFF00] text-black lowercase">
          resolved: {market.outcome ? "yes" : "no"}
        </Badge>
      );
    if (isPastDeadline)
      return <Badge variant="destructive" className="lowercase">closed</Badge>;
    return <Badge variant="default" className="lowercase">open</Badge>;
  };

  const isTxPending =
    resolveHook.isPending ||
    resolveHook.isConfirming ||
    settleHook.isPending ||
    settleHook.isConfirming ||
    settleWithProofHook.isPending ||
    settleWithProofHook.isConfirming ||
    teeSettling;

  return (
    <Card className="border-2 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold lowercase line-clamp-2">
              {market.question}
            </h3>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {market.id.slice(0, 10)}...{market.id.slice(-6)}
            </p>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground lowercase">yes pool</p>
            <p className="font-bold text-[#BFFF00]">${totalYes.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground lowercase">no pool</p>
            <p className="font-bold">${totalNo.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground lowercase">commits</p>
            <p className="font-bold">{Number(market.commitCount)}</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          deadline: {new Date(Number(market.deadline) * 1000).toLocaleString()}
        </div>

        {/* Tx Status */}
        {(resolveHook.isPending ||
          resolveHook.isConfirming ||
          resolveHook.isSuccess ||
          resolveHook.error) && (
          <TxStatus
            hash={resolveHook.hash}
            isPending={resolveHook.isPending}
            isConfirming={resolveHook.isConfirming}
            isSuccess={resolveHook.isSuccess}
            error={resolveHook.error}
          />
        )}
        {(settleHook.isPending ||
          settleHook.isConfirming ||
          settleHook.isSuccess ||
          settleHook.error) && (
          <TxStatus
            hash={settleHook.hash}
            isPending={settleHook.isPending}
            isConfirming={settleHook.isConfirming}
            isSuccess={settleHook.isSuccess}
            error={settleHook.error}
          />
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {canResolve && (
            <>
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black lowercase"
                onClick={() => handleResolve(true)}
                disabled={isTxPending}
              >
                resolve yes
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black lowercase"
                onClick={() => handleResolve(false)}
                disabled={isTxPending}
              >
                resolve no
              </Button>
            </>
          )}
          {canSettle && (
            <>
              {teeConnected && (
                <Button
                  size="sm"
                  className="flex-1 bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
                  onClick={handleTeeSettle}
                  disabled={isTxPending}
                >
                  settle with tee + zk
                </Button>
              )}
              <Button
                size="sm"
                variant={teeConnected ? "outline" : "default"}
                className={teeConnected ? "flex-1 font-black lowercase" : "flex-1 bg-[#BFFF00] hover:bg-white text-black font-black lowercase"}
                onClick={handleSettle}
                disabled={isTxPending}
              >
                settle (manual)
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { address, isConnected } = usePrivyAccount();
  const { data: adminAddress } = useContractAdmin();
  const { markets, isLoading } = useOnChainMarkets();

  const isAdmin =
    isConnected &&
    adminAddress &&
    address?.toLowerCase() === (adminAddress as string)?.toLowerCase();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-6xl">
          <Card className="border-2 border-border">
            <CardContent className="p-12">
              <EmptyState
                title="connect wallet"
                description="connect your admin wallet to manage markets"
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
        <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-black lowercase text-[#BFFF00] mb-2">
              admin panel
            </h1>
          </div>
          <Card className="border-2 border-border">
            <CardContent className="p-12">
              <EmptyState
                title="access denied"
                description="only the hellyhook admin can access this page"
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

      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black lowercase text-[#BFFF00] mb-2">
            admin panel
          </h1>
          <p className="text-muted-foreground lowercase">
            resolve and settle markets as contract admin
          </p>
        </div>

        {/* Markets List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-2 border-border animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : markets.length === 0 ? (
          <Card className="border-2 border-border">
            <CardContent className="p-12">
              <EmptyState
                title="no markets"
                description="no markets have been created yet"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {markets.map((market) => (
              <MarketAdminCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
