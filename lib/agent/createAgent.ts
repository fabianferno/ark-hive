// lib/agent/createAgent.ts
// Client-side agent creation, orchestrated entirely from the browser with the
// user's Privy wallet. Ports agent/src/{agentcard,identity} + the old server
// `POST /agents` handler:
//   1. build the full AgentCard (agentAddress = ctx.address)
//   2. pin it to IPFS via the stateless server (aiPin)
//   3. switch to Eth Sepolia → raw-viem `register(string)` 8004 mint
//   4. switch back to Braga → write the agentCard entity to Arkiv (user-signed)
import { makeRepo } from "@/lib/arkiv-client/repo";
import { aiPin } from "@/lib/arkiv-client/ai";
import type { ClientCtx } from "@/lib/arkiv-client/ctx";
import { buildAgentCard } from "./agentcard";
import { registerIdentityClient, REGISTRY_ADDRESS, REGISTRY_CHAIN_ID } from "./identity";
import type { CreateAgentInput, CreateAgentResult } from "@/lib/agentClient";
import { agentLabel, agentEns, fallbackUserLabel } from "@/lib/ens/labels";

// The subset of useUserWallet() this flow needs for the Sepolia mint + chain switching.
export interface CreateAgentWallets {
  // Privy's sendTransaction prompts the user's embedded wallet for the 8004 mint.
  sendTransaction: (input: { to: string; data: string; chainId: number }) => Promise<{ hash: `0x${string}` }>;
  publicSepolia: any;
  switchChain: (id: number) => Promise<void>;
  BRAGA_ID: number;
  SEPOLIA_ID: number;
}

const DEFAULT_DOMAIN = "agent.local";
const DEFAULT_VERSION = "1.0.0";
const DEFAULT_CAPABILITIES = ["chat", "memory-search"];

export async function createAgent(
  ctx: ClientCtx,
  wallets: CreateAgentWallets,
  input: CreateAgentInput,
): Promise<CreateAgentResult> {
  const domain = input.domain || DEFAULT_DOMAIN;
  const version = input.version || DEFAULT_VERSION;
  const capabilities = input.capabilities?.length ? input.capabilities : DEFAULT_CAPABILITIES;

  // 1. Full AgentCard. The card carries no agentId pre-mint (matches the server
  //    design — the id only exists after register()).
  const card = buildAgentCard({
    name: input.name,
    description: input.description ?? "",
    domain,
    capabilities,
    version,
    registryAddress: REGISTRY_ADDRESS,
    chainId: REGISTRY_CHAIN_ID,
    agentAddress: ctx.address,
    image: input.image || undefined,
    contact: input.contact || undefined,
    endpoints: [{ name: "chat", url: input.endpoint || `https://${domain}/chat` }],
  });

  // 2. Pin to IPFS (server holds the Pinata key).
  const uri = await aiPin(card);

  // 3. Mint on Eth Sepolia via the user's Privy wallet (sendTransaction handles
  //    the chain switch through chainId + prompts the embedded wallet).
  let agentId: string;
  let txHash: string;
  try {
    const minted = await registerIdentityClient({
      sendTransaction: wallets.sendTransaction,
      publicSepolia: wallets.publicSepolia,
      ipfsUri: uri,
    });
    agentId = minted.agentId;
    txHash = minted.txHash;
  } finally {
    // Return the embedded wallet to Braga so the Arkiv write below uses the right chain.
    try { await wallets.switchChain(wallets.BRAGA_ID); } catch { /* best-effort */ }
  }

  // 4. Write the agentCard entity to Arkiv (signed by the user's Braga wallet).
  // Every agent always gets a 4-level ENS; fall back to a derived label when the
  // user hasn't claimed one.
  const userLabel = input.userLabel || fallbackUserLabel(ctx.address);
  const endpoint = input.endpoint || `https://${domain}/chat`;
  const ensFields = {
    ensLabel: agentLabel(input.name, agentId),
    ensName: agentEns(input.name, userLabel, agentId),
    ensUserLabel: userLabel,
  };
  const written = await makeRepo(ctx).createAgentCard({
    agentId,
    registryChainId: REGISTRY_CHAIN_ID,
    name: input.name,
    description: input.description ?? "",
    agentCardUri: uri,
    card,
    origin: "created",
    endpoint,
    ...ensFields,
  });

  return { agentId, txHash, agentCardKey: written.entityKey, agentCardUri: uri };
}
