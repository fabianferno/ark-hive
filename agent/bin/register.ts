import "dotenv/config";
import { registerIdentity, REGISTRY_CHAIN_ID } from "../src/identity";
import { Repo } from "../src/repo";

const name = process.argv[2] ?? "AgentState Demo Agent";
const description = process.argv[3] ?? "An ERC-8004 agent with Arkiv-backed memory";

const id = await registerIdentity({ name, description, capabilities: ["chat", "memory-search"] });
console.log("Registered 8004 identity:", id.agentId, "tx", id.txHash);
if (id.agentCardUri) {
  console.log("Agent card pinned to IPFS:", id.agentCardUri);
}

const card = await Repo.createAgentCard({ agentId: id.agentId, registryChainId: REGISTRY_CHAIN_ID, name, description, agentCardUri: id.agentCardUri, card: id.card });
console.log("Wrote AgentCard to Arkiv:", card.entityKey, "tx", card.txHash);
console.log(JSON.stringify({ agentId: id.agentId, agentCardKey: card.entityKey, agentCardUri: id.agentCardUri }, null, 2));
