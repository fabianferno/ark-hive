type Attr = {
    key: string;
    value: string | number;
};
type ProjectAttr = {
    readonly key: string;
    readonly value: string;
};
declare const ENTITY: {
    readonly agentCard: "agentCard";
    readonly session: "session";
    readonly message: "message";
    readonly snapshot: "snapshot";
    readonly memory: "memory";
    readonly summary: "summary";
    readonly topic: "topic";
    readonly summaryTopic: "summaryTopic";
    readonly summaryLink: "summaryLink";
    readonly pubkey: "pubkey";
    readonly accessGrant: "accessGrant";
};
type EntityType = (typeof ENTITY)[keyof typeof ENTITY];
interface AgentCardFields {
    agentId: string;
    registryChainId: number;
    status: string;
    createdAt: number;
    agentCardUri: string;
    ensName?: string;
    ensLabel?: string;
    ensUserLabel?: string;
    origin?: string;
    endpoint?: string;
}
interface SessionFields {
    agentId: string;
    callerId: string;
    sessionStatus: string;
    startedAt: number;
    lastActivityAt: number;
    turnCount: number;
}
interface MessageFields {
    sessionKey: string;
    agentId: string;
    role: "user" | "assistant";
    seq: number;
    ts: number;
}
interface SnapshotFields {
    sessionKey: string;
    agentId: string;
    commitSeq: number;
    commitHash: string;
    prevSnapshotKey: string;
    payloadSize: number;
    createdAt: number;
}
type MemoryScope = "run" | "entity" | "global";
interface MemoryFields {
    agentId: string;
    scope: MemoryScope;
    scopeKey: string;
    memKey: string;
    source: string;
    version: number;
    createdAt: number;
}
interface SummaryFields {
    agentId: string;
    callerId: string;
    sessionKey: string;
    summarySeq: number;
    createdAt: number;
    enc?: string;
}
interface TopicFields {
    agentId: string;
    callerId: string;
    topicKey: string;
    createdAt: number;
}
interface SummaryTopicFields {
    agentId: string;
    callerId: string;
    summaryKey: string;
    topicKey: string;
    sessionKey: string;
    createdAt: number;
}
interface SummaryLinkFields {
    agentId: string;
    callerId: string;
    srcSummaryKey: string;
    dstSummaryKey: string;
    score: number;
    createdAt: number;
}
interface PubKeyFields {
    owner: string;
    createdAt: number;
}
interface AccessGrantFields {
    agentId: string;
    resourceKey: string;
    resourceType: string;
    granteeAgentId: string;
    granteeAddress: string;
    expiresAt: number;
    createdAt: number;
}
declare const agentCardAttrs: (p: ProjectAttr, f: AgentCardFields) => Attr[];
declare const sessionAttrs: (p: ProjectAttr, f: SessionFields) => Attr[];
declare const messageAttrs: (p: ProjectAttr, f: MessageFields) => Attr[];
declare const snapshotAttrs: (p: ProjectAttr, f: SnapshotFields) => Attr[];
declare const memoryAttrs: (p: ProjectAttr, f: MemoryFields) => Attr[];
declare const summaryAttrs: (p: ProjectAttr, f: SummaryFields) => Attr[];
declare const topicAttrs: (p: ProjectAttr, f: TopicFields) => Attr[];
declare const summaryTopicAttrs: (p: ProjectAttr, f: SummaryTopicFields) => Attr[];
declare const summaryLinkAttrs: (p: ProjectAttr, f: SummaryLinkFields) => Attr[];
declare const pubkeyAttrs: (p: ProjectAttr, f: PubKeyFields) => Attr[];
declare const accessGrantAttrs: (p: ProjectAttr, f: AccessGrantFields) => Attr[];

interface ClientCtx {
    /** Arkiv walletClient — exposes createEntity/updateEntity/deleteEntity/extendEntity. */
    wallet: any;
    /** Arkiv publicClient — exposes buildQuery/getEntity. */
    publicClient: any;
    /** The wallet's address (lowercased 0x...). Used as `createdBy` filter for scoped reads. */
    address: `0x${string}`;
}

interface SdkConfig {
    ctx: ClientCtx;
    /** Project attribute stamped on every entity (namespaces this app inside the shared Arkiv store). */
    project: ProjectAttr;
}

type Condition = {
    key: string;
    op: "eq" | "gt" | "gte" | "lt" | "lte";
    value: string | number;
};
interface MemoryQuery {
    agentId: string;
    scope?: MemoryScope;
    memKey?: string;
    sinceMs?: number;
}
declare function buildMemoryConditions(project: ProjectAttr, q: MemoryQuery): Condition[];
declare function withProject(project: ProjectAttr, entityType: string, extra?: Condition[]): Condition[];

interface DecodedEntity {
    key: string;
    payload: unknown;
    attrs: Record<string, string | number>;
    owner?: string;
    creator?: string;
}
/** Query entities CREATED BY ctx.address. Use this for the user's own data. */
declare function query(ctx: ClientCtx, conditions: Condition[], limit?: number): Promise<DecodedEntity[]>;
/** Unscoped query — reads entities from any creator. Returns owner/creator metadata. */
declare function queryGlobal(ctx: ClientCtx, conditions: Condition[], limit?: number): Promise<DecodedEntity[]>;
/** Fetch a single entity by key (unscoped). */
declare function getEntity(ctx: ClientCtx, key: string): Promise<DecodedEntity>;
/** Default TTLs per entity type — tweak as needed. */
declare const Expiry: {
    agentCard: () => number;
    session: () => number;
    message: () => number;
    snapshot: () => number;
    memory: (scope: "run" | "entity" | "global") => number;
    summary: () => number;
    topic: () => number;
    edge: () => number;
    pubkey: () => number;
};
interface ClientRepo {
    createAgentCard(f: {
        agentId: string;
        registryChainId: number;
        name: string;
        description: string;
        agentCardUri?: string;
        card?: unknown;
        ensName?: string;
        ensLabel?: string;
        ensUserLabel?: string;
        origin?: string;
        endpoint?: string;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    createSession(f: {
        agentId: string;
        callerId: string;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    createMessage(f: MessageFields & {
        content: string;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    createSnapshot(f: {
        sessionKey: string;
        agentId: string;
        commitSeq: number;
        commitHash: string;
        prevSnapshotKey: string;
        state: unknown;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    createMemory(f: Omit<MemoryFields, "createdAt"> & {
        value: string;
        expiresInSec?: number;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    createSummary(f: {
        agentId: string;
        callerId: string;
        sessionKey: string;
        summarySeq: number;
        summary: string;
        topics: string[];
        embedding: number[];
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    createTopic(f: {
        agentId: string;
        callerId: string;
        topicKey: string;
        name: string;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    createSummaryTopic(f: {
        agentId: string;
        callerId: string;
        summaryKey: string;
        topicKey: string;
        sessionKey: string;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    createSummaryLink(f: {
        agentId: string;
        callerId: string;
        srcSummaryKey: string;
        dstSummaryKey: string;
        score: number;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    updateSessionActivity(f: {
        sessionKey: string;
        agentId: string;
        callerId: string;
        startedAt: number;
        turnCount: number;
        sessionStatus?: string;
    }): Promise<void>;
    createPubKey(f: {
        owner: string;
        x25519Pub: string;
        scheme: string;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    createEncryptedSummary(f: {
        agentId: string;
        callerId: string;
        sessionKey: string;
        summarySeq: number;
        ciphertext: string;
        nonce: string;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    createAccessGrant(f: AccessGrantFields & {
        wrappedKey: string;
        ephemeralPub: string;
        nonce: string;
        expiresInSec: number;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    updateAccessGrant(entityKey: string, f: AccessGrantFields & {
        wrappedKey: string;
        ephemeralPub: string;
        nonce: string;
        expiresInSec: number;
    }): Promise<void>;
    getEntity(key: string): Promise<DecodedEntity>;
    deleteEntity(entityKey: string): Promise<void>;
    extendEntity(entityKey: string, expiresIn: number): Promise<void>;
    queryGlobal(conditions: Condition[], limit?: number): Promise<DecodedEntity[]>;
    query(conditions: Condition[], limit?: number): Promise<DecodedEntity[]>;
}
declare function makeRepo(ctx: ClientCtx, project: ProjectAttr): ClientRepo;

interface AgentClient {
    ctx: ClientCtx;
    project: ProjectAttr;
    repo: ClientRepo;
    getAgentCard(agentId: string): Promise<DecodedEntity | null>;
    listMyAgents(limit?: number): Promise<DecodedEntity[]>;
    putMemory(input: {
        agentId: string;
        scope: MemoryScope;
        scopeKey: string;
        memKey: string;
        value: string;
        source?: string;
        version?: number;
        expiresInSec?: number;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    listMemory(q: {
        agentId: string;
        scope?: MemoryScope;
        memKey?: string;
        sinceMs?: number;
        limit?: number;
    }): Promise<DecodedEntity[]>;
    openSession(input: {
        agentId: string;
        callerId: string;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    listSessions(agentId: string, limit?: number): Promise<DecodedEntity[]>;
    bumpSession(input: {
        sessionKey: string;
        agentId: string;
        callerId: string;
        startedAt: number;
        turnCount: number;
        sessionStatus?: string;
    }): Promise<void>;
    closeSession(input: {
        sessionKey: string;
        agentId: string;
        callerId: string;
        startedAt: number;
        turnCount: number;
    }): Promise<void>;
    appendMessage(input: {
        sessionKey: string;
        agentId: string;
        role: "user" | "assistant";
        seq: number;
        content: string;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    listMessages(sessionKey: string, limit?: number): Promise<DecodedEntity[]>;
    commitSnapshot(input: {
        sessionKey: string;
        agentId: string;
        commitSeq: number;
        commitHash: string;
        prevSnapshotKey: string;
        state: unknown;
    }): Promise<{
        entityKey: string;
        txHash: string;
    }>;
    listSnapshots(sessionKey: string, limit?: number): Promise<DecodedEntity[]>;
    query(conditions: Condition[], limit?: number): Promise<DecodedEntity[]>;
    queryGlobal(conditions: Condition[], limit?: number): Promise<DecodedEntity[]>;
    getEntity(key: string): Promise<DecodedEntity>;
}
declare function createAgentClient(cfg: SdkConfig): AgentClient;
/**
 * Hash a snapshot payload into a deterministic commitHash.
 * Browser/Node compatible via Web Crypto (SubtleCrypto).
 */
declare function snapshotHash(prevHash: string, payload: unknown): Promise<string>;

export { type AccessGrantFields, type AgentCardFields, type AgentClient, type Attr, type ClientCtx, type ClientRepo, type Condition, type DecodedEntity, ENTITY, type EntityType, Expiry, type MemoryFields, type MemoryQuery, type MemoryScope, type MessageFields, type ProjectAttr, type PubKeyFields, type SdkConfig, type SessionFields, type SnapshotFields, type SummaryFields, type SummaryLinkFields, type SummaryTopicFields, type TopicFields, accessGrantAttrs, agentCardAttrs, buildMemoryConditions, createAgentClient, getEntity, makeRepo, memoryAttrs, messageAttrs, pubkeyAttrs, query, queryGlobal, sessionAttrs, snapshotAttrs, snapshotHash, summaryAttrs, summaryLinkAttrs, summaryTopicAttrs, topicAttrs, withProject };
