import "dotenv/config";
import { Repo } from "../src/repo";
import { chatTurn } from "../src/chat";

const agentId = process.argv[2] ?? "smoke-agent-" + Date.now();
const session = await Repo.createSession({ agentId, callerId: "0xCaller" });
console.log("session", session.entityKey);
const t1 = await chatTurn(session.entityKey, "Remember that my favorite color is teal.");
console.log("turn1 reply:", t1.reply);
const t2 = await chatTurn(session.entityKey, "What is my favorite color?");
console.log("turn2 reply:", t2.reply);
console.log(t2.reply.toLowerCase().includes("teal") ? "RECALL OK (teal)" : "WARN: no recall");
console.log("CHAT SMOKE OK");
