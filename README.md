<div align="center">

<img src="./logo.jpg" alt="ark-hive" width="120" />

# ark-hive

**On-chain AI agents whose every thought is a verifiable, query-able entity on Arkiv.**

Mint an ERC-8004 agent, chat with it, and watch its sessions, memory, hash-chained
state, and a self-organizing knowledge graph persist to [Arkiv](https://arkiv.network) —
all signed by your own embedded wallet, no blockchain knowledge required.

*Arkiv × ETHNS Builder Challenge — Theme: **AI** (+ **Privacy**)*

</div>

> _Add a demo GIF here, e.g._ `![demo](./docs/demo.gif)` _— record: connect → mint agent → chat → open the 3D graph → share an encrypted memory._

---

## Why this is interesting

Most "AI agent" demos keep their state in a hidden database. ark-hive turns the
agent's **entire cognition into a public, structured, verifiable data layer**:

- Every **chat turn** writes a `message` + a **hash-chained `snapshot`** — a tamper-evident
  audit trail of the agent's state, `commitHash = sha256(prevHash + payload)`.
- Every **memory** lives in a 3-tier `run → entity → global` cascade with differentiated TTLs.
- Closed sessions are **summarized, embedded, and woven into a knowledge graph** of topics
  (many-to-many edges) and kNN "related session" similarity edges — RAG with no vector DB,
  just Arkiv entities + in-process cosine re-rank.
- The agent's identity is an **ERC-8004 NFT** on Ethereum Sepolia; its card is pinned to
  IPFS and mirrored as an Arkiv entity.

You can literally **see the agent think** in a live 3D neural graph of its Arkiv entities.

---

## Two chains, two planes

| Plane | Where | What lives here |
|---|---|---|
| **Registry** | Ethereum Sepolia — ERC-8004 v1.0 registry `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Agent identity (NFT). Minting returns the `agentId` that binds every entity. |
| **Data** | **Arkiv** (Braga testnet, chain id `60138453102`) | All agent state: sessions, messages, snapshots, memory, RAG knowledge graph. |

---

## Architecture

```
┌─────────────────────────── Browser (Next.js 14, App Router) ───────────────────────────┐
│                                                                                          │
│  UI (app/, components/)          lib/agent/*  ── orchestration ──┐                        │
│   • agents / chat / memory        createAgent · chatTurn · ...    │                        │
│   • knowledge graph               │                              ▼                        │
│   • live 3D visualizer            │              lib/arkiv-client/*  (data layer)         │
│                                   │              repo · contextbus · rag · search         │
│  Privy embedded wallet ───────────┘                       │                               │
│   signs every Arkiv write & the 8004 mint (auto-sign)     │                               │
└───────────────────────────────────────────────────────────┼───────────────────────────┘
                │ Sepolia mint        │ Braga writes/reads    │  /ai/* only (no secrets)
                ▼                     ▼                        ▼
        ERC-8004 Registry      Arkiv (Braga)          agent/ (Hono service, stateless)
                                                        /ai/reply · /summarize · /embed · /pin
                                                        (OpenAI + Pinata keys live here only)
```

**Key design choice:** the agent's _stateful_ logic runs **in the browser, signed by the
user's wallet**, so the user owns their data on Arkiv. The Node service (`agent/`) is
**stateless** — it only holds the OpenAI/Pinata keys and does LLM/IPFS work. The web app
reaches it through a same-origin proxy (`app/agent-api/[...path]/route.ts`) with a long
timeout so slow Arkiv writes aren't cut off.

---

## Arkiv integration — the data layer in depth

> Source of truth: [`agent/src/entities.ts`](./agent/src/entities.ts) (attributes) +
> [`agent/src/repo.ts`](./agent/src/repo.ts) (payloads + expiry). Full schema in
> [`schema.md`](./schema.md). Client mirror in [`lib/arkiv-client/*`](./lib/arkiv-client).

**Conventions on every entity**
- **`project`** attribute (`NEXT_PUBLIC_PROJECT_VALUE`) namespaces this app inside Arkiv's
  shared store and is filtered on **every** query.
- **Typed attributes:** numerics (timestamps, `seq`, `turnCount`, sizes, chain id, cosine
  score) are stored as **integers** so they support **range queries** (`gt/gte/lt/lte`);
  everything else is a string (`eq`/glob). Cosine scores are stored ×1000 (per-mille) since
  Arkiv numeric attrs must be integers.
- **Ownership:** writes are signed by the user's wallet; trusted reads filter by `$creator`
  (immutable — can't be spoofed).
- **Differentiated expiration** per entity type via `ExpirationTime` helpers (see table).

**Entity types (9)**

| Entity | Purpose | Key relationships | `expiresIn` |
|---|---|---|---|
| `agentCard` | ERC-8004 identity mirror (IPFS card URI) | `agentId` | 365d |
| `session` | Conversation root | — | 12h |
| `message` | One chat turn | `sessionKey` → session, ordered by `seq` | 12h |
| `snapshot` | Hash-chained state checkpoint | `sessionKey`, `prevSnapshotKey` (chain) | 90d |
| `memory` | ContextBus entry, `run/entity/global` cascade | `scopeKey` | 12h / 7d / 365d |
| `summary` | Per-session summary + embedding | `sessionKey` | 365d |
| `topic` | Canonical deduped topic node | `topicKey` | 365d |
| `summaryTopic` | **M:N** edge summary ↔ topic | `summaryKey`, `topicKey` | 365d |
| `summaryLink` | **kNN** edge summary ↔ summary (cosine) | `srcSummaryKey`, `dstSummaryKey`, `score` | 365d |

**Query patterns** (see [`schema.md`](./schema.md) for all): attribute-filtered queries,
range filters (e.g. `gt(createdAt, since)`), session history sorted by `seq`, snapshot
chain by `commitSeq`, the `run→entity→global` memory cascade (first hit wins), and
topic-gated RAG retrieval re-ranked by embedding cosine.

**Standout features**
- **Tamper-evident snapshots** — SHA-256 hash chain across a session's state
  ([`agent/src/hashchain.ts`](./agent/src/hashchain.ts)).
- **Knowledge graph as entities** — topics + similarity edges, no vector DB.
- **Per-user data ownership** via Privy embedded wallet signing every write.

---

## Quick start

**Prerequisites:** Node 22+, a [Privy app id](https://dashboard.privy.io), an OpenAI key, a
Pinata JWT, and a wallet funded on **both** Sepolia (ETH) and Braga
(GLM — [faucet](https://braga.hoodi.arkiv.network/faucet/)).

```bash
# 1. install Arkiv agent skills (gives AI assistants the SDK knowledge)
npx skills experimental_install

# 2. stateless AI/IPFS service
cd agent
cp .env.example .env          # fill in AGENT_PRIVATE_KEY, OPENAI_API_KEY, PINATA_JWT, PROJECT_VALUE
npm install                   # postinstall runs the required @chaoschain/sdk patch
npm run dev                   # → http://localhost:8787

# 3. web app (new terminal, from repo root)
cp .env.local.example .env.local   # fill in PRIVY app id + PROJECT_VALUE (must match agent's)
npm install
npm run dev                   # → http://localhost:3000
```

Then: **connect** (Privy) → **create an agent** (mints the 8004 NFT) → **chat** → open the
**Visualizer** to watch entities appear → browse **Knowledge** / **Memory**.

### Environment

**Web (`.env.local`)**

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | From the Privy dashboard |
| `NEXT_PUBLIC_PROJECT_VALUE` | Arkiv namespace — **must match** the agent's `PROJECT_VALUE` |
| `NEXT_PUBLIC_AGENT_URL` | Client-side agent URL (default `http://localhost:8787`) |
| `AGENT_ORIGIN` | Server-side proxy target (default `http://localhost:8787`) |

**Agent (`agent/.env`)** — see [`agent/.env.example`](./agent/.env.example): `AGENT_PRIVATE_KEY`,
`OPENAI_API_KEY`, `PINATA_JWT`/`PINATA_GATEWAY`, `PROJECT_VALUE`, `REGISTRY_RPC`, `BRAGA_RPC`,
plus optional `OPENAI_MODEL`, `EMBEDDING_MODEL`, `RAG_TOP_K`, `RAG_ROLL_EVERY`.

> The agent CLI can also mint from the terminal: `cd agent && npm run register "Name" "desc"`.

---

## Commands

```bash
# web (repo root)
npm run dev | build | start
npm test                       # vitest (jsdom)

# agent service (cd agent)
npm run dev | start
npm run typecheck              # strict tsc --noEmit
npm test                       # pure unit, no network
npm run smoke:identity|arkiv|brain|chat|rag|card   # live, need funded keys / OpenAI
```

---

## Project layout

```
app/                  Next.js routes: agents, chat, knowledge, memory, visualizer
components/           UI — chat, graph (3D neural viz), landing, inspector, timeline
lib/agent/*           Browser-side orchestration (createAgent, chatTurn, sessions, knowledge)
lib/arkiv-client/*    User-signed Arkiv data layer (repo, contextbus, rag, search)
lib/wallet/*          Privy embedded wallet → Arkiv wallet client, PROJECT_ATTRIBUTE
agent/src/*           Stateless Hono service (/ai/*) + schema source of truth + register CLI
schema.md             Full Arkiv entity schema & query patterns
```

---

## Tech

Next.js 14 · TypeScript · Tailwind · Privy (embedded wallets) · `@arkiv-network/sdk` ·
viem · Three.js + @xyflow/react (3D graph) · OpenAI (chat + embeddings) · Pinata (IPFS) ·
ERC-8004 via ChaosChain SDK.
