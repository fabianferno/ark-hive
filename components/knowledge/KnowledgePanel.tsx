// components/knowledge/KnowledgePanel.tsx
"use client";
import { Search } from "lucide-react";
import { useState } from "react";
import type { UiSummary } from "@/lib/agentClient";
import { GlowCard } from "@/components/ui/GlowCard";

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
      <h1 className="mb-1 font-display text-3xl font-bold tracking-tight text-fg">Knowledge</h1>
      <p className="mb-5 font-sans text-sm text-fg-muted">Past session summaries and topic graph built by RAG when sessions close.</p>

      <form onSubmit={(e) => { e.preventDefault(); onTopicSearch(topic); }} className="mb-6 flex gap-2">
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Fetch summaries by topic…"
          className="input flex-1" />
        <button type="submit" disabled={searching || !topic} aria-label="Topic search" className="btn-primary">
          <Search size={16} /> Topic Fetch
        </button>
      </form>

      {topicResults !== null && (
        <section className="mb-6">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-fg-muted">Topic results ({topicResults.length})</h2>
          {topicResults.length === 0 && <p className="font-sans text-sm text-fg-muted">No summaries matched that topic.</p>}
          <ul className="space-y-2">
            {topicResults.map((s, i) => (
              <li key={i} className="rounded-xl border border-accent/30 bg-accent/[0.06] p-3 font-sans text-sm text-fg">{s}</li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-fg-muted">Session summaries</h2>
      {loading && <p className="font-mono text-sm text-fg-muted">Loading…</p>}
      {!loading && summaries.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center font-sans text-fg-muted">
          No summaries yet. End a session to index its summary and topics.
        </div>
      )}
      <ul className="space-y-3">
        {summaries.map((s) => (
          <GlowCard key={s.key} variant="accent" glow={false} className="p-4">
            <div className="mb-1 font-mono text-[11px] text-fg-faint">session {s.sessionKey.slice(0, 12)}…</div>
            <div className="font-sans text-sm text-fg">{s.summary}</div>
            {s.topics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {s.topics.map((t) => (
                  <span key={t} className="chip">{t}</span>
                ))}
              </div>
            )}
          </GlowCard>
        ))}
      </ul>
    </div>
  );
}
