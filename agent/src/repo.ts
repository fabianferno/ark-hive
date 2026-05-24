import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils";
import { eq, gt } from "@arkiv-network/sdk/query";
import { wallet, publicClient, AGENT_ADDRESS, PROJECT_ATTRIBUTE } from "./arkiv";
import {
  agentCardAttrs, sessionAttrs, messageAttrs, snapshotAttrs, memoryAttrs,
  type Attr, type MessageFields, type MemoryFields,
} from "./entities";
import type { Condition } from "./search";

export interface DecodedEntity { key: string; payload: unknown; attrs: Record<string, string | number>; }

function toConditions(conds: Condition[]) {
  return conds.map((c) => (c.op === "gt" ? gt(c.key, c.value) : eq(c.key, c.value)));
}

export async function query(conditions: Condition[], limit = 50): Promise<DecodedEntity[]> {
  let q = publicClient.buildQuery();
  for (const cond of toConditions(conditions)) q = q.where(cond);
  const res = await q
    .createdBy(AGENT_ADDRESS)
    .withPayload(true)
    .withAttributes(true)
    .withMetadata(true)
    .limit(limit)
    .fetch();
  return res.entities.map((e) => ({ key: e.key, payload: safeJson(e), attrs: attrsToRecord(e) }));
}

function safeJson(e: { toJson: () => unknown; toText?: () => string }): unknown {
  try { return e.toJson(); } catch { return e.toText?.() ?? null; }
}

function attrsToRecord(e: { attributes: Attr[] }): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  // Entity.attributes is a unified Attribute[] where value is string | number
  for (const a of e.attributes) out[a.key] = a.value;
  return out;
}

export const Expiry = {
  agentCard: () => ExpirationTime.fromDays(365),
  session: () => ExpirationTime.fromHours(12),
  message: () => ExpirationTime.fromHours(12),
  snapshot: () => ExpirationTime.fromDays(90),
  memory: (scope: "run" | "entity" | "global") =>
    scope === "run" ? ExpirationTime.fromHours(12)
    : scope === "entity" ? ExpirationTime.fromDays(7)
    : ExpirationTime.fromDays(365),
};

async function create(payload: unknown, attributes: Attr[], expiresIn: number) {
  const { entityKey, txHash } = await wallet.createEntity({
    payload: jsonToPayload(payload as object),
    contentType: "application/json",
    attributes,
    expiresIn,
  });
  return { entityKey, txHash };
}

export const Repo = {
  createAgentCard(f: { agentId: string; registryChainId: number; name: string; description: string; agentCardUri?: string; card?: unknown }) {
    const createdAt = Date.now();
    return create(
      { name: f.name, description: f.description, agentId: f.agentId, agentCardUri: f.agentCardUri ?? "", card: f.card ?? null },
      agentCardAttrs(PROJECT_ATTRIBUTE, { agentId: f.agentId, registryChainId: f.registryChainId, status: "active", createdAt, agentCardUri: f.agentCardUri ?? "" }),
      Expiry.agentCard(),
    );
  },
  createSession(f: { agentId: string; callerId: string }) {
    const now = Date.now();
    return create(
      { title: "Session", callerId: f.callerId },
      sessionAttrs(PROJECT_ATTRIBUTE, { agentId: f.agentId, callerId: f.callerId, sessionStatus: "open", startedAt: now, lastActivityAt: now, turnCount: 0 }),
      Expiry.session(),
    );
  },
  createMessage(f: MessageFields & { content: string }) {
    return create({ role: f.role, content: f.content }, messageAttrs(PROJECT_ATTRIBUTE, f), Expiry.message());
  },
  createSnapshot(f: { sessionKey: string; agentId: string; commitSeq: number; commitHash: string; prevSnapshotKey: string; state: unknown }) {
    const payloadStr = JSON.stringify(f.state);
    return create(
      { state: f.state },
      snapshotAttrs(PROJECT_ATTRIBUTE, { sessionKey: f.sessionKey, agentId: f.agentId, commitSeq: f.commitSeq, commitHash: f.commitHash, prevSnapshotKey: f.prevSnapshotKey, payloadSize: payloadStr.length, createdAt: Date.now() }),
      Expiry.snapshot(),
    );
  },
  createMemory(f: Omit<MemoryFields, "createdAt"> & { value: string }) {
    return create({ value: f.value }, memoryAttrs(PROJECT_ATTRIBUTE, { ...f, createdAt: Date.now() }), Expiry.memory(f.scope));
  },
  async updateSessionActivity(sessionKey: string, turnCount: number, lastActivityAt: number = Date.now()) {
    // UpdateEntityParameters requires a full payload + contentType; we carry the updated fields as payload.
    await wallet.updateEntity({
      entityKey: sessionKey as `0x${string}`,
      payload: jsonToPayload({ lastActivityAt, turnCount }),
      contentType: "application/json",
      attributes: [{ key: "lastActivityAt", value: lastActivityAt }, { key: "turnCount", value: turnCount }],
      expiresIn: Expiry.session(),
    });
  },
};
