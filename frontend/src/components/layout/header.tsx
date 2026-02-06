"use client"

import * as React from "react"
import Link from "next/link"
import { useAccount } from "wagmi"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useClearnode } from "@/providers/clearnode-provider"
import { useContractAdmin } from "@/hooks/use-contract-reads"

const navLinks = [
  { href: "/", label: "home" },
  { href: "/markets", label: "markets" },
  { href: "/create", label: "create" },
  { href: "/how-it-works", label: "how it works" },
  { href: "/profile", label: "profile" },
]

function WthellyConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none" as const,
                userSelect: "none" as const,
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button
                    onClick={openConnectModal}
                    className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase tracking-wider"
                  >
                    connect
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    className="bg-red-500 hover:bg-red-600 text-white font-black lowercase tracking-wider"
                  >
                    wrong network
                  </Button>
                );
              }

              return (
                <Button
                  onClick={openAccountModal}
                  className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase tracking-wider"
                >
                  {account.displayName}
                </Button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const { isConnected: clearnodeConnected, isAuthenticated: clearnodeAuth } = useClearnode()
  const { address, isConnected: walletConnected } = useAccount()
  const { data: adminAddress } = useContractAdmin()
  const isAdmin =
    walletConnected &&
    adminAddress &&
    address?.toLowerCase() === (adminAddress as string)?.toLowerCase()

  const allNavLinks = isAdmin
    ? [...navLinks, { href: "/admin", label: "admin" }]
    : navLinks

  return (
    <header className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-sm border-b-2 border-border">
      <div className="container-app">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <span className="text-2xl font-black lowercase tracking-tighter text-[#BFFF00] group-hover:text-white transition-colors">
              wthelly
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {allNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-sm font-bold lowercase tracking-wider transition-colors",
                  "text-muted-foreground hover:text-[#BFFF00]",
                  link.label === "admin" && "text-red-400 hover:text-red-300"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Wallet Button + Clearnode Status */}
          <div className="hidden md:flex items-center gap-2">
            {walletConnected && (
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  clearnodeAuth
                    ? "bg-green-500"
                    : clearnodeConnected
                      ? "bg-yellow-500"
                      : "bg-red-500"
                )}
                title={
                  clearnodeAuth
                    ? "clearnode: authenticated"
                    : clearnodeConnected
                      ? "clearnode: connected"
                      : "clearnode: disconnected"
                }
              />
            )}
            <WthellyConnectButton />
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            className="md:hidden font-black lowercase text-sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? "close" : "menu"}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-border bg-background">
          <nav className="container-app py-4 flex flex-col space-y-2">
            {allNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-3 text-sm font-bold lowercase tracking-wider transition-colors",
                  "text-muted-foreground hover:text-[#BFFF00]",
                  link.label === "admin" && "text-red-400 hover:text-red-300"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2">
              <WthellyConnectButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
