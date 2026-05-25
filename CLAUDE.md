# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**ark-hive** is an ERC-8004 agent platform (Arkiv × ETHNS Builder Challenge). Users create on-chain agents, chat with them, and watch state/memory persist to Arkiv. There are **two chains and two planes**:

- **Registry plane** — ERC-8004 v1.0 identity on **Ethereum Sepolia** (registry `0x8004A818BFB912233c491871b3d84c89A494BD9e`). Minting returns the `agentId` that binds every entity.
- **Data plane** — `@arkiv-network/sdk` on **Braga** (chain id `60138453102`). All app state (sessions, messages, snapshots, memory, RAG) lives here as Arkiv entities.

## Two codebases in one repo

| | Root (`/`) | `agent/` |
|---|---|---|
| Role | Next.js 14 web app (App Router), the live UI | Node service (Hono + tsx) |
| Wallet | User's **Privy embedded wallet** signs everything | Has its own `AGENT_PRIVATE_KEY` (used only by the CLI `register` script) |
| Build | `npm run dev/build` | `cd agent && npm run dev/start` |
| TS | `tsconfig.json` **excludes `agent/`** — it's a separate project with its own tsconfig |

The web app talks to `agent/` **only** for stateless LLM/IPFS work, via the same-origin proxy `app/agent-api/[...path]/route.ts` (long 115s timeout so slow Arkiv writes aren't cut off; a Next rewrite's undici fetch caps at ~30s). The agent server (`agent/src/server.ts`) is now **stateless**: only `/health`, `/ai/reply`, `/ai/summarize`, `/ai/embed` (OpenAI), and `/ai/pin` (Pinata/IPFS). All stateful agent flows moved client-side.

## Where the agent logic actually runs (important)

Agent flows execute **in the browser**, signed by the user's Privy wallet — not on the server:

- `lib/agent/*` — the orchestration: `createAgent.ts` (mint + pin + write card), `chat.ts` (`chatTurn`), `sessions.ts`, `knowledge.ts`, `agents.ts`.
- `lib/arkiv-client/*` — the Arkiv data layer these flows use, **ported from `agent/src/*`** to take an injected `ClientCtx` (`{ wallet, publicClient, address }` from `useUserWallet`) instead of module singletons. Reads are scoped to the user's address; writes are user-signed.
- `agent/src/*` (entities, repo, contextbus, rag, search, hashchain) — the **original server-side implementation**. Now superseded for runtime except the `/ai/*` endpoints and `bin/register.ts`, but `agent/src/entities.ts` + `repo.ts` remain the **schema source of truth** (see `schema.md`). When you change an entity shape, change it in both `agent/src/*` and the `lib/arkiv-client/*` mirror.

### `lib/arkiv/*` is a SEPARATE, older layer — do not confuse with `lib/arkiv-client/*`

`lib/arkiv/*` is an in-memory **`FakeArkivClient`** (no testnet). It is used **only** by the Visualizer: `app/visualizer/page.tsx`, the `useEntity`/`useEntityWatch` hooks, and `lib/graph/buildGraph.ts`. The real, user-signed data path is `lib/arkiv-client/*`. Don't wire new agent flows through `lib/arkiv/*`.

## The two key flows

**Create agent** (`lib/agent/createAgent.ts`): build full ERC-8004 AgentCard → pin to IPFS (`aiPin` → server holds Pinata key) → switch Privy wallet to Sepolia → raw-viem `register(string)` mint → switch back to Braga → write `agentCard` entity to Arkiv.

**Chat turn** (`lib/agent/chatTurn`): load session + history from Arkiv → gather knowledge = local memory hits + scoped `goal` (contextbus cascade run→entity→global) + RAG past-session summaries (`retrieve`) → `aiReply` (stateless server) → persist `user`+`assistant` messages, a **hash-chained `snapshot`** (`commitHash = sha256(prevHash + payload)`), and a run-scoped `lastReply` memory → bump session. Every 10 turns (`RAG_ROLL_EVERY`) it re-indexes the session for RAG (fire-and-forget).

**RAG** (`lib/arkiv-client/rag.ts`, `topics.ts`): Arkiv has no vector index, so retrieval = topic-edge tag filter → **in-process cosine re-rank** of OpenAI embeddings (`text-embedding-3-small`). See the RAG entities + query patterns in `schema.md`.

## Arkiv data conventions (from `schema.md`)

- Every entity carries `PROJECT_ATTRIBUTE` (from `lib/wallet/project.ts`, value `NEXT_PUBLIC_PROJECT_VALUE`) and is filtered on it in every query — it namespaces this app inside Arkiv's shared store.
- Numeric attributes (timestamps, seq, sizes, chain id) are stored as **numbers** so they support range queries (`gt/gte/lt/lte`); everything else is a string. Arkiv numeric attrs must be **integers** (e.g. cosine scores are stored ×1000 per-mille).
- No `never()` TTL — "permanent" entities use a long TTL (365d) and are extended.
- Trusted reads filter by `$creator` (immutable, can't be spoofed).

## Commands

Web app (run from repo root):
```bash
npm run dev          # Next dev server
npm run build        # production build (also surfaces TS errors for web code)
npm test             # vitest run (jsdom)
npm run test:watch
npx vitest run lib/agent/chat   # a single test file
npx vitest run -t "name"        # tests matching a name
```
There is **no lint script**; type-checking happens via `next build` (web) and `tsc` (agent).

Agent service (run from `agent/`):
```bash
npm install                      # postinstall runs patch-package (@chaoschain/sdk fixes for Node ≥22)
npm run dev                      # tsx watch src/server.ts
npm start
npm run register "Name" "desc"   # CLI ERC-8004 mint (uses AGENT_PRIVATE_KEY) → prints agentId
npm test                         # vitest, pure unit (no network/keys)
npm run typecheck                # strict tsc --noEmit
npm run smoke:identity|arkiv|brain|chat|rag|card   # live, need funded keys / OpenAI
```
Node 22+ required for the agent service. The `@chaoschain/sdk` patch in `agent/patches/` is required — never delete it.

## Environment

- Web (`.env.local`): `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_PROJECT_VALUE`, `NEXT_PUBLIC_AGENT_URL` (client) / `AGENT_ORIGIN` (proxy server-side, default `http://localhost:8787`).
- Agent (`agent/.env`): `AGENT_PRIVATE_KEY`, `OPENAI_API_KEY`, `PINATA_JWT`/`PINATA_GATEWAY`, `PROJECT_VALUE`, `REGISTRY_RPC`, `BRAGA_RPC`, plus optional `OPENAI_MODEL`, `EMBEDDING_MODEL`, `RAG_TOP_K`, `RAG_ROLL_EVERY`. The agent wallet must be funded on **both** Sepolia (ETH, for the mint) and Braga (GLM, Arkiv faucet: `https://braga.hoodi.arkiv.network/faucet/`).

## Conventions

- Path alias `@/*` → repo root (both Next and vitest).
- `chains.ts` defines Sepolia **inline** — do NOT import from `viem/chains`; that barrel pulls `ox/tempo` whose broken dynamic require crashes client hydration. `next.config.mjs` aliases unused Privy Solana/Farcaster optional deps to `false` for the same class of reason; keep those aliases.
- Building the Braga wallet client in `useUserWallet` keys off `address` only — depending on the Privy `wallet` object (new ref each render) causes an infinite render loop. Preserve that.
- Web pages live under `app/{agents,knowledge,memory,visualizer}`; nav is `components/app/AppShell.tsx`.

## Arkiv agent skills

This repo installs Arkiv agent skills (`skills-lock.json`): `arkiv-best-practices` (SDK usage, data modeling, wagmi/React patterns, pitfalls) and `arkiv-feedback` (`/arkiv-feedback` for bug reports). Run `npx skills experimental_install` after cloning. Consult `arkiv-best-practices` before non-trivial `@arkiv-network/sdk` work.
