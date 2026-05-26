import { ChaosChainSDK, NetworkConfig, AgentRole, PinataStorage } from "@chaoschain/sdk";
import { loadConfig } from "./config";
import { buildAgentCard, type AgentCard } from "./agentcard";

const config = loadConfig();
export const REGISTRY_CHAIN_ID = 11155111; // Ethereum Sepolia
export const REGISTRY_ADDRESS = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

export function makeSdk(agentName: string) {
  const sdkConfig: ConstructorParameters<typeof ChaosChainSDK>[0] = {
    agentName,
    agentDomain: config.agentDomain,
    agentRole: AgentRole.WORKER,
    network: NetworkConfig.ETHEREUM_SEPOLIA,
    privateKey: config.agentPrivateKey,
    rpcUrl: config.registryRpc,
  };
  if (config.pinataJwt) {
    // PinataStorage implements StorageBackend (put/get); SDK config expects StorageProvider (upload/download).
    // At runtime the SDK assigns storageProvider directly to its storageBackend field — the cast is safe.
    sdkConfig.storageProvider = new PinataStorage(config.pinataJwt, config.pinataGateway) as any;
    sdkConfig.enableStorage = true;
  }
  return new ChaosChainSDK(sdkConfig);
}

export interface RegisteredAgent {
  agentId: string;
  txHash: string;
  agentCardUri: string;
  card: AgentCard;
}

export async function registerIdentity(opts: { name: string; description: string; capabilities: string[]; domain?: string; version?: string; image?: string; contact?: string; endpoint?: string }): Promise<RegisteredAgent> {
  const sdk: any = makeSdk(opts.name);
  const agentAddress: string = await sdk.getAddress();
  const card = buildAgentCard({
    name: opts.name, description: opts.description, domain: opts.domain || config.agentDomain,
    capabilities: opts.capabilities, version: opts.version || config.agentVersion,
    registryAddress: REGISTRY_ADDRESS, chainId: REGISTRY_CHAIN_ID, agentAddress,
    image: (opts.image ?? config.agentImage) || undefined, contact: (opts.contact ?? config.agentContact) || undefined,
    endpoints: [{ name: "chat", url: opts.endpoint || `https://${opts.domain || config.agentDomain}/chat` }],
  });

  let agentCardUri = "";
  if (config.pinataJwt) {
    const up = await sdk.upload(card, { filename: "agent-card.json" });
    agentCardUri = up.uri ?? (up.cid ? `ipfs://${up.cid}` : "");
  } else {
    console.warn("PINATA_JWT not set — registering without an IPFS card URI.");
  }

  const contract = sdk.chaosAgent.identityContract;
  const tx = agentCardUri
    ? await contract["register(string)"](agentCardUri)
    : await contract["register()"]();
  const receipt = await tx.wait();
  const ev = receipt.logs
    .map((l: any) => { try { return contract.interface.parseLog({ topics: [...l.topics], data: l.data }); } catch { return null; } })
    .find((e: any) => e?.name === "Registered");
  if (!ev) throw new Error("Registered event not found");
  const agentId = String(ev.args.agentId);
  return { agentId, txHash: receipt.hash, agentCardUri, card };
}
