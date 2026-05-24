// components/knowledge/KnowledgePanel.tsx
"use client";
import { Search } from "lucide-react";
import { useState } from "react";
import type { UiSummary } from "@/lib/agentClient";

export function KnowledgePanel({ summaries, loading, topicResults, searching, onTopicSearch }: {
  summaries: UiSummary[];
  loading: boolean;
  topicResults: string[] | null;
  searching: boolean;
  onTopicSearch: (topic: string) => void;
}) {
  const [topic, setTopic] = useState("");
  return (
    <div className="p-6">
      <h1 className="mb-1 font-sans text-xl font-semibold">Knowledge</h1>
      <p className="mb-4 font-sans text-xs text-slate-400">Past session summaries and topic graph built by RAG when sessions close.</p>

      <form onSubmit={(e) => { e.preventDefault(); onTopicSearch(topic); }} className="mb-5 flex gap-2">
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Fetch summaries by topic…"
          className="flex-1 rounded border border-[#475569] bg-[#0F172A] px-3 py-2 font-sans text-sm text-[#F8FAFC]" />
        <button type="submit" disabled={searching || !topic} aria-label="Topic search"
          className="flex items-center gap-1 rounded bg-[#22C55E] px-3 py-2 font-sans text-sm font-medium text-[#0F172A] disabled:opacity-40">
          <Search size={16} /> Topic Fetch
        </button>
      </form>

      {topicResults !== null && (
        <section className="mb-6">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-slate-400">Topic results ({topicResults.length})</h2>
          {topicResults.length === 0 && <p className="font-sans text-sm text-slate-400">No summaries matched that topic.</p>}
          <ul className="space-y-2">
            {topicResults.map((s, i) => (
              <li key={i} className="rounded border border-[#22C55E]/40 bg-[#1E293B] p-3 font-sans text-sm text-slate-200">{s}</li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-slate-400">Session summaries</h2>
      {loading && <p className="font-mono text-sm text-slate-400">Loading…</p>}
      {!loading && summaries.length === 0 && (
        <div className="rounded-lg border border-dashed border-[#475569] p-8 text-center font-sans text-slate-400">
          No summaries yet. End a session to index its summary and topics.
        </div>
      )}
      <ul className="space-y-3">
        {summaries.map((s) => (
          <li key={s.key} className="rounded-lg border border-[#475569] bg-[#1E293B] p-4">
            <div className="mb-1 font-mono text-[11px] text-slate-500">session {s.sessionKey.slice(0, 12)}…</div>
            <div className="font-sans text-sm text-slate-200">{s.summary}</div>
            {s.topics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {s.topics.map((t) => (
                  <span key={t} className="rounded-full border border-[#475569] bg-[#0F172A] px-2.5 py-1 font-mono text-xs text-[#22C55E]">{t}</span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
