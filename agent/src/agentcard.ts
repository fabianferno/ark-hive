export interface AgentCardInput {
  name: string; description: string; domain: string;
  capabilities: string[]; version: string; registryAddress: string; chainId: number;
  agentAddress: string; agentId?: string;
  image?: string; contact?: string; endpoints?: { name: string; url: string }[];
}
export interface AgentCardRegistration { agentRegistry: string; chainId: number; agentAddress: string; agentId?: string; }
export interface AgentCard {
  type: "AgentCard"; name: string; description: string; domain: string; role: "server";
  version: string; image: string; contact: string; capabilities: string[]; supportedTrust: string[];
  endpoints: { name: string; url: string }[];
  registrations: AgentCardRegistration[];
}
export function buildAgentCard(i: AgentCardInput): AgentCard {
  const reg: AgentCardRegistration = { agentRegistry: i.registryAddress, chainId: i.chainId, agentAddress: i.agentAddress };
  if (i.agentId) reg.agentId = i.agentId;
  return {
    type: "AgentCard", name: i.name, description: i.description, domain: i.domain, role: "server",
    version: i.version, image: i.image ?? "", contact: i.contact ?? "",
    capabilities: i.capabilities, supportedTrust: ["reputation"],
    endpoints: i.endpoints ?? [],
    registrations: [reg],
  };
}
