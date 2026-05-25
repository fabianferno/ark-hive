// lib/agent/knowledge.ts
// Client-side knowledge reads (RAG summaries + explicit topic fetch + memory
// search). callerId is the user's own address. Returns the SAME Ui* shapes as
// lib/agentClient.ts.
import { summariesForCaller, query as repoQuery } from "@/lib/arkiv-client/repo";
import { topicFetch as ragTopicFetch } from "@/lib/arkiv-client/rag";
import { buildMemoryConditions } from "@/lib/arkiv-client/search";
import { PROJECT_ATTRIBUTE } from "@/lib/arkiv-client/project";
import type { ClientCtx } from "@/lib/arkiv-client/ctx";
import type { UiSummary, UiHit } from "@/lib/agentClient";

const toSummary = (e: { key: string; payload: unknown; attrs: Record<string, string | number> }): UiSummary => {
  const p = (e.payload ?? {}) as { summary?: string; topics?: string[] };
  return {
    key: e.key,
    sessionKey: String(e.attrs.sessionKey ?? ""),
    summary: p.summary ?? "",
    topics: Array.isArray(p.topics) ? p.topics : [],
    summarySeq: Number(e.attrs.summarySeq ?? 0),
    createdAt: Number(e.attrs.createdAt ?? 0),
  };
};

export async function listSummaries(ctx: ClientCtx, agentId: string): Promise<UiSummary[]> {
  const rows = await summariesForCaller(ctx, agentId, ctx.address, 200);
  return rows.filter((r) => String(r.attrs.enc ?? "") !== "v1").map(toSummary);
}

export async function topicFetch(ctx: ClientCtx, agentId: string, topic: string): Promise<string[]> {
  return ragTopicFetch(ctx, topic, { agentId, callerId: ctx.address });
}

/**
 * Client-side memory search over the agent's Arkiv memory entities, scoped to the
 * user's address (via the repo `query`). Queries `entityType=memory`, then filters
 * client-side by `term` (case-insensitive over value/memKey) and returns UiHits
 * sorted newest-first. Mirrors the removed server `/search` endpoint shape.
 */
export async function searchMemory(ctx: ClientCtx, agentId: string, term: string, limit = 50): Promise<UiHit[]> {
  const rows = await repoQuery(ctx, buildMemoryConditions(PROJECT_ATTRIBUTE, { agentId }), limit * 4);
  const hits: UiHit[] = rows.map((r) => {
    const p = (r.payload ?? {}) as { value?: string };
    return {
      memKey: String(r.attrs.memKey ?? ""),
      value: p.value ?? "",
      scope: String(r.attrs.scope ?? ""),
      createdAt: Number(r.attrs.createdAt ?? 0),
    };
  });
  const t = term.trim().toLowerCase();
  const filtered = t
    ? hits.filter((h) => h.value.toLowerCase().includes(t) || h.memKey.toLowerCase().includes(t))
    : hits;
  return filtered.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}
