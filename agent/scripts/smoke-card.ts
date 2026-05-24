import "dotenv/config";
import { registerIdentity } from "../src/identity";
const r = await registerIdentity({ name: "AgentState Demo", description: "ERC-8004 agent with Arkiv-backed memory", capabilities: ["chat", "memory-search"] });
console.log("AGENTID", r.agentId);
console.log("CARD_URI", r.agentCardUri);
console.log("CARD", JSON.stringify(r.card));
