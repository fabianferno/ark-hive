import { describe, it, expect } from "vitest";
import { chainLabel, ipfsHttpUrl } from "@/lib/agentClient";

// The AgentClient class + `agent` singleton were retired (the agent server is now
// stateless /ai/* only; all flows run client-side in lib/agent/*). lib/agentClient
// is now types + the two pure presentation helpers below.
describe("helpers", () => {
  it("chainLabel maps known chain ids and falls back", () => {
    expect(chainLabel(11155111)).toBe("Ethereum Sepolia 11155111");
    expect(chainLabel(84532)).toBe("Base Sepolia 84532");
    expect(chainLabel(999)).toBe("Chain 999");
  });
  it("ipfsHttpUrl resolves ipfs:// to a gateway and passes through http", () => {
    expect(ipfsHttpUrl("ipfs://abc")).toBe("https://gateway.pinata.cloud/ipfs/abc");
    expect(ipfsHttpUrl("https://x/y")).toBe("https://x/y");
    expect(ipfsHttpUrl("")).toBe("");
  });
});
