// lib/hooks/useAccess.ts
// Hooks for encrypted-summary sharing: encrypt+share, incoming grants (with
// decrypted text), outgoing grants, revoke, extend. All scoped to the user's wallet.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCtx } from "./useAgents";
import {
  encryptAndShareSummary, listGrantsForMe, listOutgoingGrants,
  readSharedSummary, revokeGrant, extendGrant, type IncomingGrant,
} from "@/lib/arkiv-client/access";

export interface SharedSummaryView { grantKey: string; granterAgentId: string; expiresAt: number; summary: string; }

export function useEncryptAndShare(agentId: string) {
  const { ctx } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { sessionKey: string; summarySeq: number; summary: string; topics: string[]; originalKey?: string; granteeAgentId: string; expiresInSec: number }) =>
      encryptAndShareSummary(ctx!, {
        agentId, sessionKey: v.sessionKey, summarySeq: v.summarySeq,
        plain: { summary: v.summary, topics: v.topics },
        granteeAgentId: v.granteeAgentId, expiresInSec: v.expiresInSec,
        // Intentionally do NOT pass deleteOriginalKey: keep the plaintext summary
        // visible in the owner's knowledge list. The encrypted copy + grant are
        // separate entities.
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["summaries", agentId] });
      qc.invalidateQueries({ queryKey: ["outgoingGrants"] });
    },
  });
}

export function useSharedWithMe() {
  const { ctx } = useCtx();
  return useQuery({
    queryKey: ["sharedWithMe", ctx?.address],
    enabled: !!ctx,
    queryFn: async (): Promise<SharedSummaryView[]> => {
      const grants = await listGrantsForMe(ctx!);
      const incoming = grants.filter((g: IncomingGrant) => g.granterAgentId && g.granteeAgentId); // exclude self-grants (granteeAgentId === "")
      const out: SharedSummaryView[] = [];
      for (const g of incoming) {
        try { out.push({ grantKey: g.grantKey, granterAgentId: g.granterAgentId, expiresAt: g.expiresAt, summary: await readSharedSummary(ctx!, g) }); }
        catch { /* not decryptable / resource gone */ }
      }
      return out.sort((a, b) => a.expiresAt - b.expiresAt);
    },
    refetchInterval: 30_000, // so expiry/auto-revoke shows up
  });
}

export function useOutgoingGrants() {
  const { ctx } = useCtx();
  return useQuery({
    queryKey: ["outgoingGrants", ctx?.address],
    enabled: !!ctx,
    queryFn: () => listOutgoingGrants(ctx!),
    refetchInterval: 30_000,
  });
}

export function useRevokeGrant() {
  const { ctx } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grantKey: string) => revokeGrant(ctx!, grantKey),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["outgoingGrants"] }); qc.invalidateQueries({ queryKey: ["sharedWithMe"] }); },
  });
}

export function useExtendGrant() {
  const { ctx } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { grantKey: string; expiresInSec: number }) => extendGrant(ctx!, v.grantKey, v.expiresInSec),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outgoingGrants"] }),
  });
}
