export type Attr = { key: string; value: string | number };
export type ProjectAttr = { readonly key: "project"; readonly value: string };

export const ENTITY = {
  agentCard: "agentCard",
  session: "session",
  message: "message",
  snapshot: "snapshot",
  memory: "memory",
} as const;

export interface AgentCardFields { agentId: string; registryChainId: number; status: string; createdAt: number; agentCardUri: string; }
export interface SessionFields { agentId: string; callerId: string; sessionStatus: string; startedAt: number; lastActivityAt: number; turnCount: number; }
export interface MessageFields { sessionKey: string; agentId: string; role: "user" | "assistant"; seq: number; ts: number; }
export interface SnapshotFields { sessionKey: string; agentId: string; commitSeq: number; commitHash: string; prevSnapshotKey: string; payloadSize: number; createdAt: number; }
export interface MemoryFields { agentId: string; scope: "run" | "entity" | "global"; scopeKey: string; memKey: string; source: string; version: number; createdAt: number; }

const base = (project: ProjectAttr, entityType: string, agentId: string): Attr[] => [
  { key: project.key, value: project.value },
  { key: "entityType", value: entityType },
  { key: "agentId", value: agentId },
];

export const agentCardAttrs = (p: ProjectAttr, f: AgentCardFields): Attr[] => [
  ...base(p, ENTITY.agentCard, f.agentId),
  { key: "registryChainId", value: f.registryChainId },
  { key: "status", value: f.status },
  { key: "createdAt", value: f.createdAt },
  { key: "agentCardUri", value: f.agentCardUri },
];

export const sessionAttrs = (p: ProjectAttr, f: SessionFields): Attr[] => [
  ...base(p, ENTITY.session, f.agentId),
  { key: "callerId", value: f.callerId },
  { key: "sessionStatus", value: f.sessionStatus },
  { key: "startedAt", value: f.startedAt },
  { key: "lastActivityAt", value: f.lastActivityAt },
  { key: "turnCount", value: f.turnCount },
];

export const messageAttrs = (p: ProjectAttr, f: MessageFields): Attr[] => [
  ...base(p, ENTITY.message, f.agentId),
  { key: "sessionKey", value: f.sessionKey },
  { key: "role", value: f.role },
  { key: "seq", value: f.seq },
  { key: "ts", value: f.ts },
];

export const snapshotAttrs = (p: ProjectAttr, f: SnapshotFields): Attr[] => [
  ...base(p, ENTITY.snapshot, f.agentId),
  { key: "sessionKey", value: f.sessionKey },
  { key: "commitSeq", value: f.commitSeq },
  { key: "commitHash", value: f.commitHash },
  { key: "prevSnapshotKey", value: f.prevSnapshotKey },
  { key: "payloadSize", value: f.payloadSize },
  { key: "createdAt", value: f.createdAt },
];

export const memoryAttrs = (p: ProjectAttr, f: MemoryFields): Attr[] => [
  ...base(p, ENTITY.memory, f.agentId),
  { key: "scope", value: f.scope },
  { key: "scopeKey", value: f.scopeKey },
  { key: "memKey", value: f.memKey },
  { key: "source", value: f.source },
  { key: "version", value: f.version },
  { key: "createdAt", value: f.createdAt },
];
