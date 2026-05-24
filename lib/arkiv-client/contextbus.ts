// lib/arkiv-client/contextbus.ts
// Scoped-memory cascade (run > entity > global), ported from agent/src/contextbus.ts.
// The pure resolveCascade is unchanged; get/set/getScoped take the ctx repo
// (from makeRepo) instead of dynamic-importing module singletons.
import { PROJECT_ATTRIBUTE } from "./project";
import type { ClientRepo } from "./repo";

export type Scope = "run" | "entity" | "global";
export type ScopeKeys = Record<Scope, string>;
export type ScopeFetcher = (scope: Scope, scopeKey: string, memKey: string) => Promise<string | null>;

const ORDER: Scope[] = ["run", "entity", "global"];

export async function resolveCascade(memKey: string, keys: ScopeKeys, fetcher: ScopeFetcher): Promise<string | null> {
  for (const scope of ORDER) {
    const hit = await fetcher(scope, keys[scope], memKey);
    if (hit !== null) return hit;
  }
  return null;
}

/** Read one memory value for a scope (latest by createdAt). */
export async function getScoped(repo: ClientRepo, scope: Scope, scopeKey: string, memKey: string): Promise<string | null> {
  const rows = await repo.query([
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "memory" },
    { key: "scope", op: "eq", value: scope },
    { key: "scopeKey", op: "eq", value: scopeKey },
    { key: "memKey", op: "eq", value: memKey },
  ], 1);
  if (!rows.length) return null;
  const payload = rows[0].payload as { value?: string } | null;
  return payload?.value ?? null;
}

/** Resolve a memKey across run/entity/global using real Arkiv reads. */
export async function get(repo: ClientRepo, memKey: string, keys: ScopeKeys): Promise<string | null> {
  return resolveCascade(memKey, keys, (scope, scopeKey, mk) => getScoped(repo, scope, scopeKey, mk));
}

/** Persist a memory value into the given scope. */
export async function set(repo: ClientRepo, opts: { agentId: string; scope: Scope; scopeKey: string; memKey: string; value: string; source?: string; version?: number }) {
  return repo.createMemory({
    agentId: opts.agentId, scope: opts.scope, scopeKey: opts.scopeKey,
    memKey: opts.memKey, value: opts.value, source: opts.source ?? "chat", version: opts.version ?? 1,
  });
}
