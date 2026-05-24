// lib/arkiv/__tests__/repo.test.ts
import { describe, it, expect } from "vitest";
import { FakeArkivClient } from "@/lib/arkiv/fakeClient";
import { createRepository } from "@/lib/arkiv/repo";
import { ExpirationTime, type Cipher } from "@/lib/arkiv/types";
import { PROJECT_ATTRIBUTE } from "@/lib/arkiv/project";

const rot: Cipher = {
  available: true,
  async encrypt(s) { return `enc(${s})`; },
  async decrypt(s) { return s.replace(/^enc\((.*)\)$/, "$1"); },
};

interface Note { agentId: string; count: number; secret: string; }
const schema = {
  name: "note",
  attrs: {
    agentId: { type: "str", index: "eq" },
    count: { type: "num", index: "range" },
    secret: { type: "str", enc: true },
  },
  ownership: "$owner",
  defaultExpiry: () => ExpirationTime.days(30),
} as const;

function makeRepo() {
  const client = new FakeArkivClient();
  const repo = createRepository<Note>(schema, { client, cipher: rot, actor: "0xA" });
  return { client, repo };
}

describe("createRepository", () => {
  it("stamps project, coerces num, encrypts enc fields, sets owner", async () => {
    const { client, repo } = makeRepo();
    await repo.create({ agentId: "1", count: 5, secret: "top" });
    const raw = (await client.queryEntities([]))[0];
    expect(raw.attributes.project).toBe(PROJECT_ATTRIBUTE.value);
    expect(raw.attributes.count).toBe(5);
    expect(typeof raw.attributes.count).toBe("number");
    expect(raw.attributes.secret).toBe("enc(top)");
    expect(raw.owner).toBe("0xA");
  });

  it("get decrypts enc fields back to plaintext", async () => {
    const { repo } = makeRepo();
    const ref = await repo.create({ agentId: "1", count: 5, secret: "top" });
    const got = await repo.get(ref.key);
    expect(got).toMatchObject({ agentId: "1", count: 5, secret: "top" });
  });

  it("query always filters on project and applies eq", async () => {
    const { client, repo } = makeRepo();
    await repo.create({ agentId: "1", count: 1, secret: "a" });
    await client.createEntity({ attributes: { agentId: "1", project: "other" }, expiresAt: null });
    const r = await repo.query([{ key: "agentId", op: "eq", value: "1" }]);
    expect(r).toHaveLength(1);
  });

  it("query supports range on numeric attribute", async () => {
    const { repo } = makeRepo();
    for (const count of [1, 2, 3]) await repo.create({ agentId: "1", count, secret: "x" });
    const r = await repo.query([{ key: "count", op: "gte", value: 2 }]);
    expect(r.map((n) => n.count).sort()).toEqual([2, 3]);
  });

  it("update is owner-gated", async () => {
    const client = new FakeArkivClient();
    const mine = createRepository<Note>(schema, { client, cipher: rot, actor: "0xA" });
    const other = createRepository<Note>(schema, { client, cipher: rot, actor: "0xB" });
    const ref = await mine.create({ agentId: "1", count: 1, secret: "x" });
    await expect(other.update(ref.key, { count: 9 })).rejects.toThrow(/owner/);
  });

  it("resolves expiry from schema preset", async () => {
    const { client, repo } = makeRepo();
    const before = Date.now();
    await repo.create({ agentId: "1", count: 1, secret: "x" });
    const raw = (await client.queryEntities([]))[0];
    const days = (raw.expiresAt! - before) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it("get returns null for an entity outside the project", async () => {
    const { client, repo } = makeRepo();
    const foreign = await client.createEntity({ attributes: { agentId: "1", project: "other" }, owner: "0xA", expiresAt: null });
    expect(await repo.get(foreign.key)).toBeNull();
  });
});
