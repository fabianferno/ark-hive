// lib/arkiv/entities/auditLog.ts
import type { EntitySchema } from "../schema";
import { expiry } from "../schema";

export interface AuditLog {
  agentId: string;
  action: string;
  actorWallet: string;
  targetEntityKey: string;
  ts: number;
}

export const auditSchema: EntitySchema<AuditLog> = {
  name: "AuditLog",
  attrs: {
    agentId: { type: "str", index: "eq" },
    action: { type: "str", index: "eq" },
    actorWallet: { type: "str", index: "eq" },
    targetEntityKey: { type: "str", index: "eq" },
    ts: { type: "num", index: "range" },
  },
  ownership: "$creator",
  defaultExpiry: expiry.audit,
};
