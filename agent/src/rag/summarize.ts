// agent/src/rag/summarize.ts
import OpenAI from "openai";
import { loadConfig } from "../config";
import type { ChatTurn } from "../brain";

export interface SessionDigest { summary: string; topics: string[]; }

const PROMPT = `Summarize this conversation in 2-4 sentences capturing the user's intent, key facts, and decisions.
Then list 3-8 short topic labels (1-3 words each).
Return STRICT JSON: {"summary": string, "topics": string[]}. No prose outside the JSON.`;

export async function summarizeSession(messages: ChatTurn[]): Promise<SessionDigest> {
  const config = loadConfig();
  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const transcript = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const res = await client.chat.completions.create({
    model: config.openaiModel,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PROMPT },
      { role: "user", content: transcript || "(empty conversation)" },
    ],
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<SessionDigest>;
  return { summary: String(parsed.summary ?? ""), topics: Array.isArray(parsed.topics) ? parsed.topics.map(String) : [] };
}
