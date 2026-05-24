// lib/graph/__tests__/layout.test.ts
import { describe, it, expect } from "vitest";
import { layoutNodes } from "@/lib/graph/layout";
import type { GraphNode } from "@/lib/graph/buildGraph";

const nodes: GraphNode[] = [
  { id: "c1", type: "AgentCard", data: {} },
  { id: "s1", type: "StateSnapshot", data: {} },
];

describe("layoutNodes", () => {
  it("returns a position for every node", () => {
    const out = layoutNodes(nodes, [{ id: "e", source: "c1", target: "s1", kind: "agent" }]);
    expect(out).toHaveLength(2);
    for (const n of out) {
      expect(typeof n.position.x).toBe("number");
      expect(typeof n.position.y).toBe("number");
    }
  });
  it("is deterministic for the same input", () => {
    const a = layoutNodes(nodes, []);
    const b = layoutNodes(nodes, []);
    expect(a.map((n) => n.position)).toEqual(b.map((n) => n.position));
  });
});
