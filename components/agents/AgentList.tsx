// components/agents/AgentList.tsx
"use client";
import { Plus } from "lucide-react";
import type { UiAgent } from "@/lib/agentClient";

export function AgentList({ agents, onOpen, onNew, loading }: {
  agents: UiAgent[]; onOpen: (agentId: string) => void; onNew: () => void; loading: boolean;
}) {
  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-sans text-xl font-semibold">Agents</h1>
        <button onClick={onNew} className="flex items-center gap-1 rounded bg-[#22C55E] px-3 py-2 font-sans text-sm font-medium text-[#0F172A]">
          <Plus size={16} /> New Agent
        </button>
      </div>
      {loading && <p className="font-mono text-sm text-slate-400">Loading…</p>}
      {!loading && agents.length === 0 && (
        <div className="rounded-lg border border-dashed border-[#475569] p-8 text-center font-sans text-slate-400">
          No agents yet. Create one to register an ERC-8004 identity and start chatting.
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <button key={a.key} onClick={() => onOpen(a.agentId)}
            className="rounded-lg border border-[#475569] bg-[#1E293B] p-4 text-left hover:border-[#22C55E]">
            <div className="flex items-center justify-between">
              <span className="font-sans font-medium">{a.name || "Unnamed"}</span>
              <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
            </div>
            <div className="mt-1 font-mono text-xs text-slate-400">agentId {a.agentId}</div>
            <div className="mt-2 line-clamp-2 font-sans text-sm text-slate-300">{a.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
