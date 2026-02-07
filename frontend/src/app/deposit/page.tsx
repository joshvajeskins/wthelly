"use client";

import { useState } from "react";
import { usePrivyAccount } from "@/hooks/use-privy-account";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { EmptyState } from "@/components/shared";
import { TxStatus } from "@/components/shared/tx-status";
import { formatCurrency } from "@/lib/format";
import { USDC_DECIMALS } from "@/config/constants";
import {
  useCustodyBalance,
  useUsdcBalance,
  useUsdcAllowance,
} from "@/hooks/use-contract-reads";
import {
  useMintTestUsdc,
  useApproveUsdc,
  useDeposit,
  useWithdraw,
} from "@/hooks/use-contract-writes";
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

export default function DepositPage() {
  const { address, isConnected } = usePrivyAccount();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Read contract data
  const { data: custodyBalanceRaw, refetch: refetchCustody } = useCustodyBalance(address);
  const { data: usdcBalanceRaw, refetch: refetchUsdc } = useUsdcBalance(address);
  const { data: allowanceRaw, refetch: refetchAllowance } = useUsdcAllowance(address);

  // Write hooks
  const mintHook = useMintTestUsdc();
  const approveHook = useApproveUsdc();
  const depositHook = useDeposit();
  const withdrawHook = useWithdraw();

  const custodyBalance = custodyBalanceRaw
    ? Number(custodyBalanceRaw) / 10 ** USDC_DECIMALS
    : 0;
  const usdcBalance = usdcBalanceRaw
    ? Number(usdcBalanceRaw) / 10 ** USDC_DECIMALS
    : 0;
  const allowance = allowanceRaw
    ? Number(allowanceRaw) / 10 ** USDC_DECIMALS
    : 0;

  const depositAmountNum = parseFloat(depositAmount) || 0;
  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  const depositAmountBig = BigInt(Math.round(depositAmountNum * 1e6));
  const withdrawAmountBig = BigInt(Math.round(withdrawAmountNum * 1e6));
  const needsApproval = depositAmountNum > 0 && allowance < depositAmountNum;

  const isTxPending =
    mintHook.isPending ||
    mintHook.isConfirming ||
    approveHook.isPending ||
    approveHook.isConfirming ||
    depositHook.isPending ||
    depositHook.isConfirming ||
    withdrawHook.isPending ||
    withdrawHook.isConfirming;

  const handleMint = async () => {
    if (!address) return;
    const amount = BigInt(1000) * BigInt(1e6); // 1000 USDC
    await mintHook.mint(address, amount);
    setTimeout(() => {
      refetchUsdc();
    }, 3000);
  };

  const handleApprove = async () => {
    // Approve max uint256 for convenience
    const maxApproval = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    await approveHook.approve(maxApproval);
    setTimeout(() => {
      refetchAllowance();
    }, 3000);
  };

  const handleDeposit = async () => {
    if (depositAmountNum <= 0) return;
    await depositHook.deposit(depositAmountBig);
    setTimeout(() => {
      refetchCustody();
      refetchUsdc();
      setDepositAmount("");
    }, 3000);
  };

  const handleWithdraw = async () => {
    if (withdrawAmountNum <= 0) return;
    await withdrawHook.withdraw(withdrawAmountBig);
    setTimeout(() => {
      refetchCustody();
      refetchUsdc();
      setWithdrawAmount("");
    }, 3000);
  };

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl pb-24 lg:pb-8">
          <Card className="border-2 border-border">
            <CardContent className="p-12">
              <EmptyState
                title="connect wallet"
                description="connect your wallet to deposit and withdraw funds"
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
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl pb-24 lg:pb-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black lowercase text-[#BFFF00] mb-2">
            deposit funds
          </h1>
          <p className="text-muted-foreground lowercase">
            deposit usdc to custody (state channel) to start betting
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Balance Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-2 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="lowercase font-black text-sm">
                    wallet usdc
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-[#BFFF00]">
                    {formatCurrency(usdcBalance)}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="lowercase font-black text-sm">
                    custody balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-[#BFFF00]">
                    {formatCurrency(custodyBalance)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mint Test USDC */}
            <Card className="border-2 border-dashed border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold lowercase text-sm">
                    testnet: mint 1,000 usdc
                  </p>
                  <p className="text-xs text-muted-foreground lowercase">
                    unichain sepolia test tokens
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {(mintHook.isPending || mintHook.isConfirming) && (
                    <TxStatus
                      hash={mintHook.hash}
                      isPending={mintHook.isPending}
                      isConfirming={mintHook.isConfirming}
                      isSuccess={mintHook.isSuccess}
                      error={mintHook.error}
                    />
                  )}
                  <Button
                    onClick={handleMint}
                    disabled={isTxPending}
                    variant="outline"
                    className="font-black lowercase border-2 border-[#BFFF00] text-[#BFFF00] hover:bg-[#BFFF00] hover:text-black"
                  >
                    mint
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Deposit Form */}
            <Card className="border-2 border-border">
              <CardHeader>
                <CardTitle className="lowercase font-black">deposit</CardTitle>
                <CardDescription className="lowercase">
                  deposit usdc from wallet to custody
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="lowercase font-bold text-xs text-muted-foreground">
                    amount (usdc)
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="border-2 border-border focus:border-[#BFFF00]"
                    disabled={isTxPending}
                  />
                </div>

                {/* Tx Status */}
                {(approveHook.isPending ||
                  approveHook.isConfirming ||
                  depositHook.isPending ||
                  depositHook.isConfirming) && (
                  <TxStatus
                    hash={approveHook.hash || depositHook.hash}
                    isPending={approveHook.isPending || depositHook.isPending}
                    isConfirming={
                      approveHook.isConfirming || depositHook.isConfirming
                    }
                    isSuccess={depositHook.isSuccess}
                    error={approveHook.error || depositHook.error}
                  />
                )}

                <div className="flex gap-3">
                  {needsApproval && (
                    <Button
                      onClick={handleApprove}
                      disabled={isTxPending || depositAmountNum <= 0}
                      className="flex-1 bg-transparent border-2 border-[#BFFF00] text-[#BFFF00] hover:bg-[#BFFF00] hover:text-black font-black lowercase"
                    >
                      1. approve custody
                    </Button>
                  )}
                  <Button
                    onClick={handleDeposit}
                    disabled={
                      isTxPending ||
                      depositAmountNum <= 0 ||
                      depositAmountNum > usdcBalance ||
                      needsApproval
                    }
                    className="flex-1 bg-[#BFFF00] hover:bg-white text-black font-black lowercase"
                  >
                    {needsApproval ? "2. deposit" : "deposit"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Withdraw Form */}
            <Card className="border-2 border-border">
              <CardHeader>
                <CardTitle className="lowercase font-black">withdraw</CardTitle>
                <CardDescription className="lowercase">
                  withdraw usdc from custody to wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="lowercase font-bold text-xs text-muted-foreground">
                    amount (usdc)
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="border-2 border-border focus:border-[#BFFF00]"
                    disabled={isTxPending}
                  />
                </div>

                {(withdrawHook.isPending || withdrawHook.isConfirming) && (
                  <TxStatus
                    hash={withdrawHook.hash}
                    isPending={withdrawHook.isPending}
                    isConfirming={withdrawHook.isConfirming}
                    isSuccess={withdrawHook.isSuccess}
                    error={withdrawHook.error}
                  />
                )}

                <Button
                  onClick={handleWithdraw}
                  disabled={
                    isTxPending ||
                    withdrawAmountNum <= 0 ||
                    withdrawAmountNum > custodyBalance
                  }
                  variant="outline"
                  className="w-full font-black lowercase border-2"
                >
                  withdraw
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* How It Works Section */}
          <div>
            <Card className="border-2 border-border sticky top-8">
              <CardHeader>
                <CardTitle className="lowercase font-black">how it works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center border-2 border-[#BFFF00] text-[#BFFF00] font-black">
                      1
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-bold mb-1 lowercase">mint test usdc</h3>
                    <p className="text-sm text-muted-foreground lowercase">
                      get test tokens on unichain sepolia
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center border-2 border-[#BFFF00] text-[#BFFF00] font-black">
                      2
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-bold mb-1 lowercase">approve + deposit</h3>
                    <p className="text-sm text-muted-foreground lowercase">
                      approve custody to spend your usdc, then deposit
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center border-2 border-[#BFFF00] text-[#BFFF00] font-black">
                      3
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-bold mb-1 lowercase">start betting</h3>
                    <p className="text-sm text-muted-foreground lowercase">
                      your custody balance is used for all bets via state channels
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground lowercase">
                    <span className="text-[#BFFF00]">*</span>
                    <span>unichain sepolia testnet</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground lowercase mt-2">
                    <span className="text-[#BFFF00]">*</span>
                    <span>withdraw anytime from custody</span>
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
