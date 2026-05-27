# arkiv-agent-sdk

> Portable agent memory and state on [Arkiv](https://arkiv.network).
> Read and write ERC-8004 agent sessions, messages, snapshots and memory entities from any TypeScript app.

```
npm install arkiv-agent-sdk @arkiv-network/sdk
```

This is the package that powers [ark-hive](https://github.com/Philotheephilix/ark-hive) — an ERC-8004 agent platform where every agent's memory lives as Arkiv entities. Use this SDK to:

- **Read another agent's memory** from your own app — memory you actually own, portable across any app that reads Arkiv.
- **Write agent state** (sessions, messages, hash-chained snapshots, scoped memory) signed by *your* wallet.
- **Skip the schema work** — entity shapes, project namespacing, TTLs, and nonce serialization are all handled.

---

## Quick start

```ts
import {
  createAgentClient,
  type ClientCtx,
  type ProjectAttr,
} from "arkiv-agent-sdk";
import { createPublicClient, createWalletClient, http } from "@arkiv-network/sdk";
import { privateKeyToAccount } from "viem/accounts";

const BRAGA = {
  id: 60138453102,
  name: "Arkiv Braga",
  nativeCurrency: { name: "GLM", symbol: "GLM", decimals: 18 },
  rpcUrls: { default: { http: ["https://braga.hoodi.arkiv.network/rpc"] } },
} as const;

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);

const ctx: ClientCtx = {
  publicClient: createPublicClient({ chain: BRAGA, transport: http() }),
  wallet: createWalletClient({ chain: BRAGA, transport: http(), account }),
  address: account.address,
};

const project: ProjectAttr = { key: "project", value: "my-app" };

const agent = createAgentClient({ ctx, project });
```

> **Browser:** swap the privateKey wallet for your Privy / wagmi / RainbowKit signer — anything that the Arkiv SDK's `createWalletClient` accepts. The SDK never touches the key directly.

---

## Write memory

```ts
await agent.putMemory({
  agentId: "42",
  scope: "global",            // "run" | "entity" | "global"
  scopeKey: "preferences",
  memKey: "favorite_color",
  value: "ultraviolet",
  expiresInSec: 60 * 60 * 24, // optional — overrides the scope's default TTL
});
```

## Read memory (yours)

```ts
const mems = await agent.listMemory({ agentId: "42", scope: "global", limit: 20 });
for (const m of mems) console.log(m.attrs.memKey, "→", (m.payload as any).value);
```

## Read another agent's memory (the portability demo)

```ts
const card = await agent.getAgentCard("42");
console.log("agent owner:", card?.creator);

const sessions = await agent.queryGlobal([
  { key: "project", op: "eq", value: project.value },
  { key: "entityType", op: "eq", value: "session" },
  { key: "agentId", op: "eq", value: "42" },
]);
```

---

## Sessions, messages, snapshots

```ts
const { entityKey: sessionKey } = await agent.openSession({
  agentId: "42",
  callerId: ctx.address,
});

await agent.appendMessage({
  sessionKey, agentId: "42", role: "user", seq: 1, content: "hello",
});

import { snapshotHash } from "arkiv-agent-sdk";
const prev = "0x" + "00".repeat(32);
const state = { turn: 1, lastUser: "hello" };
const commitHash = await snapshotHash(prev, state);

await agent.commitSnapshot({
  sessionKey, agentId: "42",
  commitSeq: 1, commitHash, prevSnapshotKey: prev,
  state,
});

await agent.bumpSession({
  sessionKey, agentId: "42", callerId: ctx.address,
  startedAt: Date.now() - 1000, turnCount: 1,
});
```

---

## API

`createAgentClient({ ctx, project })` returns:

| Method | Notes |
|---|---|
| `getAgentCard(agentId)` | unscoped — finds the card written by whichever wallet minted it |
| `listMyAgents(limit?)` | scoped to your wallet |
| `putMemory({ agentId, scope, scopeKey, memKey, value, expiresInSec? })` | scope: `run` (12h) / `entity` (7d) / `global` (365d) by default |
| `listMemory({ agentId, scope?, memKey?, sinceMs?, limit? })` | |
| `openSession({ agentId, callerId })` | |
| `listSessions(agentId, limit?)` | |
| `bumpSession({ sessionKey, agentId, callerId, startedAt, turnCount })` | re-stamps `lastActivityAt`; Arkiv `updateEntity` replaces all attrs, the SDK does the bookkeeping |
| `closeSession(...)` | same shape as `bumpSession`, sets `sessionStatus: "closed"` |
| `appendMessage({ sessionKey, agentId, role, seq, content })` | |
| `listMessages(sessionKey, limit?)` | |
| `commitSnapshot({ sessionKey, agentId, commitSeq, commitHash, prevSnapshotKey, state })` | use `snapshotHash(prev, state)` to compute `commitHash` |
| `listSnapshots(sessionKey, limit?)` | |
| `query / queryGlobal / getEntity` | low-level escape hatches |
| `repo` | the underlying `ClientRepo` if you need encrypted summaries, access grants, topic edges, etc. |

### Entity types

`agentCard · session · message · snapshot · memory · summary · topic · summaryTopic · summaryLink · pubkey · accessGrant`

All entities carry `{ key: "<project>", value: "<your-app>" }` (the `project` attr you pass to `createAgentClient`) so reads/writes stay namespaced inside Arkiv's shared store. Numeric attributes (`createdAt`, `seq`, `commitSeq`, etc.) are stored as numbers so you can use `gt/gte/lt/lte` range queries.

### Default TTLs

| Entity | Default expiry |
|---|---|
| agentCard | 365 days |
| session | 12 hours (extend with `bumpSession`) |
| message | 12 hours |
| snapshot | 90 days |
| memory `run` / `entity` / `global` | 12h / 7d / 365d |
| summary / topic / edges | 365 days |
| pubkey | 365 days |

Override per-entity by passing your own `expiresIn` via the lower-level `repo.*` calls, or `expiresInSec` for memory.

---

## Notes

- **Browser-safe.** No `node:`/`fs` imports. SHA-256 uses Web Crypto.
- **Nonce-serialized writes.** All wallet writes go through an in-process promise chain with timeout + retry on `underpriced` / `nonce` errors, so rapid writes from a single wallet don't collide.
- **Scoped reads.** `agent.query()` filters by `createdBy(ctx.address)`. `agent.queryGlobal()` does not — use it to read other wallets' entities.
- **No vector index.** RAG over `summary` entities is "filter then re-rank in process" — see the host repo for an example.

---

MIT
