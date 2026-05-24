import { describe, it, expect } from "vitest";
import { required, loadConfig } from "../config";

describe("config", () => {
  it("required throws a named error when missing", () => {
    expect(() => required("NOPE_VAR", {})).toThrow(/NOPE_VAR/);
  });
  it("required returns the value when present", () => {
    expect(required("X", { X: "v" })).toBe("v");
  });
  it("loadConfig assembles values with defaults", () => {
    const c = loadConfig({
      AGENT_PRIVATE_KEY: "0xabc", OPENAI_API_KEY: "sk-x", PROJECT_VALUE: "p", AGENT_DOMAIN: "d",
    });
    expect(c.projectValue).toBe("p");
    expect(c.openaiModel).toBe("gpt-4o-mini");
    expect(c.bragaRpc).toContain("braga");
    expect(c.port).toBe(8787);
  });
  it("loadConfig provides RAG defaults", () => {
    const c = loadConfig({ AGENT_PRIVATE_KEY: "0x", OPENAI_API_KEY: "k", PROJECT_VALUE: "p", AGENT_DOMAIN: "d" });
    expect(c.embeddingModel).toBe("text-embedding-3-small");
    expect(c.ragRollEvery).toBe(10);
    expect(c.ragTopK).toBe(4);
  });
});
