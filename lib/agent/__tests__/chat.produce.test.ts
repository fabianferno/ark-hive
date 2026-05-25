import { describe, it, expect, vi, beforeEach } from "vitest";
import { __produceReplyForTest as produceReply } from "@/lib/agent/chat";

beforeEach(() => vi.restoreAllMocks());

describe("produceReply", () => {
  it("calls the endpoint proxy when an endpoint exists", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ reply: "from-endpoint" }) })));
    const out = await produceReply({ endpoint: "https://a.dev/chat", card: null }, "hi", [], []);
    expect(out).toBe("from-endpoint");
  });

  it("falls back to aiReply with persona when the endpoint fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ error: "boom" }) })));
    const ai = await import("@/lib/arkiv-client/ai");
    vi.spyOn(ai, "aiReply").mockResolvedValue("from-persona");
    const out = await produceReply({ endpoint: "https://a.dev/chat", card: { name: "Z", description: "d", capabilities: [] } }, "hi", [], []);
    expect(out).toBe("from-persona");
  });

  it("runs the pay handshake on 402 then returns the paid reply", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: any) => {
      const b = JSON.parse(init.body);
      if (!b.xPayment) return { json: async () => ({ status: 402, accepts: [{ scheme: "exact", network: "base-sepolia" }] }) } as any;
      return { json: async () => ({ reply: "paid-reply" }) } as any;
    }));
    const onPay = vi.fn(async () => "BASE64PAY");
    const out = await produceReply({ endpoint: "https://a.dev/chat", card: null }, "hi", [], [], onPay);
    expect(out).toBe("paid-reply");
    expect(onPay).toHaveBeenCalledOnce();
  });
});
