import "dotenv/config";
import { Repo } from "../src/repo";
import { indexSession, retrieve, topicFetch } from "../src/rag/rag";

const agentId = "rag2-" + Date.now();
const callerId = "0xU";
const now = Date.now();

const s1 = await Repo.createSession({ agentId, callerId });
await Repo.createMessage({ sessionKey: s1.entityKey, agentId, role: "user", seq: 0, ts: now, content: "Optimizing gas in my Solidity smart contract: storage packing, calldata, fewer SSTORE writes." });
const i1 = await indexSession({ agentId, callerId, sessionKey: s1.entityKey, summarySeq: 1 });
console.log("S1 topics:", JSON.stringify(i1.digest.topics));

const s2 = await Repo.createSession({ agentId, callerId });
await Repo.createMessage({ sessionKey: s2.entityKey, agentId, role: "user", seq: 0, ts: now, content: "Choosing React state management: Zustand vs Redux, leaning Zustand for simpler global state." });
const i2 = await indexSession({ agentId, callerId, sessionKey: s2.entityKey, summarySeq: 1 });
console.log("S2 topics:", JSON.stringify(i2.digest.topics));

const rA = (await retrieve("how do I reduce gas usage in my contract", { agentId, callerId, k: 1 }))[0] ?? "";
const rB = (await retrieve("which library for frontend state", { agentId, callerId, k: 1 }))[0] ?? "";
console.log("Q(gas)   ->", rA.slice(0, 90));
console.log("Q(state) ->", rB.slice(0, 90));
const passA = /gas|solidity|contract|sstore|storage/i.test(rA);
const passB = /state|zustand|redux|react|frontend/i.test(rB);
const tk = i1.digest.topics[0] ?? "gas";
const t = await topicFetch(tk, { agentId, callerId });
console.log(`topicFetch('${tk}') -> ${t.length}`);
console.log("ACCURACY gas->S1:", passA, "| state->S2:", passB, "| topicFetch>0:", t.length > 0);
console.log(passA && passB && t.length > 0 ? "2SESS RAG OK" : "2SESS RAG FAIL");
