// components/memory/__tests__/MemorySearch.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemorySearch } from "@/components/memory/MemorySearch";
import type { UiHit } from "@/lib/agentClient";

const hits: UiHit[] = [{ memKey: "goal", value: "ship the demo", scope: "run", createdAt: 1 }];

it("submits the search term", () => {
  const onSearch = vi.fn();
  render(<MemorySearch hits={[]} onSearch={onSearch} searching={false} />);
  fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "goal" } });
  fireEvent.submit(screen.getByPlaceholderText(/search/i).closest("form")!);
  expect(onSearch).toHaveBeenCalledWith("goal");
});

it("renders hits with scope + value", () => {
  render(<MemorySearch hits={hits} onSearch={() => {}} searching={false} />);
  expect(screen.getByText("ship the demo")).toBeInTheDocument();
  expect(screen.getByText(/run/)).toBeInTheDocument();
});
