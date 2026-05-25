import { describe, it, expect } from "vitest";
import { __toAgentForTest } from "@/lib/agent/agents";

describe("toAgent mapping", () => {
  it("reads origin + endpoint from attrs", () => {
    const a = __toAgentForTest({
      key: "k", attrs: { agentId: "5", origin: "marketplace", endpoint: "https://e.dev/chat" }, payload: { name: "N", card: null },
    } as any);
    expect(a.origin).toBe("marketplace");
    expect(a.endpoint).toBe("https://e.dev/chat");
  });

  it("defaults origin to created and falls back endpoint to card", () => {
    const b = __toAgentForTest({
      key: "k2", attrs: { agentId: "6" }, payload: { name: "M", card: { endpoints: [{ url: "https://c.dev/x" }] } },
    } as any);
    expect(b.origin).toBe("created");
    expect(b.endpoint).toBe("https://c.dev/x");
  });
});
