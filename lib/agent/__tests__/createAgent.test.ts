import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/arkiv-client/ai", () => ({ aiPin: vi.fn(async () => "ipfs://card") }));
const created: any[] = [];
vi.mock("@/lib/arkiv-client/repo", () => ({
  makeRepo: () => ({ createAgentCard: vi.fn(async (f: any) => { created.push(f); return { entityKey: "k1", txHash: "0xt" }; }) }),
}));
vi.mock("@/lib/agent/identity", () => ({
  REGISTRY_ADDRESS: "0xreg", REGISTRY_CHAIN_ID: 11155111,
  registerIdentityClient: vi.fn(async () => ({ agentId: "77", txHash: "0xmint" })),
}));

import { createAgent } from "@/lib/agent/createAgent";

const ctx = { address: "0xAbCdEf1234567890" } as any;
const wallets = { sendTransaction: vi.fn(), publicSepolia: {}, switchChain: vi.fn(async () => {}), BRAGA_ID: 1, SEPOLIA_ID: 2 } as any;

describe("createAgent", () => {
  it("uses the entered endpoint, always sets a 4-level ENS, persists origin/endpoint", async () => {
    created.length = 0;
    await createAgent(ctx, wallets, { name: "My Bot", description: "d", domain: "x.dev", endpoint: "https://x.dev/api" });
    const f = created[0];
    expect(f.endpoint).toBe("https://x.dev/api");
    expect(f.origin).toBe("created");
    expect(f.ensName).toBe("my-bot-77.user-abcdef.ark-hive.eth");
    expect(f.card.endpoints[0].url).toBe("https://x.dev/api");
  });
});
