// components/marketplace/MarketplaceCard.tsx
"use client";
import { ExternalLink } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { ipfsHttpUrl } from "@/lib/agentClient";
import type { MarketplaceAgent } from "@/lib/agent/registry";

export function MarketplaceCard({
  agent, mine, adopted, onAdopt, adopting, onOpen,
}: {
  agent: MarketplaceAgent;
  mine: boolean;
  adopted: boolean;
  onAdopt: () => void;
  adopting: boolean;
  onOpen: () => void;
}) {
  return (
    <div onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }} className="cursor-pointer">
    <GlowCard
      variant="accent"
      glow={false}
      className="flex flex-col gap-2 p-4 transition hover:bg-white/[0.02]"
    >
      <div className="flex items-center gap-3">
        {agent.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={agent.image} alt="" className="h-9 w-9 rounded-lg object-cover" />
        ) : (
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.04] font-mono text-xs text-fg-muted">#{agent.agentId}</div>
        )}
        <div className="min-w-0">
          <div className="truncate font-sans text-sm text-fg">{agent.name}</div>
          <div className="font-mono text-[10px] text-fg-faint">
            id {agent.agentId}
            {agent.owner ? <> · owner {agent.owner.slice(0, 6)}…{agent.owner.slice(-4)}</> : null}
          </div>
        </div>
      </div>
      {agent.description && <p className="line-clamp-2 font-sans text-xs text-fg-muted">{agent.description}</p>}
      {agent.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1">{agent.capabilities.slice(0, 4).map((c) => <span key={c} className="chip">{c}</span>)}</div>
      )}
      <div className="mt-auto flex items-center justify-between pt-2">
        {agent.tokenURI ? (
          <a
            href={ipfsHttpUrl(agent.tokenURI)} target="_blank" rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-mono text-[10px] text-accent hover:underline"
          >
            <ExternalLink size={10} /> card
          </a>
        ) : <span />}
        <button
          onClick={(e) => { e.stopPropagation(); onAdopt(); }}
          disabled={mine || adopted || adopting}
          className="btn-primary px-3 py-1 text-xs disabled:opacity-40"
        >
          {mine ? "Yours" : adopted ? "Adopted" : adopting ? "Adopting…" : "Adopt"}
        </button>
      </div>
    </GlowCard>
    </div>
  );
}
