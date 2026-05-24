import { describe, it, expect, vi } from "vitest";
import { resolveCascade } from "../contextbus";

describe("resolveCascade", () => {
  it("returns the run hit first (run > entity > global)", async () => {
    const fetcher = vi.fn(async (scope: string) => (scope === "run" ? "RUN" : "OTHER"));
    const r = await resolveCascade("goal", { run: "s1", entity: "c1", global: "org" }, fetcher);
    expect(r).toBe("RUN");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("falls through to entity then global", async () => {
    const fetcher = vi.fn(async (scope: string) => (scope === "global" ? "GLOBAL" : null));
    const r = await resolveCascade("goal", { run: "s1", entity: "c1", global: "org" }, fetcher);
    expect(r).toBe("GLOBAL");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("returns null when nothing resolves", async () => {
    const r = await resolveCascade("goal", { run: "s1", entity: "c1", global: "org" }, async () => null);
    expect(r).toBeNull();
  });
});
