// components/agents/__tests__/AgentList.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AgentList } from "@/components/agents/AgentList";
import type { UiAgent } from "@/lib/agentClient";

const agents: UiAgent[] = [
  { key: "k1", agentId: "5224", name: "Alpha", description: "first agent", status: "active", registryChainId: 11155111, createdAt: 1, agentCardUri: "ipfs://card1" },
];

it("lists agents with name + agentId and a create button", () => {
  render(<AgentList agents={agents} onOpen={() => {}} onNew={() => {}} loading={false} />);
  expect(screen.getByText("Alpha")).toBeInTheDocument();
  expect(screen.getByText(/5224/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /new agent/i })).toBeInTheDocument();
});

it("calls onOpen with agentId when a card is clicked", () => {
  const onOpen = vi.fn();
  render(<AgentList agents={agents} onOpen={onOpen} onNew={() => {}} loading={false} />);
  fireEvent.click(screen.getByText("Alpha"));
  expect(onOpen).toHaveBeenCalledWith("5224");
});

it("shows an empty state when there are no agents", () => {
  render(<AgentList agents={[]} onOpen={() => {}} onNew={() => {}} loading={false} />);
  expect(screen.getByText(/no agents yet/i)).toBeInTheDocument();
});

it("surfaces the chain label, status and a clickable IPFS agent card link", () => {
  render(<AgentList agents={agents} onOpen={() => {}} onNew={() => {}} loading={false} />);
  expect(screen.getByText(/ethereum sepolia 11155111/i)).toBeInTheDocument();
  const link = screen.getByRole("link", { name: /agent card/i });
  expect(link).toHaveAttribute("href", "https://gateway.pinata.cloud/ipfs/card1");
});
