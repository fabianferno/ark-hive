import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useAgentsList } from "@/lib/hooks/useAgents";
import { AgentClient } from "@/lib/agentClient";

it("useAgentsList returns normalized agents", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ agents: [
    { key: "k", payload: { name: "A", description: "d" }, attrs: { agentId: "1", status: "active", registryChainId: 11155111, createdAt: 1 } },
  ]}) }) as Response));
  const client = new AgentClient("http://x");
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: qc }, children);
  const { result } = renderHook(() => useAgentsList(client), { wrapper });
  await waitFor(() => expect(result.current.data?.[0]?.name).toBe("A"));
});
