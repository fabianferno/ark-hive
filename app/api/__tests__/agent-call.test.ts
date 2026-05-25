import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/agent-call/route";

function reqOf(body: unknown) {
  return new Request("http://x/api/agent-call", { method: "POST", body: JSON.stringify(body) });
}

beforeEach(() => vi.restoreAllMocks());

describe("agent-call", () => {
  it("returns reply on upstream 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, headers: new Headers(), text: async () => JSON.stringify({ reply: "hello" }) })));
    const r = await POST(reqOf({ url: "https://a.dev/chat", message: "hi", history: [] }));
    expect(await r.json()).toEqual({ reply: "hello", settlement: undefined });
  });

  it("surfaces upstream 402 as { status:402, accepts } (not an error)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 402, headers: new Headers(), json: async () => ({ accepts: [{ scheme: "exact", network: "base-sepolia" }] }) })));
    const r = await POST(reqOf({ url: "https://a.dev/chat", message: "hi", history: [] }));
    const j = await r.json();
    expect(j.status).toBe(402);
    expect(j.accepts).toHaveLength(1);
  });

  it("rejects a non-http url", async () => {
    const r = await POST(reqOf({ url: "ftp://x", message: "hi" }));
    expect(r.status).toBe(400);
  });

  it("blocks internal/loopback hosts (SSRF guard)", async () => {
    const r = await POST(reqOf({ url: "http://localhost:8787/x", message: "hi" }));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("blocked host");
  });
});
