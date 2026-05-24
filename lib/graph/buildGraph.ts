// lib/graph/buildGraph.ts
import type { AttrValue } from "@/lib/arkiv/types";

export type EntityType = "AgentCard" | "StateSnapshot" | "AuditLog";
export interface GraphEntity { key: string; type: EntityType; attrs: Record<string, AttrValue>; }

export interface GraphNode { id: string; type: EntityType; data: Record<string, AttrValue>; }
export interface GraphEdge { id: string; source: string; target: string; kind: "agent" | "chain"; }

export function buildGraph(entities: GraphEntity[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = entities.map((e) => ({ id: e.key, type: e.type, data: e.attrs }));
  const edges: GraphEdge[] = [];

  const cardByAgent = new Map<string, string>();
  const agentByKey = new Map<string, string>();
  const known = new Set<string>();
  for (const e of entities) {
    known.add(e.key);
    agentByKey.set(e.key, String(e.attrs.agentId));
    if (e.type === "AgentCard") cardByAgent.set(String(e.attrs.agentId), e.key);
  }

  for (const e of entities) {
    if (e.type === "AgentCard") continue;
    const agentId = String(e.attrs.agentId);
    const cardKey = cardByAgent.get(agentId);
    if (cardKey) edges.push({ id: `agent:${cardKey}->${e.key}`, source: cardKey, target: e.key, kind: "agent" });
    if (e.type === "StateSnapshot" && e.attrs.prevSnapshotKey) {
      const prev = String(e.attrs.prevSnapshotKey);
      // only chain to a KNOWN, same-agent snapshot — no dangling or cross-agent edges
      if (known.has(prev) && agentByKey.get(prev) === agentId)
        edges.push({ id: `chain:${prev}->${e.key}`, source: prev, target: e.key, kind: "chain" });
    }
  }
  return { nodes, edges };
}
