import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "wthelly | Private Betting Platform",
  description:
    "Bet on anything. Hidden positions. Maximum aura. No cap fr fr. Private betting with Yellow Network, Uniswap v4, and LI.FI.",
  keywords: [
    "prediction market",
    "betting",
    "crypto",
    "defi",
    "yellow network",
    "uniswap",
    "private betting",
  ],
  authors: [{ name: "wthelly" }],
  openGraph: {
    title: "wthelly",
    description: "Private betting platform with brainrot energy",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#141414",
              border: "1px solid #27272a",
              color: "#fafafa",
            },
          }}
        />
      </body>
    </html>
  );
}

