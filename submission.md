# Submission

## What did you build?

**ark-hive** makes agent memory a first-class, portable asset on Arkiv. Mint an ERC-8004 agent on Sepolia, then every session, message, scoped memory (run/entity/global), RAG summary and hash-chained snapshot is written to Arkiv Braga — signed by your own wallet, not ours. We also ship `arkiv-agent-sdk` on npm so any app can read another agent's memory and keep writing to it. Your agent's mind is a public, verifiable, portable object — not a row in someone else's database.

> **160-char version:** ark-hive makes agent memory a portable, user-owned asset on Arkiv. ERC-8004 identity on Sepolia, every thought signed to Braga, open SDK on npm.

---

## What's your tech stack?

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, Framer Motion, Lenis.
- **Wallet / auth:** Privy embedded wallets (user-signed everything), viem for raw calls.
- **Chains:** Ethereum Sepolia for ERC-8004 v1.0 identity registry (`0x8004…BD9e`); **Arkiv Braga** (chain `60138453102`) for all app state via `@arkiv-network/sdk`.
- **Agent service:** Hono + tsx (Node 22), stateless — only `/ai/reply`, `/ai/summarize`, `/ai/embed` (OpenAI `gpt-*` + `text-embedding-3-small`) and `/ai/pin` (Pinata/IPFS).
- **Open SDK:** `packages/arkiv-agent-sdk` — tsup build, ESM+CJS+d.ts, `@arkiv-network/sdk` as peer dep.
- **Testing:** Vitest (jsdom). **Hosting:** Vercel (web) + Render/Fly-style Node host for the `/ai/*` service.

---

## How did you use Arkiv?

Arkiv is the **entire data plane**. We modeled the agent's mind as a small set of entity types, all carrying a `project` attribute so the app is namespaced inside Arkiv's shared store, and a stable `entityType` discriminator so every read is a flat attribute query.

**Entities** (see `lib/arkiv-client/entities.ts`):

- `agentCard` — ERC-8004 card mirror keyed by `agentId`, with `registryChainId`, `agentCardUri`, optional `ensName`/`endpoint`.
- `session` — one chat conversation: `callerId`, `sessionStatus`, `startedAt`, `lastActivityAt`, `turnCount`.
- `message` — `{sessionKey, role, seq, ts}`; full text in payload.
- `snapshot` — hash-chained turn commit: `commitSeq`, `commitHash = sha256(prevHash + payload)`, `prevSnapshotKey`, `payloadSize`. This is the audit log — anyone can replay and verify a session wasn't tampered with.
- `memory` — scoped key/value: `scope ∈ {run, entity, global}`, `scopeKey`, `memKey`, `version`. The contextbus cascades **run → entity → global** at read time.
- `summary` + `topic` + `summaryTopic` + `summaryLink` — RAG layer. Arkiv has no vector index, so we tag summaries with topic edges, range-filter by `agentId`/`createdAt`, then re-rank in-process with cosine over OpenAI embeddings.
- `pubkey` / `accessGrant` — capability-style sharing primitives.

**Attribute conventions:**
- Numeric fields (`ts`, `seq`, `turnCount`, `commitSeq`, `payloadSize`, `version`, `registryChainId`) stored as **integers** so we get `gt/gte/lt/lte` range queries — e.g. "messages for session X with seq > N", "snapshots since timestamp T". Cosine scores are persisted ×1000 per-mille because Arkiv numeric attrs must be integers.
- Trusted reads filter by `$creator` (immutable) so a user's memory can't be spoofed by another writer in the shared store.
- All writes are **user-signed in the browser** via Privy → viem → `@arkiv-network/sdk` wallet client.

**Expiration / TTL:**
- No `never()` — "permanent" entities (agent cards, summaries, hash-chained snapshots) use a long TTL (365d) and we extend on touch.
- `memory.scope = run` → short TTL (turn-scoped), `entity` → medium, `global` → long. The SDK exposes `expiresInSec` to override per write.
- Sessions get their TTL bumped on every `appendMessage`, so active conversations stay alive while abandoned ones GC themselves.

Every Arkiv mutation is a single `put` with the typed attr builder, every read is a flat attribute filter — no off-chain index, no server cache, no DB.

---

## What was the hardest part?

A few specific things, in order of pain:

1. **No vector index on Arkiv.** RAG had to become "tag + range-filter + in-process re-rank." We ended up storing cosine scores as integers ×1000 because Arkiv attrs are int-only, which is a foot-gun the docs don't really warn about. A native float attr (or even a fixed-point helper in the SDK) would have saved a day.
2. **Numeric vs. string attrs is invisible until you hit a range query.** Stringly-typed timestamps silently break `gt`/`lt`. Would love a typed schema helper in `@arkiv-network/sdk` — declare attrs once, get a typed builder + query DSL.
3. **Browser signing across two chains.** Switching the Privy wallet from Braga ↔ Sepolia mid-flow (mint on Sepolia, then write `agentCard` to Braga) was fiddly — the wallet object's identity changes on every render, so `useUserWallet` had to key off `address` only or we got infinite render loops. Worth a note in the docs for anyone wiring Arkiv into wagmi/Privy.
4. **`viem/chains` barrel crashes hydration.** Importing Sepolia from `viem/chains` drags in `ox/tempo`, whose dynamic require breaks the Next.js client bundle. We define Sepolia inline in `chains.ts`. Not Arkiv's fault, but anyone building a Next.js + Arkiv app will hit it.
5. **30s undici fetch cap vs. slow Arkiv writes.** Next rewrites use undici which caps at ~30s; some `put` flows (mint + pin + write) needed the same-origin proxy at `app/agent-api/[...path]/route.ts` with a 115s timeout to stop getting cut off.
6. **`@chaoschain/sdk` on Node 22.** Required a `patch-package` patch shipped in `agent/patches/` — fine once solved, but a fresh contributor hitting it cold has no signal what went wrong.

None of these were blockers, but each one cost an afternoon. A typed-schema helper + a "Arkiv + Next.js/Privy" recipe in the docs would have made the project a weekend instead of a week.
