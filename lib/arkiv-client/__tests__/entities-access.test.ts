import { describe, it, expect } from "vitest";
import { pubkeyAttrs, accessGrantAttrs, summaryAttrs, ENTITY } from "../entities";

const P = { key: "project", value: "demo" } as const;

describe("access entity attributes", () => {
  it("pubkey carries owner + entityType", () => {
    const a = pubkeyAttrs(P, { owner: "0xabc", createdAt: 1 });
    expect(a).toContainEqual({ key: "entityType", value: ENTITY.pubkey });
    expect(a).toContainEqual({ key: "owner", value: "0xabc" });
  });

  it("accessGrant carries grantee + resource + numeric expiresAt", () => {
    const a = accessGrantAttrs(P, {
      agentId: "1", resourceKey: "0xsum", resourceType: "summary",
      granteeAgentId: "2", granteeAddress: "0xdef", expiresAt: 123, createdAt: 1,
    });
    expect(a).toContainEqual({ key: "entityType", value: ENTITY.accessGrant });
    expect(a).toContainEqual({ key: "granteeAddress", value: "0xdef" });
    expect(a).toContainEqual({ key: "resourceKey", value: "0xsum" });
    expect(a).toContainEqual({ key: "expiresAt", value: 123 });
  });

  it("summary gains an enc attribute only when set", () => {
    const plain = summaryAttrs(P, { agentId: "1", callerId: "c", sessionKey: "s", summarySeq: 1, createdAt: 1 });
    expect(plain.find((x) => x.key === "enc")).toBeUndefined();
    const enc = summaryAttrs(P, { agentId: "1", callerId: "c", sessionKey: "s", summarySeq: 1, createdAt: 1, enc: "v1" });
    expect(enc).toContainEqual({ key: "enc", value: "v1" });
  });
});
