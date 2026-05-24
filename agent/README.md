# AgentState Agent Service (ERC-8004 + Arkiv)

A real ERC-8004 agent: it registers an on-chain identity (Ethereum Sepolia), stores everything on **Arkiv** (Braga testnet), chats via **OpenAI**, and searches its own Arkiv-stored memory. No mocks — real chain, real data layer, real LLM.

## Architecture (two planes)
- **Registry plane** — ERC-8004 v1.0 via `@chaoschain/sdk` on **Ethereum Sepolia**. `registerIdentity()` mints the identity; `agentId` is the binding key.
- **Data plane** — `@arkiv-network/sdk` (viem) on **Braga** (chain `60138453102`). The agent wallet is the sole `$creator`, so trusted reads use `.createdBy(AGENT_ADDRESS)`. Every entity carries `PROJECT_ATTRIBUTE`; numeric attrs power range queries; TTLs via `ExpirationTime` (no `never()` — long TTL + extend).

## Setup
1. `cp .env.example .env` and fill:
   - `AGENT_PRIVATE_KEY` — fund the derived address on **Ethereum Sepolia** (ETH, for the 8004 mint) **and** on **Braga** (GLM, for Arkiv writes: faucet `https://braga.hoodi.arkiv.network/faucet/`).
   - `OPENAI_API_KEY` — required for chat/search replies.
   - `PROJECT_VALUE` — globally unique namespace.
   - `AGENT_DOMAIN`, `REGISTRY_RPC` (default Ethereum Sepolia public RPC), `BRAGA_RPC`.
2. `npm install` — a `postinstall` runs `patch-package` to apply required `@chaoschain/sdk` fixes (BigInt id-cache serialization + ESM→CJS entry, needed on Node ≥ 22). Patch lives in `patches/`.
3. Register an agent: `npm run register "My Agent" "what it does"` → prints the on-chain `agentId` + the Arkiv AgentCard key.
4. Run the service: `npm start` (or `npm run dev`).

> Node 22+ required (24 tested).

## HTTP API
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/health` | — | `{ ok, agentWallet, project }` |
| POST | `/agents` | `{ name, description }` | `{ agentId, txHash, agentCardKey }` (mints 8004 + writes AgentCard) |
| GET | `/agents` | — | `{ agents: [...] }` (trusted: created by this wallet) |
| POST | `/sessions` | `{ agentId, callerId }` | `{ sessionKey }` |
| POST | `/sessions/:key/messages` | `{ text }` | `{ reply, userKey, assistantKey, snapshotKey }` |
| POST | `/search` | `{ agentId, term, scope? }` | `{ hits: [...] }` |

A chat turn (`/sessions/:key/messages`): retrieves knowledge (`searchKnowledge`) + context (`get` cascade run→entity→global) → OpenAI reply → persists user+assistant `message`s, a hash-chained `snapshot`, and a run-scoped `memory` → bumps the session.

## Tests & verification
- `npm test` — pure unit tests, no network/keys (config, hashchain, entities, search conditions, context cascade).
- `npm run typecheck` — strict TS.
- Live scripts (need funded keys / OpenAI):
  - `npm run smoke:identity` — real 8004 mint (Ethereum Sepolia). ✅ Verified: agentId `5224`, tx `0x82bbcaf333ce07779a6005f47fddc01dbf81d083f400a0f470d5228fc23bdc90`.
  - `npm run smoke:arkiv` — real Arkiv create+query (needs Braga GLM).
  - `npm run smoke:brain` — real OpenAI reply (needs `OPENAI_API_KEY`).
  - `npm run smoke:chat` — full turn (needs Braga + OpenAI).

## Status
- ✅ ERC-8004 identity registration — real, on-chain, verified.
- ⏳ Arkiv writes / chat / search — code complete + typechecked; live runs need the agent wallet funded on **Braga** and a real **OPENAI_API_KEY**.
