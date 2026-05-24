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

- **Payload:** `{ name, description, agentId, agentCardUri, card }` (`card` = the full ERC-8004 agent card JSON).
- **expiresIn:** `fromDays(365)`.

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

## Query patterns

- **Browse agents:** `eq(project) ∧ eq(entityType,"agentCard")` + `.createdBy(AGENT_ADDRESS)`.
- **Session history:** `eq(project) ∧ eq(entityType,"message") ∧ eq(sessionKey,K)` → sort by `seq`.
- **Snapshot chain:** `eq(project) ∧ eq(entityType,"snapshot") ∧ eq(sessionKey,K)` → sort by `commitSeq`.
- **Memory search:** `eq(project) ∧ eq(entityType,"memory") ∧ eq(agentId,A)` [`∧ eq(scope,S)`] [`∧ gt(createdAt,since)`].
- **Context get (cascade):** for each scope in `[run, entity, global]`, `eq(scope) ∧ eq(scopeKey) ∧ eq(memKey)` limit 1; stop at first hit.
