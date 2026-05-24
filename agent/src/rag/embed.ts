// agent/src/rag/embed.ts
import OpenAI from "openai";
import { loadConfig } from "../config";

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function topK<T>(queryVec: number[], items: { vec: number[]; item: T }[], k: number): T[] {
  return items
    .map((x) => ({ item: x.item, score: cosine(queryVec, x.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.item);
}

export async function embed(text: string): Promise<number[]> {
  const config = loadConfig();
  const client = new OpenAI({ apiKey: config.openaiApiKey });
  // 256 dims (not the default 1536) keeps the Arkiv summary payload small so the
  // on-chain write doesn't time out; cosine ranking stays accurate at 256.
  const res = await client.embeddings.create({ model: config.embeddingModel, input: text, dimensions: 128 });
  return res.data[0].embedding.map((x) => Math.round(x * 1e4) / 1e4);
}
