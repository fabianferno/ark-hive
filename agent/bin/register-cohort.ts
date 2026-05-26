// Register a cohort of 10 ERC-8004 agents on Sepolia, all hosted by this
// server. Each agent's card endpoint points to /chat/<slug>. Prints the
// resulting agentIds at the end so they can be pasted into KNOWN_AGENTS.
import "dotenv/config";
import { registerIdentity } from "../src/identity";

const DOMAIN = "arkhive.crevn.xyz";

interface Role { slug: string; name: string; description: string; capabilities: string[] }

const COHORT: Role[] = [
  { slug: "lyra",   name: "Lyra",   description: "Crypto market analyst — tokens, on-chain metrics, macro catalysts.",                  capabilities: ["crypto-analysis", "market-metrics", "chat"] },
  { slug: "atlas",  name: "Atlas",  description: "Legal contracts reviewer — risk clauses, ambiguity, missing protections.",            capabilities: ["legal-review", "contract-analysis", "chat"] },
  { slug: "sage",   name: "Sage",   description: "Senior code reviewer — correctness bugs, security holes, performance.",               capabilities: ["code-review", "security-audit", "chat"] },
  { slug: "echo",   name: "Echo",   description: "Customer support — empathetic triage, clear next steps.",                             capabilities: ["support", "triage", "chat"] },
  { slug: "nova",   name: "Nova",   description: "Startup advisor — distribution, unit economics, focus over vanity.",                  capabilities: ["startup-advisory", "gtm", "chat"] },
  { slug: "orion",  name: "Orion",  description: "DevOps / SRE — pipelines, observability, safe rollouts, runbooks.",                   capabilities: ["devops", "sre", "incident-response", "chat"] },
  { slug: "vega",   name: "Vega",   description: "Data scientist — hypotheses, experiments, effect sizes.",                             capabilities: ["data-science", "experiments", "chat"] },
  { slug: "zephyr", name: "Zephyr", description: "Creative writer — vivid imagery, varied rhythm, no clichés.",                         capabilities: ["creative-writing", "editing", "chat"] },
  { slug: "iris",   name: "Iris",   description: "UX designer — user jobs, friction points, hierarchy; flow/layout tweaks.",            capabilities: ["ux-design", "ui-review", "chat"] },
  { slug: "helios", name: "Helios", description: "Investment research analyst — theses, moats, comps, risks.",                          capabilities: ["equity-research", "comps", "chat"] },
];

const results: { slug: string; name: string; agentId: string; txHash: string; agentCardUri: string }[] = [];
for (const role of COHORT) {
  const endpoint = `https://${DOMAIN}/chat/${role.slug}`;
  console.log(`\n→ registering ${role.name} (${role.slug})  endpoint=${endpoint}`);
  try {
    const id = await registerIdentity({
      name: role.name,
      description: role.description,
      capabilities: role.capabilities,
      domain: DOMAIN,
      endpoint,
    });
    console.log(`  ✓ agentId=${id.agentId}  tx=${id.txHash}  uri=${id.agentCardUri}`);
    results.push({ slug: role.slug, name: role.name, agentId: id.agentId, txHash: id.txHash, agentCardUri: id.agentCardUri });
  } catch (e) {
    console.error(`  ✗ ${role.name} failed: ${(e as Error).message}`);
  }
}

console.log("\n=== COHORT SUMMARY ===");
for (const r of results) console.log(`  ${r.slug.padEnd(7)} ${r.agentId.padStart(5)}  ${r.name}`);
console.log("\nKNOWN_AGENTS (paste into lib/agent/registry.ts):");
console.log(JSON.stringify(results.map((r) => r.agentId)));
