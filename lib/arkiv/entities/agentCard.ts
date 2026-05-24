// lib/arkiv/entities/agentCard.ts
import type { EntitySchema } from "../schema";
import { expiry } from "../schema";

export interface AgentCard {
  agentId: string;
  registryChainId: number;
  status: string;           // active | idle
  createdAt: number;
}

export const agentCardSchema: EntitySchema<AgentCard> = {
  name: "AgentCard",
  attrs: {
    agentId: { type: "str", index: "eq" },
    registryChainId: { type: "num", index: "eq" },
    status: { type: "str", index: "eq" },
    createdAt: { type: "num", index: "range" },
  },
  ownership: "$owner",
  defaultExpiry: expiry.never,
};
