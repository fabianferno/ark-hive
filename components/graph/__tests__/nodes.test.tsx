// components/graph/__tests__/nodes.test.tsx
import { describe, it, expect } from "vitest";
import { type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { AgentNode } from "@/components/graph/AgentNode";
import { SnapshotNode } from "@/components/graph/SnapshotNode";

const wrap = (ui: ReactNode) => render(<ReactFlowProvider>{ui}</ReactFlowProvider>);

describe("graph nodes", () => {
  it("AgentNode shows agentId and active status color", () => {
    wrap(<AgentNode data={{ agentId: "7", status: "active" }} />);
    expect(screen.getByText(/7/)).toBeInTheDocument();
    expect(screen.getByTestId("status-dot")).toHaveAttribute("data-status", "active");
  });
  it("SnapshotNode shows commitSeq and a short hash", () => {
    wrap(<SnapshotNode data={{ commitSeq: 42, commitHash: "0xabcdef1234" }} />);
    expect(screen.getByText(/#42/)).toBeInTheDocument();
    expect(screen.getByText(/0xabcd/)).toBeInTheDocument();
  });
});
