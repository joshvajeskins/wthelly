"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { usePrivyAccount } from "@/hooks/use-privy-account"
import { cn } from "@/lib/utils"
import { useContractAdmin } from "@/hooks/use-contract-reads"

const navItems = [
  { href: "/", label: "home" },
  { href: "/markets", label: "markets" },
  { href: "/create", label: "create" },
  { href: "/profile", label: "profile" },
]

export function MobileNav() {
  const pathname = usePathname()
  const { address, isConnected } = usePrivyAccount()
  const { data: adminAddress } = useContractAdmin()
  const isAdmin =
    isConnected &&
    adminAddress &&
    address?.toLowerCase() === (adminAddress as string)?.toLowerCase()

  const allNavItems = isAdmin
    ? [...navItems, { href: "/admin", label: "admin" }]
    : navItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t-2 border-border pb-safe">
      <div className="flex items-center justify-around h-14">
        {allNavItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center flex-1 h-full transition-colors",
                "text-xs font-black lowercase tracking-wider",
                isActive
                  ? "text-[#BFFF00]"
                  : "text-muted-foreground",
                item.label === "admin" && !isActive && "text-red-400"
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
