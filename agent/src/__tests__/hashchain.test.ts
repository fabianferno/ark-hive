import { describe, it, expect } from "vitest";
import { computeCommitHash } from "../hashchain";

describe("computeCommitHash", () => {
  it("is deterministic", () => {
    expect(computeCommitHash(null, "a")).toBe(computeCommitHash(null, "a"));
  });
  it("chains: hash depends on prev", () => {
    expect(computeCommitHash("0xprev", "a")).not.toBe(computeCommitHash(null, "a"));
  });
  it("returns a 0x-prefixed 64-hex sha256", () => {
    const h = computeCommitHash(null, "payload");
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
