// lib/ens/resolve.ts
// Arkiv-side agent resolution — public read (no wallet write required).
import { queryGlobal } from "@/lib/arkiv-client/repo";
import { PROJECT_ATTRIBUTE } from "@/lib/arkiv-client/project";
import { parseEns } from "./labels";
import type { ClientCtx } from "@/lib/arkiv-client/ctx";

/**
 * Look up an agent card in Arkiv by its full ENS name.
 * Returns null when the name is not an agent ENS or no matching entity is found.
 */
export async function resolveAgentByEns(
  ctx: ClientCtx,
  full: string,
): Promise<{
  agentId: string;
  card: unknown;
  ownerAddress?: string;
  key: string;
} | null> {
  const p = parseEns(full);
  if (p.kind !== "agent") return null;

  const rows = await queryGlobal(
    ctx,
    [
      { key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value },
      { key: "entityType", op: "eq", value: "agentCard" },
      { key: "ensName", op: "eq", value: full.toLowerCase() },
    ],
    1,
  );

  if (rows.length === 0) return null;

  return {
    agentId: String(rows[0].attrs.agentId),
    card: rows[0].payload,
    ownerAddress: rows[0].creator ?? rows[0].owner,
    key: rows[0].key,
  };
}
