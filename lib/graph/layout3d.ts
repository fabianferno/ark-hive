// lib/graph/layout3d.ts
// Lays out real Arkiv entities (from buildGraph) as a 3D neural network:
// each agent becomes a hub, its snapshots spiral outward as a chain, and its
// audit logs scatter as leaf synapses around it. Pure math — no THREE import,
// so it stays SSR-safe and testable. The component feeds these into the
// gist's node/connection shaders.
import type { GraphNode, GraphEdge, EntityType } from "./buildGraph";

export interface Node3D {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  z: number;
  level: number; // distance-from-root, drives shader color/breathing
  leaf: boolean; // shader nodeType: leaves get noise wobble
  size: number;
  data: Record<string, unknown>;
}

export interface Conn3D {
  source: string;
  target: string;
  strength: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Evenly distributed unit vectors on a sphere (Fibonacci sphere).
function fibDir(i: number, n: number): [number, number, number] {
  const y = n <= 1 ? 0 : 1 - (i / (n - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN_ANGLE * i;
  return [Math.cos(theta) * r, y, Math.sin(theta) * r];
}

// Orthonormal basis (u, v) for the plane perpendicular to w.
function basis(w: [number, number, number]): {
  u: [number, number, number];
  v: [number, number, number];
} {
  const up: [number, number, number] =
    Math.abs(w[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  // u = normalize(cross(up, w))
  let ux = up[1] * w[2] - up[2] * w[1];
  let uy = up[2] * w[0] - up[0] * w[2];
  let uz = up[0] * w[1] - up[1] * w[0];
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux /= ul;
  uy /= ul;
  uz /= ul;
  // v = cross(w, u)
  const vx = w[1] * uz - w[2] * uy;
  const vy = w[2] * ux - w[0] * uz;
  const vz = w[0] * uy - w[1] * ux;
  return { u: [ux, uy, uz], v: [vx, vy, vz] };
}

export function layout3d(graph: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}): { nodes: Node3D[]; conns: Conn3D[] } {
  const cards = graph.nodes.filter((n) => n.type === "AgentCard");
  const agentIds = cards.map((c) => String(c.data.agentId));
  const hubSpread = cards.length > 1 ? 16 : 0;

  const out = new Map<string, Node3D>();

  cards.forEach((card, ai) => {
    const agentId = String(card.data.agentId);
    const w = fibDir(ai, cards.length);
    const hub: [number, number, number] = [
      w[0] * hubSpread,
      w[1] * hubSpread,
      w[2] * hubSpread,
    ];
    const { u, v } = basis(w);

    out.set(card.id, {
      id: card.id,
      type: "AgentCard",
      x: hub[0],
      y: hub[1],
      z: hub[2],
      level: 0,
      leaf: false,
      size: 2.1,
      data: card.data,
    });

    // Snapshots: ordered by commitSeq, spiraling outward along the hub axis
    // so the chain edges trace a clean helix.
    const snaps = graph.nodes
      .filter(
        (n) =>
          n.type === "StateSnapshot" && String(n.data.agentId) === agentId,
      )
      .sort((a, b) => Number(a.data.commitSeq ?? 0) - Number(b.data.commitSeq ?? 0));

    snaps.forEach((s, i) => {
      const angle = i * 1.1;
      const radius = 3.4 + i * 1.7;
      const axial = 2 + i * 1.6;
      const c = Math.cos(angle) * radius;
      const sn = Math.sin(angle) * radius;
      out.set(s.id, {
        id: s.id,
        type: "StateSnapshot",
        x: hub[0] + u[0] * c + v[0] * sn + w[0] * axial,
        y: hub[1] + u[1] * c + v[1] * sn + w[1] * axial,
        z: hub[2] + u[2] * c + v[2] * sn + w[2] * axial,
        level: Math.min(i + 1, 4),
        leaf: i === snaps.length - 1,
        size: 1.2,
        data: s.data,
      });
    });

    // Audit logs: leaf synapses scattered on a shell around the hub.
    const audits = graph.nodes.filter(
      (n) => n.type === "AuditLog" && String(n.data.agentId) === agentId,
    );
    audits.forEach((a, i) => {
      const d = fibDir(i, Math.max(audits.length, 1));
      const r = 4.5;
      out.set(a.id, {
        id: a.id,
        type: "AuditLog",
        x: hub[0] + d[0] * r,
        y: hub[1] + d[1] * r,
        z: hub[2] + d[2] * r,
        level: 1,
        leaf: true,
        size: 0.85,
        data: a.data,
      });
    });
  });

  // Any node not attached to a known agent card (orphans / unknown agents):
  // drop them on an outer shell so nothing silently disappears.
  const orphans = graph.nodes.filter(
    (n) => !out.has(n.id) && !agentIds.includes(String(n.data.agentId)),
  );
  orphans.forEach((n, i) => {
    const d = fibDir(i, Math.max(orphans.length, 1));
    const r = hubSpread + 24;
    out.set(n.id, {
      id: n.id,
      type: n.type,
      x: d[0] * r,
      y: d[1] * r,
      z: d[2] * r,
      level: 2,
      leaf: n.type !== "AgentCard",
      size: n.type === "AgentCard" ? 2.1 : 1,
      data: n.data,
    });
  });

  const conns: Conn3D[] = graph.edges
    .filter((e) => out.has(e.source) && out.has(e.target))
    .map((e) => ({
      source: e.source,
      target: e.target,
      strength: e.kind === "chain" ? 0.95 : 0.6,
    }));

  return { nodes: [...out.values()], conns };
}
