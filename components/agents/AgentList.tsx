// components/agents/AgentList.tsx
"use client";
import { Plus, ExternalLink, Bot } from "lucide-react";
import { chainLabel, ipfsHttpUrl, type UiAgent } from "@/lib/agentClient";
import { GlowCard } from "@/components/ui/GlowCard";
import { IconChip } from "@/components/ui/IconChip";
import { EnsBadge } from "@/components/ens/EnsBadge";

export function AgentList({ agents, onOpen, onNew, loading }: {
  agents: UiAgent[]; onOpen: (agentId: string) => void; onNew: () => void; loading: boolean;
}) {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-fg">Agents</h1>
          <p className="mt-1 font-sans text-sm text-fg-muted">
            ERC-8004 identities you own — chat, snapshot, and grow their memory on Arkiv.
          </p>
        </div>
        <button onClick={onNew} className="btn-primary">
          <Plus size={16} /> New Agent
        </button>
      </div>
      {loading && <p className="font-mono text-sm text-fg-muted">Loading…</p>}
      {!loading && agents.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center font-sans text-fg-muted">
          No agents yet. Create one to register an ERC-8004 identity and start chatting.
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <GlowCard key={a.key} variant="accent" interactive className="p-5">
            <button onClick={() => onOpen(a.agentId)} className="w-full text-left">
              <div className="mb-3 flex items-start justify-between">
                <IconChip icon={Bot} />
                <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-accent">
                  <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgb(var(--accent-rgb)/0.8)]" /> {a.status || "active"}
                </span>
              </div>
              <span className="font-display text-lg font-semibold text-fg">{a.name || "Unnamed"}</span>
              <div className="mt-1 font-mono text-xs text-fg-muted">8004 agentId {a.agentId}</div>
              {a.ensName && <div className="mt-1"><EnsBadge name={a.ensName} /></div>}
              <div className="mt-1 font-mono text-[11px] text-fg-faint">{chainLabel(a.registryChainId)}</div>
              <div className="mt-2 line-clamp-2 font-sans text-sm text-fg-muted">{a.description}</div>
            </button>
            {a.agentCardUri && (
              <a href={ipfsHttpUrl(a.agentCardUri)} target="_blank" rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="relative mt-4 inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline">
                <ExternalLink size={12} /> agent card (IPFS)
              </a>
            )}
          </GlowCard>
        ))}
      </div>
    </div>
  );
}
