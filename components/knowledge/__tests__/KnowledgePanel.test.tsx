// components/knowledge/__tests__/KnowledgePanel.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KnowledgePanel } from "@/components/knowledge/KnowledgePanel";
import type { UiSummary } from "@/lib/agentClient";

// The panel's share/grants sub-components consume data hooks. These tests cover the
// presentational rendering only, so stub the hooks to avoid needing React-Query/Privy
// providers (the share/grant behavior is exercised in the access-layer tests + manually).
vi.mock("@/lib/hooks/useAgents", () => ({ useAgentsList: () => ({ data: [] }) }));
vi.mock("@/lib/hooks/useAccess", () => ({
  useEncryptAndShare: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useSharedWithMe: () => ({ data: [] }),
  useOutgoingGrants: () => ({ data: [] }),
  useRevokeGrant: () => ({ mutate: vi.fn() }),
  useExtendGrant: () => ({ mutate: vi.fn() }),
}));

const summaries: UiSummary[] = [
  { key: "s1", sessionKey: "0xsessabcdef1234", summary: "discussed rust ownership", topics: ["rust", "memory"], summarySeq: 999, createdAt: 1 },
];

it("renders summaries with topic chips", () => {
  render(<KnowledgePanel agentId="" summaries={summaries} loading={false} topicResults={null} searching={false} onTopicSearch={() => {}} />);
  expect(screen.getByText("discussed rust ownership")).toBeInTheDocument();
  expect(screen.getByText("rust")).toBeInTheDocument();
  expect(screen.getByText("memory")).toBeInTheDocument();
});

it("submits a topic search", () => {
  const onTopicSearch = vi.fn();
  render(<KnowledgePanel agentId="" summaries={[]} loading={false} topicResults={null} searching={false} onTopicSearch={onTopicSearch} />);
  fireEvent.change(screen.getByPlaceholderText(/topic/i), { target: { value: "rust" } });
  fireEvent.submit(screen.getByPlaceholderText(/topic/i).closest("form")!);
  expect(onTopicSearch).toHaveBeenCalledWith("rust");
});

it("shows topic results when provided", () => {
  render(<KnowledgePanel agentId="" summaries={[]} loading={false} topicResults={["matched summary"]} searching={false} onTopicSearch={() => {}} />);
  expect(screen.getByText("matched summary")).toBeInTheDocument();
  expect(screen.getByText(/topic results \(1\)/i)).toBeInTheDocument();
});

it("shows an empty state for summaries", () => {
  render(<KnowledgePanel agentId="" summaries={[]} loading={false} topicResults={null} searching={false} onTopicSearch={() => {}} />);
  expect(screen.getByText(/no summaries yet/i)).toBeInTheDocument();
});
