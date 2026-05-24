// agent/scripts/smoke-brain.ts — requires a real OPENAI_API_KEY in agent/.env
import "dotenv/config";
import { respond } from "../src/brain";

const reply = await respond({
  message: "Reply with exactly the single word: PONG",
  history: [],
  knowledge: [],
});
console.log("brain reply:", JSON.stringify(reply));
if (!reply) {
  console.error("FAIL: empty reply");
  process.exit(1);
}
console.log("BRAIN SMOKE OK");
