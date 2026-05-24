// components/memory/MemorySearch.tsx
"use client";
import { Search } from "lucide-react";
import { useState } from "react";
import type { UiHit } from "@/lib/agentClient";

export function MemorySearch({ hits, onSearch, searching }: { hits: UiHit[]; onSearch: (term: string) => void; searching: boolean }) {
  const [term, setTerm] = useState("");
  return (
    <div className="p-6">
      <h1 className="mb-4 font-sans text-xl font-semibold">Memory</h1>
      <form onSubmit={(e) => { e.preventDefault(); onSearch(term); }} className="mb-4 flex gap-2">
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search the agent's memory…"
          className="flex-1 rounded border border-[#475569] bg-[#0F172A] px-3 py-2 font-sans text-sm text-[#F8FAFC]" />
        <button type="submit" disabled={searching} aria-label="Search"
          className="flex items-center gap-1 rounded bg-[#22C55E] px-3 py-2 font-sans text-sm font-medium text-[#0F172A] disabled:opacity-40">
          <Search size={16} /> Search
        </button>
      </form>
      <ul className="space-y-2">
        {hits.map((h) => (
          <li key={`${h.memKey}-${h.createdAt}`} className="rounded border border-[#475569] bg-[#1E293B] p-3">
            <div className="font-mono text-xs text-slate-400">{h.scope} / {h.memKey}</div>
            <div className="font-sans text-sm text-[#F8FAFC]">{h.value}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
