// lib/agent/chat.ts
// Client-side chat turn, ported from agent/src/chat.ts to ClientCtx. Every Arkiv
// read is scoped to the user's address and every write is signed by the user's
// Privy wallet. The LLM reply comes from the stateless AI server (aiReply); RAG
// retrieval + cosine ranking happen client-side.
import { makeRepo, query as repoQuery } from "@/lib/arkiv-client/repo";
import { PROJECT_ATTRIBUTE } from "@/lib/arkiv-client/project";
import { buildMemoryConditions } from "@/lib/arkiv-client/search";
import { get as ctxGet, set as ctxSet } from "@/lib/arkiv-client/contextbus";
import { computeCommitHash } from "@/lib/arkiv-client/hashchain";
import { retrieve, indexSession, type ChatTurn } from "@/lib/arkiv-client/rag";
import { aiReply } from "@/lib/arkiv-client/ai";
import type { ClientCtx } from "@/lib/arkiv-client/ctx";
import type { SendResult } from "@/lib/agentClient";

// Rolling RAG cap: index the session every N turns (mirrors server RAG_ROLL_EVERY default).
const RAG_ROLL_EVERY = 10;

interface SessionRow { key: string; agentId: string; callerId: string; startedAt: number; }

async function loadSession(ctx: ClientCtx, sessionKey: string): Promise<SessionRow> {
  const rows = await repoQuery(ctx, [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "session" },
  ], 200);
  const row = rows.find((r) => r.key === sessionKey);
  if (!row) throw new Error(`session not found: ${sessionKey}`);
  return {
    key: row.key,
    agentId: String(row.attrs.agentId),
    callerId: String(row.attrs.callerId),
    startedAt: Number(row.attrs.startedAt ?? Date.now()),
  };
}

async function loadHistory(
  ctx: ClientCtx,
  sessionKey: string,
): Promise<{ turns: ChatTurn[]; lastSeq: number; lastSnapshot: { key: string; hash: string; seq: number } | null }> {
  const rows = await repoQuery(ctx, [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "message" },
    { key: "sessionKey", op: "eq", value: sessionKey },
  ], 200);
  const sorted = rows.sort((a, b) => Number(a.attrs.seq) - Number(b.attrs.seq));
  const turns: ChatTurn[] = sorted.map((r) => {
    const p = r.payload as { role: "user" | "assistant"; content: string };
    return { role: p.role, content: p.content };
  });
  const lastSeq = sorted.length ? Number(sorted[sorted.length - 1].attrs.seq) : -1;

  const snaps = await repoQuery(ctx, [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "snapshot" },
    { key: "sessionKey", op: "eq", value: sessionKey },
  ], 200);
  const snapSorted = snaps.sort((a, b) => Number(a.attrs.commitSeq) - Number(b.attrs.commitSeq));
  const last = snapSorted.length ? snapSorted[snapSorted.length - 1] : null;
  const lastSnapshot = last
    ? { key: last.key, hash: String(last.attrs.commitHash), seq: Number(last.attrs.commitSeq) }
    : null;
  return { turns, lastSeq, lastSnapshot };
}

/** Local knowledge search over the agent's Arkiv memory (searchKnowledge-equivalent). */
async function searchKnowledge(ctx: ClientCtx, agentId: string, term: string, limit = 6): Promise<string[]> {
  const rows = await repoQuery(ctx, buildMemoryConditions(PROJECT_ATTRIBUTE, { agentId }), limit * 4);
  const hits = rows.map((r) => {
    const p = r.payload as { value?: string } | null;
    return {
      memKey: String(r.attrs.memKey ?? ""),
      value: p?.value ?? "",
      scope: String(r.attrs.scope ?? ""),
      createdAt: Number(r.attrs.createdAt ?? 0),
    };
  });
  const t = term.toLowerCase();
  const filtered = term
    ? hits.filter((h) => h.value.toLowerCase().includes(t) || h.memKey.toLowerCase().includes(t))
    : hits;
  return filtered
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
    .map((h) => `[${h.scope}/${h.memKey}] ${h.value}`);
}

export async function chatTurn(ctx: ClientCtx, opts: { sessionKey: string; text: string }): Promise<SendResult> {
  const { sessionKey, text } = opts;
  const repo = makeRepo(ctx);
  const session = await loadSession(ctx, sessionKey);
  const { agentId, callerId } = session;

  const { turns, lastSeq, lastSnapshot } = await loadHistory(ctx, sessionKey);

  // Knowledge = local memory hits + scoped goal + RAG past-session summaries.
  const knowledge = await searchKnowledge(ctx, agentId, text, 6);
  const priorGoal = await ctxGet(repo, "goal", { run: sessionKey, entity: callerId, global: agentId });
  if (priorGoal) knowledge.push(`[goal] ${priorGoal}`);
  const past = await retrieve(ctx, text, { agentId, callerId });
  for (const s of past) knowledge.push(`[past-session] ${s}`);

  const reply = await aiReply({ message: text, history: turns, knowledge });

  const userSeq = lastSeq + 1;
  const assistantSeq = lastSeq + 2;
  const ts = Date.now();
  const user = await repo.createMessage({ sessionKey, agentId, role: "user", seq: userSeq, ts, content: text });
  const assistant = await repo.createMessage({ sessionKey, agentId, role: "assistant", seq: assistantSeq, ts: ts + 1, content: reply });

  const commitSeq = (lastSnapshot?.seq ?? 0) + 1;
  const statePayload = JSON.stringify({ sessionKey, lastSeq: assistantSeq, reply });
  const commitHash = await computeCommitHash(lastSnapshot?.hash ?? null, statePayload);
  const snap = await repo.createSnapshot({
    sessionKey, agentId, commitSeq, commitHash, prevSnapshotKey: lastSnapshot?.key ?? "", state: { lastSeq: assistantSeq, reply },
  });

  await ctxSet(repo, { agentId, scope: "run", scopeKey: sessionKey, memKey: "lastReply", value: reply, version: commitSeq });
  await repo.updateSessionActivity({ sessionKey, agentId, callerId, startedAt: session.startedAt, turnCount: assistantSeq + 1 });

  // Rolling RAG cap: every N turns, re-index the session (fire-and-forget).
  const totalTurns = assistantSeq + 1;
  if (RAG_ROLL_EVERY > 0 && totalTurns % RAG_ROLL_EVERY === 0) {
    const summarySeq = Math.floor(totalTurns / RAG_ROLL_EVERY);
    void indexSession(ctx, { agentId, callerId, sessionKey, summarySeq }).catch((e) =>
      console.warn("rolling indexSession failed:", (e as Error).message),
    );
  }

  return { reply, userKey: user.entityKey, assistantKey: assistant.entityKey, snapshotKey: snap.entityKey };
}
