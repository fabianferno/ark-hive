"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { MarketplaceCard } from "@/components/marketplace/MarketplaceCard";
import { AgentDetailsDialog } from "@/components/marketplace/AgentDetailsDialog";
import { useMarketplace } from "@/lib/hooks/useMarketplace";
import { useAgentsList, useAdoptAgent } from "@/lib/hooks/useAgents";
import { useUserWallet } from "@/lib/wallet/useUserWallet";
import type { MarketplaceAgent } from "@/lib/agent/registry";

export default function MarketplacePage() {
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<MarketplaceAgent | null>(null);
  const mkt = useMarketplace();
  const mine = useAgentsList();
  const adopt = useAdoptAgent();
  const { address } = useUserWallet();
  const adoptedIds = useMemo(() => new Set((mine.data ?? []).map((a) => a.agentId)), [mine.data]);
  const isMine = (a: MarketplaceAgent) => !!address && a.owner === address.toLowerCase();

  const agents = useMemo(() => {
    const t = term.trim().toLowerCase();
    const all = mkt.data?.agents ?? [];
    if (!t) return all;
    return all.filter((a) => a.name.toLowerCase().includes(t) || a.agentId.includes(t) || a.owner.includes(t));
  }, [mkt.data, term]);

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="mb-1 font-display text-3xl font-bold tracking-tight text-fg">Marketplace</h1>
        <p className="mb-5 font-sans text-sm text-fg-muted">
          Every ERC-8004 agent on the registry. Adopt one to chat with it under your ENS namespace.
        </p>
        <div className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint" />
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search by name, id, or owner…" className="input w-full pl-9" />
          </div>
        </div>
        {mkt.isLoading && <p className="font-mono text-sm text-fg-muted">Loading registry…</p>}
        {mkt.isError && <p className="font-mono text-sm text-[var(--danger)]">Failed to load: {(mkt.error as Error).message}</p>}
        {adopt.isError && <p className="mb-3 font-mono text-sm text-[var(--danger)]">{(adopt.error as Error).message}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <MarketplaceCard
              key={a.agentId}
              agent={a}
              mine={isMine(a)}
              adopted={adoptedIds.has(a.agentId)}
              adopting={adopt.isPending && adopt.variables?.agentId === a.agentId}
              onAdopt={() => adopt.mutate(a)}
              onOpen={() => setSelected(a)}
            />
          ))}
        </div>
        <AgentDetailsDialog
          agent={selected}
          mine={selected ? isMine(selected) : false}
          adopted={selected ? adoptedIds.has(selected.agentId) : false}
          adopting={adopt.isPending && !!selected && adopt.variables?.agentId === selected.agentId}
          onAdopt={() => { if (selected) adopt.mutate(selected); }}
          onClose={() => setSelected(null)}
        />
        {!mkt.isLoading && !mkt.isError && agents.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center font-sans text-fg-muted">
            No agents found.
          </div>
        )}
      </div>
    </AppShell>
  );
}
