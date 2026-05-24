// lib/arkiv/fakeClient.ts
import type {
  ArkivClient, CreateInput, MutateOp, QueryFilter, StoredEntity, UpdatePatch, WatchHandlers,
} from "./types";

function matches(e: StoredEntity, f: QueryFilter): boolean {
  const v = e.attributes[f.key];
  if (v === undefined) return false;
  switch (f.op) {
    case "eq": return v === f.value;
    case "gt": return v > f.value;
    case "gte": return v >= f.value;
    case "lt": return v < f.value;
    case "lte": return v <= f.value;
  }
}
const live = (e: StoredEntity) => e.expiresAt === null || e.expiresAt > Date.now();

export class FakeArkivClient implements ArkivClient {
  private store = new Map<string, StoredEntity>();
  private watchers: { filters: QueryFilter[]; handlers: WatchHandlers }[] = [];
  private seq = 0;

  private canMutate(e: StoredEntity, actor: string): boolean {
    const principal = e.owner ?? e.creator;
    return !principal || principal === actor;
  }

  async createEntity(input: CreateInput): Promise<StoredEntity> {
    const key = `e${++this.seq}`;
    const e: StoredEntity = { key, ...input, creator: input.creator ?? input.owner };
    this.store.set(key, e);
    for (const w of this.watchers)
      if (w.filters.every((f) => matches(e, f))) w.handlers.onCreated?.(e);
    return e;
  }
  async updateEntity(key: string, patch: UpdatePatch, actor: string): Promise<StoredEntity> {
    const e = this.store.get(key);
    if (!e) throw new Error("not found");
    if (!this.canMutate(e, actor)) throw new Error("not owner");
    const next = { ...e, attributes: { ...e.attributes, ...patch.attributes } };
    this.store.set(key, next);
    for (const w of this.watchers)
      if (w.filters.every((f) => matches(next, f))) w.handlers.onUpdated?.(next);
    return next;
  }
  async deleteEntity(key: string, actor: string): Promise<void> {
    const e = this.store.get(key);
    if (!e) return;
    if (!this.canMutate(e, actor)) throw new Error("not owner");
    this.store.delete(key);
    for (const w of this.watchers)
      if (w.filters.every((f) => matches(e, f))) w.handlers.onDeleted?.(key);
  }
  async getEntity(key: string): Promise<StoredEntity | null> {
    const e = this.store.get(key);
    return e && live(e) ? e : null;
  }
  async queryEntities(filters: QueryFilter[]): Promise<StoredEntity[]> {
    return [...this.store.values()].filter((e) => live(e) && filters.every((f) => matches(e, f)));
  }
  async mutateEntities(ops: MutateOp[]): Promise<StoredEntity[]> {
    const out: StoredEntity[] = [];
    for (const op of ops) {
      if (op.type === "create") out.push(await this.createEntity(op.input));
      else await this.deleteEntity(op.key, op.actor);
    }
    return out;
  }
  async extendEntity(key: string, expiresAt: number | null, actor: string): Promise<StoredEntity> {
    const e = this.store.get(key);
    if (!e) throw new Error("not found");
    if (!this.canMutate(e, actor)) throw new Error("not owner");
    const next = { ...e, expiresAt };
    this.store.set(key, next);
    return next;
  }
  watchEntities(filters: QueryFilter[], handlers: WatchHandlers): () => void {
    const w = { filters, handlers };
    this.watchers.push(w);
    return () => { this.watchers = this.watchers.filter((x) => x !== w); };
  }
}
