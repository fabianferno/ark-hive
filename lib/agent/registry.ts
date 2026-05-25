// lib/agent/registry.ts
// Enumerate the ERC-8004 IdentityRegistry on Sepolia and fetch each agent's IPFS
// metadata. Token ids are sequential ERC-721 mints (1..totalSupply). Used by the
// marketplace API route (server-side: handles CORS/IPFS + caching there).
import { createPublicClient, http } from "viem";
import { sepolia } from "@/lib/wallet/chains";
import { REGISTRY_ADDRESS, IDENTITY_REGISTRY_ABI } from "@/lib/agent/identity";
import type { AgentCard } from "@/lib/agent/agentcard";

export interface MarketplaceAgent {
  agentId: string;
  owner: string;
  tokenURI: string;
  card: AgentCard | null;
  name: string;
  description: string;
  image: string;
  capabilities: string[];
  endpoint: string;
}

const GATEWAY = process.env.PINATA_GATEWAY
  ? `https://${process.env.PINATA_GATEWAY.replace(/^https?:\/\//, "").replace(/\/$/, "")}/ipfs/`
  : "https://ipfs.io/ipfs/";

function toHttp(uri: string): string {
  return uri.startsWith("ipfs://") ? GATEWAY + uri.slice("ipfs://".length) : uri;
}

export async function fetchMetadata(uri: string): Promise<AgentCard | null> {
  try {
    const r = await fetch(toHttp(uri), { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    return (await r.json()) as AgentCard;
  } catch {
    return null;
  }
}

export function makeRegistryClient() {
  const rpc = process.env.REGISTRY_RPC || sepolia.rpcUrls.default.http[0];
  return createPublicClient({ chain: sepolia, transport: http(rpc) });
}

async function buildOne(client: any, id: bigint): Promise<MarketplaceAgent> {
  const read = (functionName: string, args?: any[]) =>
    client.readContract({ address: REGISTRY_ADDRESS, abi: IDENTITY_REGISTRY_ABI, functionName, args });
  let tokenURI = "";
  let owner = "";
  try { tokenURI = (await read("tokenURI", [id])) as string; } catch { /* missing */ }
  try { owner = ((await read("ownerOf", [id])) as string).toLowerCase(); } catch { /* missing */ }
  const card = tokenURI ? await fetchMetadata(tokenURI) : null;
  return {
    agentId: id.toString(),
    owner,
    tokenURI,
    card,
    name: card?.name || `Agent #${id}`,
    description: card?.description || "",
    image: card?.image || "",
    capabilities: card?.capabilities || [],
    endpoint: card?.endpoints?.[0]?.url || "",
  };
}

export async function enumerateAgents(client = makeRegistryClient()): Promise<MarketplaceAgent[]> {
  const total = Number(
    await client.readContract({ address: REGISTRY_ADDRESS, abi: IDENTITY_REGISTRY_ABI, functionName: "totalSupply" }),
  );
  const ids = Array.from({ length: total }, (_, i) => BigInt(i + 1));
  const out: MarketplaceAgent[] = [];
  const BATCH = 8;
  for (let i = 0; i < ids.length; i += BATCH) {
    const rows = await Promise.all(ids.slice(i, i + BATCH).map((id) => buildOne(client, id)));
    out.push(...rows);
  }
  return out;
}
