# Arkiv Entity Schema

Data model for AgentState on **Arkiv (Braga testnet)**. Source of truth: `agent/src/entities.ts` (attributes) + `agent/src/repo.ts` (payloads + expiry). The web app reads these via the agent service HTTP API.

## Conventions (every entity)

- **`project`** (str) — `PROJECT_ATTRIBUTE`, stamped on every create and filtered on every query. Distinguishes this app's data in Arkiv's shared store.
- **`entityType`** (str) — one of `agentCard | session | message | snapshot | memory`.
- **`agentId`** (str) — the ERC-8004 token id (Ethereum Sepolia), binding every entity to its agent.
- **Ownership:** all entities are written by the agent wallet, so `$creator` = the agent address. Trusted reads filter `.createdBy(AGENT_ADDRESS)` (creator is immutable — can't be spoofed).
- **Attribute typing:** numeric attributes (timestamps, sequence numbers, sizes, chain id) are stored as **numbers** so they support range queries (`gt/gte/lt/lte`); everything else is a string (`eq` / glob). No FK type — relationships are shared attribute keys.
- **Expiration:** `expiresIn` via `ExpirationTime` helpers (seconds). Arkiv has **no `never()`**, so "permanent" entities use a long TTL (365d) and are extended as needed. Payloads are JSON via `jsonToPayload`, content type `application/json`.

Relationship keys: `sessionKey` (session→messages/snapshots), `prevSnapshotKey` (snapshot hash-chain), `scope`+`scopeKey` (memory cascade).

---

## AgentCard
Registration mirror: binds the on-chain 8004 identity to Arkiv. The full ERC-8004 card (all fields) is pinned to IPFS; `agentCardUri` points to it and equals the on-chain `tokenURI`.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `project` | str | eq | |
| `entityType` | str | eq | `agentCard` |
| `agentId` | str | eq | 8004 token id |
| `registryChainId` | **num** | range/eq | `11155111` (Ethereum Sepolia) |
| `status` | str | eq | `active` \| `idle` |
| `createdAt` | **num** | range | epoch ms |
| `agentCardUri` | str | eq | `ipfs://…` / gateway URL of the pinned card |
| `ensName` / `ensLabel` / `ensUserLabel` | str | eq | optional 4-level ENS (`<agent>-<id>.<user>.ark-hive.eth`), Arkiv-resolved |
| `origin` | str | eq | `created` (minted here) \| `marketplace` (adopted external 8004 agent) |
| `endpoint` | str | eq | optional agent chat endpoint URL (mirrors `card.endpoints[0].url`); used for endpoint-call + x402 |

- **Payload:** `{ name, description, agentId, agentCardUri, card, endpoint?, origin?, ensName? }` (`card` = the full ERC-8004 agent card JSON).
- **expiresIn:** `fromDays(365)`.
- **Adopted agents** (marketplace): same `agentCard` shape with `origin: "marketplace"` and `agentCardUri` pointing at the external agent's on-chain `tokenURI`. No new mint, no NameStone write — discoverable in the user's Agents list and chat-able (endpoint → x402 pay → persona fallback).

## Session
Run-scope root for a conversation.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `project` / `entityType` / `agentId` | str | eq | `entityType` = `session` |
| `callerId` | str | eq | operator/caller wallet |
| `sessionStatus` | str | eq | `open` \| `closed` |
| `startedAt` | **num** | range | epoch ms |
| `lastActivityAt` | **num** | range | bumped each turn |
| `turnCount` | **num** | range | message count |

- **Payload:** `{ title, callerId }`.
- **expiresIn:** `fromHours(12)`.

## Message
One chat turn. Linked to its session by `sessionKey`, ordered by numeric `seq`.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `project` / `entityType` / `agentId` | str | eq | `entityType` = `message` |
| `sessionKey` | str | eq | parent Session entity key |
| `role` | str | eq | `user` \| `assistant` |
| `seq` | **num** | range | turn order within session |
| `ts` | **num** | range | epoch ms |

- **Payload:** `{ role, content }`.
- **expiresIn:** `fromHours(12)` (≤ session lifetime).

## StateSnapshot
Hash-chained state checkpoint per turn. Chain via `prevSnapshotKey`; integrity via `commitHash = sha256(prevHash + payload)`.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `project` / `entityType` / `agentId` | str | eq | `entityType` = `snapshot` |
| `sessionKey` | str | eq | parent Session entity key |
| `commitSeq` | **num** | range | monotonic per session |
| `commitHash` | str | eq | `0x…` sha256 of the chain step |
| `prevSnapshotKey` | str | eq | previous snapshot's entity key (`""` for genesis) |
| `payloadSize` | **num** | range | serialized state size |
| `createdAt` | **num** | range | epoch ms |

- **Payload:** `{ state }`.
- **expiresIn:** `fromDays(90)`.

## MemoryEntry
ContextBus store. Cascade resolution **run → entity → global** (first hit wins); differentiated TTL per scope.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `project` / `entityType` / `agentId` | str | eq | `entityType` = `memory` |
| `scope` | str | eq | `run` \| `entity` \| `global` |
| `scopeKey` | str | eq | `run`→sessionKey · `entity`→callerId · `global`→agentId |
| `memKey` | str | eq | logical key (e.g. `goal`, `lastReply`) |
| `source` | str | eq | origin (e.g. `chat`) |
| `version` | **num** | range | bump per write |
| `createdAt` | **num** | range | epoch ms |

- **Payload:** `{ value }`.
- **expiresIn:** `run` = `fromHours(12)` · `entity` = `fromDays(7)` · `global` = `fromDays(365)`.

---

## RAG entities (connected session-summary retrieval)

Per-session summaries, embedded and linked into a per-user topic + similarity graph. Written on session close and on a rolling turn cap. Retrieval = tag filter (topic edges) → in-process embedding cosine re-rank (Arkiv has no vector index). All scoped to `agentId` + `callerId`.

### SessionSummary
| Attribute | Type | Index | Notes |
|---|---|---|---|
| `project` / `entityType` / `agentId` | str | eq | `entityType` = `summary` |
| `callerId` | str | eq | per-user scope |
| `sessionKey` | str | eq | source session |
| `summarySeq` | **num** | range | rolling version (latest wins) |
| `createdAt` | **num** | range | epoch ms |

- **Payload:** `{ summary, topics[], embedding[] }` (embedding from OpenAI `text-embedding-3-small`).
- **expiresIn:** `fromDays(365)`.
- **Encrypted variant:** carries the extra attribute `enc="v1"` and payload `{ enc, ciphertext, nonce }` (base64) instead of `{ summary, topics, embedding }`.

### Topic
Canonical, deduped topic node (find-or-create by `topicKey`).

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `project` / `entityType` / `agentId` | str | eq | `entityType` = `topic` |
| `callerId` | str | eq | per-user scope |
| `topicKey` | str | eq | normalized slug (`normalizeTopic`) |
| `createdAt` | **num** | range | |

- **Payload:** `{ name }`. **expiresIn:** `fromDays(365)`.

### SummaryTopic (link edge — summary ↔ topic)
Many-to-many edge enabling topic fetch.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `project` / `entityType` / `agentId` | str | eq | `entityType` = `summaryTopic` |
| `callerId` | str | eq | |
| `summaryKey` | str | eq | SessionSummary entity key |
| `topicKey` | str | eq | Topic slug |
| `sessionKey` | str | eq | |
| `createdAt` | **num** | range | |

- **Payload:** `{}`. **expiresIn:** `fromDays(365)`.

### SummaryLink (kNN edge — summary ↔ summary)
"Related sessions" similarity edges (top-k by embedding cosine at index time).

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `project` / `entityType` / `agentId` | str | eq | `entityType` = `summaryLink` |
| `callerId` | str | eq | |
| `srcSummaryKey` | str | eq | new summary |
| `dstSummaryKey` | str | eq | neighbor summary |
| `score` | **num** | range | cosine ×1000 (per-mille integer — Arkiv numeric attrs must be integers) |
| `createdAt` | **num** | range | |

- **Payload:** `{}`. **expiresIn:** `fromDays(365)`.

---

## PubKey
One entity per wallet; stores the public X25519 key used to encrypt session summaries for the owner.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `project` | str | eq | |
| `entityType` | str | eq | `pubkey` |
| `owner` | str | eq | wallet address = `$creator` |
| `createdAt` | **num** | range | epoch ms |

- **Payload:** `{ x25519Pub, scheme }`.
- **expiresIn:** `fromDays(365)`.
- Note: does NOT carry `agentId` — one record per wallet address, not per agent.

## AccessGrant
Wrapped-key entity granting decrypt access to an encrypted summary. Auto-revokes via expiry.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `project` / `entityType` / `agentId` | str | eq | `entityType` = `accessGrant` |
| `resourceKey` | str | eq | the encrypted summary entity key |
| `resourceType` | str | eq | `summary` |
| `granteeAgentId` | str | eq | `""` for self-grant |
| `granteeAddress` | str | eq | wallet that can decrypt — queried on read |
| `expiresAt` | **num** | range | epoch ms; grant validity end |
| `createdAt` | **num** | range | epoch ms |

- **Payload:** `{ wrappedKey, ephemeralPub, nonce }` (base64).
- **expiresIn:** configurable per grant (1h / 24h / 7d / custom; self-grant = 365d).
- Auto-revoke: when the grant expires Arkiv stops returning it = access revoked, no revocation list. Revoke early = delete; extend = `extendEntity`.

---

## Query patterns

- **Browse agents:** `eq(project) ∧ eq(entityType,"agentCard")` + `.createdBy(AGENT_ADDRESS)`.
- **Session history:** `eq(project) ∧ eq(entityType,"message") ∧ eq(sessionKey,K)` → sort by `seq`.
- **Snapshot chain:** `eq(project) ∧ eq(entityType,"snapshot") ∧ eq(sessionKey,K)` → sort by `commitSeq`.
- **Memory search:** `eq(project) ∧ eq(entityType,"memory") ∧ eq(agentId,A)` [`∧ eq(scope,S)`] [`∧ gt(createdAt,since)`].
- **Context get (cascade):** for each scope in `[run, entity, global]`, `eq(scope) ∧ eq(scopeKey) ∧ eq(memKey)` limit 1; stop at first hit.
- **Topic fetch:** `eq(entityType,"summaryTopic") ∧ eq(agentId,A) ∧ eq(callerId,C) ∧ eq(topicKey,T)` → `summaryKey`s → fetch summaries.
- **RAG retrieve:** gather candidate summaries (topic-gated via `summaryTopic`, else recent `eq(entityType,"summary") ∧ eq(callerId,C)`) → re-rank by cosine of `embedding` vs query embedding → top-k.
- **Related sessions:** `eq(entityType,"summaryLink") ∧ eq(srcSummaryKey,S)` → `dstSummaryKey`s.
- **Resolve pubkey:** `eq(entityType,"pubkey") ∧ eq(owner,addr)` (no `createdBy` scope — reads any wallet's pubkey).
- **Grants for me:** `eq(entityType,"accessGrant") ∧ eq(granteeAddress,me)` (expired grants auto-omitted = auto-revoke).
