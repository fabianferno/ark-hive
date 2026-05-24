// lib/graph/layout.ts
import { forceLink, forceManyBody, forceSimulation, forceCenter, type SimulationNodeDatum } from "d3-force";
import type { GraphEdge, GraphNode } from "./buildGraph";

export interface PositionedNode extends GraphNode { position: { x: number; y: number }; }
interface SimNode extends SimulationNodeDatum { id: string; }

export function layoutNodes(nodes: GraphNode[], edges: GraphEdge[]): PositionedNode[] {
  // deterministic seed positions on a ring so output is stable for tests/screenshots
  const sim: SimNode[] = nodes.map((n, i) => ({
    id: n.id,
    x: Math.cos((i / nodes.length) * 2 * Math.PI) * 200,
    y: Math.sin((i / nodes.length) * 2 * Math.PI) * 200,
  }));
  const links = edges.map((e) => ({ source: e.source, target: e.target }));
  forceSimulation<SimNode>(sim)
    .force("charge", forceManyBody().strength(-400))
    .force("link", forceLink<SimNode, { source: string; target: string }>(links as never).id((d) => d.id).distance(120))
    .force("center", forceCenter(0, 0))
    .stop()
    .tick(120); // run to convergence synchronously — no animation jitter
  const byId = new Map(sim.map((s) => [s.id, s]));
  return nodes.map((n) => {
    const s = byId.get(n.id)!;
    return { ...n, position: { x: Math.round(s.x ?? 0), y: Math.round(s.y ?? 0) } };
  });
}
