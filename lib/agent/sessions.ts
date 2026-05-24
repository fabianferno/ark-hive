// lib/agent/sessions.ts
// Client-side session lifecycle. callerId is always the user's own address
// (ctx.address). Returns the SAME Ui* shapes as lib/agentClient.ts.
import { makeRepo, query as repoQuery, type DecodedEntity } from "@/lib/arkiv-client/repo";
import { PROJECT_ATTRIBUTE } from "@/lib/arkiv-client/project";
import { indexSession } from "@/lib/arkiv-client/rag";
import type { ClientCtx } from "@/lib/arkiv-client/ctx";
import type { UiSession, UiMessage, CloseSessionResult } from "@/lib/agentClient";

const toSession = (e: DecodedEntity): UiSession => ({
  key: e.key,
  agentId: String(e.attrs.agentId),
  callerId: String(e.attrs.callerId ?? ""),
  sessionStatus: String(e.attrs.sessionStatus ?? "open"),
  turnCount: Number(e.attrs.turnCount ?? 0),
  startedAt: Number(e.attrs.startedAt ?? 0),
  lastActivityAt: Number(e.attrs.lastActivityAt ?? 0),
});

const toMessage = (e: DecodedEntity): UiMessage => {
  const p = (e.payload ?? {}) as { role?: "user" | "assistant"; content?: string };
  return { key: e.key, role: p.role ?? "assistant", content: p.content ?? "", seq: Number(e.attrs.seq ?? 0) };
};

/** Create a session with the user's own address as the callerId. */
export async function createSession(ctx: ClientCtx, agentId: string): Promise<{ sessionKey: string }> {
  const s = await makeRepo(ctx).createSession({ agentId, callerId: ctx.address });
  return { sessionKey: s.entityKey };
}

export async function listSessions(ctx: ClientCtx, agentId: string): Promise<UiSession[]> {
  const rows = await repoQuery(ctx, [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "session" },
    { key: "agentId", op: "eq", value: agentId },
  ], 200);
  return rows.map(toSession);
}

export async function listMessages(ctx: ClientCtx, sessionKey: string): Promise<UiMessage[]> {
  const rows = await repoQuery(ctx, [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "message" },
    { key: "sessionKey", op: "eq", value: sessionKey },
  ], 200);
  rows.sort((a, b) => Number(a.attrs.seq) - Number(b.attrs.seq));
  return rows.map(toMessage);
}

/** Close a session: index it (summary + topic/similarity edges) for future RAG. */
export async function closeSession(ctx: ClientCtx, sessionKey: string): Promise<CloseSessionResult> {
  const rows = await repoQuery(ctx, [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "session" },
  ], 500);
  const s = rows.find((r) => r.key === sessionKey);
  if (!s) throw new Error(`session not found: ${sessionKey}`);
  const agentId = String(s.attrs.agentId);
  const callerId = String(s.attrs.callerId);
  const idx = await indexSession(ctx, { agentId, callerId, sessionKey, summarySeq: 999 });
  return { closed: true, summaryKey: idx.summaryKey, digest: idx.digest };
}
