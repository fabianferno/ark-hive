// lib/hooks/__tests__/useEntityWatch.test.tsx
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { FakeArkivClient } from "@/lib/arkiv/fakeClient";
import { createRepository } from "@/lib/arkiv/repo";
import { agentCardSchema, type AgentCard } from "@/lib/arkiv/entities/agentCard";
import type { Cipher } from "@/lib/arkiv/types";
import { useEntityList } from "@/lib/hooks/useEntity";
import { useEntityWatch } from "@/lib/hooks/useEntityWatch";

const pass: Cipher = { available: true, async encrypt(s) { return s; }, async decrypt(s) { return s; } };

describe("useEntityWatch", () => {
  it("invalidates the list when a new entity is created externally", async () => {
    const client = new FakeArkivClient();
    const repo = createRepository<AgentCard>(agentCardSchema, { client, cipher: pass, actor: "0xA" });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => {
      useEntityWatch(repo, "agents");
      return useEntityList(repo, "agents");
    }, { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([]));
    await repo.create({ agentId: "9", registryChainId: 1, status: "active", createdAt: 1 });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });
});
