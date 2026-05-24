// agent/scripts/smoke-rag.ts — needs OPENAI_API_KEY + Braga GLM
import "dotenv/config";
import { Repo } from "../src/repo";
import { chatTurn } from "../src/chat";
import { indexSession, retrieve } from "../src/rag/rag";

const agentId = process.argv[2] ?? "rag-smoke";
const callerId = "0xCaller";
const s = await Repo.createSession({ agentId, callerId });
await chatTurn(s.entityKey, "My project uses Arkiv for storage and Base Sepolia for identity.");
await chatTurn(s.entityKey, "Remind me which chain I use for identity.");
const idx = await indexSession({ agentId, callerId, sessionKey: s.entityKey, summarySeq: 1 });
console.log("INDEXED", idx.summaryKey, JSON.stringify(idx.digest));
const hits = await retrieve("what chain for identity?", { agentId, callerId, k: 3 });
console.log("RETRIEVED", JSON.stringify(hits, null, 2));
if (!hits.length) { console.error("FAIL: no hits"); process.exit(1); }
console.log("RAG SMOKE OK");
