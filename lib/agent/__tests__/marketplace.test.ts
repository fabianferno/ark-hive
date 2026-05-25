import { describe, it, expect, vi } from "vitest";

const created: any[] = [];
let existing: any[] = [];
vi.mock("@/lib/agent/agents", () => ({ listAgents: vi.fn(async () => existing) }));
vi.mock("@/lib/arkiv-client/repo", () => ({
  makeRepo: () => ({ createAgentCard: vi.fn(async (f: any) => { created.push(f); return { entityKey: "k", txHash: "0x" }; }) }),
}));
vi.mock("@/lib/agent/identity", () => ({ REGISTRY_CHAIN_ID: 11155111 }));

import { adoptAgent } from "@/lib/agent/marketplace";

const ctx = { address: "0xAbCdEf1234567890" } as any;
const mkt = { agentId: "9", owner: "0xother", tokenURI: "ipfs://c", card: { name: "Z", endpoints: [{ url: "https://z.dev/chat" }] }, name: "Z", description: "zz", image: "", capabilities: [], endpoint: "https://z.dev/chat" } as any;

describe("adoptAgent", () => {
  it("writes an Arkiv agentCard with origin=marketplace, endpoint, 4-level ENS", async () => {
    created.length = 0; existing = [];
    const res = await adoptAgent(ctx, mkt, "");
    const f = created[0];
    expect(f.origin).toBe("marketplace");
    expect(f.endpoint).toBe("https://z.dev/chat");
    expect(f.agentCardUri).toBe("ipfs://c");
    expect(f.ensName).toBe("z-9.user-abcdef.ark-hive.eth");
    expect(res.ensName).toBe(f.ensName);
  });

  it("throws when already adopted", async () => {
    created.length = 0; existing = [{ agentId: "9" }];
    await expect(adoptAgent(ctx, mkt, "")).rejects.toThrow(/already adopted/i);
  });
});
