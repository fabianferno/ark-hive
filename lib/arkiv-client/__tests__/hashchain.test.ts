import { describe, it, expect } from "vitest";
import { computeCommitHash } from "../hashchain";

describe("computeCommitHash", () => {
  it("is deterministic", async () => {
    expect(await computeCommitHash(null, "a")).toBe(await computeCommitHash(null, "a"));
  });
  it("chains: hash depends on prev", async () => {
    expect(await computeCommitHash("0xprev", "a")).not.toBe(await computeCommitHash(null, "a"));
  });
  it("returns a 0x-prefixed 64-hex sha256", async () => {
    const h = await computeCommitHash(null, "payload");
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
