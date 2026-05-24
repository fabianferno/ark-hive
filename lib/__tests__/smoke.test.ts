import { describe, it, expect } from "vitest";
describe("harness", () => {
  it("runs", () => { expect(1 + 1).toBe(2); });
  it("has web crypto", () => { expect(globalThis.crypto?.subtle).toBeDefined(); });
});
