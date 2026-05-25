// lib/agent/marketplace.ts
// Adopt a marketplace (external ERC-8004) agent into ark-hive: write a user-scoped
// Arkiv agentCard entity (no new mint, no NameStone) so it reuses the Agents list +
// chat plumbing. ENS is the existing 4-level scheme under the user's namespace.
import { makeRepo } from "@/lib/arkiv-client/repo";
import { listAgents } from "@/lib/agent/agents";
import { REGISTRY_CHAIN_ID } from "@/lib/agent/identity";
import { agentLabel, agentEns, fallbackUserLabel } from "@/lib/ens/labels";
import type { ClientCtx } from "@/lib/arkiv-client/ctx";
import type { MarketplaceAgent } from "@/lib/agent/registry";

export async function adoptAgent(
  ctx: ClientCtx,
  mkt: MarketplaceAgent,
  passedUserLabel: string,
): Promise<{ entityKey: string; ensName: string }> {
  const mine = await listAgents(ctx);
  if (mine.some((a) => a.agentId === mkt.agentId)) {
    throw new Error("already adopted");
  }
  const userLabel = passedUserLabel || fallbackUserLabel(ctx.address);
  const ensName = agentEns(mkt.name, userLabel, mkt.agentId);
  const written = await makeRepo(ctx).createAgentCard({
    agentId: mkt.agentId,
    registryChainId: REGISTRY_CHAIN_ID,
    name: mkt.name,
    description: mkt.description,
    agentCardUri: mkt.tokenURI,
    card: mkt.card ?? { type: "AgentCard", name: mkt.name, endpoints: mkt.endpoint ? [{ name: "chat", url: mkt.endpoint }] : [] },
    origin: "marketplace",
    endpoint: mkt.endpoint,
    ensName,
    ensLabel: agentLabel(mkt.name, mkt.agentId),
    ensUserLabel: userLabel,
  });
  return { entityKey: written.entityKey, ensName };
}
