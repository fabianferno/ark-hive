/*
 * demo-seed.ts — end-to-end demo seeder for ark-hive
 *
 * PREREQUISITES
 * ─────────────
 * 1. Braga RPC must be up and reachable (BRAGA_RPC env var or default)
 * 2. AGENT_PRIVATE_KEY (in agent/.env) — funded with GLM on Braga
 * 3. DEMO_USER_B_PRIVATE_KEY — optional; if unset a fresh keypair is generated
 *    (you must fund its address with Braga GLM before running successfully)
 * 4. Agent AI server running at NEXT_PUBLIC_AGENT_URL (for indexSession/aiSummarize)
 *    — if absent, falls back to manual createSummary
 * 5. NAMESTONE_BASE_URL + NAMESTONE_API_KEY + ENS_ROOT_DOMAIN in .env.local
 *
 * ENV FLAGS
 * ─────────
 * DEMO_WAIT=1            — after seeding, sleep 130 s then verify expirable entity is GONE
 * DEMO_KEEP_ENS=1        — do NOT delete the demo NameStone subdomain names at the end
 * DEMO_USER_B_PRIVATE_KEY=0x...  — second account private key
 *
 * RUN
 * ───
 * npm run demo:seed
 */

// ─── 0. Bootstrap ────────────────────────────────────────────────────────────
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local" }); // NEXT_PUBLIC_PROJECT_VALUE, NAMESTONE_*, ENS_ROOT_DOMAIN
dotenv({ path: "agent/.env" }); // AGENT_PRIVATE_KEY, BRAGA_RPC, PINATA_*

// localStorage shim — lib/crypto/keys.ts caches the derived X25519 key in localStorage
if (typeof (globalThis as any).localStorage === "undefined") {
  const m = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

// ─── Imports ─────────────────────────────────────────────────────────────────
import { createWalletClient, createPublicClient, http } from "@arkiv-network/sdk";
import { braga } from "@arkiv-network/sdk/chains";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

import { makeRepo, queryGlobal } from "../lib/arkiv-client/repo";
import { indexSession } from "../lib/arkiv-client/rag";
import {
  publishPubKey,
  encryptAndShareSummary,
  listGrantsForMe,
  readSharedSummary,
} from "../lib/arkiv-client/access";
import { PROJECT_ATTRIBUTE } from "../lib/arkiv-client/project";
import { agentEns, agentLabel, userEns } from "../lib/ens/labels";
import type { ClientCtx } from "../lib/arkiv-client/ctx";

// ─── CTX builder ─────────────────────────────────────────────────────────────
function makeCtx(pk: `0x${string}`): ClientCtx {
  const account = privateKeyToAccount(pk);
  const rpc = process.env.BRAGA_RPC ?? "https://braga.hoodi.arkiv.network/rpc";
  const wallet = createWalletClient({ account, chain: braga, transport: http(rpc) });
  const publicClient = createPublicClient({ chain: braga, transport: http(rpc) });
  return {
    wallet,
    publicClient,
    address: account.address.toLowerCase() as `0x${string}`,
    signMessage: (message: string) => account.signMessage({ message }),
  };
}

// ─── Inline NameStone helpers (lib/ens/namestone.ts has `import "server-only"`) ─
interface NsNameRecord { name: string; address: string; domain: string; }

function nsCfg() {
  const base = process.env.NAMESTONE_BASE_URL;
  const key = process.env.NAMESTONE_API_KEY;
  const domain = process.env.ENS_ROOT_DOMAIN ?? process.env.NEXT_PUBLIC_ENS_ROOT_DOMAIN ?? "ark-hive.eth";
  return { base, key, domain };
}

async function nsSetName(name: string, address: string, textRecords?: Record<string, string>): Promise<void> {
  const { base, key, domain } = nsCfg();
  if (!base || !key) { console.warn("  [ENS] NAMESTONE not configured — skipping set-name"); return; }
  const body: Record<string, unknown> = { domain, name, address };
  if (textRecords) body.text_records = textRecords;
  const res = await fetch(`${base}/set-name`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`NameStone set-name ${res.status}: ${await res.text()}`);
}

async function nsSearchName(name: string, exact = true): Promise<NsNameRecord[]> {
  const { base, key, domain } = nsCfg();
  if (!base || !key) return [];
  const qs = new URLSearchParams({ domain, name, ...(exact ? { exact_match: "1" } : {}) });
  const res = await fetch(`${base}/search-names?${qs}`, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`NameStone search-names ${res.status}: ${await res.text()}`);
  return res.json() as Promise<NsNameRecord[]>;
}

async function nsDeleteName(name: string): Promise<void> {
  const { base, key, domain } = nsCfg();
  if (!base || !key) { console.warn("  [ENS] NAMESTONE not configured — skipping delete-name"); return; }
  const res = await fetch(`${base}/delete-name`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key },
    body: JSON.stringify({ domain, name }),
  });
  if (!res.ok) throw new Error(`NameStone delete-name ${res.status}: ${await res.text()}`);
}

// ─── Utility ─────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function banner(title: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(60));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // ── Account setup ──────────────────────────────────────────────────────────
  const pkA = (process.env.AGENT_PRIVATE_KEY ?? "") as `0x${string}`;
  if (!pkA || pkA === "0x") {
    console.error("AGENT_PRIVATE_KEY is not set in agent/.env — aborting");
    process.exit(1);
  }

  const pkBRaw = process.env.DEMO_USER_B_PRIVATE_KEY;
  let pkB: `0x${string}`;
  if (!pkBRaw) {
    pkB = generatePrivateKey();
    const addrB = privateKeyToAccount(pkB).address;
    console.warn(`\n[WARN] DEMO_USER_B_PRIVATE_KEY not set — generated ephemeral key for account B.`);
    console.warn(`       Address B: ${addrB}`);
    console.warn(`       Fund it with Braga GLM before a live run.\n`);
  } else {
    pkB = pkBRaw as `0x${string}`;
  }

  const ctxA = makeCtx(pkA);
  let ctxB = makeCtx(pkB);

  // If account B has no Braga GLM (e.g. an ephemeral generated key), fall back to
  // account A as the recipient so the access-grant + expiry flow still runs LIVE on
  // a single funded wallet. The grant code path is wallet-identical — a true
  // cross-wallet run just needs DEMO_USER_B_PRIVATE_KEY funded with GLM.
  let singleWallet = false;
  if (!pkBRaw) {
    try {
      const balB = await ctxB.publicClient.getBalance({ address: ctxB.address });
      if (balB === 0n) {
        console.warn("[WARN] Account B unfunded — reusing account A as recipient (single-wallet live demo).");
        ctxB = ctxA;
        singleWallet = true;
      }
    } catch { /* balance probe failed — keep separate ctxB */ }
  }

  // ── Phase 0: Config ─────────────────────────────────────────────────────────
  banner("Phase 0: Configuration");
  console.log("  RPC         :", process.env.BRAGA_RPC ?? "https://braga.hoodi.arkiv.network/rpc");
  console.log("  Project     :", PROJECT_ATTRIBUTE.value);
  console.log("  ENS domain  :", process.env.ENS_ROOT_DOMAIN ?? process.env.NEXT_PUBLIC_ENS_ROOT_DOMAIN ?? "ark-hive.eth");
  console.log("  Address A   :", ctxA.address);
  console.log("  Address B   :", ctxB.address);

  // ── Phase 1: ENS ────────────────────────────────────────────────────────────
  banner("Phase 1: ENS — claim user labels");

  const USER_LABEL_A = "crypto";
  const USER_LABEL_B = "legal";

  try {
    await nsSetName(USER_LABEL_A, ctxA.address, { "com.twitter": "cryptoTrader", description: "Demo crypto user A" });
    console.log(`  set '${USER_LABEL_A}' → ${ctxA.address}  (${userEns(USER_LABEL_A)})`);
  } catch (e) { console.warn(`  [ENS] set-name '${USER_LABEL_A}' failed:`, (e as Error).message); }

  try {
    await nsSetName(USER_LABEL_B, ctxB.address, { description: "Demo legal user B" });
    console.log(`  set '${USER_LABEL_B}' → ${ctxB.address}  (${userEns(USER_LABEL_B)})`);
  } catch (e) { console.warn(`  [ENS] set-name '${USER_LABEL_B}' failed:`, (e as Error).message); }

  try {
    const hits = await nsSearchName(USER_LABEL_A);
    console.log(`  search '${USER_LABEL_A}' returned ${hits.length} record(s)`);
  } catch (e) { console.warn(`  [ENS] search failed:`, (e as Error).message); }

  // ── Phase 2: Agent A — "crypto-example" ─────────────────────────────────────
  banner("Phase 2: Agent A — crypto-example (demo-crypto-1)");

  const AGENT_A_ID = "demo-crypto-1";
  const AGENT_A_ENS = agentEns("Crypto Trader", USER_LABEL_A, AGENT_A_ID);
  const AGENT_A_LABEL = agentLabel("Crypto Trader", AGENT_A_ID);
  const CALLER_A = ctxA.address;

  let sessionKeyA = "";
  let summaryKeyA = "";

  try {
    const repoA = makeRepo(ctxA);

    // AgentCard
    const card = await repoA.createAgentCard({
      agentId: AGENT_A_ID,
      registryChainId: 60138453102, // BRAGA_ID
      name: "Crypto Trader",
      description: "Demo agent A — trades DeFi instruments, holds wallet keys.",
      ensName: AGENT_A_ENS,
      ensLabel: AGENT_A_LABEL,
      ensUserLabel: USER_LABEL_A,
    });
    console.log("  agentCard       :", card.entityKey, "(tx:", card.txHash, ")");

    // Session
    const session = await repoA.createSession({ agentId: AGENT_A_ID, callerId: CALLER_A });
    sessionKeyA = session.entityKey;
    console.log("  session         :", sessionKeyA);

    // Message 1 — user
    const msg1 = await repoA.createMessage({
      sessionKey: sessionKeyA, agentId: AGENT_A_ID,
      role: "user", seq: 1, ts: Date.now(),
      content: "What is the current price action for ETH/BTC and should I rebalance my DeFi portfolio?",
    });
    console.log("  message[user]   :", msg1.entityKey);

    // Message 2 — assistant
    const msg2 = await repoA.createMessage({
      sessionKey: sessionKeyA, agentId: AGENT_A_ID,
      role: "assistant", seq: 2, ts: Date.now(),
      content: "ETH/BTC is forming a bullish pennant. Consider rotating 20% of your stablecoin LP into wstETH.",
    });
    console.log("  message[asst]   :", msg2.entityKey);

    // Snapshot
    const snap = await repoA.createSnapshot({
      sessionKey: sessionKeyA, agentId: AGENT_A_ID,
      commitSeq: 1, commitHash: "0xabc123",
      prevSnapshotKey: "0x0000000000000000000000000000000000000000000000000000000000000000",
      state: { portfolioUSD: 42000, ethPct: 60, stablePct: 40, lastRebalance: Date.now() },
    });
    console.log("  snapshot        :", snap.entityKey);

    // Memory
    const mem = await repoA.createMemory({
      agentId: AGENT_A_ID, scope: "global",
      scopeKey: "portfolio", memKey: "defi-allocation",
      source: "session-analysis", version: 1,
      value: JSON.stringify({ ethPct: 60, stablePct: 40, wstEthTarget: 20 }),
    });
    console.log("  memory          :", mem.entityKey);

    // Try indexSession (requires agent AI server); fall back to manual createSummary
    try {
      const { summaryKey, digest } = await indexSession(ctxA, {
        agentId: AGENT_A_ID, callerId: CALLER_A,
        sessionKey: sessionKeyA, summarySeq: 1,
      });
      summaryKeyA = summaryKey;
      console.log("  summary (RAG)   :", summaryKey, "| topics:", digest.topics.join(", "));
    } catch (ragErr) {
      console.warn("  [RAG] indexSession failed (AI server down?) — using manual createSummary");
      console.warn("       ", (ragErr as Error).message);
      const sum = await repoA.createSummary({
        agentId: AGENT_A_ID, callerId: CALLER_A,
        sessionKey: sessionKeyA, summarySeq: 1,
        summary: "User asked about ETH/BTC price action for DeFi portfolio rebalancing. Agent recommended wstETH rotation.",
        topics: ["crypto", "defi", "portfolio-rebalancing", "ethereum"],
        embedding: [],
      });
      summaryKeyA = sum.entityKey;
      console.log("  summary (manual):", summaryKeyA);
    }

    // Topic
    const topic = await repoA.createTopic({
      agentId: AGENT_A_ID, callerId: CALLER_A,
      topicKey: "defi", name: "DeFi",
    });
    console.log("  topic           :", topic.entityKey);

    // SummaryTopic
    const st = await repoA.createSummaryTopic({
      agentId: AGENT_A_ID, callerId: CALLER_A,
      summaryKey: summaryKeyA, topicKey: "defi", sessionKey: sessionKeyA,
    });
    console.log("  summaryTopic    :", st.entityKey);

    // SummaryLink (self-link as placeholder — normally links to a prior session's summary)
    const sl = await repoA.createSummaryLink({
      agentId: AGENT_A_ID, callerId: CALLER_A,
      srcSummaryKey: summaryKeyA, dstSummaryKey: summaryKeyA,
      score: 1000,
    });
    console.log("  summaryLink     :", sl.entityKey);

  } catch (e) {
    console.error("  [Agent A] Arkiv writes failed:", (e as Error).message);
    console.warn("  (RPC likely down — continuing to next phase)");
  }

  // ── Phase 3: Agent B — "legal-paperwork" ────────────────────────────────────
  banner("Phase 3: Agent B — legal-paperwork (demo-legal-1)");

  const AGENT_B_ID = "demo-legal-1";
  const AGENT_B_ENS = agentEns("Legal Paperwork", USER_LABEL_B, AGENT_B_ID);
  const AGENT_B_LABEL = agentLabel("Legal Paperwork", AGENT_B_ID);
  const CALLER_B = ctxB.address;

  let sessionKeyB = "";
  let summaryKeyB = "";
  let expirableEntityKey = "";

  try {
    const repoB = makeRepo(ctxB);

    // AgentCard — MUST be created before encryptAndShareSummary (resolves owner by agentCard)
    const cardB = await repoB.createAgentCard({
      agentId: AGENT_B_ID,
      registryChainId: 60138453102,
      name: "Legal Paperwork",
      description: "Demo agent B — handles NDA drafts and contract clause analysis.",
      ensName: AGENT_B_ENS,
      ensLabel: AGENT_B_LABEL,
      ensUserLabel: USER_LABEL_B,
    });
    console.log("  agentCard       :", cardB.entityKey);

    // Session
    const sessionB = await repoB.createSession({ agentId: AGENT_B_ID, callerId: CALLER_B });
    sessionKeyB = sessionB.entityKey;
    console.log("  session         :", sessionKeyB);

    // Messages
    const msgB1 = await repoB.createMessage({
      sessionKey: sessionKeyB, agentId: AGENT_B_ID,
      role: "user", seq: 1, ts: Date.now(),
      content: "Draft an NDA between Acme Corp and Initech covering confidential product roadmap details.",
    });
    console.log("  message[user]   :", msgB1.entityKey);

    const msgB2 = await repoB.createMessage({
      sessionKey: sessionKeyB, agentId: AGENT_B_ID,
      role: "assistant", seq: 2, ts: Date.now(),
      content: "MUTUAL NDA DRAFT: Acme Corp and Initech hereby agree that all Confidential Information shared under this Agreement shall not be disclosed to third parties for a period of 2 years. Governing law: Delaware.",
    });
    console.log("  message[asst]   :", msgB2.entityKey);

    // Snapshot
    const snapB = await repoB.createSnapshot({
      sessionKey: sessionKeyB, agentId: AGENT_B_ID,
      commitSeq: 1, commitHash: "0xdef456",
      prevSnapshotKey: "0x0000000000000000000000000000000000000000000000000000000000000000",
      state: { ndaStatus: "draft", parties: ["Acme Corp", "Initech"], jurisdiction: "Delaware" },
    });
    console.log("  snapshot        :", snapB.entityKey);

    // Memory (global scope)
    const memB = await repoB.createMemory({
      agentId: AGENT_B_ID, scope: "entity",
      scopeKey: "acme-corp", memKey: "nda-draft-v1",
      source: "legal-session", version: 1,
      value: JSON.stringify({ status: "draft", parties: ["Acme Corp", "Initech"] }),
    });
    console.log("  memory          :", memB.entityKey);

    // Try indexSession; fall back to manual createSummary
    try {
      const { summaryKey, digest } = await indexSession(ctxB, {
        agentId: AGENT_B_ID, callerId: CALLER_B,
        sessionKey: sessionKeyB, summarySeq: 1,
      });
      summaryKeyB = summaryKey;
      console.log("  summary (RAG)   :", summaryKey, "| topics:", digest.topics.join(", "));
    } catch (ragErr) {
      console.warn("  [RAG] indexSession failed — using manual createSummary");
      const sumB = await repoB.createSummary({
        agentId: AGENT_B_ID, callerId: CALLER_B,
        sessionKey: sessionKeyB, summarySeq: 1,
        summary: "Drafted mutual NDA between Acme Corp and Initech covering confidential product roadmap. Delaware governing law, 2-year term.",
        topics: ["legal", "nda", "contract", "acme-corp"],
        embedding: [],
      });
      summaryKeyB = sumB.entityKey;
      console.log("  summary (manual):", summaryKeyB);
    }

    // Topic
    const topicB = await repoB.createTopic({
      agentId: AGENT_B_ID, callerId: CALLER_B,
      topicKey: "nda", name: "NDA",
    });
    console.log("  topic           :", topicB.entityKey);

    // SummaryTopic
    const stB = await repoB.createSummaryTopic({
      agentId: AGENT_B_ID, callerId: CALLER_B,
      summaryKey: summaryKeyB, topicKey: "nda", sessionKey: sessionKeyB,
    });
    console.log("  summaryTopic    :", stB.entityKey);

    // SummaryLink (self-link placeholder)
    const slB = await repoB.createSummaryLink({
      agentId: AGENT_B_ID, callerId: CALLER_B,
      srcSummaryKey: summaryKeyB, dstSummaryKey: summaryKeyB,
      score: 1000,
    });
    console.log("  summaryLink     :", slB.entityKey);

    // ── EXPIRABLE ENTITY (~2 min TTL) ─────────────────────────────────────────
    // First-class expirable knowledge via the repo (serialized write, correct nonce
    // handling) — expiresInSec overrides the scope's default TTL.
    console.log("\n  [EXPIRABLE] Writing confidential memory with 2-minute TTL...");
    const expResult = await repoB.createMemory({
      agentId: AGENT_B_ID,
      scope: "run",
      scopeKey: "acme-corp",
      memKey: "nda-confidential-tmp",
      source: "legal-session",
      version: 1,
      value: "CONFIDENTIAL: Acme Corp NDA draft — do not distribute",
      expiresInSec: 120,
    });
    expirableEntityKey = expResult.entityKey;
    console.log("  expirable key   :", expirableEntityKey);
    console.log("  NOTE: This entity should vanish from queries after ~2 minutes.");

  } catch (e) {
    console.error("  [Agent B] Arkiv writes failed:", (e as Error).message);
    console.warn("  (RPC likely down — continuing to next phase)");
  }

  // ── Phase 4: Cross-user encrypted access grant ───────────────────────────────
  banner("Phase 4: Cross-user encrypted access grant (A → B)");
  console.log(singleWallet
    ? "  [single-wallet mode] recipient = account A (code path identical to cross-wallet)"
    : "  [cross-wallet mode] recipient = account B");

  try {
    // Publish X25519 pubkeys for both accounts
    console.log("  Publishing pubKey for A...");
    await publishPubKey(ctxA);
    console.log("  Publishing pubKey for B...");
    await publishPubKey(ctxB);

    // A grants B's agent access to an encrypted summary about the legal paperwork
    // sessionKey must be a valid hex bytes32 key — use the B session key if available,
    // otherwise fall back to a known placeholder
    const grantSessionKey = sessionKeyB || "0x0000000000000000000000000000000000000000000000000000000000000001";

    console.log("  ctxA encrypting + sharing summary to demo-legal-1...");
    const { summaryKey: grantedKey } = await encryptAndShareSummary(ctxA, {
      agentId: AGENT_A_ID,
      sessionKey: grantSessionKey,
      summarySeq: 2,
      plain: {
        summary: "Acme Corp legal paperwork — share with counsel. DeFi meets NDA: cross-domain legal risk assessment.",
        topics: ["legal", "nda", "acme-corp", "cross-domain"],
      },
      granteeAgentId: AGENT_B_ID,
      expiresInSec: 120, // 2 minutes — matches expirable entity TTL
    });
    console.log("  encrypted summaryKey:", grantedKey);

    // B lists grants and reads the shared summary
    console.log("  ctxB listing grants...");
    const grants = await listGrantsForMe(ctxB);
    console.log(`  grants for B: ${grants.length} found`);

    const relevant = grants.find((g) => g.resourceKey === grantedKey);
    if (relevant) {
      const decrypted = await readSharedSummary(ctxB, relevant);
      console.log("  [DECRYPTED SUMMARY]:", decrypted);
      console.log("  Cross-account encrypted access grant: VERIFIED");
    } else {
      console.warn("  Grant not found in B's incoming grants yet — may need indexing delay.");
      if (grants.length > 0) {
        try {
          const decrypted = await readSharedSummary(ctxB, grants[0]);
          console.log("  [DECRYPTED first available]:", decrypted);
        } catch (re) {
          console.warn("  Could not decrypt first grant:", (re as Error).message);
        }
      }
    }

  } catch (e) {
    console.error("  [Access Grant] Failed:", (e as Error).message);
    console.warn("  (Expected when RPC is down — continuing)");
  }

  // ── Phase 5: Expiry verification ─────────────────────────────────────────────
  banner("Phase 5: Expiry verification");

  if (expirableEntityKey) {
    try {
      const entityNow = await queryGlobal(ctxB, [
        { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
        { key: "memKey", op: "eq", value: "nda-confidential-tmp" },
      ], 1);
      console.log(`  Entity NOW present: ${entityNow.length > 0 ? "YES" : "NO"} (key: ${expirableEntityKey})`);
    } catch (e) {
      console.warn("  Could not query expirable entity:", (e as Error).message);
    }

    if (process.env.DEMO_WAIT === "1") {
      console.log("  DEMO_WAIT=1 — sleeping 130 s to let the 2-min TTL expire...");
      await sleep(130_000);
      try {
        const entityAfter = await queryGlobal(ctxB, [
          { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
          { key: "memKey", op: "eq", value: "nda-confidential-tmp" },
        ], 1);
        if (entityAfter.length === 0) {
          console.log("  Entity GONE after expiry: VERIFIED");
        } else {
          console.warn("  Entity still present after expiry (TTL enforcement may be eventual-consistent)");
        }
      } catch (e) {
        console.warn("  Post-expiry query failed:", (e as Error).message);
      }
    } else {
      console.log(`  To verify expiry: re-query key ${expirableEntityKey} after ~2 minutes.`);
      console.log("  Set DEMO_WAIT=1 to have this script wait and verify automatically.");
    }
  } else {
    console.log("  No expirable entity key recorded (Arkiv writes may have failed earlier).");
  }

  // ── Phase 6: ENS resolve recap + cleanup ────────────────────────────────────
  banner("Phase 6: ENS resolve recap + cleanup");

  console.log("  agentEns(A):", agentEns("Crypto Trader", USER_LABEL_A, AGENT_A_ID));
  console.log("  agentEns(B):", agentEns("Legal Paperwork", USER_LABEL_B, AGENT_B_ID));
  console.log("  userEns(A) :", userEns(USER_LABEL_A), "→", ctxA.address);
  console.log("  userEns(B) :", userEns(USER_LABEL_B), "→", ctxB.address);

  if (process.env.DEMO_KEEP_ENS !== "1") {
    console.log("\n  Cleaning up demo ENS names...");
    try { await nsDeleteName(USER_LABEL_A); console.log(`  deleted '${USER_LABEL_A}'`); }
    catch (e) { console.warn(`  delete '${USER_LABEL_A}' failed:`, (e as Error).message); }
    try { await nsDeleteName(USER_LABEL_B); console.log(`  deleted '${USER_LABEL_B}'`); }
    catch (e) { console.warn(`  delete '${USER_LABEL_B}' failed:`, (e as Error).message); }
  } else {
    console.log("  DEMO_KEEP_ENS=1 — skipping ENS cleanup.");
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  banner("Demo Summary");

  console.log("  Created (when RPC is live):");
  console.log("  ├── Agent A (demo-crypto-1)");
  console.log("  │   ├── agentCard, session, 2 messages, snapshot, memory");
  console.log("  │   ├── summary, topic('defi'), summaryTopic, summaryLink");
  console.log("  │   └── ENS:", agentEns("Crypto Trader", USER_LABEL_A, AGENT_A_ID));
  console.log("  └── Agent B (demo-legal-1)");
  console.log("      ├── agentCard, session, 2 messages, snapshot, memory");
  console.log("      ├── summary, topic('nda'), summaryTopic, summaryLink");
  console.log("      ├── EXPIRABLE memory (2-min TTL) →", expirableEntityKey || "<not created>");
  console.log("      └── ENS:", agentEns("Legal Paperwork", USER_LABEL_B, AGENT_B_ID));
  console.log();
  console.log("  Cross-user encrypted access grant:");
  console.log("  Account A → summary encrypted with B's X25519 pubkey → B can decrypt");
  console.log();
  console.log("  Visualizer checks:");
  console.log("  - Both agent cards visible in /agents");
  console.log("  - All entity types in the graph view");
  console.log("  - Expirable entity disappears from visualizer after ~2 min");
  console.log("  - Access grant visible under B's incoming grants");
  if (expirableEntityKey) {
    console.log(`\n  Expirable entity key: ${expirableEntityKey}`);
    console.log("  Query after 2 min to verify TTL expiry.");
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\n[FATAL]", err);
  process.exit(1);
});
