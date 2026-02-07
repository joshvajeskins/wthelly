"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Zap,
  Shield,
  ArrowDown,
  Lock,
  Unlock,
  Server,
  Monitor,
  Cpu,
  Globe,
  ChevronRight,
  Github,
  Video,
  Mail,
} from "lucide-react";

const SLIDE_COUNT = 12;

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

function Slide({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`min-h-screen snap-start flex items-center justify-center px-6 md:px-12 py-16 ${className}`}
    >
      <div className="w-full max-w-5xl">{children}</div>
    </section>
  );
}

function SlideNumber({ n }: { n: number }) {
  return (
    <span className="text-xs font-mono text-muted-foreground/40 absolute top-6 left-6">
      {String(n).padStart(2, "0")} / {SLIDE_COUNT}
    </span>
  );
}

export default function PitchPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setActive(Math.min(idx, SLIDE_COUNT - 1));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-auto snap-y snap-mandatory bg-background"
    >
      {/* Dot navigation */}
      <nav className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 hidden md:flex">
        {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
          <button
            key={i}
            onClick={() => {
              const el = containerRef.current;
              if (el) el.scrollTo({ top: i * el.clientHeight, behavior: "smooth" });
            }}
            className={`w-2.5 h-2.5 rounded-full border border-[#BFFF00]/50 transition-all duration-300 ${
              active === i
                ? "bg-[#BFFF00] scale-125 shadow-[0_0_8px_#BFFF00]"
                : "bg-transparent hover:bg-[#BFFF00]/30"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </nav>

      {/* ============ SLIDE 1 — TITLE ============ */}
      <Slide className="relative">
        <SlideNumber n={1} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={stagger}
          className="flex flex-col items-center text-center gap-6"
        >
          <motion.h1
            variants={fadeUp}
            className="text-7xl md:text-8xl lg:text-9xl font-black lowercase tracking-tighter text-[#BFFF00]"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            wthelly
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-xl md:text-2xl text-muted-foreground lowercase tracking-wide max-w-2xl"
          >
            the prediction market where nobody knows which side you&apos;re on.
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="text-sm md:text-base text-muted-foreground/70 lowercase max-w-3xl leading-relaxed"
          >
            ecies-encrypted bets &bull; groth16 zk settlement &bull; erc-7824
            state channels &bull; uniswap v4 oracle
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-col items-center gap-2 text-muted-foreground/40"
          >
            <span className="text-xs uppercase tracking-widest">scroll</span>
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </motion.div>
        </motion.div>
      </Slide>

      {/* ============ SLIDE 2 — THE PROBLEM ============ */}
      <Slide>
        <SlideNumber n={2} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-black lowercase tracking-tighter text-[#BFFF00] mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            the problem
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground lowercase mb-12 text-lg max-w-2xl"
          >
            prediction markets have a transparency problem that&apos;s actually a
            feature request.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Eye className="w-8 h-8" />,
                title: "whale exposure",
                desc: "large bets move odds before settlement, punishing informed traders. your $500 YES is public before the block confirms.",
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "copy-trading parasites",
                desc: "bots mirror smart money instantly, diluting alpha. front-runners feast on your conviction.",
              },
              {
                icon: <Globe className="w-8 h-8" />,
                title: "gas costs per bet",
                desc: "every prediction is an on-chain transaction. micro-bets are uneconomical. $2 gas on a $5 bet? no cap.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="border-2 border-border rounded-lg p-6 hover:border-[#BFFF00] transition-colors"
              >
                <div className="text-[#BFFF00] mb-4">{item.icon}</div>
                <h3
                  className="text-xl font-black lowercase text-foreground mb-2"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground lowercase leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Slide>

      {/* ============ SLIDE 3 — THE SOLUTION ============ */}
      <Slide>
        <SlideNumber n={3} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-black lowercase tracking-tighter text-[#BFFF00] mb-12"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            the solution
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: <Lock className="w-7 h-7" />,
                title: "ecies encrypted bets",
                desc: "your bet direction (YES/NO) is encrypted with the TEE's public key. only the trusted enclave can read it.",
              },
              {
                icon: <Shield className="w-7 h-7" />,
                title: "groth16 zk settlement",
                desc: "payouts verified by a zero-knowledge proof. math is correct, but individual bets stay hidden forever.",
              },
              {
                icon: <Zap className="w-7 h-7" />,
                title: "erc-7824 state channels",
                desc: "all betting off-chain through nitrolite. zero gas per bet. deposit once, bet unlimited, withdraw when done.",
              },
              {
                icon: <Monitor className="w-7 h-7" />,
                title: "uniswap v4 oracle",
                desc: "hellyhook records pool prices via afterSwap(). automated market resolution — the swap activity IS the oracle.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="border-2 border-border rounded-lg p-6 flex gap-5 hover:border-[#BFFF00] transition-colors"
              >
                <div className="text-[#BFFF00] flex-shrink-0 mt-1">{item.icon}</div>
                <div>
                  <h3
                    className="text-lg font-black lowercase text-foreground mb-1"
                    style={{ fontFamily: "var(--font-space-grotesk)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground lowercase leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p
            variants={fadeUp}
            className="mt-8 text-center text-muted-foreground lowercase text-sm"
          >
            you deposit once. you bet as many times as you want. you withdraw
            when you&apos;re done.{" "}
            <span className="text-[#BFFF00] font-bold">
              two on-chain transactions total.
            </span>
          </motion.p>
        </motion.div>
      </Slide>

      {/* ============ SLIDE 4 — HOW IT WORKS ============ */}
      <Slide>
        <SlideNumber n={4} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-black lowercase tracking-tighter text-[#BFFF00] mb-12 text-center"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            how it works
          </motion.h2>

          <div className="flex flex-col md:flex-row items-stretch gap-4">
            {[
              {
                step: "1",
                label: "deposit",
                detail: "approve USDC → deposit to custody → open state channel",
                color: "border-[#BFFF00]",
              },
              {
                step: "2",
                label: "bet",
                detail:
                  "pick market, choose YES/NO → ECIES encrypt → send via state channel. zero gas, fully private.",
                color: "border-[#BFFF00]",
              },
              {
                step: "3",
                label: "settle",
                detail:
                  "market resolves → TEE computes payouts → generates groth16 ZK proof → verified on-chain.",
                color: "border-[#BFFF00]",
              },
              {
                step: "4",
                label: "withdraw",
                detail: "close channel → withdraw from custody → USDC back in wallet.",
                color: "border-[#BFFF00]",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="flex-1 flex flex-col items-center relative"
              >
                <div
                  className={`border-2 ${item.color} rounded-lg p-6 text-center w-full h-full flex flex-col justify-center`}
                >
                  <div className="text-3xl font-black text-[#BFFF00] mb-2">
                    {item.step}
                  </div>
                  <h3
                    className="text-xl font-black lowercase text-foreground mb-2"
                    style={{ fontFamily: "var(--font-space-grotesk)" }}
                  >
                    {item.label}
                  </h3>
                  <p className="text-xs text-muted-foreground lowercase leading-relaxed">
                    {item.detail}
                  </p>
                </div>
                {i < 3 && (
                  <ChevronRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 text-[#BFFF00]/40 w-6 h-6 z-10" />
                )}
              </motion.div>
            ))}
          </div>

          <motion.p
            variants={fadeUp}
            className="text-center text-muted-foreground/60 text-xs mt-8 lowercase"
          >
            steps 1 &amp; 4 are on-chain &bull; steps 2 &amp; 3 happen
            entirely off-chain
          </motion.p>
        </motion.div>
      </Slide>

      {/* ============ SLIDE 5 — ARCHITECTURE ============ */}
      <Slide>
        <SlideNumber n={5} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-black lowercase tracking-tighter text-[#BFFF00] mb-10 text-center"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            architecture
          </motion.h2>

          {/* On-chain */}
          <motion.div variants={fadeUp} className="mb-4">
            <div className="text-xs uppercase tracking-widest text-[#BFFF00] mb-3 font-bold">
              on-chain
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  name: "custody",
                  sub: "erc-7824",
                  detail: "deposits · withdrawals · channels",
                },
                {
                  name: "hellyhook",
                  sub: "v4 hook",
                  detail: "markets · oracle prices · zk settle",
                },
                {
                  name: "groth16 verifier",
                  sub: "snarkjs",
                  detail: "proof verification · 4 public signals",
                },
              ].map((b, i) => (
                <div
                  key={i}
                  className="border-2 border-[#BFFF00] rounded-lg p-4 text-center"
                >
                  <p
                    className="font-black lowercase text-foreground text-sm md:text-base"
                    style={{ fontFamily: "var(--font-space-grotesk)" }}
                  >
                    {b.name}
                  </p>
                  <p className="text-[10px] text-[#BFFF00] uppercase tracking-wider mt-1">
                    {b.sub}
                  </p>
                  <p className="text-[10px] text-muted-foreground lowercase mt-2">
                    {b.detail}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Divider */}
          <motion.div
            variants={fadeIn}
            className="flex items-center justify-center gap-3 my-4 text-muted-foreground/30"
          >
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-widest">
              deposit / withdraw only ↕ proof
            </span>
            <div className="h-px flex-1 bg-border" />
          </motion.div>

          {/* Off-chain */}
          <motion.div variants={fadeUp}>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-bold">
              off-chain
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  name: "clearnode",
                  sub: "nitrolite",
                  detail: "state channels · ws routing · app sessions",
                },
                {
                  name: "tee server",
                  sub: "marlin oyster",
                  detail:
                    "ecies decrypt · balance track · zk proofs",
                },
                {
                  name: "frontend",
                  sub: "next.js",
                  detail: "ecies encrypt · ws client · privy wallet",
                },
              ].map((b, i) => (
                <div
                  key={i}
                  className="border-2 border-border rounded-lg p-4 text-center hover:border-[#BFFF00]/50 transition-colors"
                >
                  <p
                    className="font-black lowercase text-foreground text-sm md:text-base"
                    style={{ fontFamily: "var(--font-space-grotesk)" }}
                  >
                    {b.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                    {b.sub}
                  </p>
                  <p className="text-[10px] text-muted-foreground lowercase mt-2">
                    {b.detail}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </Slide>

      {/* ============ SLIDE 6 — STATE CHANNELS ============ */}
      <Slide>
        <SlideNumber n={6} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-black lowercase tracking-tighter text-[#BFFF00] mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            state channels
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground lowercase mb-10 text-base max-w-2xl"
          >
            nitrolite / erc-7824 — the core UX unlock. the state channel is the
            highway. bets are the cars. you pay the toll once, drive as much as
            you want.
          </motion.p>

          {/* Comparison table */}
          <motion.div
            variants={fadeUp}
            className="overflow-hidden rounded-lg border-2 border-border"
          >
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="p-4 text-sm font-black lowercase text-muted-foreground">
                    &nbsp;
                  </th>
                  <th className="p-4 text-sm font-black lowercase text-muted-foreground">
                    without channels
                  </th>
                  <th className="p-4 text-sm font-black lowercase text-[#BFFF00]">
                    with nitrolite
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm lowercase">
                {[
                  ["gas", "$0.50–2 per bet", "zero gas per bet"],
                  ["speed", "2–12s confirmation", "instant (websocket)"],
                  ["privacy", "bet visible on-chain", "encrypted, off-chain"],
                  ["scope", "new tx per market", "one channel → all markets"],
                ].map(([label, without, withCh], i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-4 font-bold text-foreground">{label}</td>
                    <td className="p-4 text-muted-foreground">{without}</td>
                    <td className="p-4 text-[#BFFF00] font-bold">{withCh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-8 grid md:grid-cols-2 gap-4 text-sm"
          >
            <div className="border border-border rounded-lg p-4">
              <p className="font-bold lowercase text-foreground mb-1">
                custody.sol
              </p>
              <p className="text-muted-foreground lowercase text-xs">
                holds all user funds with erc-7824 channel lifecycle
              </p>
            </div>
            <div className="border border-border rounded-lg p-4">
              <p className="font-bold lowercase text-foreground mb-1">
                app sessions
              </p>
              <p className="text-muted-foreground lowercase text-xs">
                each bet is a lightweight virtual channel between user and TEE
              </p>
            </div>
          </motion.div>
        </motion.div>
      </Slide>

      {/* ============ SLIDE 7 — ZK PROOFS ============ */}
      <Slide>
        <SlideNumber n={7} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-black lowercase tracking-tighter text-[#BFFF00] mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            zk proofs
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground lowercase mb-10 text-base max-w-2xl"
          >
            groth16 circuit (settlement_verify.circom, MAX_BETS=32). the proof
            makes &ldquo;hidden bets with provable settlement&rdquo; possible.
          </motion.p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Public */}
            <motion.div
              variants={fadeUp}
              className="border-2 border-[#BFFF00] rounded-lg p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Unlock className="w-5 h-5 text-[#BFFF00]" />
                <h3
                  className="text-lg font-black lowercase text-[#BFFF00]"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  public signals
                </h3>
              </div>
              <p className="text-xs text-muted-foreground lowercase mb-3">
                verified on-chain by the smart contract
              </p>
              <ul className="space-y-2 text-sm lowercase">
                {[
                  "outcome (0 or 1)",
                  "feeBps (platform fee rate)",
                  "totalPool (sum of all bets)",
                  "platformFee (fee amount)",
                ].map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-foreground">
                    <span className="w-1.5 h-1.5 bg-[#BFFF00] rounded-full flex-shrink-0" />
                    <span className="font-mono text-xs">{s}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Private */}
            <motion.div
              variants={fadeUp}
              className="border-2 border-border rounded-lg p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <EyeOff className="w-5 h-5 text-muted-foreground" />
                <h3
                  className="text-lg font-black lowercase text-foreground"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  private signals
                </h3>
              </div>
              <p className="text-xs text-muted-foreground lowercase mb-3">
                hidden — never revealed to anyone
              </p>
              <ul className="space-y-2 text-sm lowercase">
                {[
                  "directions[] (each bet's YES/NO)",
                  "amounts[] (each bet's size)",
                  "payouts[] (each bet's payout)",
                  "active[] (which slots are used)",
                ].map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full flex-shrink-0" />
                    <span className="font-mono text-xs">{s}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          <motion.div
            variants={fadeUp}
            className="mt-8 border border-border rounded-lg p-5 text-sm lowercase text-muted-foreground"
          >
            <p>
              an observer sees:{" "}
              <span className="text-foreground font-bold">
                &ldquo;a market settled, $10,000 total pool, $200 fee, payouts
                distributed.&rdquo;
              </span>
            </p>
            <p className="mt-2">
              they do NOT see:{" "}
              <span className="text-[#BFFF00] font-bold">
                &ldquo;alice bet $5000 YES and won $9,800.&rdquo;
              </span>
            </p>
          </motion.div>
        </motion.div>
      </Slide>

      {/* ============ SLIDE 8 — UNISWAP V4 HOOK ============ */}
      <Slide>
        <SlideNumber n={8} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-black lowercase tracking-tighter text-[#BFFF00] mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            uniswap v4 hook
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground lowercase mb-10 text-base max-w-2xl"
          >
            hellyhook is a uniswap v4 hook that serves as an on-chain price
            oracle for automated market resolution. no chainlink, no external
            feeds.
          </motion.p>

          <motion.div variants={fadeUp} className="space-y-4">
            {[
              {
                title: "afterSwap() price recording",
                desc: "records lastSqrtPriceX96 after every swap on tracked pools. the swap activity IS the oracle.",
              },
              {
                title: "price-target markets",
                desc: "\"will ETH/USDC be above $5000 by block X?\" — markets auto-resolve when the target is reached.",
              },
              {
                title: "resolveMarketFromOracle()",
                desc: "reads stored price and resolves the market automatically. anyone can call it after the deadline.",
              },
              {
                title: "pool-native prediction markets",
                desc: "any uniswap v4 pool becomes a prediction market source. trustless automated resolution.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex gap-4 items-start border-l-2 border-[#BFFF00] pl-5 py-2"
              >
                <div>
                  <p
                    className="font-black lowercase text-foreground text-sm"
                    style={{ fontFamily: "var(--font-space-grotesk)" }}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground lowercase mt-1">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </Slide>

      {/* ============ SLIDE 9 — TECH STACK ============ */}
      <Slide>
        <SlideNumber n={9} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-black lowercase tracking-tighter text-[#BFFF00] mb-10 text-center"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            tech stack
          </motion.h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                name: "solidity",
                sub: "smart contracts",
                detail: "hellyhook, verifier, custody",
              },
              {
                name: "nitrolite",
                sub: "erc-7824",
                detail: "gasless off-chain betting",
              },
              {
                name: "circom",
                sub: "groth16",
                detail: "zk settlement proofs",
              },
              {
                name: "tee",
                sub: "marlin oyster",
                detail: "encrypted bet processing",
              },
              {
                name: "next.js",
                sub: "frontend",
                detail: "privy wallet, viem",
              },
              {
                name: "ecies",
                sub: "secp256k1",
                detail: "aes-256-gcm encryption",
              },
              {
                name: "unichain",
                sub: "sepolia",
                detail: "chain id: 1301",
              },
              {
                name: "uniswap",
                sub: "v4 hooks",
                detail: "price oracle, markets",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="border-2 border-border rounded-lg p-5 text-center hover:border-[#BFFF00] transition-colors"
              >
                <p
                  className="text-lg font-black lowercase text-[#BFFF00]"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  {item.name}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                  {item.sub}
                </p>
                <p className="text-xs text-muted-foreground lowercase mt-2">
                  {item.detail}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Slide>

      {/* ============ SLIDE 10 — WHAT MAKES THIS NOVEL ============ */}
      <Slide>
        <SlideNumber n={10} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-black lowercase tracking-tighter text-[#BFFF00] mb-10"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            what makes this novel
          </motion.h2>

          <div className="space-y-4">
            {[
              {
                n: "01",
                title: "encrypted prediction markets are new",
                desc: "existing platforms (polymarket, augur) show all positions publicly. wthelly is the first to encrypt bet directions with ECIES and settle with ZK proofs.",
              },
              {
                n: "02",
                title: "state channels for prediction markets are new",
                desc: "nobody has used erc-7824 channels to make betting gasless while maintaining on-chain settlement guarantees.",
              },
              {
                n: "03",
                title: 'the "shadow balance" system',
                desc: "the TEE tracks available liquidity per user separately from the channel ledger — enabling multiple concurrent bets without channel resizing.",
              },
              {
                n: "04",
                title: "zk-verified settlement with hidden bets",
                desc: "the groth16 circuit proves payout correctness across up to 32 bets without revealing any individual bet's direction or amount.",
              },
              {
                n: "05",
                title: "uniswap v4 hooks as price oracles",
                desc: "using swap activity as a built-in oracle for automated market resolution — no chainlink, no external feeds.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="flex gap-5 items-start border-2 border-border rounded-lg p-5 hover:border-[#BFFF00] transition-colors"
              >
                <span className="text-2xl font-black text-[#BFFF00] flex-shrink-0 font-mono">
                  {item.n}
                </span>
                <div>
                  <h3
                    className="font-black lowercase text-foreground text-base mb-1"
                    style={{ fontFamily: "var(--font-space-grotesk)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground lowercase leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Slide>

      {/* ============ SLIDE 11 — SPONSOR INTEGRATIONS ============ */}
      <Slide>
        <SlideNumber n={11} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-black lowercase tracking-tighter text-[#BFFF00] mb-10 text-center"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            sponsor integrations
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Nitrolite */}
            <motion.div
              variants={fadeUp}
              className="border-2 border-[#BFFF00] rounded-lg p-6"
            >
              <h3
                className="text-xl font-black lowercase text-[#BFFF00] mb-4"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                nitrolite / erc-7824
              </h3>
              <ul className="space-y-3 text-sm lowercase">
                {[
                  ["custody.sol", "full erc-7824 fund custody with channel lifecycle"],
                  [
                    "clearnode",
                    "state channel router managing websocket connections and app sessions",
                  ],
                  [
                    "nitroliteclient sdk",
                    "frontend integration for channel create, deposit, withdraw, app session management",
                  ],
                  [
                    "app sessions",
                    "each bet is an app session between user and TEE, with encrypted state payloads",
                  ],
                ].map(([title, desc], i) => (
                  <li key={i}>
                    <span className="text-foreground font-bold">{title}</span>
                    <span className="text-muted-foreground"> — {desc}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Uniswap */}
            <motion.div
              variants={fadeUp}
              className="border-2 border-border rounded-lg p-6 hover:border-[#BFFF00] transition-colors"
            >
              <h3
                className="text-xl font-black lowercase text-foreground mb-4"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                uniswap
              </h3>
              <ul className="space-y-3 text-sm lowercase">
                {[
                  [
                    "hellyhook",
                    "v4 hook implementing afterSwap() for price oracle",
                  ],
                  [
                    "price recording",
                    "lastSqrtPriceX96 stored per pool per swap",
                  ],
                  [
                    "auto resolution",
                    "resolveMarketFromOracle() compares stored price vs target",
                  ],
                  [
                    "pool-native markets",
                    "any v4 pool becomes a prediction market source",
                  ],
                ].map(([title, desc], i) => (
                  <li key={i}>
                    <span className="text-foreground font-bold">{title}</span>
                    <span className="text-muted-foreground"> — {desc}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </motion.div>
      </Slide>

      {/* ============ SLIDE 12 — BUILDER & LINKS ============ */}
      <Slide>
        <SlideNumber n={12} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={stagger}
          className="flex flex-col items-center text-center gap-8"
        >
          <motion.h2
            variants={fadeUp}
            className="text-5xl md:text-6xl lg:text-7xl font-black lowercase tracking-tighter text-[#BFFF00]"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            wthelly
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="text-muted-foreground lowercase text-lg"
          >
            solo builder —{" "}
            <span className="text-foreground font-bold">joshva jeskins</span>
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-wrap justify-center gap-4"
          >
            <a
              href="https://github.com/joshvajeskins"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-2 border-border hover:border-[#BFFF00] rounded-lg px-5 py-3 text-sm lowercase font-bold text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
              github
            </a>
            <a
              href="mailto:joshvajeskinsweb3@gmail.com"
              className="inline-flex items-center gap-2 border-2 border-border hover:border-[#BFFF00] rounded-lg px-5 py-3 text-sm lowercase font-bold text-foreground transition-colors"
            >
              <Mail className="w-4 h-4" />
              contact
            </a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-4 flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-3 text-sm text-muted-foreground lowercase">
              <Server className="w-4 h-4" />
              <span>deployed on unichain sepolia (chain id: 1301)</span>
            </div>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-8 text-xs text-muted-foreground/50 lowercase tracking-widest"
          >
            built at ethglobal hackmoney 2026
          </motion.p>
        </motion.div>
      </Slide>
    </div>
  );
}
