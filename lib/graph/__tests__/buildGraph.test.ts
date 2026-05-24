// lib/graph/__tests__/buildGraph.test.ts
import { describe, it, expect } from "vitest";
import { buildGraph, type GraphEntity } from "@/lib/graph/buildGraph";

const card: GraphEntity = { key: "c1", type: "AgentCard", attrs: { agentId: "7", status: "active" } };
const snap1: GraphEntity = { key: "s1", type: "StateSnapshot", attrs: { agentId: "7", commitSeq: 1 } };
const snap2: GraphEntity = { key: "s2", type: "StateSnapshot", attrs: { agentId: "7", commitSeq: 2, prevSnapshotKey: "s1" } };
const audit: GraphEntity = { key: "a1", type: "AuditLog", attrs: { agentId: "7", action: "CREATE" } };

describe("buildGraph", () => {
  it("creates one node per entity", () => {
    const { nodes } = buildGraph([card, snap1, snap2, audit]);
    expect(nodes.map((n) => n.id).sort()).toEqual(["a1", "c1", "s1", "s2"]);
  });

  it("links children to the AgentCard by shared agentId", () => {
    const { edges } = buildGraph([card, snap1, audit]);
    expect(edges).toContainEqual(expect.objectContaining({ source: "c1", target: "s1", kind: "agent" }));
    expect(edges).toContainEqual(expect.objectContaining({ source: "c1", target: "a1", kind: "agent" }));
  });

  it("draws the snapshot hash-chain via prevSnapshotKey", () => {
    const { edges } = buildGraph([card, snap1, snap2]);
    expect(edges).toContainEqual(expect.objectContaining({ source: "s1", target: "s2", kind: "chain" }));
  });

  it("does not link across different agentIds", () => {
    const other: GraphEntity = { key: "s9", type: "StateSnapshot", attrs: { agentId: "99", commitSeq: 1 } };
    const { edges } = buildGraph([card, other]);
    expect(edges.filter((e) => e.target === "s9")).toHaveLength(0);
  });

  it("does not chain across different agentIds", () => {
    const foreign: GraphEntity = { key: "sx", type: "StateSnapshot", attrs: { agentId: "99", commitSeq: 1 } };
    const mine: GraphEntity = { key: "s2", type: "StateSnapshot", attrs: { agentId: "7", commitSeq: 2, prevSnapshotKey: "sx" } };
    const { edges } = buildGraph([card, foreign, mine]);
    expect(edges.filter((e) => e.kind === "chain")).toHaveLength(0);
  });

  it("does not emit a dangling chain edge when prev is absent", () => {
    const lonely: GraphEntity = { key: "s2", type: "StateSnapshot", attrs: { agentId: "7", commitSeq: 2, prevSnapshotKey: "missing" } };
    const { edges } = buildGraph([card, lonely]);
    expect(edges.filter((e) => e.kind === "chain")).toHaveLength(0);
  });
});
