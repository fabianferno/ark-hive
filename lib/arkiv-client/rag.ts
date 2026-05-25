// lib/arkiv-client/rag.ts
// Client-side RAG, ported from agent/src/rag/rag.ts. Summarize + embed run on the
// stateless AI server (aiSummarize/aiEmbed); all Arkiv writes are signed by the
// user's Privy wallet via the ctx repo. Edge writes stay FIRE-AND-FORGET.
import { makeRepo, query as repoQuery, findTopic, summariesForCaller } from "./repo";
import { PROJECT_ATTRIBUTE } from "./project";
import { topK, cosine } from "./vector";
import { normalizeTopic } from "./topics";
import { aiSummarize, aiEmbed } from "./ai";
import type { ClientCtx } from "./ctx";

export interface SessionDigest { summary: string; topics: string[]; }
export interface ChatTurn { role: "user" | "assistant"; content: string; }

// Default top-k for retrieval (mirrors the server's RAG_TOP_K default of 4).
const DEFAULT_RAG_TOP_K = 4;

interface SummaryRow { key: string; summary: string; embedding: number[]; sessionKey: string; topics: string[]; encrypted: boolean; }

function toSummaryRow(r: { key: string; payload: unknown; attrs: Record<string, string | number> }): SummaryRow {
  const encrypted = String(r.attrs.enc ?? "") === "v1";
  const p = r.payload as { summary?: string; embedding?: number[]; topics?: string[] } | null;
  return {
    key: r.key,
    summary: encrypted ? "" : (p?.summary ?? ""),
    embedding: !encrypted && Array.isArray(p?.embedding) ? p!.embedding! : [],
    sessionKey: String(r.attrs.sessionKey ?? ""),
    topics: !encrypted && Array.isArray(p?.topics) ? p!.topics! : [],
    encrypted,
  };
}

/** Test-only export. */
export const __toSummaryRowForTest = toSummaryRow;

// A summary matches a normalized query topic if any of its own topics overlaps it.
function topicMatches(rowTopics: string[], queryKey: string): boolean {
  return rowTopics.some((t) => {
    const nk = normalizeTopic(t);
    return nk === queryKey || nk.includes(queryKey) || queryKey.includes(nk);
  });
}

async function loadSessionTurns(ctx: ClientCtx, sessionKey: string): Promise<ChatTurn[]> {
  const rows = await repoQuery(ctx, [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "message" },
    { key: "sessionKey", op: "eq", value: sessionKey },
  ], 500);
  return rows.sort((a, b) => Number(a.attrs.seq) - Number(b.attrs.seq))
    .map((r) => { const p = r.payload as { role: "user" | "assistant"; content: string }; return { role: p.role, content: p.content }; });
}

/** Summarize a session, embed it, persist summary + topic edges + kNN similarity edges. */
export async function indexSession(ctx: ClientCtx, opts: { agentId: string; callerId: string; sessionKey: string; summarySeq: number }): Promise<{ summaryKey: string; digest: SessionDigest }> {
  const repo = makeRepo(ctx);
  const turns = await loadSessionTurns(ctx, opts.sessionKey);
  const digest = await aiSummarize(turns);
  const embedding = await aiEmbed(digest.summary);

  const ref = await repo.createSummary({ ...opts, summary: digest.summary, topics: digest.topics, embedding });
  const summaryKey = ref.entityKey;

  // Graph edges are written FIRE-AND-FORGET (not awaited): each is a serialized Braga tx,
  // and ~10 of them would push /close past the proxy timeout. The summary is the critical
  // write (awaited above); topics/links populate in the background, best-effort.
  void writeGraphEdges(ctx, opts, summaryKey, embedding, digest.topics);

  return { summaryKey, digest };
}

async function writeGraphEdges(
  ctx: ClientCtx,
  opts: { agentId: string; callerId: string; sessionKey: string },
  summaryKey: string, embedding: number[], topics: string[],
) {
  const repo = makeRepo(ctx);
  for (const t of topics) {
    const topicKey = normalizeTopic(t);
    if (!topicKey) continue;
    try {
      const existing = await findTopic(ctx, opts.agentId, opts.callerId, topicKey);
      if (!existing) await repo.createTopic({ agentId: opts.agentId, callerId: opts.callerId, topicKey, name: t });
      await repo.createSummaryTopic({ agentId: opts.agentId, callerId: opts.callerId, summaryKey, topicKey, sessionKey: opts.sessionKey });
    } catch (e) { console.warn("topic edge write skipped:", topicKey, (e as Error).message); }
  }
  try {
    const priors = (await summariesForCaller(ctx, opts.agentId, opts.callerId, 100)).map(toSummaryRow).filter((s) => s.key !== summaryKey && s.embedding.length);
    const neighbors = topK(embedding, priors.map((s) => ({ vec: s.embedding, item: s })), 5);
    for (const n of neighbors) {
      const score = Math.round(1000 * cosine(embedding, n.embedding)); // per-mille int (Arkiv numeric attrs must be integers)
      try { await repo.createSummaryLink({ agentId: opts.agentId, callerId: opts.callerId, srcSummaryKey: summaryKey, dstSummaryKey: n.key, score }); }
      catch (e) { console.warn("summary link write skipped:", (e as Error).message); }
    }
  } catch (e) { console.warn("kNN linking skipped:", (e as Error).message); }
}

/** Retrieve top-k past-session summaries for a query: strict topic-gating when topics match, else recency fallback, then cosine re-rank. */
export async function retrieve(ctx: ClientCtx, queryText: string, opts: { agentId: string; callerId: string; k?: number }): Promise<string[]> {
  const k = opts.k ?? DEFAULT_RAG_TOP_K;
  const qVec = await aiEmbed(queryText);
  const qTopics = queryText.toLowerCase().split(/[^a-z0-9]+/).map(normalizeTopic).filter((w) => w.length > 3);
  const all = (await summariesForCaller(ctx, opts.agentId, opts.callerId, 100)).map(toSummaryRow).filter((s) => s.embedding.length);
  // Topic-gate on each summary's own topics (payload) — robust even if edge writes failed.
  const tagged = qTopics.length ? all.filter((s) => qTopics.some((q) => topicMatches(s.topics, q))) : [];
  const pool = tagged.length ? tagged : all;   // topic-gated when topics match, else recency fallback
  return topK(qVec, pool.map((s) => ({ vec: s.embedding, item: s })), k).map((s) => s.summary);
}

/** Topic/knowledge search: (1) match the query against each summary's topics or
 *  text; (2) if nothing matches exactly, fall back to SEMANTIC ranking (embed the
 *  query, cosine vs summary embeddings) so e.g. "name" finds an "introduction"
 *  session. Robust even when SummaryTopic edge writes failed. */
export async function topicFetch(ctx: ClientCtx, topic: string, opts: { agentId: string; callerId: string }): Promise<string[]> {
  const topicKey = normalizeTopic(topic);
  if (!topicKey) return [];
  const all = (await summariesForCaller(ctx, opts.agentId, opts.callerId, 200)).map(toSummaryRow);
  const term = topic.toLowerCase().trim();

  const exact = all.filter((s) => topicMatches(s.topics, topicKey) || s.summary.toLowerCase().includes(term));
  if (exact.length) return exact.map((s) => s.summary);

  // Semantic fallback — rank all embedded summaries by cosine to the query.
  const embedded = all.filter((s) => s.embedding.length);
  if (!embedded.length) return [];
  const qVec = await aiEmbed(topic);
  return topK(qVec, embedded.map((s) => ({ vec: s.embedding, item: s })), 5).map((s) => s.summary);
}
