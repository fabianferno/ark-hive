// components/graph/GraphCanvas.tsx
"use client";
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { AgentNode } from "./AgentNode";
import { SnapshotNode } from "./SnapshotNode";
import { AuditNode } from "./AuditNode";
import { layoutNodes } from "@/lib/graph/layout";
import type { GraphEdge, GraphNode } from "@/lib/graph/buildGraph";

// Cast to NodeTypes: our node components use narrow data shapes but React Flow
// requires NodeProps<Node> — casting avoids prop-type mismatch without changing behaviour.
const nodeTypes = {
  AgentCard: AgentNode,
  StateSnapshot: SnapshotNode,
  AuditLog: AuditNode,
} as unknown as NodeTypes;

export function GraphCanvas({
  graph, onSelect,
}: { graph: { nodes: GraphNode[]; edges: GraphEdge[] }; onSelect: (id: string) => void }) {
  const nodes: Node[] = useMemo(
    () => layoutNodes(graph.nodes, graph.edges).map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
    [graph],
  );
  const edges: Edge[] = useMemo(
    () => graph.edges.map((e) => ({
      id: e.id, source: e.source, target: e.target, animated: e.kind === "chain",
      style: { stroke: e.kind === "chain" ? "#22C55E" : "#475569" },
    })),
    [graph],
  );
  return (
    <div className="h-full w-full bg-[#0F172A]">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView
        onNodeClick={(_, n) => onSelect(n.id)}>
        <Background color="#272F42" />
        <MiniMap pannable className="!bg-[#1E293B]" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
