import { describe, it, expect } from "vitest";
import { normalizeTopic } from "../topics";

describe("normalizeTopic", () => {
  it("lowercases and hyphenates", () => { expect(normalizeTopic("Smart Contracts")).toBe("smart-contracts"); });
  it("strips punctuation and collapses separators", () => { expect(normalizeTopic("  DeFi / Yield!! ")).toBe("defi-yield"); });
  it("returns empty string for empty/symbol-only input", () => { expect(normalizeTopic("  ***  ")).toBe(""); });
});
