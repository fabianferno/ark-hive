import { query, Repo } from "./repo";
import { PROJECT_ATTRIBUTE } from "./arkiv";
import { respond, type ChatTurn } from "./brain";
import { searchKnowledge } from "./search";
import { get as ctxGet, set as ctxSet } from "./contextbus";
import { computeCommitHash } from "./hashchain";
import { retrieve, indexSession } from "./rag/rag";
import { loadConfig } from "./config";

async function loadSession(sessionKey: string) {
  const rows = await query([
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "session" },
  ], 200);
  const row = rows.find((r) => r.key === sessionKey);
  if (!row) throw new Error(`session not found: ${sessionKey}`);
  return row;
}

async function loadHistory(sessionKey: string): Promise<{ turns: ChatTurn[]; lastSeq: number; lastSnapshot: { key: string; hash: string; seq: number } | null }> {
  const rows = await query([
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

  const snaps = await query([
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "snapshot" },
    { key: "sessionKey", op: "eq", value: sessionKey },
  ], 200);
  const snapSorted = snaps.sort((a, b) => Number(a.attrs.commitSeq) - Number(b.attrs.commitSeq));
  const last = snapSorted.length ? snapSorted[snapSorted.length - 1] : null;
  const lastSnapshot = last ? { key: last.key, hash: String(last.attrs.commitHash), seq: Number(last.attrs.commitSeq) } : null;
  return { turns, lastSeq, lastSnapshot };
}

export interface TurnResult { reply: string; userKey: string; assistantKey: string; snapshotKey: string; }

export async function chatTurn(sessionKey: string, text: string): Promise<TurnResult> {
  const session = await loadSession(sessionKey);
  const agentId = String(session.attrs.agentId);
  const callerId = String(session.attrs.callerId);

  const { turns, lastSeq, lastSnapshot } = await loadHistory(sessionKey);

  const knowledgeHits = await searchKnowledge({ agentId }, text, 6);
  const knowledge = knowledgeHits.map((h) => `[${h.scope}/${h.memKey}] ${h.value}`);
  const priorGoal = await ctxGet("goal", { run: sessionKey, entity: callerId, global: agentId });
  if (priorGoal) knowledge.push(`[goal] ${priorGoal}`);

  const past = await retrieve(text, { agentId, callerId });
  for (const s of past) knowledge.push(`[past-session] ${s}`);

  const reply = await respond({ message: text, history: turns, knowledge });

  const userSeq = lastSeq + 1;
  const assistantSeq = lastSeq + 2;
  const ts = Date.now();
  const user = await Repo.createMessage({ sessionKey, agentId, role: "user", seq: userSeq, ts, content: text });
  const assistant = await Repo.createMessage({ sessionKey, agentId, role: "assistant", seq: assistantSeq, ts: ts + 1, content: reply });

  const commitSeq = (lastSnapshot?.seq ?? 0) + 1;
  const statePayload = JSON.stringify({ sessionKey, lastSeq: assistantSeq, reply });
  const commitHash = computeCommitHash(lastSnapshot?.hash ?? null, statePayload);
  const snap = await Repo.createSnapshot({
    sessionKey, agentId, commitSeq, commitHash, prevSnapshotKey: lastSnapshot?.key ?? "", state: { lastSeq: assistantSeq, reply },
  });

  await ctxSet({ agentId, scope: "run", scopeKey: sessionKey, memKey: "lastReply", value: reply, version: commitSeq });
  await Repo.updateSessionActivity({ sessionKey, agentId, callerId, startedAt: Number(session.attrs.startedAt ?? Date.now()), turnCount: assistantSeq + 1 });

  const rollEvery = loadConfig().ragRollEvery;
  const totalTurns = assistantSeq + 1;
  if (rollEvery > 0 && totalTurns % rollEvery === 0) {
    const seq = Math.floor(totalTurns / rollEvery);
    try { await indexSession({ agentId, callerId, sessionKey, summarySeq: seq }); }
    catch (e) { console.warn("rolling indexSession failed:", (e as Error).message); }
  }

  return { reply, userKey: user.entityKey, assistantKey: assistant.entityKey, snapshotKey: snap.entityKey };
}
