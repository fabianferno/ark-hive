// lib/hooks/useMarketplace.ts
import { useQuery } from "@tanstack/react-query";
import type { MarketplaceAgent } from "@/lib/agent/registry";

export interface MarketplaceResponse { agents: MarketplaceAgent[]; total: number; fetchedAt: number }

export function useMarketplace() {
  return useQuery({
    queryKey: ["marketplace"],
    staleTime: 60_000,
    queryFn: async (): Promise<MarketplaceResponse> => {
      const r = await fetch("/api/marketplace");
      if (!r.ok) throw new Error(`marketplace ${r.status}`);
      return r.json();
    },
  });
}
