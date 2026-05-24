import { describe, it, expect } from "vitest";
import { buildAgentCard } from "../agentcard";

describe("buildAgentCard", () => {
  const card = buildAgentCard({
    name: "Demo", description: "d", domain: "agent.example.com",
    capabilities: ["chat", "memory-search"], version: "1.0.0",
    registryAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e", chainId: 11155111,
    agentAddress: "0xWallet", image: "https://img", contact: "mailto:x@y.z",
    endpoints: [{ name: "chat", url: "https://agent.example.com/chat" }],
  });
  it("includes all ERC-8004 card fields", () => {
    expect(card.type).toBe("AgentCard");
    expect(card.name).toBe("Demo");
    expect(card.domain).toBe("agent.example.com");
    expect(card.role).toBe("server");
    expect(card.version).toBe("1.0.0");
    expect(card.image).toBe("https://img");
    expect(card.contact).toBe("mailto:x@y.z");
    expect(card.capabilities).toEqual(["chat", "memory-search"]);
    expect(card.supportedTrust).toEqual(["reputation"]);
    expect(card.endpoints).toEqual([{ name: "chat", url: "https://agent.example.com/chat" }]);
  });
  it("embeds a registration referencing registry+chain+address", () => {
    expect(card.registrations).toEqual([
      { agentRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e", chainId: 11155111, agentAddress: "0xWallet" },
    ]);
  });
  it("includes agentId in registration when provided", () => {
    const c = buildAgentCard({ name: "N", description: "", domain: "d", capabilities: [], version: "1.0.0", registryAddress: "0xreg", chainId: 1, agentAddress: "0xW", agentId: "42" });
    expect(c.registrations[0].agentId).toBe("42");
  });
  it("defaults optional fields", () => {
    const c = buildAgentCard({ name: "N", description: "", domain: "d", capabilities: [], version: "1.0.0", registryAddress: "0xreg", chainId: 1, agentAddress: "0xW" });
    expect(c.image).toBe(""); expect(c.contact).toBe(""); expect(c.endpoints).toEqual([]);
  });
});
