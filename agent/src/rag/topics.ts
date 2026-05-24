// agent/src/rag/topics.ts
export function normalizeTopic(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")  // non-alnum runs -> single hyphen
    .replace(/^-+|-+$/g, "");      // trim edge hyphens
}
