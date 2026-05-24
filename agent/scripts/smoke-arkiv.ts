import "dotenv/config";
import { Repo, query } from "../src/repo";
import { PROJECT_ATTRIBUTE } from "../src/arkiv";

const agentId = "smoke-" + Date.now();
const { entityKey, txHash } = await Repo.createAgentCard({ agentId, registryChainId: 84532, name: "Smoke", description: "smoke test" });
console.log("created agentCard", entityKey, txHash);

const rows = await query([
  { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
  { key: "entityType", op: "eq", value: "agentCard" },
  { key: "agentId", op: "eq", value: agentId },
]);
console.log("queried back:", rows.length, JSON.stringify(rows[0], null, 2));
if (rows.length !== 1) { console.error("FAIL: expected 1 row"); process.exit(1); }
console.log("ARKIV SMOKE OK");
