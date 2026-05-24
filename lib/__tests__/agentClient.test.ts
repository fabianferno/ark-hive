import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentClient } from "@/lib/agentClient";

function mockFetch(json: unknown) {
  return vi.fn(async () => ({ ok: true, json: async () => json }) as Response);
}

describe("AgentClient", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("listAgents normalizes DecodedEntity into UI agents", async () => {
    const fetchMock = mockFetch({ agents: [
      { key: "0xcard1", payload: { name: "Alpha", description: "first" }, attrs: { agentId: "5224", status: "active", registryChainId: 11155111, createdAt: 1000 } },
    ]});
    vi.stubGlobal("fetch", fetchMock);
    const c = new AgentClient("http://x");
    const agents = await c.listAgents();
    expect(agents).toEqual([{ key: "0xcard1", agentId: "5224", name: "Alpha", description: "first", status: "active", registryChainId: 11155111, createdAt: 1000, agentCardUri: "" }]);
    expect(fetchMock).toHaveBeenCalledWith("http://x/agents", expect.objectContaining({ method: "GET" }));
  });

  it("createAgent POSTs name/description and returns ids", async () => {
    const fetchMock = mockFetch({ agentId: "9", txHash: "0xtx", agentCardKey: "0xck" });
    vi.stubGlobal("fetch", fetchMock);
    const c = new AgentClient("http://x");
    const r = await c.createAgent({ name: "New", description: "desc" });
    expect(r).toEqual({ agentId: "9", txHash: "0xtx", agentCardKey: "0xck" });
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0][0]).toBe("http://x/agents");
    expect(JSON.parse(calls[0][1].body as string)).toEqual({ name: "New", description: "desc" });
  });

  it("listMessages normalizes role/content/seq", async () => {
    const fetchMock = mockFetch({ messages: [
      { key: "m1", payload: { role: "user", content: "hi" }, attrs: { seq: 0 } },
      { key: "m2", payload: { role: "assistant", content: "yo" }, attrs: { seq: 1 } },
    ]});
    vi.stubGlobal("fetch", fetchMock);
    const c = new AgentClient("http://x");
    const msgs = await c.listMessages("0xsess");
    expect(msgs).toEqual([
      { key: "m1", role: "user", content: "hi", seq: 0 },
      { key: "m2", role: "assistant", content: "yo", seq: 1 },
    ]);
  });

  it("sendMessage POSTs text and returns reply", async () => {
    const fetchMock = mockFetch({ reply: "answer", userKey: "u", assistantKey: "a", snapshotKey: "s" });
    vi.stubGlobal("fetch", fetchMock);
    const c = new AgentClient("http://x");
    const r = await c.sendMessage("0xsess", "q");
    expect(r.reply).toBe("answer");
  });

  it("throws on non-ok responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, text: async () => "boom" }) as Response));
    const c = new AgentClient("http://x");
    await expect(c.listAgents()).rejects.toThrow(/500/);
  });
});
