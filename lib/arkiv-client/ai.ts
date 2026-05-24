// lib/arkiv-client/ai.ts
// Browser → stateless AI server (OpenAI/Pinata) via the Next proxy. No secrets in
// the browser: summarize/embed/reply/pin all run server-side.
const AI = process.env.NEXT_PUBLIC_AGENT_URL ?? "/agent-api";

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${AI}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path} ${r.status} ${await r.text().catch(() => "")}`);
  return r.json() as Promise<T>;
}

export const aiReply = (b: { message: string; history: { role: string; content: string }[]; knowledge: string[] }) =>
  post<{ reply: string }>("/ai/reply", b).then((r) => r.reply);
export const aiSummarize = (messages: { role: string; content: string }[]) =>
  post<{ summary: string; topics: string[] }>("/ai/summarize", { messages });
export const aiEmbed = (text: string) =>
  post<{ vector: number[] }>("/ai/embed", { text }).then((r) => r.vector);
export const aiPin = (card: unknown) =>
  post<{ uri: string }>("/ai/pin", { card }).then((r) => r.uri);
