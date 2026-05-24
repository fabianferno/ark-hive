// lib/hooks/__tests__/useEntity.test.tsx
import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { FakeArkivClient } from "@/lib/arkiv/fakeClient";
import { createRepository } from "@/lib/arkiv/repo";
import { agentCardSchema, type AgentCard } from "@/lib/arkiv/entities/agentCard";
import type { Cipher } from "@/lib/arkiv/types";
import { useEntityList, useCreate } from "@/lib/hooks/useEntity";

const pass: Cipher = { available: true, async encrypt(s) { return s; }, async decrypt(s) { return s; } };

function setup() {
  const repo = createRepository<AgentCard>(agentCardSchema, { client: new FakeArkivClient(), cipher: pass, actor: "0xA" });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { repo, wrapper };
}

describe("useEntity hooks", () => {
  it("lists entities, refreshes after create", async () => {
    const { repo, wrapper } = setup();
    const list = renderHook(() => useEntityList(repo, "agents"), { wrapper });
    await waitFor(() => expect(list.result.current.data).toEqual([]));

    const create = renderHook(() => useCreate(repo, "agents"), { wrapper });
    await act(async () => {
      await create.result.current.mutateAsync({ agentId: "7", registryChainId: 1, status: "active", createdAt: 1 });
    });
    await waitFor(() => expect(list.result.current.data).toHaveLength(1));
  });
});
