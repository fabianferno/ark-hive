// lib/agentClient.ts
// TYPES ONLY. The old server-wallet HTTP client (AgentClient class + `agent`
// singleton + to* normalizers) has been retired — the agent server is now stateless
// (/ai/* only) and all agent flows run client-side in lib/agent/* signed by the
// user's Privy wallet. These Ui*/Create*/Send*/Summary types are still the shared
// shapes returned by those flows and consumed by the components, so they stay here.
// The chainLabel/ipfsHttpUrl helpers are pure presentation utilities used by the UI.
export interface UiAgent { key: string; agentId: string; name: string; description: string; status: string; registryChainId: number; createdAt: number; agentCardUri: string; ensName?: string; origin?: string; endpoint?: string; }
export interface UiSession { key: string; agentId: string; callerId: string; sessionStatus: string; turnCount: number; startedAt: number; lastActivityAt: number; }
export interface UiMessage { key: string; role: "user" | "assistant"; content: string; seq: number; }
export interface UiHit { memKey: string; value: string; scope: string; createdAt: number; }
export interface CreateAgentResult { agentId: string; txHash: string; agentCardKey: string; agentCardUri?: string; }
export interface SendResult { reply: string; userKey: string; assistantKey: string; snapshotKey: string; }
export interface CreateAgentInput { name: string; description: string; domain?: string; capabilities?: string[]; version?: string; image?: string; contact?: string; userLabel?: string; endpoint?: string; }
export interface SessionDigest { summary: string; topics: string[]; }
export interface CloseSessionResult { closed: boolean; summaryKey: string; digest: SessionDigest; }
export interface UiSummary { key: string; sessionKey: string; summary: string; topics: string[]; summarySeq: number; createdAt: number; }

/** Human label for an ERC-8004 registry chain id. */
export function chainLabel(chainId: number): string {
  const known: Record<number, string> = {
    11155111: "Ethereum Sepolia",
    84532: "Base Sepolia",
    11142220: "Celo Sepolia",
    1: "Ethereum Mainnet",
  };
  return known[chainId] ? `${known[chainId]} ${chainId}` : `Chain ${chainId}`;
}

/** Resolve an ipfs:// URI to an HTTP gateway URL for clickable links. */
export function ipfsHttpUrl(uri: string, gateway = "https://gateway.pinata.cloud/ipfs/"): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) return `${gateway}${uri.slice("ipfs://".length)}`;
  return uri;
}
