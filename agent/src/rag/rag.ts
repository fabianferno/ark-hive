// agent/src/rag/rag.ts
import { query, Repo, findTopic, summariesForCaller, summaryKeysForTopic } from "../repo";
import { PROJECT_ATTRIBUTE } from "../arkiv";
import { loadConfig } from "../config";
import { embed, topK, cosine } from "./embed";
import { normalizeTopic } from "./topics";
import { summarizeSession, type SessionDigest } from "./summarize";
import type { ChatTurn } from "../brain";

interface SummaryRow { key: string; summary: string; embedding: number[]; sessionKey: string; }

function toSummaryRow(r: { key: string; payload: unknown; attrs: Record<string, string | number> }): SummaryRow {
  const p = r.payload as { summary?: string; embedding?: number[] } | null;
  return { key: r.key, summary: p?.summary ?? "", embedding: Array.isArray(p?.embedding) ? p!.embedding! : [], sessionKey: String(r.attrs.sessionKey ?? "") };
}

async function loadSessionTurns(sessionKey: string): Promise<ChatTurn[]> {
  const rows = await query([
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "message" },
    { key: "sessionKey", op: "eq", value: sessionKey },
  ], 500);
  return rows.sort((a, b) => Number(a.attrs.seq) - Number(b.attrs.seq))
    .map((r) => { const p = r.payload as { role: "user" | "assistant"; content: string }; return { role: p.role, content: p.content }; });
}

/** Summarize a session, embed it, persist summary + topic edges + kNN similarity edges. */
export async function indexSession(opts: { agentId: string; callerId: string; sessionKey: string; summarySeq: number }): Promise<{ summaryKey: string; digest: SessionDigest }> {
  const turns = await loadSessionTurns(opts.sessionKey);
  const digest = await summarizeSession(turns);
  const embedding = await embed(digest.summary);

  const ref = await Repo.createSummary({ ...opts, summary: digest.summary, topics: digest.topics, embedding });
  const summaryKey = ref.entityKey;

  // Graph edges are written FIRE-AND-FORGET (not awaited): each is a serialized Braga tx,
  // and ~10 of them would push /close past the proxy timeout. The summary is the critical
  // write (awaited above); topics/links populate in the background, best-effort.
  void writeGraphEdges(opts, summaryKey, embedding, digest.topics);

  return { summaryKey, digest };
}

async function writeGraphEdges(
  opts: { agentId: string; callerId: string; sessionKey: string },
  summaryKey: string, embedding: number[], topics: string[],
) {
  for (const t of topics) {
    const topicKey = normalizeTopic(t);
    if (!topicKey) continue;
    try {
      const existing = await findTopic(opts.agentId, opts.callerId, topicKey);
      if (!existing) await Repo.createTopic({ agentId: opts.agentId, callerId: opts.callerId, topicKey, name: t });
      await Repo.createSummaryTopic({ agentId: opts.agentId, callerId: opts.callerId, summaryKey, topicKey, sessionKey: opts.sessionKey });
    } catch (e) { console.warn("topic edge write skipped:", topicKey, (e as Error).message); }
  }
  try {
    const priors = (await summariesForCaller(opts.agentId, opts.callerId, 100)).map(toSummaryRow).filter((s) => s.key !== summaryKey && s.embedding.length);
    const neighbors = topK(embedding, priors.map((s) => ({ vec: s.embedding, item: s })), 5);
    for (const n of neighbors) {
      const score = Math.round(1000 * cosine(embedding, n.embedding)); // per-mille int (Arkiv numeric attrs must be integers)
      try { await Repo.createSummaryLink({ agentId: opts.agentId, callerId: opts.callerId, srcSummaryKey: summaryKey, dstSummaryKey: n.key, score }); }
      catch (e) { console.warn("summary link write skipped:", (e as Error).message); }
    }
  } catch (e) { console.warn("kNN linking skipped:", (e as Error).message); }
}

/** Retrieve top-k past-session summaries for a query: strict topic-gating when topics match, else recency fallback, then cosine re-rank. */
export async function retrieve(queryText: string, opts: { agentId: string; callerId: string; k?: number }): Promise<string[]> {
  const k = opts.k ?? loadConfig().ragTopK;
  const qVec = await embed(queryText);
  const tokens = queryText.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const candidateKeys = new Set<string>();
  for (const tok of tokens) {
    const topicKey = normalizeTopic(tok);
    if (!topicKey) continue;
    for (const key of await summaryKeysForTopic(opts.agentId, opts.callerId, topicKey, 50)) candidateKeys.add(key);
  }
  const all = (await summariesForCaller(opts.agentId, opts.callerId, 100)).map(toSummaryRow).filter((s) => s.embedding.length);
  const tagged = candidateKeys.size ? all.filter((s) => candidateKeys.has(s.key)) : [];
  const pool = tagged.length ? tagged : all;   // topic-gated when topics match, else recency fallback
  return topK(qVec, pool.map((s) => ({ vec: s.embedding, item: s })), k).map((s) => s.summary);
}

/** Explicit topic fetch: normalize → Topic → SummaryTopic → summaries. */
export async function topicFetch(topic: string, opts: { agentId: string; callerId: string }): Promise<string[]> {
  const topicKey = normalizeTopic(topic);
  if (!topicKey) return [];
  const keys = new Set(await summaryKeysForTopic(opts.agentId, opts.callerId, topicKey, 100));
  const all = (await summariesForCaller(opts.agentId, opts.callerId, 200)).map(toSummaryRow);
  return all.filter((s) => keys.has(s.key)).map((s) => s.summary);
}
