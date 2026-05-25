// lib/agent/agents.ts
// Client-side agent listing/reads. Reads are scoped to the user's address by the
// repo `query` (.createdBy(ctx.address)). Returns the SAME Ui* shapes as
// lib/agentClient.ts so the Phase 5 hooks are a drop-in.
import { query as repoQuery, queryGlobal, type DecodedEntity } from "@/lib/arkiv-client/repo";
import { PROJECT_ATTRIBUTE } from "@/lib/arkiv-client/project";
import type { ClientCtx } from "@/lib/arkiv-client/ctx";
import type { UiAgent } from "@/lib/agentClient";

/** An agent discoverable across ALL users (for cross-user sharing) — carries owner. */
export interface DiscoverableAgent extends UiAgent { owner?: string }

const toAgent = (e: DecodedEntity): UiAgent => {
  const p = (e.payload ?? {}) as { name?: string; description?: string; ensName?: string; endpoint?: string; card?: { endpoints?: { url?: string }[] } | null };
  const ensName = String(e.attrs.ensName ?? p.ensName ?? "") || undefined;
  const endpoint = String(e.attrs.endpoint ?? p.endpoint ?? p.card?.endpoints?.[0]?.url ?? "") || undefined;
  return {
    key: e.key,
    agentId: String(e.attrs.agentId),
    name: p.name ?? "",
    description: p.description ?? "",
    status: String(e.attrs.status ?? "active"),
    registryChainId: Number(e.attrs.registryChainId ?? 0),
    createdAt: Number(e.attrs.createdAt ?? 0),
    agentCardUri: String(e.attrs.agentCardUri ?? ""),
    ensName,
    origin: String(e.attrs.origin ?? "created"),
    endpoint,
  };
};

/** @internal test seam */
export const __toAgentForTest = toAgent;

export async function listAgents(ctx: ClientCtx): Promise<UiAgent[]> {
  const rows = await repoQuery(ctx, [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "agentCard" },
  ], 200);
  return rows.map(toAgent);
}

/** List agents across ALL users (unscoped) so the user can share to others' agents. */
export async function listAllAgents(ctx: ClientCtx): Promise<DiscoverableAgent[]> {
  const rows = await queryGlobal(ctx, [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "agentCard" },
  ], 300);
  return rows.map((e) => ({ ...toAgent(e), owner: (e.creator ?? e.owner)?.toLowerCase() }));
}

export async function getAgent(ctx: ClientCtx, agentId: string): Promise<UiAgent | null> {
  const rows = await repoQuery(ctx, [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "agentCard" },
    { key: "agentId", op: "eq", value: agentId },
  ], 1);
  return rows[0] ? toAgent(rows[0]) : null;
}
