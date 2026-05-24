import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { loadConfig } from "./config";
import { registerIdentity, REGISTRY_CHAIN_ID } from "./identity";
import { Repo, query } from "./repo";
import { chatTurn } from "./chat";
import { searchKnowledge } from "./search";
import type { MemoryQuery, Condition } from "./search";
import { PROJECT_ATTRIBUTE, AGENT_ADDRESS } from "./arkiv";

const config = loadConfig();
const app = new Hono();

app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Headers", "Content-Type");
  c.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});

app.get("/health", (c) => c.json({ ok: true, agentWallet: AGENT_ADDRESS, project: PROJECT_ATTRIBUTE.value }));

app.post("/agents", async (c) => {
  const b = await c.req.json<{ name: string; description?: string; domain?: string; capabilities?: string[]; version?: string; image?: string; contact?: string }>();
  const id = await registerIdentity({
    name: b.name, description: b.description ?? "",
    capabilities: b.capabilities ?? ["chat", "memory-search"],
    domain: b.domain, version: b.version, image: b.image, contact: b.contact,
  });
  const card = await Repo.createAgentCard({ agentId: id.agentId, registryChainId: REGISTRY_CHAIN_ID, name: b.name, description: b.description ?? "", agentCardUri: id.agentCardUri, card: id.card });
  return c.json({ agentId: id.agentId, txHash: id.txHash, agentCardKey: card.entityKey, agentCardUri: id.agentCardUri });
});

app.get("/agents", async (c) => {
  const rows = await query([
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "agentCard" },
  ]);
  return c.json({ agents: rows });
});

app.post("/sessions", async (c) => {
  const { agentId, callerId } = await c.req.json<{ agentId: string; callerId?: string }>();
  const s = await Repo.createSession({ agentId: String(agentId), callerId: String(callerId ?? "0xCaller") });
  return c.json({ sessionKey: s.entityKey });
});

app.post("/sessions/:key/messages", async (c) => {
  const { text } = await c.req.json<{ text: string }>();
  const result = await chatTurn(c.req.param("key"), String(text));
  return c.json(result);
});

app.post("/search", async (c) => {
  const { agentId, term, scope } = await c.req.json<{ agentId: string; term?: string; scope?: string }>();
  const q: MemoryQuery = { agentId: String(agentId), scope: scope as MemoryQuery["scope"] };
  const hits = await searchKnowledge(q, term, 20);
  return c.json({ hits });
});

app.get("/agents/:id", async (c) => {
  const rows = await query([
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "agentCard" },
    { key: "agentId", op: "eq", value: c.req.param("id") },
  ] as Condition[]);
  return c.json({ agent: rows[0] ?? null });
});

app.get("/sessions", async (c) => {
  const agentId = c.req.query("agentId");
  const conds: Condition[] = [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "session" },
  ];
  if (agentId) conds.push({ key: "agentId", op: "eq", value: agentId });
  const rows = await query(conds);
  return c.json({ sessions: rows });
});

app.get("/sessions/:key/messages", async (c) => {
  const rows = await query([
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "message" },
    { key: "sessionKey", op: "eq", value: c.req.param("key") },
  ] as Condition[], 200);
  rows.sort((a, b) => Number(a.attrs.seq) - Number(b.attrs.seq));
  return c.json({ messages: rows });
});

serve({ fetch: app.fetch, port: config.port });
console.log(`agent service on :${config.port} (wallet ${AGENT_ADDRESS})`);
