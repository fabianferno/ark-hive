"use client";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { GlowCard } from "@/components/ui/GlowCard";
import { Package, Copy, Check, ExternalLink } from "lucide-react";

const PKG = "arkiv-agent-sdk";
const NPM_URL = `https://www.npmjs.com/package/${PKG}`;
const GH_URL = "https://github.com/Philotheephilix/ark-hive/tree/main/packages/arkiv-agent-sdk";

const INSTALL = `npm install ${PKG} @arkiv-network/sdk`;

const INIT_NODE = `import { createAgentClient, type ClientCtx } from "${PKG}";
import { createPublicClient, createWalletClient, http } from "@arkiv-network/sdk";
import { privateKeyToAccount } from "viem/accounts";

const BRAGA = {
  id: 60138453102,
  name: "Arkiv Braga",
  nativeCurrency: { name: "GLM", symbol: "GLM", decimals: 18 },
  rpcUrls: { default: { http: ["https://braga.hoodi.arkiv.network/rpc"] } },
} as const;

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as \`0x\${string}\`);

const ctx: ClientCtx = {
  publicClient: createPublicClient({ chain: BRAGA, transport: http() }),
  wallet: createWalletClient({ chain: BRAGA, transport: http(), account }),
  address: account.address,
};

const agent = createAgentClient({
  ctx,
  project: { key: "project", value: "my-app" },
});`;

const INIT_BROWSER = `// Browser (Privy / wagmi / RainbowKit): pass any signer the Arkiv SDK accepts.
import { createAgentClient } from "${PKG}";
import { useUserWallet } from "@/lib/wallet/useUserWallet";

function useAgent() {
  const { publicClient, walletClient, address } = useUserWallet();
  if (!walletClient || !address) return null;
  return createAgentClient({
    ctx: { publicClient, wallet: walletClient, address },
    project: { key: "project", value: process.env.NEXT_PUBLIC_PROJECT_VALUE! },
  });
}`;

const WRITE_MEM = `// Persist a piece of memory — signed by the user's wallet, scoped to the agent.
await agent.putMemory({
  agentId: "42",
  scope: "global",            // "run" | "entity" | "global"
  scopeKey: "preferences",
  memKey: "favorite_color",
  value: "ultraviolet",
  expiresInSec: 60 * 60 * 24, // optional; overrides the scope's default TTL
});`;

const READ_MEM = `// Read your agent's memory back.
const mems = await agent.listMemory({
  agentId: "42",
  scope: "global",
  limit: 20,
});

for (const m of mems) {
  console.log(m.attrs.memKey, "→", (m.payload as any).value);
}`;

const READ_OTHER = `// Read ANOTHER agent's public state — memory you don't own, but can verify.
const card = await agent.getAgentCard("42");
console.log("agent owner:", card?.creator);

const sessions = await agent.queryGlobal([
  { key: "project", op: "eq", value: "my-app" },
  { key: "entityType", op: "eq", value: "session" },
  { key: "agentId", op: "eq", value: "42" },
]);`;

const SESSION_FLOW = `import { snapshotHash } from "${PKG}";

// 1. Open a session.
const { entityKey: sessionKey } = await agent.openSession({
  agentId: "42",
  callerId: agent.ctx.address,
});

// 2. Append messages.
await agent.appendMessage({
  sessionKey, agentId: "42", role: "user", seq: 1, content: "hello",
});

// 3. Commit a hash-chained snapshot of agent state.
const prev = "0x" + "00".repeat(32);
const state = { turn: 1, lastUser: "hello" };
const commitHash = await snapshotHash(prev, state);

await agent.commitSnapshot({
  sessionKey, agentId: "42",
  commitSeq: 1, commitHash, prevSnapshotKey: prev,
  state,
});

// 4. Bump session activity.
await agent.bumpSession({
  sessionKey, agentId: "42", callerId: agent.ctx.address,
  startedAt: Date.now() - 1000, turnCount: 1,
});`;

function CodeBlock({ code, lang = "ts" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="group relative">
      <button
        onClick={copy}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 font-mono text-[10px] text-fg-muted opacity-0 transition-opacity hover:text-fg group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto rounded-xl border border-border bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-fg">
        <code data-lang={lang}>{code}</code>
      </pre>
    </div>
  );
}

function SectionHeading({ kicker, title, children }: { kicker?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {kicker ? <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent/70">{kicker}</div> : null}
      <h2 className="font-display text-xl text-fg">{title}</h2>
      {children ? <p className="max-w-2xl font-sans text-sm text-fg-muted">{children}</p> : null}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl space-y-10 px-6 py-8">
        {/* Hero */}
        <GlowCard variant="accent" className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
              <Package size={22} />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent/70">SDK</div>
                <h1 className="font-display text-2xl text-fg">arkiv-agent-sdk</h1>
              </div>
              <p className="font-sans text-sm text-fg-muted">
                The same data layer ark-hive uses, packaged for your own apps. Read and write ERC-8004 agent
                memory, sessions, messages and hash-chained snapshots on Arkiv from any TypeScript runtime
                — Node, Edge, browser, all the same code.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a href={NPM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs text-fg hover:border-accent/40 hover:text-accent">
                  npm <ExternalLink size={12} />
                </a>
                <a href={GH_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs text-fg hover:border-accent/40 hover:text-accent">
                  Source <ExternalLink size={12} />
                </a>
                <code className="rounded-md border border-border bg-black/40 px-2 py-1 font-mono text-[11px] text-fg-muted">{PKG}</code>
              </div>
            </div>
          </div>
        </GlowCard>

        {/* Install */}
        <div className="space-y-3">
          <SectionHeading kicker="1 · Install" title="Add the package">
            One peer dep on <code className="font-mono text-fg">@arkiv-network/sdk</code> — everything else (project namespacing,
            TTLs, nonce serialization) is handled.
          </SectionHeading>
          <CodeBlock code={INSTALL} lang="bash" />
        </div>

        {/* Init */}
        <div className="space-y-4">
          <SectionHeading kicker="2 · Initialise" title="Create an agent client">
            Pass an Arkiv <code className="font-mono text-fg">publicClient</code> + <code className="font-mono text-fg">wallet</code> and the project namespace.
            Same shape on Node and in the browser.
          </SectionHeading>
          <div className="grid gap-3">
            <div>
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">Node</div>
              <CodeBlock code={INIT_NODE} />
            </div>
            <div>
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">Browser (Privy / wagmi)</div>
              <CodeBlock code={INIT_BROWSER} />
            </div>
          </div>
        </div>

        {/* Write */}
        <div className="space-y-3">
          <SectionHeading kicker="3 · Write" title="Persist agent memory">
            Memory is scoped — <code className="font-mono text-fg">run</code> (12h),
            <code className="font-mono text-fg"> entity</code> (7d), <code className="font-mono text-fg">global</code> (365d).
            Every write is signed by your wallet and stamped with the project attribute.
          </SectionHeading>
          <CodeBlock code={WRITE_MEM} />
        </div>

        {/* Read own */}
        <div className="space-y-3">
          <SectionHeading kicker="4 · Read" title="Query your agent's memory">
            <code className="font-mono text-fg">listMemory</code> is scoped to your wallet
            (<code className="font-mono text-fg">createdBy(ctx.address)</code>).
          </SectionHeading>
          <CodeBlock code={READ_MEM} />
        </div>

        {/* Portability */}
        <div className="space-y-3">
          <SectionHeading kicker="5 · Portability" title="Read another agent's public state">
            Drop the <code className="font-mono text-fg">createdBy</code> filter and you can read any agent on the same
            project namespace — the whole point of putting memory on Arkiv.
          </SectionHeading>
          <CodeBlock code={READ_OTHER} />
        </div>

        {/* Sessions / snapshots */}
        <div className="space-y-3">
          <SectionHeading kicker="6 · Sessions" title="Full chat-turn lifecycle">
            Open a session, append messages, commit a hash-chained snapshot of state, bump activity.
            <code className="font-mono text-fg"> snapshotHash(prev, payload)</code> uses Web Crypto so it runs in any runtime.
          </SectionHeading>
          <CodeBlock code={SESSION_FLOW} />
        </div>

        {/* Footer */}
        <div className="rounded-2xl border border-border bg-surface/60 p-5 text-sm text-fg-muted">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">Need more?</div>
          For encrypted summaries, ENS-bound agent cards, access grants and topic edges, the SDK exposes the
          underlying <code className="font-mono text-fg">repo</code> object — see the
          {" "}
          <a className="text-accent hover:underline" href={GH_URL} target="_blank" rel="noreferrer">README on GitHub</a>.
        </div>
      </div>
    </AppShell>
  );
}
