"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  EyeOff,
  ShieldCheck,
  Fingerprint,
  Network,
  Link2,
  Boxes,
  Database,
  Wallet,
  MessageSquare,
  Sparkles,
  GitBranch,
  Lock,
  Cpu,
  Layers,
  Check,
  KeyRound,
  Clock,
  Brain,
} from "lucide-react";
import { AppBrand } from "@/components/app/AppBrand";

const GITHUB_URL = "https://github.com/Philotheephilix/ark-hive";

const SLIDES = [
  "Title",
  "Problem",
  "Solution",
  "Two planes",
  "Arkiv depth",
  "Standout",
  "Architecture",
  "Demo",
  "Memory",
  "Close",
] as const;

export function PitchDeck() {
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const isScrolling = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>();
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((i: number, behavior: ScrollBehavior = "smooth") => {
    const idx = Math.max(0, Math.min(SLIDES.length - 1, i));
    const el = slideRefs.current[idx];
    if (!el) return;
    isScrolling.current = true;
    setCurrent(idx);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${idx + 1}`);
    }
    el.scrollIntoView({ behavior });
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      isScrolling.current = false;
    }, behavior === "smooth" ? 700 : 100);
  }, []);

  // Deep-link: open directly on #N (1-based), jumping instantly (no smooth animation).
  useEffect(() => {
    const n = parseInt(window.location.hash.slice(1), 10);
    if (!(Number.isFinite(n) && n >= 1 && n <= SLIDES.length)) return;
    const idx = n - 1;
    const t = setTimeout(() => {
      const c = containerRef.current;
      const el = slideRefs.current[idx];
      if (!c || !el) return;
      const prev = c.style.scrollBehavior;
      c.style.scrollBehavior = "auto";
      isScrolling.current = true;
      el.scrollIntoView();
      setCurrent(idx);
      history.replaceState(null, "", `#${idx + 1}`);
      requestAnimationFrame(() => {
        c.style.scrollBehavior = prev;
        isScrolling.current = false;
      });
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", " "].includes(e.key)) {
        e.preventDefault();
        goTo(current + 1);
      } else if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        goTo(current - 1);
      } else if (e.key === "Home") {
        goTo(0);
      } else if (e.key === "End") {
        goTo(SLIDES.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, goTo]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const idx = slideRefs.current.indexOf(entry.target as HTMLElement);
            if (idx !== -1) setCurrent(idx);
          }
        }
      },
      { root, threshold: [0.5, 0.75] }
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const slides = [
    <TitleSlide key="t" onStart={() => goTo(1)} />,
    <ProblemSlide key="p" />,
    <SolutionSlide key="s" />,
    <PlanesSlide key="2p" />,
    <ArkivSlide key="ad" />,
    <StandoutSlide key="so" />,
    <ArchitectureSlide key="ar" />,
    <DemoSlide key="d" />,
    <MemorySlide key="m" />,
    <CloseSlide key="c" />,
  ];

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      {/* exit to landing */}
      <Link
        href="/"
        className="fixed left-5 top-5 z-50 inline-flex items-center gap-2 rounded-full border border-border bg-bg/70 px-3 py-1.5 font-sans text-xs text-fg-muted backdrop-blur-xl transition hover:border-accent/40 hover:text-fg"
      >
        <ArrowLeft size={13} /> Back to site
      </Link>

      {/* dot indicators */}
      <div className="fixed right-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-2.5 md:flex">
        {SLIDES.map((label, i) => (
          <button
            key={label}
            aria-label={`Go to slide ${i + 1}: ${label}`}
            onClick={() => goTo(i)}
            className={`group relative flex items-center justify-end`}
          >
            <span
              className={`mr-2 whitespace-nowrap rounded-full bg-bg/80 px-2 py-0.5 font-mono text-[10px] text-fg-muted opacity-0 backdrop-blur transition group-hover:opacity-100`}
            >
              {label}
            </span>
            <span
              className={`block rounded-full transition-all duration-300 ${
                i === current ? "h-5 w-1.5 bg-accent" : "h-1.5 w-1.5 bg-fg-faint hover:bg-fg-muted"
              }`}
            />
          </button>
        ))}
      </div>

      {/* arrows */}
      {current > 0 && (
        <button
          aria-label="Previous slide"
          onClick={() => goTo(current - 1)}
          className="fixed bottom-6 right-20 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg/70 text-fg-muted backdrop-blur-xl transition hover:border-accent/40 hover:text-fg"
        >
          <ArrowLeft size={16} />
        </button>
      )}
      {current < SLIDES.length - 1 && (
        <button
          aria-label="Next slide"
          onClick={() => goTo(current + 1)}
          className="fixed bottom-6 right-8 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent backdrop-blur-xl transition hover:bg-accent/20"
        >
          <ArrowRight size={16} />
        </button>
      )}

      {/* counter + hint */}
      <div className="fixed bottom-7 left-5 z-50 flex items-center gap-3 font-mono text-xs text-fg-faint">
        <span>
          <span className="text-fg-muted">{String(current + 1).padStart(2, "0")}</span> /{" "}
          {String(SLIDES.length).padStart(2, "0")}
        </span>
        <span className="hidden sm:inline">↑↓ / ← → to navigate</span>
      </div>

      {/* progress bar */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${((current + 1) / SLIDES.length) * 100}%` }}
        />
      </div>

      {/* scroller */}
      <div
        ref={containerRef}
        className="h-dvh snap-y snap-mandatory overflow-y-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <section
            key={SLIDES[i]}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="flex h-dvh snap-start items-center justify-center overflow-hidden px-6 py-16 sm:px-10"
          >
            <div className="mx-auto w-full max-w-[1180px]">{slide}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Shared atoms                                                       */
/* ----------------------------------------------------------------- */

function Label({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
      {index} — {children}
    </p>
  );
}

function Card({
  children,
  accent = false,
  className = "",
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 backdrop-blur-xl transition-colors ${
        accent
          ? "border-accent/25 bg-accent/[0.04] hover:border-accent/40"
          : "border-white/10 bg-white/[0.02] hover:border-white/20"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function GlowBlob({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full bg-accent opacity-[0.10] blur-[150px] ${className}`}
    />
  );
}

/* ----------------------------------------------------------------- */
/* Slides                                                             */
/* ----------------------------------------------------------------- */

function TitleSlide({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative text-center">
      <GlowBlob className="left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2" />
      <div className="relative flex flex-col items-center">
        <div className="animate-[fadeIn_0.6s_ease-out] scale-125">
          <AppBrand size="lg" />
        </div>
        <h1 className="mt-8 font-display text-5xl font-bold leading-[1.04] tracking-tight text-fg sm:text-7xl">
          AI agents that <span className="text-accent">remember</span>,
          <br className="hidden sm:block" /> on-chain
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-sans text-base text-fg-muted sm:text-lg">
          Every thought an agent has becomes a{" "}
          <span className="text-fg">verifiable, query-able entity</span> on Arkiv — signed by your
          own wallet, no blockchain knowledge required.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          {["Arkiv × ETHNS", "Theme: AI + Privacy", "ERC-8004", "Braga testnet"].map((p) => (
            <span
              key={p}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 font-mono text-xs text-fg-muted"
            >
              {p}
            </span>
          ))}
        </div>
        <button
          onClick={onStart}
          className="mt-12 inline-flex animate-bounce flex-col items-center gap-1 text-fg-faint transition hover:text-accent"
          aria-label="Start"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest">Pitch</span>
          <ChevronDown size={20} />
        </button>
      </div>
    </div>
  );
}

function ProblemSlide() {
  const pains = [
    { icon: EyeOff, title: "Hidden state", desc: "Agent memory lives in a private DB no one can audit." },
    { icon: Lock, title: "No ownership", desc: "The platform owns your agent's data, not you." },
    { icon: ShieldCheck, title: "Unverifiable", desc: "No way to prove what the agent knew or did, or when." },
  ];
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
      <div>
        <Label index="01">The problem</Label>
        <h2 className="mt-4 font-display text-4xl font-bold leading-[1.1] tracking-tight text-fg sm:text-5xl">
          Most AI agents are <span className="text-fg-faint">black boxes</span>.
        </h2>
        <p className="mt-5 max-w-lg font-sans text-base leading-relaxed text-fg-muted">
          Demos keep the agent's entire mind in a hidden database. You can't see what it remembers,
          you don't own it, and you can never prove the trail was not tampered with.
        </p>
        <div className="mt-8 space-y-4">
          {pains.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3.5">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Icon size={17} className="text-fg-muted" />
              </span>
              <div>
                <p className="font-display text-base font-semibold text-fg">{title}</p>
                <p className="font-sans text-sm text-fg-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Card className="relative overflow-hidden">
        <p className="font-mono text-xs uppercase tracking-widest text-fg-faint">Typical agent</p>
        <div className="mt-5 flex items-center justify-center gap-3 py-6 font-mono text-sm">
          <span className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-fg-muted">
            you
          </span>
          <ArrowRight size={16} className="text-fg-faint" />
          <span className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-fg">
            agent
          </span>
          <ArrowRight size={16} className="text-fg-faint" />
          <span className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <Lock size={13} /> private DB
            </span>
          </span>
        </div>
        <p className="mt-4 text-center font-sans text-sm italic text-fg-muted">
          Trust us — the memory is in there somewhere.
        </p>
      </Card>
    </div>
  );
}

function SolutionSlide() {
  const stats = [
    { icon: GitBranch, n: "9", label: "entity types on Arkiv" },
    { icon: ShieldCheck, n: "SHA-256", label: "hash-chained snapshots" },
    { icon: Wallet, n: "100%", label: "user-signed writes" },
  ];
  return (
    <div className="text-center">
      <Label index="02">The solution</Label>
      <h2 className="mx-auto mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.1] tracking-tight text-fg sm:text-5xl">
        Turn the agent's <span className="text-accent">entire cognition</span> into a public data
        layer.
      </h2>
      <p className="mx-auto mt-5 max-w-2xl font-sans text-base leading-relaxed text-fg-muted">
        Ark-Hive writes every chat turn, memory, and state checkpoint to{" "}
        <span className="text-fg">Arkiv</span> as a structured, query-able, tamper-evident entity —
        and lets you watch the agent think in a live 3D graph.
      </p>
      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-accent/20 bg-accent/[0.03] px-6 py-5">
        <p className="font-display text-lg font-medium text-fg sm:text-xl">
          “Most agents hide their mind in a database.{" "}
          <span className="text-accent">We make it a verifiable, on-chain knowledge graph.</span>”
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {stats.map(({ icon: Icon, n, label }) => (
          <Card key={label} accent className="text-left">
            <Icon size={20} className="text-accent" />
            <p className="mt-3 font-display text-4xl font-bold text-fg">{n}</p>
            <p className="mt-1 font-sans text-sm text-fg-muted">{label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PlanesSlide() {
  return (
    <div>
      <div className="text-center">
        <Label index="03">Architecture — two chains</Label>
        <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          Two planes, one agent
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-sans text-base text-fg-muted">
          Identity is anchored on Ethereum. Every thought lives on Arkiv.
        </p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Fingerprint size={18} className="text-fg" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-fg">Registry plane</p>
              <p className="font-mono text-xs text-fg-muted">Ethereum Sepolia · ERC-8004 v1.0</p>
            </div>
          </div>
          <p className="mt-4 font-sans text-sm leading-relaxed text-fg-muted">
            The agent's identity is a real <span className="text-fg">ERC-8004 NFT</span>. Minting
            returns the <span className="font-mono text-accent">agentId</span> that binds every
            entity downstream.
          </p>
          <p className="mt-4 break-all rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[11px] text-fg-faint">
            0x8004A818BFB912233c491871b3d84c89A494BD9e
          </p>
        </Card>
        <Card accent>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.08]">
              <Database size={18} className="text-accent" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-fg">Data plane</p>
              <p className="font-mono text-xs text-accent">Arkiv · Braga · chain 60138453102</p>
            </div>
          </div>
          <p className="mt-4 font-sans text-sm leading-relaxed text-fg-muted">
            All agent state — <span className="text-fg">sessions, messages, snapshots, memory,
            and the RAG knowledge graph</span> — lives here as typed, query-able Arkiv entities.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["sessions", "messages", "snapshots", "memory", "summaries", "topics"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-accent/20 bg-accent/[0.05] px-2.5 py-1 font-mono text-[11px] text-accent"
              >
                {t}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ArkivSlide() {
  const entities = [
    { name: "agentCard", purpose: "ERC-8004 identity mirror (IPFS card)", ttl: "365d" },
    { name: "session", purpose: "Conversation root", ttl: "12h" },
    { name: "message", purpose: "One chat turn, ordered by seq", ttl: "12h" },
    { name: "snapshot", purpose: "Hash-chained state checkpoint", ttl: "90d" },
    { name: "memory", purpose: "run → entity → global cascade", ttl: "12h/7d/365d" },
    { name: "summary", purpose: "Per-session summary + embedding", ttl: "365d" },
    { name: "topic", purpose: "Canonical deduped topic node", ttl: "365d" },
    { name: "summaryTopic", purpose: "M:N edge summary ↔ topic", ttl: "365d" },
    { name: "summaryLink", purpose: "kNN cosine edge summary ↔ summary", ttl: "365d" },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label index="04">Arkiv integration — 40% of the score</Label>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl">
            A real schema, not a blob
          </h2>
        </div>
        <p className="max-w-sm font-sans text-sm text-fg-muted">
          9 entity types, typed attributes for range queries, foreign-key relationships, and
          differentiated TTLs that mirror real product logic.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card className="p-0">
          <div className="grid grid-cols-[1.1fr_1.6fr_0.7fr] gap-2 border-b border-white/10 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-fg-faint">
            <span>Entity</span>
            <span>Purpose</span>
            <span className="text-right">TTL</span>
          </div>
          <div className="max-h-[46vh] divide-y divide-white/[0.06] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {entities.map((e) => (
              <div
                key={e.name}
                className="grid grid-cols-[1.1fr_1.6fr_0.7fr] items-center gap-2 px-5 py-2.5 transition-colors hover:bg-white/[0.02]"
              >
                <span className="font-mono text-xs text-accent">{e.name}</span>
                <span className="font-sans text-xs text-fg-muted">{e.purpose}</span>
                <span className="text-right font-mono text-[11px] text-fg-faint">{e.ttl}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          {[
            {
              icon: Boxes,
              title: "Typed attributes",
              desc: "Numerics (timestamps, seq, cosine ×1000) for range queries; strings for eq/glob.",
            },
            {
              icon: Link2,
              title: "Foreign-key relationships",
              desc: "sessionKey, prevSnapshotKey, and M:N topic edges — maintained on create & delete.",
            },
            {
              icon: KeyRound,
              title: "Ownership & trust",
              desc: "Writes signed by the user's wallet; trusted reads filter by immutable $creator.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} accent>
              <Icon size={18} className="text-accent" />
              <p className="mt-2.5 font-display text-base font-semibold text-fg">{title}</p>
              <p className="mt-1 font-sans text-sm leading-relaxed text-fg-muted">{desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function StandoutSlide() {
  const features = [
    {
      icon: ShieldCheck,
      title: "Tamper-evident snapshots",
      desc: "Every turn appends a snapshot with commitHash = sha256(prevHash + payload) — a verifiable audit trail of the agent's state.",
    },
    {
      icon: Network,
      title: "Knowledge graph, no vector DB",
      desc: "Summaries are embedded, deduped into topics (M:N) and kNN cosine edges — RAG via Arkiv entities + in-process re-rank.",
    },
    {
      icon: Lock,
      title: "Encrypted, auto-revoking shares",
      desc: "Envelope-encrypted summaries with wrapped-key AccessGrants that expire — layered access control on top of $owner.",
    },
    {
      icon: Wallet,
      title: "True per-user ownership",
      desc: "The stateful agent logic runs in the browser, signed by your Privy embedded wallet. You own your data on Arkiv.",
    },
  ];
  return (
    <div>
      <div className="text-center">
        <Label index="05">What makes it stand out</Label>
        <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          Advanced Arkiv, used for real
        </h2>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {features.map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="flex gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.06]">
              <Icon size={20} className="text-accent" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-fg">{title}</p>
              <p className="mt-1.5 font-sans text-sm leading-relaxed text-fg-muted">{desc}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ArchitectureSlide() {
  return (
    <div>
      <div className="text-center">
        <Label index="06">How it runs</Label>
        <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          State runs in your browser
        </h2>
        <p className="mx-auto mt-4 max-w-2xl font-sans text-base text-fg-muted">
          The stateful logic is client-side and wallet-signed. The server is stateless — it only
          holds the OpenAI / Pinata keys.
        </p>
      </div>

      <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-[1.3fr_auto_1fr]">
        <Card accent>
          <div className="flex items-center gap-2.5">
            <Cpu size={18} className="text-accent" />
            <p className="font-display text-base font-semibold text-fg">Browser (Next.js)</p>
          </div>
          <ul className="mt-4 space-y-2 font-sans text-sm text-fg-muted">
            {[
              "lib/agent/* — createAgent, chatTurn orchestration",
              "lib/arkiv-client/* — user-signed Arkiv data layer",
              "Privy embedded wallet signs every write + the mint",
              "Live 3D visualizer of Arkiv entities",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check size={15} className="mt-0.5 shrink-0 text-accent" />
                {t}
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col items-center justify-center gap-2 px-2 text-fg-faint">
          <Layers size={18} className="text-accent" />
          <div className="hidden h-full w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent lg:block" />
          <span className="font-mono text-[10px] uppercase tracking-widest">signs</span>
        </div>

        <div className="grid gap-4">
          <Card>
            <p className="font-mono text-xs text-fg-faint">Ethereum Sepolia</p>
            <p className="mt-1 font-display text-base font-semibold text-fg">ERC-8004 Registry</p>
            <p className="mt-1 font-sans text-xs text-fg-muted">Mint identity → agentId</p>
          </Card>
          <Card accent>
            <p className="font-mono text-xs text-accent">Arkiv · Braga</p>
            <p className="mt-1 font-display text-base font-semibold text-fg">Entity store</p>
            <p className="mt-1 font-sans text-xs text-fg-muted">All sessions, memory, RAG graph</p>
          </Card>
          <Card>
            <p className="font-mono text-xs text-fg-faint">agent/ (Hono)</p>
            <p className="mt-1 font-display text-base font-semibold text-fg">Stateless /ai/*</p>
            <p className="mt-1 font-sans text-xs text-fg-muted">reply · summarize · embed · pin</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DemoSlide() {
  const steps = [
    { n: "01", icon: Wallet, title: "Connect", desc: "Sign in with Privy. An embedded wallet is created — no seed phrase." },
    { n: "02", icon: Fingerprint, title: "Mint agent", desc: "Register an ERC-8004 identity on Sepolia, card pinned to IPFS." },
    { n: "03", icon: MessageSquare, title: "Chat", desc: "Each turn writes message + hash-chained snapshot + memory to Arkiv." },
    { n: "04", icon: Network, title: "Visualize", desc: "Watch entities appear in the live 3D knowledge graph." },
  ];
  return (
    <div>
      <div className="text-center">
        <Label index="07">See it work</Label>
        <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          Wallet to thinking agent in 4 steps
        </h2>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ n, icon: Icon, title, desc }) => (
          <Card key={n} className="relative">
            <span className="font-mono text-sm text-accent">{n}</span>
            <Icon size={22} className="mt-4 text-fg" />
            <p className="mt-3 font-display text-base font-semibold text-fg">{title}</p>
            <p className="mt-1.5 font-sans text-sm leading-relaxed text-fg-muted">{desc}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-accent/20 bg-accent/[0.03] px-6 py-5 sm:flex-row">
        <div className="flex items-center gap-2.5 font-mono text-xs text-fg-muted">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          Live on Braga testnet · chain 60138453102
        </div>
        <Link href="/agents" className="btn-primary px-5 py-2.5 text-sm">
          Try it live <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

function MemorySlide() {
  const tiers = [
    { name: "run", scope: "Scratchpad — this conversation", ttl: "12h" },
    { name: "entity", scope: "Per-agent knowledge", ttl: "7d" },
    { name: "global", scope: "Durable, cross-session recall", ttl: "365d" },
  ];
  const flow = ["query", "topic filter", "cosine re-rank", "top-K"];
  return (
    <div>
      <div className="text-center">
        <Label index="08">How it remembers</Label>
        <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          Memory that cascades and recalls
        </h2>
        <p className="mx-auto mt-4 max-w-2xl font-sans text-base text-fg-muted">
          Three tiers of memory with real TTLs, plus retrieval over a self-organizing knowledge
          graph — <span className="text-fg">no vector database</span>.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {/* 3-tier cascade */}
        <Card>
          <div className="flex items-center gap-2.5">
            <Layers size={18} className="text-accent" />
            <p className="font-display text-base font-semibold text-fg">3-tier memory cascade</p>
          </div>
          <div className="mt-5 space-y-2">
            {tiers.map((t, i) => (
              <div key={t.name}>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-sm text-accent">{t.name}</span>
                    <span className="font-sans text-sm text-fg-muted">{t.scope}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-fg-faint">
                    <Clock size={12} /> {t.ttl}
                  </span>
                </div>
                {i < tiers.length - 1 && (
                  <div className="flex justify-center py-0.5 text-fg-faint">
                    <ChevronDown size={14} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 font-sans text-sm text-fg-muted">
            Reads cascade <span className="font-mono text-xs text-accent">run → entity → global</span>{" "}
            — first hit wins, so recent context beats long-term memory.
          </p>
        </Card>

        {/* RAG without a vector DB */}
        <Card accent>
          <div className="flex items-center gap-2.5">
            <Network size={18} className="text-accent" />
            <p className="font-display text-base font-semibold text-fg">RAG without a vector DB</p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            {flow.map((step, i) => (
              <div key={step} className="flex items-center gap-1.5">
                <span className="rounded-lg border border-accent/20 bg-accent/[0.05] px-2.5 py-1.5 font-mono text-xs text-accent">
                  {step}
                </span>
                {i < flow.length - 1 && <ArrowRight size={13} className="text-fg-faint" />}
              </div>
            ))}
          </div>
          <ul className="mt-5 space-y-2.5 font-sans text-sm text-fg-muted">
            {[
              "Closed sessions summarized + embedded (text-embedding-3-small)",
              "Topics (M:N) + kNN similarity edges live as Arkiv entities",
              "In-process cosine re-rank; scores stored ×1000 per-mille",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check size={15} className="mt-0.5 shrink-0 text-accent" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 font-sans text-sm text-fg-muted">
            Re-indexed every <span className="font-mono text-xs text-accent">10 turns</span> so recall
            sharpens as the agent talks.
          </p>
        </Card>
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-center font-mono text-xs text-fg-faint">
        <Brain size={13} className="text-accent" /> Watch the graph grow live in the 3D visualizer.
      </p>
    </div>
  );
}

function CloseSlide() {
  return (
    <div className="relative text-center">
      <GlowBlob className="left-1/2 top-1/3 h-[34rem] w-[34rem] -translate-x-1/2" />
      <div className="relative">
        <div className="flex justify-center scale-110">
          <AppBrand size="lg" />
        </div>
        <h2 className="mx-auto mt-7 max-w-3xl font-display text-4xl font-bold leading-[1.1] tracking-tight text-fg sm:text-6xl">
          See an agent <span className="text-accent">think</span> on-chain.
        </h2>
        <p className="mx-auto mt-5 max-w-xl font-sans text-base text-fg-muted">
          Connect a wallet, mint an agent, and watch its memory persist to Arkiv — verifiable,
          query-able, and yours.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/agents" className="btn-primary px-6 py-3 text-sm">
            Launch the app <ArrowRight size={16} />
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-ghost px-6 py-3 text-sm">
            <GitBranch size={16} /> View the code
          </a>
        </div>
        <div className="mx-auto mt-12 grid max-w-2xl gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left">
            <p className="font-mono text-[11px] uppercase tracking-widest text-fg-faint">
              ERC-8004 registry
            </p>
            <p className="mt-1 break-all font-mono text-xs text-fg-muted">
              0x8004A818BFB912233c491871b3d84c89A494BD9e
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left">
            <p className="font-mono text-[11px] uppercase tracking-widest text-fg-faint">
              Repository
            </p>
            <p className="mt-1 font-mono text-xs text-fg-muted">Philotheephilix/ark-hive</p>
          </div>
        </div>
        <div className="mt-8 flex items-center justify-center gap-2.5 font-mono text-xs text-fg-faint">
          <Sparkles size={13} className="text-accent" /> Arkiv × ETHNS Builder Challenge
        </div>
      </div>
    </div>
  );
}
