import { describe, it, expect, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn(async () => ({ choices: [{ message: { content: "ok" } }] })) }));
vi.mock("openai", () => ({ default: class { chat = { completions: { create } }; } }));
vi.mock("../config", () => ({ loadConfig: () => ({ openaiApiKey: "k", openaiModel: "gpt-4o-mini" }) }));

import { respond } from "../brain";

describe("respond persona", () => {
  it("uses the persona as the system prompt when provided", async () => {
    await respond({ message: "hi", history: [], knowledge: [], persona: "You are Zorp." });
    const args = create.mock.calls[0] as any[];
    expect(args[0].messages[0].content as string).toContain("You are Zorp.");
  });

  it("falls back to the default system prompt when no persona", async () => {
    create.mockClear();
    await respond({ message: "hi", history: [], knowledge: [] });
    const args = create.mock.calls[0] as any[];
    expect(args[0].messages[0].content as string).toContain("ERC-8004 registered AI agent");
  });
});
