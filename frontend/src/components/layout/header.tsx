"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navLinks = [
  { href: "/", label: "home" },
  { href: "/markets", label: "markets" },
  { href: "/create", label: "create" },
  { href: "/squads", label: "squads" },
  { href: "/how-it-works", label: "how it works" },
  { href: "/profile", label: "profile" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-sm font-bold lowercase tracking-wider transition-colors",
                  "text-muted-foreground hover:text-[#BFFF00]"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Wallet Button */}
          <div className="hidden md:flex items-center">
            <Button className="bg-[#BFFF00] hover:bg-white text-black font-black lowercase tracking-wider">
              connect
            </Button>
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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-3 text-sm font-bold lowercase tracking-wider transition-colors",
                  "text-muted-foreground hover:text-[#BFFF00]"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2">
              <Button className="w-full bg-[#BFFF00] hover:bg-white text-black font-black lowercase tracking-wider">
                connect
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
