import { describe, it, expect } from "vitest";
import { buildMemoryConditions } from "../search";

const project = { key: "project", value: "p" } as const;

describe("buildMemoryConditions", () => {
  it("always includes project, entityType=memory and agentId", () => {
    const c = buildMemoryConditions(project, { agentId: "7" });
    expect(c).toContainEqual({ key: "project", op: "eq", value: "p" });
    expect(c).toContainEqual({ key: "entityType", op: "eq", value: "memory" });
    expect(c).toContainEqual({ key: "agentId", op: "eq", value: "7" });
  });
  it("adds scope eq when given", () => {
    const c = buildMemoryConditions(project, { agentId: "7", scope: "entity" });
    expect(c).toContainEqual({ key: "scope", op: "eq", value: "entity" });
  });
  it("adds a numeric createdAt range when sinceMs given", () => {
    const c = buildMemoryConditions(project, { agentId: "7", sinceMs: 1000 });
    expect(c).toContainEqual({ key: "createdAt", op: "gt", value: 1000 });
  });
});
