// lib/graph/layout.ts
import { forceLink, forceManyBody, forceSimulation, forceCenter, forceCollide, type SimulationNodeDatum } from "d3-force";
import type { GraphEdge, GraphNode } from "./buildGraph";

export interface PositionedNode extends GraphNode { position: { x: number; y: number }; }
interface SimNode extends SimulationNodeDatum { id: string; }

// React-Flow nodes used here render ~220-260px wide × ~80-110px tall, so use a
// collide radius that exceeds the visible half-width (else cards still overlap).
const NODE_RADIUS = 160;

export function layoutNodes(nodes: GraphNode[], edges: GraphEdge[]): PositionedNode[] {
  // Seed positions on a wider ring so the simulation starts with more room.
  const radius = Math.max(260, nodes.length * 40);
  const sim: SimNode[] = nodes.map((n, i) => ({
    id: n.id,
    x: Math.cos((i / Math.max(nodes.length, 1)) * 2 * Math.PI) * radius,
    y: Math.sin((i / Math.max(nodes.length, 1)) * 2 * Math.PI) * radius,
  }));
  const links = edges.map((e) => ({ source: e.source, target: e.target }));
  forceSimulation<SimNode>(sim)
    .force("charge", forceManyBody().strength(-900))
    .force("link", forceLink<SimNode, { source: string; target: string }>(links as never).id((d) => d.id).distance(260))
    .force("collide", forceCollide<SimNode>(NODE_RADIUS).strength(1).iterations(3))
    .force("center", forceCenter(0, 0))
    .stop()
    .tick(300); // converge synchronously — no animation jitter
  const byId = new Map(sim.map((s) => [s.id, s]));
  return nodes.map((n) => {
    const s = byId.get(n.id)!;
    return { ...n, position: { x: Math.round(s.x ?? 0), y: Math.round(s.y ?? 0) } };
  });
}
