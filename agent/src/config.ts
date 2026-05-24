type Env = Record<string, string | undefined>;

export function required(name: string, env: Env = process.env): string {
  const v = env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export interface AgentConfig {
  agentPrivateKey: `0x${string}`;
  openaiApiKey: string;
  openaiModel: string;
  projectValue: string;
  agentDomain: string;
  registryRpc: string;
  bragaRpc: string;
  port: number;
  pinataJwt?: string;
  pinataGateway: string;
  agentVersion: string;
  agentImage: string;
  agentContact: string;
  embeddingModel: string;
  ragRollEvery: number;
  ragTopK: number;
}

export function loadConfig(env: Env = process.env): AgentConfig {
  return {
    agentPrivateKey: required("AGENT_PRIVATE_KEY", env) as `0x${string}`,
    openaiApiKey: required("OPENAI_API_KEY", env),
    openaiModel: env.OPENAI_MODEL ?? "gpt-4o-mini",
    projectValue: required("PROJECT_VALUE", env),
    agentDomain: required("AGENT_DOMAIN", env),
    registryRpc: env.REGISTRY_RPC ?? "https://ethereum-sepolia-rpc.publicnode.com",
    bragaRpc: env.BRAGA_RPC ?? "https://braga.hoodi.arkiv.network/rpc",
    port: Number(env.PORT ?? 8787),
    pinataJwt: env.PINATA_JWT,
    pinataGateway: env.PINATA_GATEWAY ?? "https://gateway.pinata.cloud",
    agentVersion: env.AGENT_VERSION ?? "1.0.0",
    agentImage: env.AGENT_IMAGE ?? "",
    agentContact: env.AGENT_CONTACT ?? "",
    embeddingModel: env.EMBEDDING_MODEL ?? "text-embedding-3-small",
    ragRollEvery: Number(env.RAG_ROLL_EVERY ?? 10),
    ragTopK: Number(env.RAG_TOP_K ?? 4),
  };
}
