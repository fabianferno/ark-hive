// lib/agent/agents.ts
// Client-side agent listing/reads. Reads are scoped to the user's address by the
// repo `query` (.createdBy(ctx.address)). Returns the SAME Ui* shapes as
// lib/agentClient.ts so the Phase 5 hooks are a drop-in.
import { query as repoQuery, type DecodedEntity } from "@/lib/arkiv-client/repo";
import { PROJECT_ATTRIBUTE } from "@/lib/arkiv-client/project";
import type { ClientCtx } from "@/lib/arkiv-client/ctx";
import type { UiAgent } from "@/lib/agentClient";

const toAgent = (e: DecodedEntity): UiAgent => {
  const p = (e.payload ?? {}) as { name?: string; description?: string };
  return {
    key: e.key,
    agentId: String(e.attrs.agentId),
    name: p.name ?? "",
    description: p.description ?? "",
    status: String(e.attrs.status ?? "active"),
    registryChainId: Number(e.attrs.registryChainId ?? 0),
    createdAt: Number(e.attrs.createdAt ?? 0),
    agentCardUri: String(e.attrs.agentCardUri ?? ""),
  };
};

export async function listAgents(ctx: ClientCtx): Promise<UiAgent[]> {
  const rows = await repoQuery(ctx, [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "agentCard" },
  ], 200);
  return rows.map(toAgent);
}

export async function getAgent(ctx: ClientCtx, agentId: string): Promise<UiAgent | null> {
  const rows = await repoQuery(ctx, [
    { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
    { key: "entityType", op: "eq", value: "agentCard" },
    { key: "agentId", op: "eq", value: agentId },
  ], 1);
  return rows[0] ? toAgent(rows[0]) : null;
}
