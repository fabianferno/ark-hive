// lib/agent/registry.ts
// Curated marketplace listing of ERC-8004 IdentityRegistry agents on Sepolia.
// The registry does NOT implement totalSupply (reverts), and across last 500k
// blocks zero external agents had a reachable chat endpoint (5/6 used
// daio.example DNS-fail; 1 returned 501). So we hardcode a verified allowlist
// (KNOWN_AGENTS) and fetch each id's tokenURI/ownerOf directly — fast, no log
// scan, deterministic.
import { createPublicClient, http } from "viem";
import { sepolia } from "@/lib/wallet/chains";
import { REGISTRY_ADDRESS, IDENTITY_REGISTRY_ABI } from "@/lib/agent/identity";
import type { AgentCard } from "@/lib/agent/agentcard";

/** Verified-working ERC-8004 agent ids (probed; endpoints respond to POST).
 *  All hosted at arkhive.crevn.xyz with distinct per-role personas. */
export const KNOWN_AGENTS: readonly string[] = [
  "5340", // ArkHive Demo Agent — /chat
  "5341", // Lyra   — crypto market analyst         — /chat/lyra
  "5342", // Atlas  — legal contracts reviewer      — /chat/atlas
  "5343", // Sage   — senior code reviewer          — /chat/sage
  "5344", // Echo   — customer support              — /chat/echo
  "5345", // Nova   — startup advisor               — /chat/nova
  "5346", // Orion  — devops / SRE                  — /chat/orion
  "5347", // Vega   — data scientist                — /chat/vega
  "5348", // Zephyr — creative writer               — /chat/zephyr
  "5349", // Iris   — UX designer                   — /chat/iris
  "5350", // Helios — investment research analyst   — /chat/helios
];

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

/** Parse a `data:application/json[;base64],...` URI inline (no network). */
function parseDataUri(uri: string): AgentCard | null {
  const m = uri.match(/^data:([^,]*),(.*)$/);
  if (!m) return null;
  const meta = m[1].toLowerCase();
  let raw = m[2];
  try {
    if (meta.includes(";base64")) raw = Buffer.from(raw, "base64").toString("utf8");
    else raw = decodeURIComponent(raw);
    return JSON.parse(raw) as AgentCard;
  } catch {
    return null;
  }
}

export async function fetchMetadata(uri: string): Promise<AgentCard | null> {
  if (!uri) return null;
  if (uri.startsWith("data:")) return parseDataUri(uri);
  try {
    const r = await fetch(toHttp(uri), { signal: AbortSignal.timeout(15_000) });
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

// Direct contract reads for a single known agent id (tokenURI + ownerOf).
async function readKnownAgent(client: any, id: string): Promise<{ tokenURI: string; owner: string } | null> {
  try {
    const [tokenURI, owner] = await Promise.all([
      client.readContract({ address: REGISTRY_ADDRESS, abi: IDENTITY_REGISTRY_ABI, functionName: "tokenURI", args: [BigInt(id)] }),
      client.readContract({ address: REGISTRY_ADDRESS, abi: IDENTITY_REGISTRY_ABI, functionName: "ownerOf", args: [BigInt(id)] }),
    ]);
    return { tokenURI: String(tokenURI ?? ""), owner: String(owner ?? "").toLowerCase() };
  } catch {
    return null;
  }
}

// Endpoints that are templates/placeholders/private hosts — not chat-able.
const PLACEHOLDER_HOSTS = new Set([
  "agent.local", "agent.localhost", "localhost", "127.0.0.1", "0.0.0.0",
  "example.com", "my-agent.example.com", "agent.example.com",
]);

function isUsableEndpoint(url: string): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (PLACEHOLDER_HOSTS.has(h)) return false;
    if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
    if (h.endsWith(".local") || h.endsWith(".internal")) return false;
    return true;
  } catch { return false; }
}

function isCompatible(card: AgentCard | null): card is AgentCard {
  if (!card || typeof card !== "object") return false;
  const name = (card as { name?: unknown }).name;
  return typeof name === "string" && name.trim().length > 0;
}

async function buildOne(agentId: string, tokenURI: string, owner: string): Promise<MarketplaceAgent | null> {
  const card = tokenURI ? await fetchMetadata(tokenURI) : null;
  if (!isCompatible(card)) return null;
  const rawEndpoint = card.endpoints?.[0]?.url || "";
  const endpoint = isUsableEndpoint(rawEndpoint) ? rawEndpoint : "";
  return {
    agentId,
    owner,
    tokenURI,
    card,
    name: card.name,
    description: card.description || "",
    image: card.image || "",
    capabilities: card.capabilities || [],
    endpoint,
  };
}

export async function enumerateAgents(
  client = makeRegistryClient(),
  ids: readonly string[] = KNOWN_AGENTS,
): Promise<MarketplaceAgent[]> {
  const out: MarketplaceAgent[] = [];
  await Promise.all(
    ids.map(async (id) => {
      const ref = await readKnownAgent(client, id);
      if (!ref) return;
      const row = await buildOne(id, ref.tokenURI, ref.owner);
      if (row) out.push(row);
    }),
  );
  // Newest first.
  out.sort((a, b) => Number(BigInt(b.agentId) - BigInt(a.agentId)));
  return out;
}
