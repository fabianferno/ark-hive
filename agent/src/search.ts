import type { ProjectAttr } from "./entities";

export type Condition = { key: string; op: "eq" | "gt" | "gte" | "lt" | "lte"; value: string | number };
export interface MemoryQuery { agentId: string; scope?: "run" | "entity" | "global"; memKey?: string; sinceMs?: number; }

export function buildMemoryConditions(project: ProjectAttr, q: MemoryQuery): Condition[] {
  const c: Condition[] = [
    { key: project.key, op: "eq", value: project.value },
    { key: "entityType", op: "eq", value: "memory" },
    { key: "agentId", op: "eq", value: q.agentId },
  ];
  if (q.scope) c.push({ key: "scope", op: "eq", value: q.scope });
  if (q.memKey) c.push({ key: "memKey", op: "eq", value: q.memKey });
  if (q.sinceMs !== undefined) c.push({ key: "createdAt", op: "gt", value: q.sinceMs });
  return c;
}

export interface KnowledgeHit { memKey: string; value: string; scope: string; createdAt: number; }

/** Real search over the agent's Arkiv memory; returns hits for grounding the LLM. */
export async function searchKnowledge(q: MemoryQuery, term?: string, limit = 10): Promise<KnowledgeHit[]> {
  const { query } = await import("./repo");
  const { PROJECT_ATTRIBUTE } = await import("./arkiv");
  const conditions = buildMemoryConditions(PROJECT_ATTRIBUTE, q);
  const rows = await query(conditions, limit);
  const hits = rows.map((r) => {
    const p = r.payload as { value?: string } | null;
    return {
      memKey: String(r.attrs.memKey ?? ""),
      value: p?.value ?? "",
      scope: String(r.attrs.scope ?? ""),
      createdAt: Number(r.attrs.createdAt ?? 0),
    };
  });
  const filtered = term
    ? hits.filter((h) => h.value.toLowerCase().includes(term.toLowerCase()) || h.memKey.toLowerCase().includes(term.toLowerCase()))
    : hits;
  return filtered.sort((a, b) => b.createdAt - a.createdAt);
}
