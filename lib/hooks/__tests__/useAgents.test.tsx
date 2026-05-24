import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// useAgents hooks now build a ClientCtx from the Privy wallet and call the client
// flows in lib/agent/*. Mock both: a ready wallet (so ctx != null → query enabled)
// and listAgents returning one UiAgent.
vi.mock("@/lib/wallet/useUserWallet", () => ({
  useUserWallet: () => ({
    arkivWallet: {},
    publicArkiv: {},
    address: "0xUser",
    sepoliaWallet: {},
    publicSepolia: {},
    switchChain: vi.fn(),
    BRAGA_ID: 60138453102,
    SEPOLIA_ID: 11155111,
  }),
}));

vi.mock("@/lib/agent/agents", () => ({
  listAgents: vi.fn(async () => [
    { key: "k", agentId: "1", name: "A", description: "d", status: "active", registryChainId: 11155111, createdAt: 1, agentCardUri: "" },
  ]),
  getAgent: vi.fn(),
}));

import { useAgentsList } from "@/lib/hooks/useAgents";

it("useAgentsList returns agents from the client flow", async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: qc }, children);
  const { result } = renderHook(() => useAgentsList(), { wrapper });
  await waitFor(() => expect(result.current.data?.[0]?.name).toBe("A"));
});
