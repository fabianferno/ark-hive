// lib/graph/buildTopicGraph.ts
// Build a Topic→Summary graph from the user's RAG session summaries, for the
// visualizer. Reuses the existing graph machinery via aliasing:
//   Topic   → an "AgentCard" hub  (data.agentId = topicKey, data.label = "# name")
//   Summary → an "AuditLog" leaf   (data.agentId = primary topicKey, content in data)
// so layout3d (groups leaves by data.agentId) + NeuralGraph3D + GraphCanvas render
// it with no changes: topics become glowing hubs, summaries scatter as leaf nodes.
import type { GraphNode, GraphEdge } from "./buildGraph";
import { normalizeTopic } from "@/lib/arkiv-client/topics";

export interface VizSummary {
  key: string;
  summary: string;
  topics: string[];
  sessionKey: string;
  createdAt: number;
  embedding: number[];
}

const UNTAGGED = "untagged";
const truncate = (s: string, n = 64) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function buildTopicGraph(summaries: VizSummary[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const label = new Map<string, string>(); // topicKey -> original label
  const count = new Map<string, number>();

  for (const s of summaries) {
    const keys = topicKeys(s);
    for (const tk of keys) {
      if (!label.has(tk)) label.set(tk, tk === UNTAGGED ? "untagged" : firstLabel(s, tk));
      count.set(tk, (count.get(tk) ?? 0) + 1);
    }
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Topic hubs.
  for (const [tk, name] of label) {
    nodes.push({
      id: `topic:${tk}`,
      type: "AgentCard",
      data: { agentId: tk, label: `# ${name}`, count: count.get(tk) ?? 0 },
    });
  }

  // Summary leaves + topic→summary edges.
  for (const s of summaries) {
    const keys = topicKeys(s);
    const primary = keys[0] ?? UNTAGGED;
    nodes.push({
      id: s.key,
      type: "AuditLog",
      data: {
        agentId: primary, // positions the leaf around its primary topic hub
        action: truncate(s.summary),
        content: s.summary,
        sessionKey: s.sessionKey,
        createdAt: s.createdAt,
      },
    });
    for (const tk of keys) {
      edges.push({ id: `t:${tk}->${s.key}`, source: `topic:${tk}`, target: s.key, kind: "agent" });
    }
  }

  return { nodes, edges };
}

function topicKeys(s: VizSummary): string[] {
  const keys = Array.from(new Set(s.topics.map((t) => normalizeTopic(t)).filter(Boolean)));
  return keys.length ? keys : [UNTAGGED];
}

function firstLabel(s: VizSummary, tk: string): string {
  return s.topics.find((t) => normalizeTopic(t) === tk) ?? tk;
}
