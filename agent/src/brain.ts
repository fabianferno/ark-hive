import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions/completions.js";
import { loadConfig } from "./config";

const config = loadConfig();
const client = new OpenAI({ apiKey: config.openaiApiKey });

export interface ChatTurn { role: "user" | "assistant"; content: string; }
export interface BrainInput { message: string; history: ChatTurn[]; knowledge: string[]; }

const SYSTEM = `You are an ERC-8004 registered AI agent with persistent, queryable memory stored on Arkiv.
Use the provided KNOWLEDGE (retrieved from your past sessions) when relevant.
Be concise and specific. If knowledge is empty, answer from the conversation.`;

export async function respond(input: BrainInput): Promise<string> {
  const knowledgeBlock = input.knowledge.length
    ? `KNOWLEDGE:\n${input.knowledge.map((k, i) => `${i + 1}. ${k}`).join("\n")}`
    : "KNOWLEDGE: (none)";

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: `${SYSTEM}\n\n${knowledgeBlock}` },
    ...input.history.map((t): ChatCompletionMessageParam => ({ role: t.role, content: t.content })),
    { role: "user", content: input.message },
  ];

  const completion = await client.chat.completions.create({
    model: config.openaiModel,
    messages,
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned an empty completion");
  return text;
}
