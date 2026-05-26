import { describe, it, expect, vi, beforeEach } from "vitest";
import { enumerateAgents, KNOWN_AGENTS } from "@/lib/agent/registry";

function fakeClient(ids: Record<string, { tokenURI: string; owner: string }>) {
  return {
    readContract: vi.fn(async ({ functionName, args }: any) => {
      const id = String(args?.[0]);
      const row = ids[id];
      if (!row) throw new Error("nonexistent");
      if (functionName === "tokenURI") return row.tokenURI;
      if (functionName === "ownerOf") return row.owner;
      throw new Error(`unexpected fn ${functionName}`);
    }),
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.includes("good"))        return { ok: true, json: async () => ({ name: "Alpha", description: "d", capabilities: ["chat"], endpoints: [{ url: "https://alpha.dev/chat" }] }) } as any;
    if (url.includes("noendpoint"))  return { ok: true, json: async () => ({ name: "Beta", endpoints: [] }) } as any;
    if (url.includes("placeholder")) return { ok: true, json: async () => ({ name: "Plac", endpoints: [{ url: "https://agent.local/chat" }] }) } as any;
    return { ok: false, status: 500 } as any;
  }));
});

describe("KNOWN_AGENTS", () => {
  it("contains the curated cohort (11 verified ids)", () => {
    expect(KNOWN_AGENTS.length).toBe(11);
    for (const id of ["5340", "5341", "5342", "5343", "5344", "5345", "5346", "5347", "5348", "5349", "5350"]) {
      expect(KNOWN_AGENTS).toContain(id);
    }
  });
});

describe("enumerateAgents — curated allowlist", () => {
  it("fetches each id via tokenURI+ownerOf and builds rows", async () => {
    const client = fakeClient({
      "5340": { tokenURI: "ipfs://good", owner: "0xOWNER" },
    });
    const agents = await enumerateAgents(client as any, ["5340"]);
    expect(agents).toHaveLength(1);
    expect(agents[0]).toMatchObject({ agentId: "5340", name: "Alpha", endpoint: "https://alpha.dev/chat", owner: "0xowner" });
  });

  it("skips missing ids and ones with unreachable/incompatible metadata", async () => {
    const client = fakeClient({
      "100": { tokenURI: "ipfs://good", owner: "0xA" },
      "200": { tokenURI: "ipfs://missing", owner: "0xB" }, // 500 → dropped
      // 300 missing from registry entirely → readKnownAgent returns null
    });
    const agents = await enumerateAgents(client as any, ["100", "200", "300"]);
    expect(agents.map((a) => a.agentId)).toEqual(["100"]);
  });

  it("normalizes placeholder endpoints to empty (persona fallback)", async () => {
    const client = fakeClient({
      "1": { tokenURI: "ipfs://placeholder", owner: "0xA" },
      "2": { tokenURI: "ipfs://noendpoint",  owner: "0xB" },
    });
    const agents = await enumerateAgents(client as any, ["1", "2"]);
    const byId = Object.fromEntries(agents.map((a) => [a.agentId, a]));
    expect(byId["1"].endpoint).toBe("");
    expect(byId["2"].endpoint).toBe("");
  });
});
