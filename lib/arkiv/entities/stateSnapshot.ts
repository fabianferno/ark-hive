// lib/arkiv/entities/stateSnapshot.ts
import type { EntitySchema } from "../schema";
import { expiry } from "../schema";

export interface StateSnapshot {
  agentId: string;
  sessionKey: string;
  commitSeq: number;
  commitHash: string;
  encPayload: string;       // ciphertext
  payloadSize: number;
  prevSnapshotKey?: string;
}

export const snapshotSchema: EntitySchema<StateSnapshot> = {
  name: "StateSnapshot",
  attrs: {
    agentId: { type: "str", index: "eq" },
    sessionKey: { type: "str", index: "eq" },
    commitSeq: { type: "num", index: "range" },
    commitHash: { type: "str", index: "eq" },
    encPayload: { type: "str", enc: true },
    payloadSize: { type: "num", index: "range" },
    prevSnapshotKey: { type: "str", index: "eq" },
  },
  ownership: "$owner",
  defaultExpiry: expiry.snapshot,
};
