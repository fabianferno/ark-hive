// arkiv-agent-sdk — low-level Arkiv data layer.
// Ported from lib/arkiv-client/repo.ts, decoupled from the host app (project
// attribute is injected, no @/lib/wallet import).
import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils";
import { eq, gt, gte, lt, lte } from "@arkiv-network/sdk/query";
import {
  agentCardAttrs, sessionAttrs, messageAttrs, snapshotAttrs, memoryAttrs,
  summaryAttrs, topicAttrs, summaryTopicAttrs, summaryLinkAttrs,
  pubkeyAttrs, accessGrantAttrs,
  type Attr, type MessageFields, type MemoryFields, type AccessGrantFields, type ProjectAttr,
} from "./entities";
import type { Condition } from "./search";
import type { ClientCtx } from "./client";

export interface DecodedEntity {
  key: string;
  payload: unknown;
  attrs: Record<string, string | number>;
  owner?: string;
  creator?: string;
}

function toConditions(conds: Condition[]) {
  return conds.map((c) => {
    switch (c.op) {
      case "gt": return gt(c.key, c.value);
      case "gte": return gte(c.key, c.value);
      case "lt": return lt(c.key, c.value);
      case "lte": return lte(c.key, c.value);
      default: return eq(c.key, c.value);
    }
  });
}

function safeJson(e: { toJson: () => unknown; toText?: () => string }): unknown {
  try { return e.toJson(); } catch { return e.toText?.() ?? null; }
}

function attrsToRecord(e: { attributes: Attr[] }): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const a of e.attributes) out[a.key] = a.value;
  return out;
}

/** Query entities CREATED BY ctx.address. Use this for the user's own data. */
export async function query(ctx: ClientCtx, conditions: Condition[], limit = 50): Promise<DecodedEntity[]> {
  let q = ctx.publicClient.buildQuery();
  for (const cond of toConditions(conditions)) q = q.where(cond);
  const res = await q
    .createdBy(ctx.address)
    .withPayload(true)
    .withAttributes(true)
    .withMetadata(true)
    .limit(limit)
    .fetch();
  return res.entities.map((e: any) => ({ key: e.key, payload: safeJson(e), attrs: attrsToRecord(e) }));
}

/** Unscoped query — reads entities from any creator. Returns owner/creator metadata. */
export async function queryGlobal(ctx: ClientCtx, conditions: Condition[], limit = 50): Promise<DecodedEntity[]> {
  let q = ctx.publicClient.buildQuery();
  for (const cond of toConditions(conditions)) q = q.where(cond);
  const res = await q.withPayload(true).withAttributes(true).withMetadata(true).limit(limit).fetch();
  return res.entities.map((e: any) => ({
    key: e.key, payload: safeJson(e), attrs: attrsToRecord(e),
    owner: e.owner ? String(e.owner) : undefined,
    creator: e.creator ? String(e.creator) : undefined,
  }));
}

/** Fetch a single entity by key (unscoped). */
export async function getEntity(ctx: ClientCtx, key: string): Promise<DecodedEntity> {
  const e: any = await ctx.publicClient.getEntity(key as `0x${string}`);
  return {
    key: e.key, payload: safeJson(e), attrs: attrsToRecord(e),
    owner: e.owner ? String(e.owner) : undefined,
    creator: e.creator ? String(e.creator) : undefined,
  };
}

/** Default TTLs per entity type — tweak as needed. */
export const Expiry = {
  agentCard: () => ExpirationTime.fromDays(365),
  session: () => ExpirationTime.fromHours(12),
  message: () => ExpirationTime.fromHours(12),
  snapshot: () => ExpirationTime.fromDays(90),
  memory: (scope: "run" | "entity" | "global") =>
    scope === "run" ? ExpirationTime.fromHours(12)
    : scope === "entity" ? ExpirationTime.fromDays(7)
    : ExpirationTime.fromDays(365),
  summary: () => ExpirationTime.fromDays(365),
  topic: () => ExpirationTime.fromDays(365),
  edge: () => ExpirationTime.fromDays(365),
  pubkey: () => ExpirationTime.fromDays(365),
};

// A wallet's nonce queue is serial — browsers especially can collide on rapid
// writes ("replacement transaction underpriced"). Funnel every wallet write
// through a module-level chain so only one tx is in flight at a time.
let writeChain: Promise<unknown> = Promise.resolve();
const WRITE_TIMEOUT_MS = 60_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`Arkiv write timed out after ${ms / 1000}s`)), ms)),
  ]);
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      const msg = (e as Error)?.message ?? "";
      if (!/underpriced|timed out|timeout|nonce|already known/i.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

async function serializeWrite<T>(fn: () => Promise<T>): Promise<T> {
  const attempt = () => withRetry(() => withTimeout(fn(), WRITE_TIMEOUT_MS));
  const run = writeChain.then(attempt, attempt);
  writeChain = run.catch(() => {});
  return run;
}

async function create(ctx: ClientCtx, payload: unknown, attributes: Attr[], expiresIn: number) {
  const { entityKey, txHash } = await serializeWrite<{ entityKey: string; txHash: string }>(() =>
    ctx.wallet.createEntity({
      payload: jsonToPayload(payload as object),
      contentType: "application/json",
      attributes,
      expiresIn,
    }),
  );
  return { entityKey, txHash };
}

export interface ClientRepo {
  createAgentCard(f: { agentId: string; registryChainId: number; name: string; description: string; agentCardUri?: string; card?: unknown; ensName?: string; ensLabel?: string; ensUserLabel?: string; origin?: string; endpoint?: string }): Promise<{ entityKey: string; txHash: string }>;
  createSession(f: { agentId: string; callerId: string }): Promise<{ entityKey: string; txHash: string }>;
  createMessage(f: MessageFields & { content: string }): Promise<{ entityKey: string; txHash: string }>;
  createSnapshot(f: { sessionKey: string; agentId: string; commitSeq: number; commitHash: string; prevSnapshotKey: string; state: unknown }): Promise<{ entityKey: string; txHash: string }>;
  createMemory(f: Omit<MemoryFields, "createdAt"> & { value: string; expiresInSec?: number }): Promise<{ entityKey: string; txHash: string }>;
  createSummary(f: { agentId: string; callerId: string; sessionKey: string; summarySeq: number; summary: string; topics: string[]; embedding: number[] }): Promise<{ entityKey: string; txHash: string }>;
  createTopic(f: { agentId: string; callerId: string; topicKey: string; name: string }): Promise<{ entityKey: string; txHash: string }>;
  createSummaryTopic(f: { agentId: string; callerId: string; summaryKey: string; topicKey: string; sessionKey: string }): Promise<{ entityKey: string; txHash: string }>;
  createSummaryLink(f: { agentId: string; callerId: string; srcSummaryKey: string; dstSummaryKey: string; score: number }): Promise<{ entityKey: string; txHash: string }>;
  updateSessionActivity(f: { sessionKey: string; agentId: string; callerId: string; startedAt: number; turnCount: number; sessionStatus?: string }): Promise<void>;
  createPubKey(f: { owner: string; x25519Pub: string; scheme: string }): Promise<{ entityKey: string; txHash: string }>;
  createEncryptedSummary(f: { agentId: string; callerId: string; sessionKey: string; summarySeq: number; ciphertext: string; nonce: string }): Promise<{ entityKey: string; txHash: string }>;
  createAccessGrant(f: AccessGrantFields & { wrappedKey: string; ephemeralPub: string; nonce: string; expiresInSec: number }): Promise<{ entityKey: string; txHash: string }>;
  updateAccessGrant(entityKey: string, f: AccessGrantFields & { wrappedKey: string; ephemeralPub: string; nonce: string; expiresInSec: number }): Promise<void>;
  getEntity(key: string): Promise<DecodedEntity>;
  deleteEntity(entityKey: string): Promise<void>;
  extendEntity(entityKey: string, expiresIn: number): Promise<void>;
  queryGlobal(conditions: Condition[], limit?: number): Promise<DecodedEntity[]>;
  query(conditions: Condition[], limit?: number): Promise<DecodedEntity[]>;
}

export function makeRepo(ctx: ClientCtx, project: ProjectAttr): ClientRepo {
  return {
    createAgentCard(f) {
      const createdAt = Date.now();
      return create(
        ctx,
        { name: f.name, description: f.description, agentId: f.agentId, agentCardUri: f.agentCardUri ?? "", card: f.card ?? null, ...(f.endpoint ? { endpoint: f.endpoint } : {}), ...(f.origin ? { origin: f.origin } : {}), ...(f.ensName ? { ensName: f.ensName, ensLabel: f.ensLabel, ensUserLabel: f.ensUserLabel } : {}) },
        agentCardAttrs(project, { agentId: f.agentId, registryChainId: f.registryChainId, status: "active", createdAt, agentCardUri: f.agentCardUri ?? "", ensName: f.ensName, ensLabel: f.ensLabel, ensUserLabel: f.ensUserLabel, origin: f.origin, endpoint: f.endpoint }),
        Expiry.agentCard(),
      );
    },
    createSession(f) {
      const now = Date.now();
      return create(
        ctx,
        { title: "Session", callerId: f.callerId },
        sessionAttrs(project, { agentId: f.agentId, callerId: f.callerId, sessionStatus: "open", startedAt: now, lastActivityAt: now, turnCount: 0 }),
        Expiry.session(),
      );
    },
    createMessage(f) {
      return create(ctx, { role: f.role, content: f.content }, messageAttrs(project, f), Expiry.message());
    },
    createSnapshot(f) {
      const payloadStr = JSON.stringify(f.state);
      return create(
        ctx,
        { state: f.state },
        snapshotAttrs(project, { sessionKey: f.sessionKey, agentId: f.agentId, commitSeq: f.commitSeq, commitHash: f.commitHash, prevSnapshotKey: f.prevSnapshotKey, payloadSize: payloadStr.length, createdAt: Date.now() }),
        Expiry.snapshot(),
      );
    },
    createMemory(f) {
      const expiresIn = f.expiresInSec ? ExpirationTime.fromSeconds(f.expiresInSec) : Expiry.memory(f.scope);
      const { expiresInSec: _omit, ...mem } = f;
      return create(ctx, { value: f.value }, memoryAttrs(project, { ...mem, createdAt: Date.now() }), expiresIn);
    },
    createSummary(f) {
      return create(
        ctx,
        { summary: f.summary, topics: f.topics, embedding: f.embedding },
        summaryAttrs(project, { agentId: f.agentId, callerId: f.callerId, sessionKey: f.sessionKey, summarySeq: f.summarySeq, createdAt: Date.now() }),
        Expiry.summary(),
      );
    },
    createTopic(f) {
      return create(
        ctx,
        { name: f.name },
        topicAttrs(project, { agentId: f.agentId, callerId: f.callerId, topicKey: f.topicKey, createdAt: Date.now() }),
        Expiry.topic(),
      );
    },
    createSummaryTopic(f) {
      return create(ctx, {}, summaryTopicAttrs(project, { ...f, createdAt: Date.now() }), Expiry.edge());
    },
    createSummaryLink(f) {
      return create(ctx, {}, summaryLinkAttrs(project, { ...f, createdAt: Date.now() }), Expiry.edge());
    },
    async updateSessionActivity(f) {
      await serializeWrite(() => ctx.wallet.updateEntity({
        entityKey: f.sessionKey as `0x${string}`,
        payload: jsonToPayload({ title: "Session", callerId: f.callerId }),
        contentType: "application/json",
        attributes: sessionAttrs(project, {
          agentId: f.agentId, callerId: f.callerId, sessionStatus: f.sessionStatus ?? "open",
          startedAt: f.startedAt, lastActivityAt: Date.now(), turnCount: f.turnCount,
        }),
        expiresIn: Expiry.session(),
      }));
    },
    createPubKey(f) {
      return create(ctx, { x25519Pub: f.x25519Pub, scheme: f.scheme },
        pubkeyAttrs(project, { owner: f.owner, createdAt: Date.now() }), Expiry.pubkey());
    },
    createEncryptedSummary(f) {
      return create(ctx, { enc: "v1", ciphertext: f.ciphertext, nonce: f.nonce },
        summaryAttrs(project, { agentId: f.agentId, callerId: f.callerId, sessionKey: f.sessionKey, summarySeq: f.summarySeq, createdAt: Date.now(), enc: "v1" }),
        Expiry.summary());
    },
    createAccessGrant(f) {
      return create(ctx, { wrappedKey: f.wrappedKey, ephemeralPub: f.ephemeralPub, nonce: f.nonce },
        accessGrantAttrs(project, {
          agentId: f.agentId, resourceKey: f.resourceKey, resourceType: f.resourceType,
          granteeAgentId: f.granteeAgentId, granteeAddress: f.granteeAddress,
          expiresAt: f.expiresAt, createdAt: Date.now(),
        }), f.expiresInSec);
    },
    async updateAccessGrant(entityKey, f) {
      await serializeWrite(() => ctx.wallet.updateEntity({
        entityKey: entityKey as `0x${string}`,
        payload: jsonToPayload({ wrappedKey: f.wrappedKey, ephemeralPub: f.ephemeralPub, nonce: f.nonce }),
        contentType: "application/json",
        attributes: accessGrantAttrs(project, {
          agentId: f.agentId, resourceKey: f.resourceKey, resourceType: f.resourceType,
          granteeAgentId: f.granteeAgentId, granteeAddress: f.granteeAddress,
          expiresAt: f.expiresAt, createdAt: f.createdAt,
        }),
        expiresIn: f.expiresInSec,
      }));
    },
    getEntity(key) { return getEntity(ctx, key); },
    async deleteEntity(entityKey) {
      await serializeWrite(() => ctx.wallet.deleteEntity({ entityKey: entityKey as `0x${string}` }));
    },
    async extendEntity(entityKey, expiresIn) {
      await serializeWrite(() => ctx.wallet.extendEntity({ entityKey: entityKey as `0x${string}`, expiresIn }));
    },
    queryGlobal(conditions, limit = 50) {
      return queryGlobal(ctx, conditions, limit);
    },
    query(conditions, limit = 50) {
      return query(ctx, conditions, limit);
    },
  };
}
