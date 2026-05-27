"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ENTITY: () => ENTITY,
  Expiry: () => Expiry,
  accessGrantAttrs: () => accessGrantAttrs,
  agentCardAttrs: () => agentCardAttrs,
  buildMemoryConditions: () => buildMemoryConditions,
  createAgentClient: () => createAgentClient,
  getEntity: () => getEntity,
  makeRepo: () => makeRepo,
  memoryAttrs: () => memoryAttrs,
  messageAttrs: () => messageAttrs,
  pubkeyAttrs: () => pubkeyAttrs,
  query: () => query,
  queryGlobal: () => queryGlobal,
  sessionAttrs: () => sessionAttrs,
  snapshotAttrs: () => snapshotAttrs,
  snapshotHash: () => snapshotHash,
  summaryAttrs: () => summaryAttrs,
  summaryLinkAttrs: () => summaryLinkAttrs,
  summaryTopicAttrs: () => summaryTopicAttrs,
  topicAttrs: () => topicAttrs,
  withProject: () => withProject
});
module.exports = __toCommonJS(index_exports);

// src/entities.ts
var ENTITY = {
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
  accessGrant: "accessGrant"
};
var base = (project, entityType, agentId) => [
  { key: project.key, value: project.value },
  { key: "entityType", value: entityType },
  { key: "agentId", value: agentId }
];
var agentCardAttrs = (p, f) => [
  ...base(p, ENTITY.agentCard, f.agentId),
  { key: "registryChainId", value: f.registryChainId },
  { key: "status", value: f.status },
  { key: "createdAt", value: f.createdAt },
  { key: "agentCardUri", value: f.agentCardUri },
  ...f.ensName ? [{ key: "ensName", value: f.ensName }] : [],
  ...f.ensUserLabel ? [{ key: "ensUserLabel", value: f.ensUserLabel }] : [],
  ...f.ensLabel ? [{ key: "ensLabel", value: f.ensLabel }] : [],
  ...f.origin ? [{ key: "origin", value: f.origin }] : [],
  ...f.endpoint ? [{ key: "endpoint", value: f.endpoint }] : []
];
var sessionAttrs = (p, f) => [
  ...base(p, ENTITY.session, f.agentId),
  { key: "callerId", value: f.callerId },
  { key: "sessionStatus", value: f.sessionStatus },
  { key: "startedAt", value: f.startedAt },
  { key: "lastActivityAt", value: f.lastActivityAt },
  { key: "turnCount", value: f.turnCount }
];
var messageAttrs = (p, f) => [
  ...base(p, ENTITY.message, f.agentId),
  { key: "sessionKey", value: f.sessionKey },
  { key: "role", value: f.role },
  { key: "seq", value: f.seq },
  { key: "ts", value: f.ts }
];
var snapshotAttrs = (p, f) => [
  ...base(p, ENTITY.snapshot, f.agentId),
  { key: "sessionKey", value: f.sessionKey },
  { key: "commitSeq", value: f.commitSeq },
  { key: "commitHash", value: f.commitHash },
  { key: "prevSnapshotKey", value: f.prevSnapshotKey },
  { key: "payloadSize", value: f.payloadSize },
  { key: "createdAt", value: f.createdAt }
];
var memoryAttrs = (p, f) => [
  ...base(p, ENTITY.memory, f.agentId),
  { key: "scope", value: f.scope },
  { key: "scopeKey", value: f.scopeKey },
  { key: "memKey", value: f.memKey },
  { key: "source", value: f.source },
  { key: "version", value: f.version },
  { key: "createdAt", value: f.createdAt }
];
var summaryAttrs = (p, f) => [
  ...base(p, ENTITY.summary, f.agentId),
  { key: "callerId", value: f.callerId },
  { key: "sessionKey", value: f.sessionKey },
  { key: "summarySeq", value: f.summarySeq },
  { key: "createdAt", value: f.createdAt },
  ...f.enc ? [{ key: "enc", value: f.enc }] : []
];
var topicAttrs = (p, f) => [
  ...base(p, ENTITY.topic, f.agentId),
  { key: "callerId", value: f.callerId },
  { key: "topicKey", value: f.topicKey },
  { key: "createdAt", value: f.createdAt }
];
var summaryTopicAttrs = (p, f) => [
  ...base(p, ENTITY.summaryTopic, f.agentId),
  { key: "callerId", value: f.callerId },
  { key: "summaryKey", value: f.summaryKey },
  { key: "topicKey", value: f.topicKey },
  { key: "sessionKey", value: f.sessionKey },
  { key: "createdAt", value: f.createdAt }
];
var summaryLinkAttrs = (p, f) => [
  ...base(p, ENTITY.summaryLink, f.agentId),
  { key: "callerId", value: f.callerId },
  { key: "srcSummaryKey", value: f.srcSummaryKey },
  { key: "dstSummaryKey", value: f.dstSummaryKey },
  { key: "score", value: f.score },
  { key: "createdAt", value: f.createdAt }
];
var pubkeyAttrs = (p, f) => [
  { key: p.key, value: p.value },
  { key: "entityType", value: ENTITY.pubkey },
  { key: "owner", value: f.owner },
  { key: "createdAt", value: f.createdAt }
];
var accessGrantAttrs = (p, f) => [
  ...base(p, ENTITY.accessGrant, f.agentId),
  { key: "resourceKey", value: f.resourceKey },
  { key: "resourceType", value: f.resourceType },
  { key: "granteeAgentId", value: f.granteeAgentId },
  { key: "granteeAddress", value: f.granteeAddress },
  { key: "expiresAt", value: f.expiresAt },
  { key: "createdAt", value: f.createdAt }
];

// src/search.ts
function buildMemoryConditions(project, q) {
  const c = [
    { key: project.key, op: "eq", value: project.value },
    { key: "entityType", op: "eq", value: "memory" },
    { key: "agentId", op: "eq", value: q.agentId }
  ];
  if (q.scope) c.push({ key: "scope", op: "eq", value: q.scope });
  if (q.memKey) c.push({ key: "memKey", op: "eq", value: q.memKey });
  if (q.sinceMs !== void 0) c.push({ key: "createdAt", op: "gt", value: q.sinceMs });
  return c;
}
function withProject(project, entityType, extra = []) {
  return [
    { key: project.key, op: "eq", value: project.value },
    { key: "entityType", op: "eq", value: entityType },
    ...extra
  ];
}

// src/repo.ts
var import_utils = require("@arkiv-network/sdk/utils");
var import_query = require("@arkiv-network/sdk/query");
function toConditions(conds) {
  return conds.map((c) => {
    switch (c.op) {
      case "gt":
        return (0, import_query.gt)(c.key, c.value);
      case "gte":
        return (0, import_query.gte)(c.key, c.value);
      case "lt":
        return (0, import_query.lt)(c.key, c.value);
      case "lte":
        return (0, import_query.lte)(c.key, c.value);
      default:
        return (0, import_query.eq)(c.key, c.value);
    }
  });
}
function safeJson(e) {
  try {
    return e.toJson();
  } catch {
    return e.toText?.() ?? null;
  }
}
function attrsToRecord(e) {
  const out = {};
  for (const a of e.attributes) out[a.key] = a.value;
  return out;
}
async function query(ctx, conditions, limit = 50) {
  let q = ctx.publicClient.buildQuery();
  for (const cond of toConditions(conditions)) q = q.where(cond);
  const res = await q.createdBy(ctx.address).withPayload(true).withAttributes(true).withMetadata(true).limit(limit).fetch();
  return res.entities.map((e) => ({ key: e.key, payload: safeJson(e), attrs: attrsToRecord(e) }));
}
async function queryGlobal(ctx, conditions, limit = 50) {
  let q = ctx.publicClient.buildQuery();
  for (const cond of toConditions(conditions)) q = q.where(cond);
  const res = await q.withPayload(true).withAttributes(true).withMetadata(true).limit(limit).fetch();
  return res.entities.map((e) => ({
    key: e.key,
    payload: safeJson(e),
    attrs: attrsToRecord(e),
    owner: e.owner ? String(e.owner) : void 0,
    creator: e.creator ? String(e.creator) : void 0
  }));
}
async function getEntity(ctx, key) {
  const e = await ctx.publicClient.getEntity(key);
  return {
    key: e.key,
    payload: safeJson(e),
    attrs: attrsToRecord(e),
    owner: e.owner ? String(e.owner) : void 0,
    creator: e.creator ? String(e.creator) : void 0
  };
}
var Expiry = {
  agentCard: () => import_utils.ExpirationTime.fromDays(365),
  session: () => import_utils.ExpirationTime.fromHours(12),
  message: () => import_utils.ExpirationTime.fromHours(12),
  snapshot: () => import_utils.ExpirationTime.fromDays(90),
  memory: (scope) => scope === "run" ? import_utils.ExpirationTime.fromHours(12) : scope === "entity" ? import_utils.ExpirationTime.fromDays(7) : import_utils.ExpirationTime.fromDays(365),
  summary: () => import_utils.ExpirationTime.fromDays(365),
  topic: () => import_utils.ExpirationTime.fromDays(365),
  edge: () => import_utils.ExpirationTime.fromDays(365),
  pubkey: () => import_utils.ExpirationTime.fromDays(365)
};
var writeChain = Promise.resolve();
var WRITE_TIMEOUT_MS = 6e4;
function withTimeout(p, ms) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`Arkiv write timed out after ${ms / 1e3}s`)), ms))
  ]);
}
async function withRetry(fn, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = e?.message ?? "";
      if (!/underpriced|timed out|timeout|nonce|already known/i.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}
async function serializeWrite(fn) {
  const attempt = () => withRetry(() => withTimeout(fn(), WRITE_TIMEOUT_MS));
  const run = writeChain.then(attempt, attempt);
  writeChain = run.catch(() => {
  });
  return run;
}
async function create(ctx, payload, attributes, expiresIn) {
  const { entityKey, txHash } = await serializeWrite(
    () => ctx.wallet.createEntity({
      payload: (0, import_utils.jsonToPayload)(payload),
      contentType: "application/json",
      attributes,
      expiresIn
    })
  );
  return { entityKey, txHash };
}
function makeRepo(ctx, project) {
  return {
    createAgentCard(f) {
      const createdAt = Date.now();
      return create(
        ctx,
        { name: f.name, description: f.description, agentId: f.agentId, agentCardUri: f.agentCardUri ?? "", card: f.card ?? null, ...f.endpoint ? { endpoint: f.endpoint } : {}, ...f.origin ? { origin: f.origin } : {}, ...f.ensName ? { ensName: f.ensName, ensLabel: f.ensLabel, ensUserLabel: f.ensUserLabel } : {} },
        agentCardAttrs(project, { agentId: f.agentId, registryChainId: f.registryChainId, status: "active", createdAt, agentCardUri: f.agentCardUri ?? "", ensName: f.ensName, ensLabel: f.ensLabel, ensUserLabel: f.ensUserLabel, origin: f.origin, endpoint: f.endpoint }),
        Expiry.agentCard()
      );
    },
    createSession(f) {
      const now = Date.now();
      return create(
        ctx,
        { title: "Session", callerId: f.callerId },
        sessionAttrs(project, { agentId: f.agentId, callerId: f.callerId, sessionStatus: "open", startedAt: now, lastActivityAt: now, turnCount: 0 }),
        Expiry.session()
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
        Expiry.snapshot()
      );
    },
    createMemory(f) {
      const expiresIn = f.expiresInSec ? import_utils.ExpirationTime.fromSeconds(f.expiresInSec) : Expiry.memory(f.scope);
      const { expiresInSec: _omit, ...mem } = f;
      return create(ctx, { value: f.value }, memoryAttrs(project, { ...mem, createdAt: Date.now() }), expiresIn);
    },
    createSummary(f) {
      return create(
        ctx,
        { summary: f.summary, topics: f.topics, embedding: f.embedding },
        summaryAttrs(project, { agentId: f.agentId, callerId: f.callerId, sessionKey: f.sessionKey, summarySeq: f.summarySeq, createdAt: Date.now() }),
        Expiry.summary()
      );
    },
    createTopic(f) {
      return create(
        ctx,
        { name: f.name },
        topicAttrs(project, { agentId: f.agentId, callerId: f.callerId, topicKey: f.topicKey, createdAt: Date.now() }),
        Expiry.topic()
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
        entityKey: f.sessionKey,
        payload: (0, import_utils.jsonToPayload)({ title: "Session", callerId: f.callerId }),
        contentType: "application/json",
        attributes: sessionAttrs(project, {
          agentId: f.agentId,
          callerId: f.callerId,
          sessionStatus: f.sessionStatus ?? "open",
          startedAt: f.startedAt,
          lastActivityAt: Date.now(),
          turnCount: f.turnCount
        }),
        expiresIn: Expiry.session()
      }));
    },
    createPubKey(f) {
      return create(
        ctx,
        { x25519Pub: f.x25519Pub, scheme: f.scheme },
        pubkeyAttrs(project, { owner: f.owner, createdAt: Date.now() }),
        Expiry.pubkey()
      );
    },
    createEncryptedSummary(f) {
      return create(
        ctx,
        { enc: "v1", ciphertext: f.ciphertext, nonce: f.nonce },
        summaryAttrs(project, { agentId: f.agentId, callerId: f.callerId, sessionKey: f.sessionKey, summarySeq: f.summarySeq, createdAt: Date.now(), enc: "v1" }),
        Expiry.summary()
      );
    },
    createAccessGrant(f) {
      return create(
        ctx,
        { wrappedKey: f.wrappedKey, ephemeralPub: f.ephemeralPub, nonce: f.nonce },
        accessGrantAttrs(project, {
          agentId: f.agentId,
          resourceKey: f.resourceKey,
          resourceType: f.resourceType,
          granteeAgentId: f.granteeAgentId,
          granteeAddress: f.granteeAddress,
          expiresAt: f.expiresAt,
          createdAt: Date.now()
        }),
        f.expiresInSec
      );
    },
    async updateAccessGrant(entityKey, f) {
      await serializeWrite(() => ctx.wallet.updateEntity({
        entityKey,
        payload: (0, import_utils.jsonToPayload)({ wrappedKey: f.wrappedKey, ephemeralPub: f.ephemeralPub, nonce: f.nonce }),
        contentType: "application/json",
        attributes: accessGrantAttrs(project, {
          agentId: f.agentId,
          resourceKey: f.resourceKey,
          resourceType: f.resourceType,
          granteeAgentId: f.granteeAgentId,
          granteeAddress: f.granteeAddress,
          expiresAt: f.expiresAt,
          createdAt: f.createdAt
        }),
        expiresIn: f.expiresInSec
      }));
    },
    getEntity(key) {
      return getEntity(ctx, key);
    },
    async deleteEntity(entityKey) {
      await serializeWrite(() => ctx.wallet.deleteEntity({ entityKey }));
    },
    async extendEntity(entityKey, expiresIn) {
      await serializeWrite(() => ctx.wallet.extendEntity({ entityKey, expiresIn }));
    },
    queryGlobal(conditions, limit = 50) {
      return queryGlobal(ctx, conditions, limit);
    },
    query(conditions, limit = 50) {
      return query(ctx, conditions, limit);
    }
  };
}

// src/agent.ts
function createAgentClient(cfg) {
  const { ctx, project } = cfg;
  const repo = makeRepo(ctx, project);
  return {
    ctx,
    project,
    repo,
    async getAgentCard(agentId) {
      const rows = await repo.queryGlobal(
        withProject(project, "agentCard", [{ key: "agentId", op: "eq", value: agentId }]),
        1
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
        expiresInSec: input.expiresInSec
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
    getEntity: (k) => repo.getEntity(k)
  };
}
async function snapshotHash(prevHash, payload) {
  const text = `${prevHash}|${JSON.stringify(payload)}`;
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return `0x${hex}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ENTITY,
  Expiry,
  accessGrantAttrs,
  agentCardAttrs,
  buildMemoryConditions,
  createAgentClient,
  getEntity,
  makeRepo,
  memoryAttrs,
  messageAttrs,
  pubkeyAttrs,
  query,
  queryGlobal,
  sessionAttrs,
  snapshotAttrs,
  snapshotHash,
  summaryAttrs,
  summaryLinkAttrs,
  summaryTopicAttrs,
  topicAttrs,
  withProject
});
