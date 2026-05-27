# ark-hive — Video Demo Script

> Target length: **4–5 min** (was 3–4 before the SDK extraction).
> Tone: builder talking to builders. Don't sell. Show.
>
> Submission context: Arkiv × ETHNS Builder Challenge. Judges score on **Arkiv Integration Depth (40%)**, Functionality (30%), Design & UX (20%), Code Quality (10%). Every beat below is deliberately tied to a rubric line — flagged inline as `↳ rubric:` so you can riff without losing the thread.
>
> **What's new since the last cut:** we've extracted the entire Arkiv data layer into a standalone npm package — [`arkiv-agent-sdk`](https://www.npmjs.com/package/arkiv-agent-sdk) — and added an in-app `/integrations` page that documents it. The "memory you actually own, portable across any app" claim is no longer a vibe; it's `npm install`. Section 6 below is the new payoff beat.

---

## 0. Cold open (0:00 – 0:15) — the problem

**On screen:** landing page hero, scroll slowly.

> "Every AI agent you talk to today forgets you the moment you close the tab — or worse, its 'memory' is locked inside one vendor's vector DB. You don't own it. You can't port it. You can't even read it.
>
> ERC-8004 gave agents an on-chain identity. But identity without memory is just a name tag. **ark-hive** is what happens when you give that identity a memory layer it actually owns — on Arkiv."

↳ **Theme:** AI — *Agents whose memory you actually own* (builders-guide.md, Theme 1). Also touches Privacy (owner-scoped reads) and a light DePIN-style hashchain audit trail → hybrid is fair game per the rules.

---

## 1. The two-plane architecture (0:15 – 0:40)

**On screen:** quick whiteboard / architecture slide (or the pitch page if it's wired). Point at two boxes.

> "Two chains, two jobs.
>
> **Sepolia** holds the ERC-8004 v1.0 registry — that's the agent's permanent identity. One mint, one `agentId`, forever.
>
> **Arkiv on Braga** holds *everything else*: the agent card, every session, every message, hash-chained snapshots, scoped memory, RAG embeddings. Every write is signed by the user's Privy embedded wallet — so `$owner` on Arkiv is literally the person using the agent. Nobody else can mutate it. Not us. Not the model provider."

↳ rubric: **Ownership model (5/5 target)** — user `$owner` for writes, `$creator` immutable for trusted reads. **Entity relationships** — `agentId` is the foreign key everything cascades from.

---

## 2. Mint an agent (0:40 – 1:10)

**On screen:** `/agents` → "New Agent" dialog → fill name + description → submit.

> "I'll mint a new agent. Behind the click: we build the full ERC-8004 AgentCard JSON, pin it to IPFS, ask Privy to flip the wallet to Sepolia, send a raw `register(string)`, then flip back to Braga and write the canonical `agentCard` entity into Arkiv — stamped with our `PROJECT_ATTRIBUTE` so it's namespaced inside Arkiv's shared store."
>
> *(while it spins)* "That namespace stamp is on every single entity and every query. Without it, our reads would return everyone else's data — Arkiv's a shared public DB, you have to think like Postgres-without-schemas."

↳ rubric: **Entity schema design** — typed attributes, project-namespaced, IPFS URI pinned, registry chain id stored as a *numeric* attribute so it's range-queryable. **Wallet integration** — chain switch handled, errors surfaced.

**On screen:** show the success state with the IPFS link + Arkiv entity link.

> "There's the card on IPFS, and there's the entity on the Arkiv explorer. Same data, two layers — the cryptographic identity and the live mutable workspace."

---

## 3. Marketplace + ENS + x402 (1:10 – 1:40)

**On screen:** `/marketplace` — scroll the 11-agent curated cohort, hover a card, open details.

> "Every ERC-8004 agent on the registry shows up here. The curated cohort each have an **ENS subdomain** under our namespace, and the cards expose **x402 pay-per-call** endpoints — so an agent isn't just a chat window, it's a callable service with on-chain pricing.
>
> Practical example: imagine a research agent that costs 0.10 USDC per query. Another agent can call it, pay via x402, get a result, and *log that call as an Arkiv entity owned by the caller's wallet*. You get a tamper-proof receipt of every cross-agent interaction."

**On screen:** click "Adopt" on someone else's agent.

> "Adopting an agent doesn't move ownership of the registry NFT — it writes an *adoption* entity scoped to my wallet so I can chat with it under my own namespace. The original `$creator` is preserved, immutably."

↳ rubric: **Advanced features** (x402 + ENS), **Entity relationships** (adoption links agent → owner), **Ownership model** (`$creator` vs `$owner` used intentionally).

---

## 4. Chat — the memory cascade in action (1:40 – 2:30)

**On screen:** open the adopted agent → "Start Session" → send 2–3 messages that reference earlier context (e.g. "Remember I prefer concise answers" → later: "Summarise the last point").

> "Start session — that's a new Arkiv `session` entity with a short TTL. Now watch what happens on each turn:
>
> 1. We pull session history from Arkiv.
> 2. We gather **knowledge**: run-scoped memory hits, plus a cascading `goal` lookup — run → entity → global — plus **RAG** over past session summaries.
> 3. Hit the stateless `/ai/reply` endpoint.
> 4. Persist the user message, the assistant message, *and* a **hash-chained snapshot** — `commitHash = sha256(prevHash + payload)`. So the entire conversation is a Merkle-style chain. Tamper with one message, every subsequent hash breaks."

**On screen:** open the explorer link on a snapshot, point at the `commitHash` and `prevHash`.

> "Every ten turns we re-roll the session into a RAG summary — embedded with OpenAI's `text-embedding-3-small`, stored as a per-mille integer vector on Arkiv since their numeric attributes are integers. Retrieval is topic-tag filter on Arkiv plus in-process cosine re-rank — because Arkiv doesn't have a vector index, and that's a feature, not a bug: the index is yours, portable, inspectable."

↳ rubric: **Query usage** (multiple filters, range on numeric `seq`/`ts`, paginates), **Expiration dates** (session short TTL, snapshots long, memory differentiated — exactly what builders-guide calls "the strongest signal you understand Arkiv"), **Advanced features** (hashchain audit trail, batch writes, RAG pipeline).

---

## 5. Knowledge & Memory pages (2:30 – 3:00)

**On screen:** `/knowledge` — select agent, show summaries list, fetch by topic.

> "Knowledge is the rolled-up view: every session compressed into a summary, tagged with topics. I can fetch all summaries for a topic in one query — that's a single `where(eq(topic, …))` on the Arkiv side. Practical example: a customer-support agent that has had 400 conversations about 'refunds' — one query, you get every relevant past summary, ranked by recency."

**On screen:** `/memory` — search a term.

> "Memory search runs across the agent's full message and snapshot store, again wallet-scoped. This is the 'portability' bit: any other UI that knows the schema can read this same data with the user's wallet. We're not building a moat — we're building a substrate."

↳ rubric: **Filtering & search** (multiple filters, combinable), **Data integrity** (no orphaned data, snapshots stay verifiable).

---

## 6. Integrations — the portability proof (3:00 – 3:40)

**On screen:** `/integrations` page. Show the install one-liner, scroll the code examples (init → write memory → read another agent's memory → snapshot).

> "Here's the part I'm proudest of. Everything you just saw — sessions, messages, hash-chained snapshots, scoped memory, the whole entity schema — we extracted into a standalone npm package: **`arkiv-agent-sdk`**. One install, peer dep on `@arkiv-network/sdk`, MIT licensed.
>
> ```
> npm install arkiv-agent-sdk @arkiv-network/sdk
> ```
>
> `createAgentClient({ ctx, project })` and you've got `putMemory`, `listMemory`, `openSession`, `appendMessage`, `commitSnapshot` — typed, project-namespaced, TTLs handled, nonce-serialized writes so rapid calls from one wallet don't collide, SHA-256 via Web Crypto so it runs in the browser. The SDK never touches the private key — it accepts any signer the Arkiv SDK accepts: a Node `privateKeyToAccount`, a Privy embedded wallet, wagmi, RainbowKit, whatever.
>
> The portability claim from the AI theme — *'memory you actually own, portable across any tool that reads Arkiv'* — this package is what makes it real. A second app, a CLI, an MCP server, a different agent UI — same `agentId`, same wallet, instant read of the same memory. Practical example: I can ship a Raycast extension tomorrow that pulls my agent's last 10 session summaries with five lines of code, and the platform doesn't have to grant me anything because Arkiv `$owner` is already me."

**On screen:** flip to the `packages/arkiv-agent-sdk/README.md` on GitHub (or in the editor) and point at the API table.

> "Eleven entity types documented, default TTLs published, `query` / `queryGlobal` / `getEntity` exposed as escape hatches. This is what 'Arkiv as a substrate, not a moat' looks like when you actually mean it."

↳ rubric: **Advanced features (5/5)** — published a reusable SDK packaging the entity model, nonce serialization, hashchain helper (`snapshotHash`), TTL policy, and browser-safe crypto. **Entity schema design** — schema is now versioned and shipped, not just declared. **Code organization** — clean separation of concerns; the app consumes its own public package. **README** — package ships with full docs + API table. This single beat lifts the 10% code-quality block *and* the advanced-features sub-criterion.

---

## 7. Visualizer — the visual payoff (3:40 – 4:10)

**On screen:** `/visualizer` — the 3D neural graph. Let it bloom. Click a topic node, click a summary leaf.

> "And this is the part judges will remember. The visualizer reads my Arkiv summaries live and lays them out as a topic → summary graph. Glowing hubs are topics. Leaves are individual session summaries scattered around their primary topic. Click any node — you get the full text, plus a direct link to the entity on the Arkiv explorer.
>
> This isn't a mockup. Every node here is an entity I own, on Braga, right now."

↳ rubric: **Visual design** (distinctive identity), **User experience** (progressive disclosure — graph → detail), **Blockchain abstraction** (you'd never know there were two chains under this).

---

## 8. Close (4:10 – 4:40)

**On screen:** back to landing, or a clean "thanks" slide with repo + demo URLs + the `npm i arkiv-agent-sdk` line.

> "So — ark-hive in one breath: ERC-8004 identity on Sepolia, the entire agent lifecycle on Arkiv, every byte signed by the user's wallet, hash-chained, owner-scoped, and now **shipped as a reusable npm SDK** so any builder can plug into the same data layer. We hit all six Arkiv-integration sub-criteria deliberately — typed schemas, multi-filter queries with range on numerics, layered ownership using both `$owner` and `$creator`, foreign-key relationships, differentiated expirations, and advanced features — RAG, hashchain, x402, ENS, and a published SDK.
>
> App, package, and `arkiv-best-practices` skill all MIT, all open source. Thanks for watching — see you at Network School."

---

## Cheat sheet — rubric coverage to keep in your head while filming

| Rubric line (40% block) | Where to point in the demo |
|---|---|
| Entity schema design | Mint screen → "typed attributes, project-namespaced, numerics for range" |
| Query usage | Knowledge page → topic filter; Memory page → search; Chat → RAG retrieval |
| Ownership model | "Every write is the user's Privy wallet"; adoption preserving `$creator` |
| Entity relationships | `agentId` as FK across sessions/messages/snapshots/summaries |
| Expiration dates | Session short TTL, snapshots long-lived, memory differentiated |
| Advanced features | Hashchain snapshots, RAG, x402 pay-per-call, ENS, batch writes, **published `arkiv-agent-sdk` npm package** |

| Other criteria | Cue |
|---|---|
| Functionality (30%) | Mint → adopt → chat → snapshot → search → visualize — *one continuous take* if you can |
| Design & UX (20%) | Visualizer beat + smooth Lenis scroll on landing |
| Code quality (10%) | Mention monorepo (`/packages/arkiv-agent-sdk`), package README + API table, MIT license on both, `arkiv-best-practices` skill installed |

---

## Recording tips

- **One take per section**, stitch in post. Stops the "ums".
- Have a **funded wallet pre-loaded** — Sepolia ETH + Braga GLM. Faucet runs slow under load.
- Pre-mint one agent so the marketplace isn't empty, but mint a fresh one *on camera* for the wow.
- Pre-seed 4–5 sessions on the demo agent so RAG and the visualizer have real data to show — empty graphs read as broken.
- Keep DevTools network panel open for one beat during chat to flash the actual Arkiv write calls. Optional but credible.
- End by leaving the **Arkiv explorer tab** visible on a snapshot entity. Tamper-proof receipt = the story in one image.
- For the Integrations beat: have **two tabs ready** — the in-app `/integrations` page *and* the npm package page at `npmjs.com/package/arkiv-agent-sdk`. Flipping from "here's the docs in our app" to "here's the public npm listing" sells the portability claim in two seconds.
- If you have ~30s of slack, **live `npm install arkiv-agent-sdk`** in a scratch terminal and `import { createAgentClient } from "arkiv-agent-sdk"` in a fresh file. Nothing else convinces judges that "portable" is real like watching the package resolve from the registry.
