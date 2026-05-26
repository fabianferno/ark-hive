import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { loadConfig } from "./config";
import { makeSdk } from "./identity";
import { respond, type ChatTurn } from "./brain";
import { summarizeSession } from "./rag/summarize";
import { embed } from "./rag/embed";

const config = loadConfig();
const app = new Hono();

app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Headers", "Content-Type");
  c.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});

app.get("/health", (c) => c.json({ ok: true }));

app.post("/ai/reply", async (c) => {
  try {
    const { message, history, knowledge, persona } = await c.req.json<{ message: string; history?: ChatTurn[]; knowledge?: string[]; persona?: string }>();
    const reply = await respond({ message: String(message), history: history ?? [], knowledge: knowledge ?? [], persona });
    return c.json({ reply });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.post("/ai/summarize", async (c) => {
  try {
    const { messages } = await c.req.json<{ messages?: ChatTurn[] }>();
    const { summary, topics } = await summarizeSession(messages ?? []);
    return c.json({ summary, topics });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.post("/ai/embed", async (c) => {
  try {
    const { text } = await c.req.json<{ text: string }>();
    const vector = await embed(String(text));
    return c.json({ vector });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

// Per-role personas for the cohort of 10 ERC-8004 agents hosted by this server.
// Each role's chat endpoint is `/chat/<slug>`; the AgentCard endpoint URL points
// here, so a marketplace `Adopt` + chat round-trips through this server.
const PERSONAS: Record<string, { name: string; system: string }> = {
  lyra:    { name: "Lyra",    system: 'You are "Lyra", a crypto market analyst. Frame replies around tokens, on-chain metrics, and macro catalysts. Be direct, cite numbers when relevant, never give financial advice.' },
  atlas:   { name: "Atlas",   system: 'You are "Atlas", a legal-contracts reviewer. Flag risk clauses, ambiguous language, and missing protections. Plain-English summaries, bullet points, no jargon dumps. Not a substitute for a lawyer.' },
  sage:    { name: "Sage",    system: 'You are "Sage", a senior code reviewer. Spot correctness bugs, security holes, perf issues. One concrete fix per finding. No praise.' },
  echo:    { name: "Echo",    system: 'You are "Echo", a customer support agent. Empathetic, concise, action-oriented. Always confirm understanding and outline next steps.' },
  nova:    { name: "Nova",    system: 'You are "Nova", a startup advisor. Cut through founder-vanity, push for distribution, unit economics, focus. Be blunt.' },
  orion:   { name: "Orion",   system: 'You are "Orion", a devops/SRE engineer. Talk in pipelines, observability, blast-radius. Lean toward safe rollouts and runbooks.' },
  vega:    { name: "Vega",    system: 'You are "Vega", a data scientist. Frame problems as hypotheses with metrics. Suggest experiments, watch for confounders, quote effect sizes.' },
  zephyr:  { name: "Zephyr",  system: 'You are "Zephyr", a creative writer. Vivid imagery, varied rhythm, no clichés. Short paragraphs.' },
  iris:    { name: "Iris",    system: 'You are "Iris", a UX designer. Think in user jobs, friction points, hierarchy. Suggest concrete flow/layout tweaks; cite Fitts/Hick where it fits.' },
  helios:  { name: "Helios",  system: 'You are "Helios", an investment research analyst. Frame replies around theses, moats, comps, risks. Never give financial advice; cite reasoning.' },
};

export const COHORT_SLUGS = Object.keys(PERSONAS);

// Per-role chat endpoint: POST /chat/<slug> { message, history } → { reply }.
app.post("/chat/:slug", async (c) => {
  const slug = c.req.param("slug").toLowerCase();
  const persona = PERSONAS[slug];
  if (!persona) return c.json({ error: `unknown agent slug: ${slug}` }, 404);
  try {
    const { message, history, knowledge } = await c.req.json<{ message: string; history?: ChatTurn[]; knowledge?: string[] }>();
    const reply = await respond({
      message: String(message ?? ""),
      history: history ?? [],
      knowledge: Array.isArray(knowledge) ? knowledge : [],
      persona: persona.system,
    });
    return c.json({ reply, agent: persona.name });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

// Generic /chat — the legacy ArkHive Demo Agent (agentId 5340).
app.post("/chat", async (c) => {
  try {
    const { message, history, knowledge } = await c.req.json<{ message: string; history?: ChatTurn[]; knowledge?: string[] }>();
    const reply = await respond({
      message: String(message ?? ""),
      history: history ?? [],
      knowledge: Array.isArray(knowledge) ? knowledge : [],
      persona: 'You are "ArkHive Demo Agent", a friendly ERC-8004 agent hosted by ark-hive. Answer concisely and helpfully.',
    });
    return c.json({ reply });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.post("/ai/pin", async (c) => {
  try {
    const { card } = await c.req.json<{ card: unknown }>();
    const sdk: any = makeSdk("pin");
    const up = await sdk.upload(card, { filename: "agent-card.json" });
    return c.json({ uri: up.uri ?? `ipfs://${up.cid}` });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

serve({ fetch: app.fetch, port: config.port });
console.log(`agent service on :${config.port} (stateless AI + pin)`);
