"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Bot,
  BookOpen,
  Search,
  Network,
  Wallet,
  GitBranch,
  ArrowRight,
  Fingerprint,
  MessageSquare,
  Presentation,
} from "lucide-react";
import { AppBrand } from "@/components/app/AppBrand";
import { GlowCard } from "@/components/ui/GlowCard";
import { IconChip } from "@/components/ui/IconChip";
import { SmoothScroll } from "@/components/SmoothScroll";

const WireframeSphere = dynamic(
  () => import("./WireframeSphere").then((m) => m.WireframeSphere),
  { ssr: false }
);

const GITHUB_URL = "https://github.com/Philotheephilix/ark-hive";

const FEATURES = [
  {
    icon: Bot,
    title: "Agents",
    desc: "Register ERC-8004 agent identities and bring them on-chain in a click.",
  },
  {
    icon: BookOpen,
    title: "Knowledge",
    desc: "Ground agents with RAG over summarized, embedded sessions.",
  },
  {
    icon: Search,
    title: "Memory",
    desc: "Run, entity, and global memory that cascades and persists on Arkiv.",
  },
  {
    icon: Network,
    title: "Visualizer",
    desc: "See the topic and similarity graph your agents build as they talk.",
  },
];

const STEPS = [
  {
    icon: Wallet,
    title: "Connect your wallet",
    desc: "Sign in with Privy. Every action is signed by your own wallet — no custody.",
  },
  {
    icon: Fingerprint,
    title: "Register an agent",
    desc: "Mint an ERC-8004 identity on Ethereum Sepolia, mirrored to Arkiv.",
  },
  {
    icon: MessageSquare,
    title: "Chat & it remembers",
    desc: "Sessions, snapshots, memory, and RAG are written to Arkiv as you go.",
  },
];

const STACK = ["Arkiv · Braga testnet", "ERC-8004", "Privy", "Next.js"];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export function Landing() {
  return (
    <SmoothScroll>
    <div className="min-h-dvh">
      {/* Nav */}
      <header className="sticky top-3 z-20 mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-full border border-border bg-bg/70 py-2 pl-5 pr-2 backdrop-blur-xl">
        <AppBrand />
        <nav className="hidden items-center gap-1 md:flex">
          <a href="#features" className="nav-link">
            Features
          </a>
          <a href="#how" className="nav-link">
            How it works
          </a>
          <Link href="/pitch" className="nav-link inline-flex items-center gap-1.5 text-accent">
            <Presentation size={14} /> Pitch
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost hidden sm:inline-flex"
          >
            <GitBranch size={16} /> GitHub
          </a>
          <Link href="/agents" className="btn-primary">
            Launch App <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-6rem] top-[-8rem] h-[34rem] w-[34rem] rounded-full bg-accent opacity-[0.12] blur-[150px]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-20 sm:pt-28 lg:grid-cols-2">
          {/* Left: copy */}
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.08 }}
            className="relative text-center lg:text-left"
          >
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
              <span className="chip">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                On-chain agents on Arkiv
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-fg sm:text-6xl"
            >
              AI agents that <span className="text-accent">remember</span>, on-chain
            </motion.h1>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mx-auto mt-5 max-w-xl font-sans text-base text-fg-muted sm:text-lg lg:mx-0"
            >
              Register ERC-8004 agents, chat with them, and let them remember —
              every action signed by your own wallet and stored on Arkiv.
            </motion.p>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mt-8 flex items-center justify-center gap-3 lg:justify-start"
            >
              <Link href="/agents" className="btn-primary px-6 py-3 text-sm">
                Launch App <ArrowRight size={16} />
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost px-6 py-3 text-sm"
              >
                <GitBranch size={16} /> View on GitHub
              </a>
            </motion.div>
          </motion.div>

          {/* Right: wireframe sphere */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative mx-auto aspect-square w-full max-w-sm sm:max-w-md lg:max-w-none"
          >
            <WireframeSphere />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <Section id="features">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <GlowCard key={title} variant="neutral" interactive className="p-5">
              <IconChip icon={Icon} variant="accent" />
              <h3 className="mt-4 font-display text-base font-semibold text-fg">
                {title}
              </h3>
              <p className="mt-1.5 font-sans text-sm leading-relaxed text-fg-muted">
                {desc}
              </p>
            </GlowCard>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section id="how">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            How it works
          </h2>
          <p className="mx-auto mt-2 max-w-md font-sans text-sm text-fg-muted">
            From wallet to a remembering agent in three steps.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <GlowCard key={title} variant="neutral" className="p-6">
              <span className="absolute right-5 top-5 font-mono text-sm text-fg-faint">
                0{i + 1}
              </span>
              <IconChip icon={Icon} variant="accent" size={20} className="h-10 w-10" />
              <h3 className="mt-4 font-display text-base font-semibold text-fg">
                {title}
              </h3>
              <p className="mt-1.5 font-sans text-sm leading-relaxed text-fg-muted">
                {desc}
              </p>
            </GlowCard>
          ))}
        </div>
      </Section>

      {/* Tech badges */}
      <Section>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {STACK.map((s) => (
            <span key={s} className="chip text-fg-muted">
              {s}
            </span>
          ))}
        </div>
      </Section>

      {/* Footer CTA */}
      <Section>
        <GlowCard variant="accent" className="px-6 py-14 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Build your first on-chain agent
          </h2>
          <p className="mx-auto mt-2 max-w-md font-sans text-sm text-fg-muted">
            Connect a wallet and register an agent in under a minute.
          </p>
          <Link
            href="/agents"
            className="btn-primary mx-auto mt-6 px-6 py-3 text-sm"
          >
            Launch App <ArrowRight size={16} />
          </Link>
        </GlowCard>
      </Section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 sm:flex-row">
          <AppBrand />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 font-sans text-sm text-fg-muted hover:text-fg"
          >
            <GitBranch size={15} /> Philotheephilix/ark-hive
          </a>
        </div>
      </footer>
    </div>
    </SmoothScroll>
  );
}

function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-6xl scroll-mt-24 px-6 py-12"
    >
      {children}
    </motion.section>
  );
}
