"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "home" },
  { href: "/markets", label: "markets" },
  { href: "/create", label: "create" },
  { href: "/squads", label: "squads" },
  { href: "/profile", label: "profile" },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t-2 border-border pb-safe">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
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
                  : "text-muted-foreground"
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
