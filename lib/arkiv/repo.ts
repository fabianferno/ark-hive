// lib/arkiv/repo.ts
import { PROJECT_ATTRIBUTE } from "./project";
import type { EntitySchema } from "./schema";
import type {
  ArkivClient, AttrValue, Cipher, ExpirationTime, QueryFilter, StoredEntity, WatchHandlers,
} from "./types";

export interface EntityRef { key: string; }
export interface RepoDeps { client: ArkivClient; cipher: Cipher; actor: string; }
export type Decoded<T extends object> = T & { key: string; expiresAt: number | null };

export function createRepository<T extends object>(
  schema: EntitySchema<T>,
  deps: RepoDeps,
) {
  const { client, cipher, actor } = deps;
  const attrEntries = Object.entries(schema.attrs) as [keyof T, EntitySchema<T>["attrs"][keyof T]][];

  async function encode(data: Partial<T>): Promise<Record<string, AttrValue>> {
    const attrs: Record<string, AttrValue> = {};
    for (const [k, def] of attrEntries) {
      const v = data[k];
      if (v === undefined) continue;
      attrs[k as string] = def.enc
        ? await cipher.encrypt(String(v))
        : def.type === "num" ? Number(v) : String(v);
    }
    return attrs;
  }

  async function decode(e: StoredEntity): Promise<Decoded<T>> {
    const out: Record<string, AttrValue> = {};
    for (const [k, def] of attrEntries) {
      const v = e.attributes[k as string];
      if (v === undefined) continue;
      if (def.enc) {
        if (!cipher.available) { out[k as string] = "🔒"; continue; }
        const plain = await cipher.decrypt(String(v));
        out[k as string] = def.type === "num" ? Number(plain) : plain;
      } else {
        out[k as string] = def.type === "num" ? Number(v) : String(v);
      }
    }
    return { ...(out as T), key: e.key, expiresAt: e.expiresAt };
  }

  function withProject(filters: QueryFilter[]): QueryFilter[] {
    return [{ key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value }, ...filters];
  }

  return {
    async create(data: T, opts?: { expiresIn?: ExpirationTime }): Promise<EntityRef> {
      const exp = (opts?.expiresIn ?? schema.defaultExpiry()).toExpiresAt();
      const attrs = await encode(data);
      attrs[PROJECT_ATTRIBUTE.key] = PROJECT_ATTRIBUTE.value;
      const ownerField = schema.ownership === "$owner" ? { owner: actor } : { creator: actor };
      const e = await client.createEntity({ attributes: attrs, expiresAt: exp, ...ownerField });
      return { key: e.key };
    },
    async update(key: string, patch: Partial<T>): Promise<EntityRef> {
      const e = await client.updateEntity(key, { attributes: await encode(patch) }, actor);
      return { key: e.key };
    },
    async delete(key: string): Promise<void> { await client.deleteEntity(key, actor); },
    async extend(key: string, expiresIn: ExpirationTime): Promise<void> {
      await client.extendEntity(key, expiresIn.toExpiresAt(), actor);
    },
    async get(key: string): Promise<Decoded<T> | null> {
      const e = await client.getEntity(key);
      if (!e) return null;
      if (e.attributes[PROJECT_ATTRIBUTE.key] !== PROJECT_ATTRIBUTE.value) return null;
      return decode(e);
    },
    async query(filters: QueryFilter[] = []): Promise<Decoded<T>[]> {
      const rows = await client.queryEntities(withProject(filters));
      return Promise.all(rows.map(decode));
    },
    watch(filters: QueryFilter[], handlers: WatchHandlers) {
      return client.watchEntities(withProject(filters), handlers);
    },
    schema,
  };
}

export type Repository<T extends object> = ReturnType<typeof createRepository<T>>;
