// lib/arkiv/__tests__/fakeClient.test.ts
import { describe, it, expect, vi } from "vitest";
import { FakeArkivClient } from "@/lib/arkiv/fakeClient";

describe("FakeArkivClient", () => {
  it("creates and queries by eq", async () => {
    const c = new FakeArkivClient();
    await c.createEntity({ attributes: { kind: "a", n: 1 }, owner: "0xA", expiresAt: null });
    await c.createEntity({ attributes: { kind: "b", n: 2 }, owner: "0xA", expiresAt: null });
    const r = await c.queryEntities([{ key: "kind", op: "eq", value: "a" }]);
    expect(r.map((e) => e.attributes.n)).toEqual([1]);
  });

  it("supports range ops", async () => {
    const c = new FakeArkivClient();
    for (const n of [1, 2, 3]) await c.createEntity({ attributes: { n }, expiresAt: null });
    const r = await c.queryEntities([{ key: "n", op: "gte", value: 2 }]);
    expect(r.map((e) => e.attributes.n).sort()).toEqual([2, 3]);
  });

  it("gates update/delete by owner", async () => {
    const c = new FakeArkivClient();
    const e = await c.createEntity({ attributes: {}, owner: "0xA", expiresAt: null });
    await expect(c.deleteEntity(e.key, "0xB")).rejects.toThrow(/owner/);
    await c.deleteEntity(e.key, "0xA");
    expect(await c.getEntity(e.key)).toBeNull();
  });

  it("emits watch onCreated for matching filter", async () => {
    const c = new FakeArkivClient();
    const onCreated = vi.fn();
    c.watchEntities([{ key: "kind", op: "eq", value: "a" }], { onCreated });
    await c.createEntity({ attributes: { kind: "a" }, expiresAt: null });
    await c.createEntity({ attributes: { kind: "b" }, expiresAt: null });
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it("excludes expired entities from queries", async () => {
    const c = new FakeArkivClient();
    await c.createEntity({ attributes: { n: 1 }, expiresAt: Date.now() - 1000 });
    expect(await c.queryEntities([])).toHaveLength(0);
  });

  it("gates mutation by creator when no owner is set", async () => {
    const c = new FakeArkivClient();
    const e = await c.createEntity({ attributes: {}, creator: "0xA", expiresAt: null });
    await expect(c.deleteEntity(e.key, "0xB")).rejects.toThrow(/owner/);
    await c.deleteEntity(e.key, "0xA");
    expect(await c.getEntity(e.key)).toBeNull();
  });

  it("emits onDeleted only to watchers whose filter matches", async () => {
    const c = new FakeArkivClient();
    const onDeleted = vi.fn();
    const e = await c.createEntity({ attributes: { kind: "a" }, expiresAt: null });
    c.watchEntities([{ key: "kind", op: "eq", value: "b" }], { onDeleted });
    await c.deleteEntity(e.key, "anyone");
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("emits onDeleted to a matching watcher", async () => {
    const c = new FakeArkivClient();
    const onDeleted = vi.fn();
    const e = await c.createEntity({ attributes: { kind: "a" }, expiresAt: null });
    c.watchEntities([{ key: "kind", op: "eq", value: "a" }], { onDeleted });
    await c.deleteEntity(e.key, "anyone");
    expect(onDeleted).toHaveBeenCalledWith(e.key);
  });
});
