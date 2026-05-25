export type Attr = { key: string; value: string | number };
export type ProjectAttr = { readonly key: "project"; readonly value: string };

export const ENTITY = {
  agentCard: "agentCard",
  session: "session",
  message: "message",
  snapshot: "snapshot",
  memory: "memory",
  summary: "summary",
  topic: "topic",
  summaryTopic: "summaryTopic",
  summaryLink: "summaryLink",
  pubkey: "pubkey",
  accessGrant: "accessGrant",
} as const;

export interface AgentCardFields { agentId: string; registryChainId: number; status: string; createdAt: number; agentCardUri: string; ensName?: string; ensLabel?: string; ensUserLabel?: string; origin?: string; endpoint?: string; }
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
  ...(f.ensName ? [{ key: "ensName", value: f.ensName }] : []),
  ...(f.ensUserLabel ? [{ key: "ensUserLabel", value: f.ensUserLabel }] : []),
  ...(f.ensLabel ? [{ key: "ensLabel", value: f.ensLabel }] : []),
  ...(f.origin ? [{ key: "origin", value: f.origin }] : []),
  ...(f.endpoint ? [{ key: "endpoint", value: f.endpoint }] : []),
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

export interface SummaryFields { agentId: string; callerId: string; sessionKey: string; summarySeq: number; createdAt: number; enc?: string; }
export interface TopicFields { agentId: string; callerId: string; topicKey: string; createdAt: number; }
export interface SummaryTopicFields { agentId: string; callerId: string; summaryKey: string; topicKey: string; sessionKey: string; createdAt: number; }
export interface SummaryLinkFields { agentId: string; callerId: string; srcSummaryKey: string; dstSummaryKey: string; score: number; createdAt: number; }

export const summaryAttrs = (p: ProjectAttr, f: SummaryFields): Attr[] => [
  ...base(p, ENTITY.summary, f.agentId),
  { key: "callerId", value: f.callerId },
  { key: "sessionKey", value: f.sessionKey },
  { key: "summarySeq", value: f.summarySeq },
  { key: "createdAt", value: f.createdAt },
  ...(f.enc ? [{ key: "enc", value: f.enc } as Attr] : []),
];
export const topicAttrs = (p: ProjectAttr, f: TopicFields): Attr[] => [
  ...base(p, ENTITY.topic, f.agentId),
  { key: "callerId", value: f.callerId },
  { key: "topicKey", value: f.topicKey },
  { key: "createdAt", value: f.createdAt },
];
export const summaryTopicAttrs = (p: ProjectAttr, f: SummaryTopicFields): Attr[] => [
  ...base(p, ENTITY.summaryTopic, f.agentId),
  { key: "callerId", value: f.callerId },
  { key: "summaryKey", value: f.summaryKey },
  { key: "topicKey", value: f.topicKey },
  { key: "sessionKey", value: f.sessionKey },
  { key: "createdAt", value: f.createdAt },
];
export const summaryLinkAttrs = (p: ProjectAttr, f: SummaryLinkFields): Attr[] => [
  ...base(p, ENTITY.summaryLink, f.agentId),
  { key: "callerId", value: f.callerId },
  { key: "srcSummaryKey", value: f.srcSummaryKey },
  { key: "dstSummaryKey", value: f.dstSummaryKey },
  { key: "score", value: f.score },
  { key: "createdAt", value: f.createdAt },
];

export interface PubKeyFields { owner: string; createdAt: number; }
export const pubkeyAttrs = (p: ProjectAttr, f: PubKeyFields): Attr[] => [
  { key: p.key, value: p.value },
  { key: "entityType", value: ENTITY.pubkey },
  { key: "owner", value: f.owner },
  { key: "createdAt", value: f.createdAt },
];

export interface AccessGrantFields {
  agentId: string; resourceKey: string; resourceType: string;
  granteeAgentId: string; granteeAddress: string; expiresAt: number; createdAt: number;
}
export const accessGrantAttrs = (p: ProjectAttr, f: AccessGrantFields): Attr[] => [
  ...base(p, ENTITY.accessGrant, f.agentId),
  { key: "resourceKey", value: f.resourceKey },
  { key: "resourceType", value: f.resourceType },
  { key: "granteeAgentId", value: f.granteeAgentId },
  { key: "granteeAddress", value: f.granteeAddress },
  { key: "expiresAt", value: f.expiresAt },
  { key: "createdAt", value: f.createdAt },
];
