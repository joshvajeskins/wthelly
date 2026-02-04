import Link from "next/link"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t-2 border-border bg-card mt-auto">
      <div className="container-app py-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Powered By */}
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground lowercase tracking-wider">
              powered by{" "}
              <span className="text-[#BFFF00] font-bold">yellow</span>
              {" + "}
              <span className="text-[#BFFF00] font-bold">uniswap</span>
              {" + "}
              <span className="text-[#BFFF00] font-bold">lifi</span>
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1 lowercase">
              {currentYear} wthelly
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/docs"
              className="text-sm text-muted-foreground hover:text-[#BFFF00] transition-colors lowercase font-bold"
            >
              docs
            </Link>
            <Link
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-[#BFFF00] transition-colors lowercase font-bold"
            >
              github
            </Link>
            <Link
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-[#BFFF00] transition-colors lowercase font-bold"
            >
              twitter
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
