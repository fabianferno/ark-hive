import { describe, it, expect } from "vitest";
import { agentCardAttrs, messageAttrs, memoryAttrs, ENTITY } from "../entities";

const project = { key: "project", value: "p" } as const;

describe("entity attribute builders", () => {
  it("agentCard stamps project, entityType, numeric chainId + createdAt", () => {
    const a = agentCardAttrs(project, { agentId: "7", registryChainId: 84532, status: "active", createdAt: 1000, agentCardUri: "ipfs://x" });
    expect(a).toContainEqual({ key: "project", value: "p" });
    expect(a).toContainEqual({ key: "entityType", value: ENTITY.agentCard });
    expect(a).toContainEqual({ key: "agentId", value: "7" });
    expect(a).toContainEqual({ key: "registryChainId", value: 84532 });
    expect(a).toContainEqual({ key: "createdAt", value: 1000 });
  });
  it("message keeps seq + ts numeric and role/sessionKey string", () => {
    const a = messageAttrs(project, { sessionKey: "s1", agentId: "7", role: "user", seq: 3, ts: 99 });
    expect(a).toContainEqual({ key: "seq", value: 3 });
    expect(a).toContainEqual({ key: "ts", value: 99 });
    expect(a).toContainEqual({ key: "role", value: "user" });
    expect(a).toContainEqual({ key: "sessionKey", value: "s1" });
  });
  it("memory carries scope/scopeKey/memKey and numeric version", () => {
    const a = memoryAttrs(project, { agentId: "7", scope: "run", scopeKey: "s1", memKey: "goal", source: "chat", version: 1, createdAt: 5 });
    expect(a).toContainEqual({ key: "scope", value: "run" });
    expect(a).toContainEqual({ key: "memKey", value: "goal" });
    expect(a).toContainEqual({ key: "version", value: 1 });
  });
});
