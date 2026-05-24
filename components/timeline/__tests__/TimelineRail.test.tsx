// components/timeline/__tests__/TimelineRail.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineRail, type TimelineEvent } from "@/components/timeline/TimelineRail";

const events: TimelineEvent[] = [
  { id: "1", nodeId: "s1", label: "snapshot #1", ts: 1000, kind: "StateSnapshot" },
  { id: "2", nodeId: "c1", label: "agent created", ts: 900, kind: "AgentCard" },
];

describe("TimelineRail", () => {
  it("renders newest first", () => {
    render(<TimelineRail events={events} onFocus={() => {}} />);
    const rows = screen.getAllByRole("button");
    expect(rows[0]).toHaveTextContent("snapshot #1");
  });
  it("calls onFocus with nodeId on click", () => {
    const onFocus = vi.fn();
    render(<TimelineRail events={events} onFocus={onFocus} />);
    fireEvent.click(screen.getByText("agent created"));
    expect(onFocus).toHaveBeenCalledWith("c1");
  });
});
