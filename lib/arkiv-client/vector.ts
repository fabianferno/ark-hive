// lib/arkiv-client/vector.ts
// Pure vector math (cosine + topK), ported from agent/src/rag/embed.ts.
// The OpenAI `embed` lives on the stateless server (lib/arkiv-client/ai.ts).
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
