// components/memory/MemorySearch.tsx
"use client";
import { Search } from "lucide-react";
import { useState } from "react";
import type { UiHit } from "@/lib/agentClient";

export function MemorySearch({ hits, onSearch, searching }: { hits: UiHit[]; onSearch: (term: string) => void; searching: boolean }) {
  const [term, setTerm] = useState("");
  return (
    <div className="p-6">
      <h1 className="mb-1 font-display text-3xl font-bold tracking-tight text-fg">Memory</h1>
      <p className="mb-5 font-sans text-sm text-fg-muted">Semantic search across everything the agent has remembered.</p>
      <form onSubmit={(e) => { e.preventDefault(); onSearch(term); }} className="mb-5 flex gap-2">
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search the agent's memory…"
          className="input flex-1" />
        <button type="submit" disabled={searching} aria-label="Search" className="btn-primary">
          <Search size={16} /> Search
        </button>
      </form>
      <ul className="space-y-2">
        {hits.map((h) => (
          <li key={`${h.memKey}-${h.createdAt}`} className="rounded-xl border border-border bg-surface p-3 backdrop-blur-md">
            <div className="font-mono text-xs text-fg-muted">{h.scope} / {h.memKey}</div>
            <div className="font-sans text-sm text-fg">{h.value}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
