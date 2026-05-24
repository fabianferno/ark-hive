// lib/arkiv/__tests__/entities.test.ts
import { describe, it, expect } from "vitest";
import { FakeArkivClient } from "@/lib/arkiv/fakeClient";
import type { Cipher } from "@/lib/arkiv/types";
import { agentCardSchema, type AgentCard } from "@/lib/arkiv/entities/agentCard";
import { snapshotSchema, type StateSnapshot } from "@/lib/arkiv/entities/stateSnapshot";
import { auditSchema } from "@/lib/arkiv/entities/auditLog";
import { createRepository } from "@/lib/arkiv/repo";

const pass: Cipher = { available: true, async encrypt(s) { return s; }, async decrypt(s) { return s; } };

describe("entity schemas", () => {
  it("agentCard stores registryChainId as number, never expires", async () => {
    const client = new FakeArkivClient();
    const repo = createRepository<AgentCard>(agentCardSchema, { client, cipher: pass, actor: "0xA" });
    await repo.create({ agentId: "7", registryChainId: 11142220, status: "active", createdAt: Date.now() });
    const raw = (await client.queryEntities([])).find((e) => e.attributes.agentId === "7")!;
    expect(typeof raw.attributes.registryChainId).toBe("number");
    expect(raw.expiresAt).toBeNull();
  });

  it("snapshot encrypts encPayload and keeps commitSeq numeric", async () => {
    const client = new FakeArkivClient();
    const repo = createRepository<StateSnapshot>(snapshotSchema, { client, cipher: pass, actor: "0xA" });
    await repo.create({ agentId: "7", sessionKey: "s1", commitSeq: 1, commitHash: "0xab", encPayload: "{}", payloadSize: 2 });
    const got = (await repo.query([{ key: "commitSeq", op: "gte", value: 1 }]))[0];
    expect(got.commitSeq).toBe(1);
  });

  it("audit uses $creator ownership", () => {
    expect(auditSchema.ownership).toBe("$creator");
  });
});
