// lib/arkiv/types.ts
export type AttrValue = string | number;
export type QueryOp = "eq" | "gt" | "gte" | "lt" | "lte";
export interface QueryFilter { key: string; op: QueryOp; value: AttrValue; }

export interface StoredEntity {
  key: string;
  attributes: Record<string, AttrValue>;
  owner?: string;
  creator?: string;
  expiresAt: number | null; // epoch ms; null = never
}

export interface CreateInput {
  attributes: Record<string, AttrValue>;
  owner?: string;
  creator?: string;
  expiresAt: number | null;
}
export interface UpdatePatch { attributes?: Record<string, AttrValue>; }
export type MutateOp =
  | { type: "create"; input: CreateInput }
  | { type: "delete"; key: string; actor: string };

export interface WatchHandlers {
  onCreated?: (e: StoredEntity) => void;
  onUpdated?: (e: StoredEntity) => void;
  onDeleted?: (key: string) => void;
}

export interface ArkivClient {
  createEntity(input: CreateInput): Promise<StoredEntity>;
  updateEntity(key: string, patch: UpdatePatch, actor: string): Promise<StoredEntity>;
  deleteEntity(key: string, actor: string): Promise<void>;
  getEntity(key: string): Promise<StoredEntity | null>;
  queryEntities(filters: QueryFilter[]): Promise<StoredEntity[]>;
  mutateEntities(ops: MutateOp[]): Promise<StoredEntity[]>;
  extendEntity(key: string, expiresAt: number | null, actor: string): Promise<StoredEntity>;
  watchEntities(filters: QueryFilter[], handlers: WatchHandlers): () => void;
}

// Encryption boundary used by the repo factory.
export interface Cipher {
  available: boolean;
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}

// ExpirationTime — never hardcode raw seconds.
export class ExpirationTime {
  private constructor(public readonly seconds: number | null) {}
  static never() { return new ExpirationTime(null); }
  static days(n: number) { return new ExpirationTime(n * 86400); }
  static hours(n: number) { return new ExpirationTime(n * 3600); }
  static min(a: ExpirationTime, b: ExpirationTime) {
    if (a.seconds === null) return b;
    if (b.seconds === null) return a;
    return new ExpirationTime(Math.min(a.seconds, b.seconds));
  }
  toExpiresAt(now = Date.now()): number | null {
    return this.seconds === null ? null : now + this.seconds * 1000;
  }
}
