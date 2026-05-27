// arkiv-agent-sdk — high-level agent memory + state API.
// Wraps makeRepo() with ergonomic methods: putMemory/listMemory, sessions, messages, snapshots, agent card lookup.
import { makeRepo, type ClientRepo, type DecodedEntity } from "./repo";
import type { ClientCtx, SdkConfig } from "./client";
import type { ProjectAttr, MemoryScope } from "./entities";
import { buildMemoryConditions, withProject, type Condition } from "./search";

export interface AgentClient {
  ctx: ClientCtx;
  project: ProjectAttr;
  repo: ClientRepo;

  // --- AGENT CARD ---
  getAgentCard(agentId: string): Promise<DecodedEntity | null>;
  listMyAgents(limit?: number): Promise<DecodedEntity[]>;

  // --- MEMORY (the headline use case: own your agent's memory) ---
  putMemory(input: {
    agentId: string;
    scope: MemoryScope;
    scopeKey: string;
    memKey: string;
    value: string;
    source?: string;
    version?: number;
    expiresInSec?: number;
  }): Promise<{ entityKey: string; txHash: string }>;
  listMemory(q: { agentId: string; scope?: MemoryScope; memKey?: string; sinceMs?: number; limit?: number }): Promise<DecodedEntity[]>;

  // --- SESSIONS ---
  openSession(input: { agentId: string; callerId: string }): Promise<{ entityKey: string; txHash: string }>;
  listSessions(agentId: string, limit?: number): Promise<DecodedEntity[]>;
  bumpSession(input: { sessionKey: string; agentId: string; callerId: string; startedAt: number; turnCount: number; sessionStatus?: string }): Promise<void>;
  closeSession(input: { sessionKey: string; agentId: string; callerId: string; startedAt: number; turnCount: number }): Promise<void>;

  // --- MESSAGES ---
  appendMessage(input: { sessionKey: string; agentId: string; role: "user" | "assistant"; seq: number; content: string }): Promise<{ entityKey: string; txHash: string }>;
  listMessages(sessionKey: string, limit?: number): Promise<DecodedEntity[]>;

  // --- SNAPSHOTS (hash-chained state commits) ---
  commitSnapshot(input: { sessionKey: string; agentId: string; commitSeq: number; commitHash: string; prevSnapshotKey: string; state: unknown }): Promise<{ entityKey: string; txHash: string }>;
  listSnapshots(sessionKey: string, limit?: number): Promise<DecodedEntity[]>;

  // --- LOW-LEVEL ESCAPE HATCHES ---
  query(conditions: Condition[], limit?: number): Promise<DecodedEntity[]>;
  queryGlobal(conditions: Condition[], limit?: number): Promise<DecodedEntity[]>;
  getEntity(key: string): Promise<DecodedEntity>;
}

export function createAgentClient(cfg: SdkConfig): AgentClient {
  const { ctx, project } = cfg;
  const repo = makeRepo(ctx, project);

  return {
    ctx,
    project,
    repo,

    async getAgentCard(agentId) {
      const rows = await repo.queryGlobal(
        withProject(project, "agentCard", [{ key: "agentId", op: "eq", value: agentId }]),
        1,
      );
      return rows[0] ?? null;
    },
    listMyAgents(limit = 50) {
      return repo.query(withProject(project, "agentCard"), limit);
    },

    putMemory(input) {
      return repo.createMemory({
        agentId: input.agentId,
        scope: input.scope,
        scopeKey: input.scopeKey,
        memKey: input.memKey,
        source: input.source ?? "sdk",
        version: input.version ?? 1,
        value: input.value,
        expiresInSec: input.expiresInSec,
      });
    },
    listMemory({ agentId, scope, memKey, sinceMs, limit = 50 }) {
      return repo.query(buildMemoryConditions(project, { agentId, scope, memKey, sinceMs }), limit);
    },

    openSession(input) {
      return repo.createSession(input);
    },
    listSessions(agentId, limit = 50) {
      return repo.query(withProject(project, "session", [{ key: "agentId", op: "eq", value: agentId }]), limit);
    },
    bumpSession(input) {
      return repo.updateSessionActivity({ ...input, sessionStatus: input.sessionStatus ?? "open" });
    },
    closeSession(input) {
      return repo.updateSessionActivity({ ...input, sessionStatus: "closed" });
    },

    appendMessage(input) {
      return repo.createMessage({ ...input, ts: Date.now() });
    },
    listMessages(sessionKey, limit = 200) {
      return repo.query(withProject(project, "message", [{ key: "sessionKey", op: "eq", value: sessionKey }]), limit);
    },

    commitSnapshot(input) {
      return repo.createSnapshot(input);
    },
    listSnapshots(sessionKey, limit = 100) {
      return repo.query(withProject(project, "snapshot", [{ key: "sessionKey", op: "eq", value: sessionKey }]), limit);
    },

    query: (c, l) => repo.query(c, l),
    queryGlobal: (c, l) => repo.queryGlobal(c, l),
    getEntity: (k) => repo.getEntity(k),
  };
}

/**
 * Hash a snapshot payload into a deterministic commitHash.
 * Browser/Node compatible via Web Crypto (SubtleCrypto).
 */
export async function snapshotHash(prevHash: string, payload: unknown): Promise<string> {
  const text = `${prevHash}|${JSON.stringify(payload)}`;
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return `0x${hex}`;
}
