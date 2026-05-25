import { describe, it, expect, vi, beforeEach } from "vitest";
import { enumerateAgents } from "@/lib/agent/registry";

function fakeClient() {
  return {
    readContract: vi.fn(async ({ functionName, args }: any) => {
      if (functionName === "totalSupply") return 2n;
      if (functionName === "tokenURI") return `ipfs://card${args[0]}`;
      if (functionName === "ownerOf") return args[0] === 1n ? "0xOWNER1" : "0xOWNER2";
      throw new Error("unexpected fn");
    }),
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.includes("card1")) {
      return { ok: true, json: async () => ({ name: "Alpha", description: "d", capabilities: ["chat"], image: "", endpoints: [{ url: "https://alpha.dev/chat" }] }) } as any;
    }
    return { ok: false, status: 500 } as any;
  }));
});

describe("enumerateAgents", () => {
  it("lists N agents; tolerates a failing metadata fetch", async () => {
    const agents = await enumerateAgents(fakeClient() as any);
    expect(agents).toHaveLength(2);
    expect(agents[0]).toMatchObject({ agentId: "1", owner: "0xowner1", name: "Alpha", endpoint: "https://alpha.dev/chat" });
    expect(agents[1]).toMatchObject({ agentId: "2", owner: "0xowner2", card: null, name: "Agent #2" });
  });
});
