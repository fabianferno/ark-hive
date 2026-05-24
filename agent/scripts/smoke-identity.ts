import "dotenv/config";
import { registerIdentity } from "../src/identity";
const id = await registerIdentity({ name: "Smoke Agent", description: "smoke", capabilities: ["chat"] });
if (!id.agentId) { console.error("FAIL: no agentId"); process.exit(1); }
console.log("IDENTITY SMOKE OK", JSON.stringify(id, null, 2));
