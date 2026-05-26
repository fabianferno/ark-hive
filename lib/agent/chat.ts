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
import { listGrantsForMe, readSharedSummary } from "@/lib/arkiv-client/access";
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

// ─── endpoint interaction (real agent call → x402 pay → persona fallback) ──────

interface AgentRuntime { endpoint?: string; card: { name?: string; description?: string; capabilities?: string[] } | null }

/** UI callback: given x402 payment requirements, return a base64 X-PAYMENT or null to decline. */
export type OnPaymentRequired = (accepts: unknown[]) => Promise<string | null>;

function personaPrompt(card: NonNullable<AgentRuntime["card"]>): string {
  const caps = card.capabilities?.length ? ` Capabilities: ${card.capabilities.join(", ")}.` : "";
  return `You are "${card.name ?? "an agent"}". ${card.description ?? ""}.${caps} Stay in character.`;
}

async function postAgentCall(url: string, message: string, history: ChatTurn[], knowledge: string[], xPayment?: string): Promise<{ reply?: string; status?: number; accepts?: unknown[]; error?: string }> {
  const r = await fetch("/api/agent-call", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, message, history, knowledge, xPayment }),
    signal: AbortSignal.timeout(25_000),
  });
  return r.json().catch(() => ({ error: `agent-call ${r.status}` }));
}

async function callAgentEndpoint(url: string, message: string, history: ChatTurn[], knowledge: string[], onPay?: OnPaymentRequired): Promise<string> {
  let res = await postAgentCall(url, message, history, knowledge);
  if (res.status === 402) {
    if (!onPay) throw new Error("payment required (no handler)");
    const xPayment = await onPay(res.accepts ?? []);
    if (!xPayment) throw new Error("payment declined");
    res = await postAgentCall(url, message, history, knowledge, xPayment);
  }
  if (typeof res.reply !== "string") throw new Error(res.error ?? "no reply");
  return res.reply;
}

export async function produceReply(
  agent: AgentRuntime, text: string, turns: ChatTurn[], knowledge: string[], onPay?: OnPaymentRequired,
): Promise<string> {
  if (agent.endpoint) {
    try { return await callAgentEndpoint(agent.endpoint, text, turns, knowledge, onPay); }
    catch (e) { console.warn("endpoint call failed, persona fallback:", (e as Error).message); }
  }
  const persona = agent.card ? personaPrompt(agent.card) : undefined;
  return aiReply({ message: text, history: turns, knowledge, persona });
}

/** @internal test seam */
export const __produceReplyForTest = produceReply;

async function loadAgentRuntime(ctx: ClientCtx, agentId: string): Promise<AgentRuntime> {
  const rows = await repoQuery(ctx, [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "agentCard" },
    { key: "agentId", op: "eq", value: agentId },
  ], 1);
  const e = rows[0];
  if (!e) return { endpoint: undefined, card: null };
  const p = (e.payload ?? {}) as { endpoint?: string; card?: (AgentRuntime["card"] & { endpoints?: { url?: string }[] }) | null };
  const endpoint = String(e.attrs.endpoint ?? p.endpoint ?? p.card?.endpoints?.[0]?.url ?? "") || undefined;
  return { endpoint, card: p.card ?? null };
}

export async function chatTurn(ctx: ClientCtx, opts: { sessionKey: string; text: string; onPaymentRequired?: OnPaymentRequired }): Promise<SendResult> {
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

  // Shared knowledge: summaries another agent granted to THIS agent (access grants
  // where I'm the grantee, scoped to this agentId). Decrypt + add to context.
  // Filter by expiresAt defensively — Arkiv TTL purge has latency, so a recently
  // expired grant could still come back from a query until it's swept.
  try {
    const now = Date.now();
    const grants = (await listGrantsForMe(ctx)).filter(
      (g) => g.granteeAgentId === agentId && g.expiresAt > now,
    );
    for (const g of grants) {
      try {
        const shared = await readSharedSummary(ctx, g);
        if (shared) knowledge.push(`[shared] ${shared}`);
      } catch (e) { console.warn("shared summary decrypt skipped:", (e as Error).message); }
    }
  } catch (e) { console.warn("incoming grants fetch skipped:", (e as Error).message); }

  const agentRt = await loadAgentRuntime(ctx, agentId);
  const reply = await produceReply(agentRt, text, turns, knowledge, opts.onPaymentRequired);

  const userSeq = lastSeq + 1;
  const assistantSeq = lastSeq + 2;
  const ts = Date.now();
  // Critical path: persist the two messages so the chat renders the reply. Everything
  // after (snapshot, memory, session-activity, rolling index) is telemetry/derived
  // state and must NOT gate the reply — a slow/stuck write would otherwise hang the
  // whole turn ("agent is thinking…" with no answer). Run those fire-and-forget.
  const user = await repo.createMessage({ sessionKey, agentId, role: "user", seq: userSeq, ts, content: text });
  const assistant = await repo.createMessage({ sessionKey, agentId, role: "assistant", seq: assistantSeq, ts: ts + 1, content: reply });

  const totalTurns = assistantSeq + 1;
  void (async () => {
    try {
      const commitSeq = (lastSnapshot?.seq ?? 0) + 1;
      const statePayload = JSON.stringify({ sessionKey, lastSeq: assistantSeq, reply });
      const commitHash = await computeCommitHash(lastSnapshot?.hash ?? null, statePayload);
      await repo.createSnapshot({
        sessionKey, agentId, commitSeq, commitHash, prevSnapshotKey: lastSnapshot?.key ?? "", state: { lastSeq: assistantSeq, reply },
      });
      await ctxSet(repo, { agentId, scope: "run", scopeKey: sessionKey, memKey: "lastReply", value: reply, version: commitSeq });
      await repo.updateSessionActivity({ sessionKey, agentId, callerId, startedAt: session.startedAt, turnCount: totalTurns });
      // Rolling RAG cap: every N turns, re-index the session.
      if (RAG_ROLL_EVERY > 0 && totalTurns % RAG_ROLL_EVERY === 0) {
        await indexSession(ctx, { agentId, callerId, sessionKey, summarySeq: Math.floor(totalTurns / RAG_ROLL_EVERY) });
      }
    } catch (e) { console.warn("chat post-write (background) failed:", (e as Error).message); }
  })();

  return { reply, userKey: user.entityKey, assistantKey: assistant.entityKey, snapshotKey: "" };
}
