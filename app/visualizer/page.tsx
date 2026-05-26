// app/visualizer/page.tsx
// Immersive Topic→Summary graph of the user's RAG memory. Topics are glowing hubs,
// each session summary scatters as a leaf node around its primary topic. Data is the
// user's own Arkiv summaries (read via the Privy wallet). 3D neural view + 2D graph.
// Clicking a node shows its content in the right pane (topic → its summaries; summary → full text).
"use client";
import { useMemo, useRef, useState } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useQuery } from "@tanstack/react-query";
import { useUserWallet } from "@/lib/wallet/useUserWallet";
import { query as repoQuery } from "@/lib/arkiv-client/repo";
import { PROJECT_ATTRIBUTE } from "@/lib/arkiv-client/project";
import { normalizeTopic } from "@/lib/arkiv-client/topics";
import { cosine } from "@/lib/arkiv-client/vector";
import { buildTopicGraph, type VizSummary } from "@/lib/graph/buildTopicGraph";
import { AppShell } from "@/components/app/AppShell";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { NeuralGraph3D, type NeuralGraph3DHandle } from "@/components/graph/NeuralGraph3D";
import { arkivExplorerEntityUrl } from "@/lib/arkiv/explorer";
import { ExternalLink } from "lucide-react";

type Selection =
  | { kind: "topic"; topicKey: string; label: string }
  | { kind: "summary"; summary: VizSummary }
  | null;

const topicKeysOf = (s: VizSummary) => Array.from(new Set(s.topics.map(normalizeTopic).filter(Boolean)));
const fmtDate = (ms: number) => (ms ? new Date(ms).toLocaleString() : "—");

function VisualizerInner() {
  const { arkivWallet, publicArkiv, address } = useUserWallet();
  const ctx = useMemo(
    () => (arkivWallet && address ? { wallet: arkivWallet, publicClient: publicArkiv, address } : null),
    [arkivWallet, publicArkiv, address],
  );

  const summariesQ = useQuery({
    queryKey: ["viz-summaries", address],
    enabled: !!ctx,
    refetchInterval: 20000,
    queryFn: async (): Promise<VizSummary[]> => {
      const rows = await repoQuery(ctx!, [
        { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
        { key: "entityType", op: "eq", value: "summary" },
      ], 300);
      return rows.map((r) => {
        const p = (r.payload ?? {}) as { summary?: string; topics?: string[]; embedding?: number[] };
        return {
          key: r.key,
          summary: p.summary ?? "",
          topics: Array.isArray(p.topics) ? p.topics : [],
          sessionKey: String(r.attrs.sessionKey ?? ""),
          createdAt: Number(r.attrs.createdAt ?? 0),
          embedding: Array.isArray(p.embedding) ? p.embedding : [],
        };
      });
    },
  });

  const summaries = summariesQ.data ?? [];
  const graph = useMemo(() => buildTopicGraph(summaries), [summaries]);
  const [sel, setSel] = useState<Selection>(null);
  const [mode, setMode] = useState<"2d" | "3d">("3d");
  const flow = useReactFlow();
  const graph3d = useRef<NeuralGraph3DHandle>(null);

  const focus = (nodeId: string) => {
    if (mode === "2d") {
      const n = flow.getNode(nodeId);
      if (n) flow.setCenter(n.position.x, n.position.y, { zoom: 1.4, duration: 400 });
    } else {
      graph3d.current?.focus(nodeId);
    }
    if (nodeId.startsWith("topic:")) {
      const node = graph.nodes.find((n) => n.id === nodeId);
      setSel({ kind: "topic", topicKey: nodeId.slice("topic:".length), label: String(node?.data.label ?? "") });
    } else {
      const s = summaries.find((x) => x.key === nodeId);
      if (s) setSel({ kind: "summary", summary: s });
    }
  };

  const loading = summariesQ.isLoading || !ctx;
  const empty = !loading && summaries.length === 0;
  const topicSummaries =
    sel?.kind === "topic" ? summaries.filter((s) => topicKeysOf(s).includes(sel.topicKey)) : [];

  // Neighbours: similar sessions (cosine over embeddings — robust vs. fire-and-forget edges).
  const summaryNeighbours = useMemo(() => {
    if (sel?.kind !== "summary" || !sel.summary.embedding.length) return [];
    const self = sel.summary;
    return summaries
      .filter((x) => x.key !== self.key && x.embedding.length)
      .map((x) => ({ s: x, score: cosine(self.embedding, x.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [sel, summaries]);

  // Neighbours: topics that co-occur with the selected topic across sessions.
  const relatedTopics = useMemo(() => {
    if (sel?.kind !== "topic") return [];
    const key = sel.topicKey;
    const co = new Map<string, { label: string; count: number }>();
    for (const s of summaries) {
      if (!topicKeysOf(s).includes(key)) continue;
      for (const t of s.topics) {
        const tk = normalizeTopic(t);
        if (!tk || tk === key) continue;
        const e = co.get(tk) ?? { label: t, count: 0 };
        e.count++;
        co.set(tk, e);
      }
    }
    return [...co.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 6).map(([tk, v]) => ({ tk, ...v }));
  }, [sel, summaries]);

  return (
    <div className="flex h-full w-full">
      <div className="relative flex-1">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="font-display text-lg text-fg">No topic graph yet</p>
            <p className="max-w-sm font-sans text-sm text-fg-muted">
              Chat with an agent and click <span className="text-accent">End Session</span> — each session is
              summarized into topics that appear here as a living graph.
            </p>
          </div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center font-mono text-sm text-fg-muted">Loading memory graph…</div>
        ) : mode === "2d" ? (
          <GraphCanvas graph={graph} onSelect={focus} />
        ) : (
          <NeuralGraph3D ref={graph3d} graph={graph} onSelect={focus} />
        )}

        {!empty && !loading && (
          <>
            <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 gap-1 rounded-full border border-border bg-surface p-1 backdrop-blur-md">
              {(["3d", "2d"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-full px-4 py-1 text-xs font-medium uppercase tracking-wide transition ${
                    mode === m ? "bg-accent text-accent-ink" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {m === "3d" ? "3D Neural" : "2D Graph"}
                </button>
              ))}
            </div>
            <div className="absolute left-4 top-4 z-20 rounded-lg border border-border bg-surface/80 px-3 py-1.5 font-mono text-[11px] text-fg-muted backdrop-blur-md">
              {graph.nodes.filter((n) => n.type === "AgentCard").length} topics · {summaries.length} summaries
            </div>
          </>
        )}
      </div>

      {/* Right detail pane */}
      <aside className="flex w-80 flex-col overflow-y-auto border-l border-border bg-surface/60 p-4 backdrop-blur-md">
        {!sel && (
          <div className="mt-8 text-center font-sans text-sm text-fg-muted">
            Click a <span className="text-accent">topic</span> or <span className="text-accent">summary</span> node to inspect it.
          </div>
        )}

        {sel?.kind === "topic" && (
          <div className="space-y-3">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-fg-muted">Topic</div>
              <h2 className="font-display text-lg text-fg">{sel.label}</h2>
              <div className="font-mono text-xs text-fg-muted">{topicSummaries.length} session{topicSummaries.length === 1 ? "" : "s"}</div>
            </div>
            <div className="space-y-2">
              {topicSummaries.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSel({ kind: "summary", summary: s })}
                  className="block w-full rounded-lg border border-border bg-surface-2 p-3 text-left transition hover:border-accent/40"
                >
                  <p className="font-sans text-sm text-fg">{s.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.topics.map((t) => (
                      <span key={t} className="rounded-full bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-accent">{t}</span>
                    ))}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-fg-muted">session {s.sessionKey.slice(0, 10)}… · {fmtDate(s.createdAt)}</div>
                </button>
              ))}
            </div>
            {relatedTopics.length > 0 && (
              <div className="border-t border-border pt-3">
                <div className="mb-2 font-mono text-[11px] uppercase tracking-wide text-fg-muted">Neighbours · related topics</div>
                <div className="flex flex-wrap gap-1">
                  {relatedTopics.map((rt) => (
                    <button
                      key={rt.tk}
                      onClick={() => setSel({ kind: "topic", topicKey: rt.tk, label: `# ${rt.label}` })}
                      className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[11px] text-accent hover:bg-accent/20"
                    >
                      {rt.label} <span className="text-fg-muted">{rt.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {sel?.kind === "summary" && (
          <div className="space-y-3">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-fg-muted">Session summary</div>
              <div className="font-mono text-[11px] text-fg-muted">session {sel.summary.sessionKey.slice(0, 14)}… · {fmtDate(sel.summary.createdAt)}</div>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface-2 p-2.5 font-mono text-[11px]">
              <a href={arkivExplorerEntityUrl(sel.summary.key)} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline">
                <ExternalLink size={12} /> summary entity · {sel.summary.key.slice(0, 12)}…
              </a>
              {sel.summary.sessionKey && (
                <a href={arkivExplorerEntityUrl(sel.summary.sessionKey)} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline">
                  <ExternalLink size={12} /> session entity · {sel.summary.sessionKey.slice(0, 12)}…
                </a>
              )}
            </div>
            <p className="font-sans text-sm leading-relaxed text-fg">{sel.summary.summary}</p>
            <div>
              <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-fg-muted">Topics</div>
              <div className="flex flex-wrap gap-1">
                {sel.summary.topics.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSel({ kind: "topic", topicKey: normalizeTopic(t), label: `# ${t}` })}
                    className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[11px] text-accent hover:bg-accent/20"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {summaryNeighbours.length > 0 && (
              <div className="border-t border-border pt-3">
                <div className="mb-2 font-mono text-[11px] uppercase tracking-wide text-fg-muted">Neighbours · similar sessions</div>
                <div className="space-y-2">
                  {summaryNeighbours.map(({ s, score }) => (
                    <button
                      key={s.key}
                      onClick={() => setSel({ kind: "summary", summary: s })}
                      className="block w-full rounded-lg border border-border bg-surface-2 p-2.5 text-left transition hover:border-accent/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 font-sans text-xs text-fg">{s.summary}</p>
                        <span className="shrink-0 font-mono text-[10px] text-accent">{Math.round(score * 100)}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

export default function VisualizerPage() {
  return (
    <AppShell>
      <ReactFlowProvider>
        <VisualizerInner />
      </ReactFlowProvider>
    </AppShell>
  );
}
