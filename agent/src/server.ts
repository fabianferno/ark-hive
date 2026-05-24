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
    const { message, history, knowledge } = await c.req.json<{ message: string; history?: ChatTurn[]; knowledge?: string[] }>();
    const reply = await respond({ message: String(message), history: history ?? [], knowledge: knowledge ?? [] });
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
