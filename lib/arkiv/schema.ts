// lib/arkiv/schema.ts
import { ExpirationTime } from "./types";

export type AttrType = "str" | "num";
export interface AttrDef { type: AttrType; index?: "eq" | "range"; enc?: boolean; }

export interface EntitySchema<T> {
  name: string;
  attrs: { [K in keyof T]: AttrDef };
  ownership: "$owner" | "$creator";
  defaultExpiry: () => ExpirationTime;
}

// Shared expiry presets so TTLs stay differentiated per entity.
export const expiry = {
  never: () => ExpirationTime.never(),
  snapshot: () => ExpirationTime.days(90),
  audit: () => ExpirationTime.days(180),
};
