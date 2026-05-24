// lib/arkiv-client/search.ts
// Pure query-condition builders (no live search), ported from agent/src/search.ts.
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
